/* copyright (c) Adam Biagianti/el-mapache 2013.
 * Heavily based on HTML5 rocks filesystem article http://www.html5rocks.com/en/tutorials/file/filesystem/
 * MIT License
 * Thanks dudez
 */
(function(root) {
  // Test if the API is accessible before we set anything else up
  // Not 100% certain how to handle these errors yet
  if (root.location.protocol === "file:") 
     throw new Error("The Filesystem API can only be accessed via http.");
  if (!root.webkitRequestFileSystem)
    throw new Error("Sorry, the Filesystem API is currently only available on Google Chrome.");

  var P = PERSISTENT;
  var T = TEMPORARY;
  var MB = 1024 * 1024;
  
  // Limited error reporting
  function onError(e) {
    var msg = '';

    switch (e.code) {
      case FileError.QUOTA_EXCEEDED_ERR:
        msg = 'File system full.';
        break;
      case FileError.NOT_FOUND_ERR:
        msg = 'The requested file cant\'t be located.';
        break;
      case FileError.SECURITY_ERR:
        msg = 'SECURITY_ERR';
        break;
      case FileError.INVALID_MODIFICATION_ERR:
        msg = 'INVALID_MODIFICATION_ERR';
        break;
      case FileError.INVALID_STATE_ERR:
        msg = 'INVALID_STATE_ERR';
        break;
      default:
        msg = 'Unknown Error';
        break;
    }
    console.log(msg);
  }

  function toArray(list) {
    return Array.prototype.slice.call(list || [], 0);
  }

  function isCallback(fn) {
    return typeof fn === "function" ? fn : false;
  };

  function addTo(obj, path, val) {
    var key, lastIdx;
    lastIdx = path.length - 1;

    for (var i = 0; i < lastIdx;i++) {
      key = path[i];

      if (!(key in obj))
        obj[key] = {}

      obj = obj[key];
    }

    obj[path[lastIdx]] = val;
  }

  root.FileSystem = root.FileSystem || function() {};

  root.FileSystem = FileSystem = function(opts) {
    Constructor: FileSystem;

    this.debug = opts && opts.debug || false; 
    this.fs = null;
    this.currentDirectory = null;
    this.file = null;
    this.bytes = ((opts && opts.storage) || 4000) * MB;
    this.type = window[opts && opts.type || 'PERSISTENT'];
    this.cb = opts && opts.callback || null;
    this.allocateStorage();
  }

  // Noop after the initial allocation request,
  // unless additional storage space is being requested
  FileSystem.prototype.allocateStorage = function() {
    var self = this;
    webkitStorageInfo.requestQuota(this.type, this.bytes, function(bytes) {
      webkitRequestFileSystem(self.type, bytes, self.onFsInit.bind(self, arguments), onError);
    },onError);
  };
  
  FileSystem.prototype.getStorageType = function() {
    if (this.type === PERSISTENT)
      return window.navigator.webkitPersistentStorage;
    
    if (this.type === TEMPORARY)
      return window.navigator.webkitTemporaryStorage;
  };

  FileSystem.prototype.onFsInit = function(args, fileSys) {
    this.fs = fileSys;
    this.currentDirectory = fileSys.root;
    this.cb && this.cb();

    if (this.debug) {
      console.log("File system sandbox accessed.");
      this.availableStorage();
    }
  };

  FileSystem.prototype.availableStorage = function(cb) {
    cb = isCallback(cb);

    function currentAndTotalStorage(used, allocated) {
      if (this.debug) {
        console.log(used / MB + " MB used.");
        console.log(allocated / MB + " MB total space remaining.");
      }

      cb && cb({
        allocated: allocated / MB,
        used: used / MB
      });
    }

    this.getStorageType().queryUsageAndQuota(currentAndTotalStorage);
  };

  FileSystem.prototype.getFile = function(root, filename, cb) {
    var cb = isCallback(cb),
        self = this,
        root = root || this.currentDirectory;
 
    root.getFile(filename, {}, function(fileEntry) {
      self.file = fileEntry;
      cb && cb(fileEntry);
    }, onError);
  };
 
  FileSystem.prototype.findOrCreateFile = function(root, filename, cb) {
    var self = this,
        root = root || this.currentDirectory;
 
    cb = isCallback(cb);
 
    function onFileRetrieval(fileEntry) {
      if (self.debug) console.log('File created');
      self.file = fileEntry;
      cb && cb(fileEntry);
    }
 
    function onRetrievalError(err) {
      if (err.code === 9) {
        if (self.debug) console.log('file exists, opening..')
        root.getFile(filename, {}, function(entry) {
          self.file = entry;
          return cb && cb(self.file);
        },onError);
      } else {
        return onError(err);
      }
    }
 
    root.getFile(filename, {
      create: true, 
      exclusive: true
    }, onFileRetrieval, onRetrievalError);
  };
 
  FileSystem.prototype.removeFile = function(filename, cb) { 
    var cb = isCallback(cb),
        self = this;
 
    this.getFile(filename, function(fileEntry) {
      if (self.file === fileEntry) self.file = null;
      fileEntry.remove(function() {
        cb && cb();
      }, onError);
    }, onError);
  };
   
  // Reads a portion of a file into memory.  Useful for overwriting small amounts 
  // of data, like the headers on a wav file
  // {@param from} Number first byte to be read
  // {@param to} Number last byte to be read
  // {@param cb} Function callback with the results of the write
  FileSystem.prototype.readChunk = function(from, to, cb) {
    var cb = isCallback(cb); 
 
    if(arguments.length < 3) throw new Error("Invalid arguments.");
 
    this.file.file(function(file) {
      var reader = new FileReader();
      reader.onload = function(e) {
         cb && cb(e.target.result);
      };
 
      reader.readAsArrayBuffer(file.slice(from, to));
    });
  } 
  
  FileSystem.prototype.readFile = function(filename, cb) {
    var cb = isCallback(cb);

    this.getFile(filename, function(fileEntry) {
      fileEntry.file(function(file) {
        var reader = new FileReader();

        reader.onloadend = function(evt) {
          cb && cb(this.result);
        };

        reader.readAsText(file);
      });
    }, onError);
  };

  FileSystem.prototype.writeFile = function(content, type, cb, position) {
    if(!this.file) throw new Error("No file to write to.");
    if(!content instanceof Blob) throw new Error("Content must be an instance of Blob.");
     
    var cb = isCallback(cb),
        self = this;
 
    this.file.createWriter(function(writer) {
      writer.onwriteend = function() {
        if (self.debug) console.log('File written');
        self.file = null;
        cb && cb();
      }; 
 
      writer.onerror = function(e) {
        if (self.debug) {
          self.file = null;
          console.log("Write failed!\n");
          console.log(e);
        }
      };
 
      if(type.toLowerCase() === "a") {
        writer.seek(typeof position !== "undefined" || writer.length);
      }
 
      writer.write(content);
 
    }, onError);
  };
 
  FileSystem.prototype.moveFile = function(cwd, src, dest, newName, cb) {
    var cb = isCallback(cb),
        newName = typeof newName !== "undefined" ? newName : null;

    cwd.getFile(src, {}, function(file) {
      cwd.getDirectory(dest, {}, function(dir) {
        if (newName)
          file.moveTo(dir, newName);
        else
          file.moveTo(dir);

        cb && cb();
      },onError); 
    },onError);
  };

  FileSystem.prototype.copyFile = function(cwd, filename, dest, cb) {
    var cb = isCallback(cb);

    cwd.getFile(filename, {}, function(file) {
      cwd.getDirectory(dest, {},  function(dir) {
        file.copyTo(dir);

        cb && cb();
      }, onError);
    },onError); 
  };

  FileSystem.prototype.getResourceURL = function(file) {
    return this.file.toURL();
  };
   
  FileSystem.prototype.changeDir = function(cwd, path, cb) {
    var dirs = path.split('/').splice(1),
        cb = isCallback(cb),
        self = this;

    function locate(root, target) {
      root.getDirectory(target, {}, function(dirEntry) {
        if(dirs.length === 0) { 
          self.currentDirectory = dirEntry;
          return cb && cb(dirEntry);
        }

        locate(dirEntry,dirs.shift());
        
      },onError); 
    }
    
    locate(cwd, dirs.shift());
  };
  

  function locate(root, path) {
    var dirs = path.split('/').splice(1);

    function find(root, target) {
      root.getDirectory(target, {}, function(dirEntry) {
        if(dirs.length === 0) return dirEntry;

        find(dirEntry,dirs.shift());
      },onError); 
    }

    find(root,dirs.shift());
  }
  
  // Always searches the whole file system for a folder
  FileSystem.prototype.removeDir = function(path, cb) {
    var self = this,
        dirToRemove = locate(this.fs.root, path),
        name = dirToRemove.name;

    cb = isCallback(cb);

    dirToRemove.remove(function() {
      if (self.currentDirectory.name === name) {
        self.currentDirectory = self.fs.root;
      }

      cb && cb();
    }, onError);
  };

  // Recursively makes nested directories after parent dir is created
  // {@param rootDir} Object initial parent directory
  // {@param folders} String names of folders separated by a '/' 
  // {@param cb} Function callback executed after all folders are created
  FileSystem.prototype.mkDir = function(rootDir, folders, cb) {
    var folders = folders.split('/'),
        cb = isCallback(cb),
        rootDir = rootDir || this.currentDirectory;
    
    function createDir(root, folder) {
      folder = folder[0];

      // Remove hidden folders and call again
      if((folders[0] === '.' || folders[0] === '' || folder === "") && folders.length !== 0) {
        createDir(root, folders.splice(0,1));
      }
      root.getDirectory(folder, {create: true}, function(dirEntry) {
        if(folders.length === 0) return cb && cb(dirEntry);
        createDir(dirEntry, folders.splice(0,1));
      }, onError);
    }

    createDir(rootDir, folders.splice(0,1));
  };
   
  // Read the entire filesystem recursively in series.
  // TODO explore do this in parallel and then sorting?
  FileSystem.prototype.readDir = function(root, cb) {
    function walk(root,done) {
      var results = {},
          temp = [],
          reader = root.createReader(),
          name = root.fullPath === "/" ? "" : root.fullPath;
     

      function read() {
        reader.readEntries(function(list) {
          if (!list.length) {
            var i = 0;
            temp.sort(); 

            (function next() {
              var file = temp[i++];
              if (!file) return done(temp,results);

              addTo(results,file.fullPath.split("/"), file.isFile ? null : {});

              if(file.isDirectory) {
                walk(file, function(res,results) {
                  temp = temp.concat(toArray(res));
                  next();
                });
              } else {
                next();
              }
            })();
          } else {
            // We don't know if all entries have been returned so put 
            // the current results into a temporary array and relist the files.
            temp = temp.concat(toArray(list));
            read();
          }
        }, onError);
      }
      read();
    }
 
    walk(root,cb); 
  };

  FileSystem.prototype.listEntries = function(list,entries,cb) {
    function loop(obj,l) {
      // If the folder object has no children, 
      // remove the empty ul form the DOM.
      if (Object.keys(obj).length === 0) l.remove()

      for (var entry in obj) {

        if (obj[entry]) {
          var ul = document.createElement("ul"),
              li = document.createElement("li");

          li.innerHTML = entry;
          l.appendChild(li);
          l.insertBefore(ul, li.nextSibling);

          loop(obj[entry],ul);

        } else {
          var li = document.createElement("li");
          li.innerHTML = entry;
          l.appendChild(li);
        }
      }
    }

    var ul = document.createElement("ul");
    loop(entries,list)
    list.appendChild(ul);
  };
 
  return FileSystem;
})(window);
