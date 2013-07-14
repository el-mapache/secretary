var should = chai.should(),
    expect = chai.expect;

describe("FileSystem Wrapper", function() {
  var fs = null;

  // Little wrapper so I dont have to copy paste this block
  function beforeEach() {
    before(function(done) {
      // Initializes asynchronously, need to call done before
      // the suite can execute.
      fs = new FileSystem({
        debug: true,
        callback: function() {
          done();
        }
      });
    });
  }

  describe("Instatiation", function() {
    beforeEach();

    it("is be an instance of FileSystem", function() {
      (fs instanceof FileSystem).should.equal(true);
    });

    it("has properties: 'fs', 'file', 'type', 'bytes', 'debug'", function() {
      fs.should.have.property("fs");
      fs.should.have.property("file");
      fs.should.have.property("bytes");
      fs.should.have.property("type");
      fs.should.have.property("debug");
    });
    
    it("sets the 'fs' property to the root dir", function() {
      fs.fs.should.not.equal(null);
      fs.fs.fullPath.should.equal("/");
    });

    it("allocates storage size equal to bytes * megabyte", function() {
      fs.availableStorage(function(storageObj) {
        storageObj.allocated.should.equal(fs.bytes /(1024 * 1024));
      });
    });
  });

  describe("File methods", function() {
    beforeEach();

    it("responds to: 'getFile', 'findOrCreateFile', 'removeFile', 'writeFile', 'readFile', 'readChunk'", function() {
      fs.should.have.property("getFile"); 
      fs.should.have.property("findOrCreateFile"); 
      fs.should.have.property("removeFile"); 
      fs.should.have.property("writeFile"); 
      fs.should.have.property("readChunk"); 
      fs.should.have.property("readFile"); 
      fs.should.have.property("moveFile"); 
      fs.should.have.property("copyFile"); 
    }); 

    it("creates/gets the specified file", function(done) {
      fs.findOrCreateFile("test.tmp", function(file) {
        fs.file.should.not.equal(null);
        fs.file.name.should.equal("test.tmp");
        fs.removeFile("test.tmp", function() {
          done();
        });
      });
    });

    it("removes the specified file from the sandbox", function(done) {
     fs.findOrCreateFile("test.tmp", function(file) {
       fs.removeFile("test.tmp", function() {
         expect(fs.file).to.equal(null);
         fs.readDir(fs.fs, function(results) {
           results.length.should.equal(0);
           done();
         });
       });
     }); 
   });
   
    it("reads the specified file into memory", function(done) {
      fs.findOrCreateFile("test.tmp", function(file) {
        fs.writeFile(new Blob(["hi"],{type: "text/plain"}), 'w', function() {
          fs.readFile("test.tmp", function(text) {
            text.should.equal("hi");
            fs.removeFile("test.tmp", function() {
              done();
            });
          });
        });
      });
    }); 

    it("reads a chunk of a file into memory", function(done) {
      fs.findOrCreateFile("test.tmp", function(file) {
        fs.writeFile(new Blob(["hi"],{type: "text/plain"}), 'w', function() {
          fs.getFile("test.tmp", function(file) {
            fs.readChunk(0,2, function(buffer) {
              buffer.byteLength.should.equal(2);
              fs.removeFile("test.tmp", function() {
                done();
              });
            });
          });
        });
      });
    });

    it("copies a file", function(done) {
      fs.findOrCreateFile("test.tmp", function(file) {
        fs.mkDir(fs.fs, "new", function() {
          fs.copyFile(fs.fs,"test.tmp","new", function() {
            fs.getFile("new/test.tmp",function(file) {
              file.should.not.equal(null);
              done();
            });
          });
        });
      });
    });

    it("moves/renames a file", function(done) {
      fs.findOrCreateFile("test.tmp", function(file) {
        fs.mkDir(fs.fs, "new", function() {
          fs.moveFile(fs.fs,"test.tmp","new", "new.tmp", function() {
            fs.getFile("new/new.tmp",function(file) {
              file.should.not.equal(null);
              fs.fs.getFile("test.tmp",{},function() {},function(e) {
                e.code.should.equal(1);
                done();
              });
            });
          });
        });
      });
    });
  });

  describe("DirectoryEntry methods", function() {
  
  });
});
