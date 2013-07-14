var should = chai.should(),
    expect = chai.expect;

describe("FileSystem Wrapper", function() {
  var fs = null;

  function beforeEach() {
    before(function(done) {
      fs = new FileSystem({
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

    it("has some properties", function() {
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
});
