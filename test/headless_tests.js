// Create a browser environment for CodeMirror
var jsdom = require("jsdom").jsdom;
document = jsdom('<html><body><div id="editor"></div></body></html>');
window = document.parentWindow;

var share = require('share');
var shareAce = require('..');
var assert = require('assert');


require("../ace-builds/src-noconflict/ace.js");
var ace = window.ace;


function newEditor(ctx) {
  var editor = ace.edit('editor');
  editor.$blockScrolling = Infinity
  var EditSession = ace.require('ace/edit_session').EditSession;
  var session = new EditSession('');
  editor.setSession(session);
  
  shareAce(session, ctx);
  return session;
}

describe('Editor creation', function () {
  it('sets context text in editor', function () {
    var ctx = new Ctx('hi');
    var editor = newEditor(ctx);

    assert.equal('hi', editor.getValue());
  });
});

describe('Editor edits', function () {
  it('adds text', function () {
    var ctx = new Ctx('');
    var editor = newEditor(ctx);

    var text = "aaaa\nbbbb\ncccc\ndddd";
    editor.setValue(text);
    assert.equal(text, ctx.get());
  });

  it('adds empty text', function () {
    var ctx = new Ctx('');
    var editor = newEditor(ctx);

    editor.setValue('');
    assert.equal('', ctx.get() || '');

    editor.setValue('a');
    assert.equal('a', ctx.get() || '');
  });

  it('replaces a couple of lines', function () {
    var ctx = new Ctx('three\nblind\nmice\nsee\nhow\nthey\nrun\n');
    var editor = newEditor(ctx);

    editor.replace({start: {row: 1, column: 0}, end: {row: 3, column: 0} }, 'evil\nrats\n');
    assert.equal('three\nevil\nrats\nsee\nhow\nthey\nrun\n', ctx.get());
  });
});

describe('ShareJS changes', function () {
  it('adds text', function () {
    var ctx = new Ctx('', true);
    var editor = newEditor(ctx);

    var text = "aaaa\nbbbb\ncccc\ndddd";
    ctx.insert(0, text);
    assert.equal(text, editor.getValue());
  });

  it('can edit a doc that has been empty', function () {
    var ctx = new Ctx('', true);
    var editor = newEditor(ctx);

    ctx.insert(0, '');
    assert.equal('', editor.getValue());

    ctx.insert(0, 'a');
    assert.equal('a', editor.getValue());
  });

  it('replaces a line', function () {
    var ctx = new Ctx('hi', true);
    var editor = newEditor(ctx);

    ctx.remove(0, 2);
    ctx.insert(0, 'hello');
    assert.equal('hello', editor.getValue());
  });

  it('replaces a couple of lines', function () {
    var ctx = new Ctx('three\nblind\nmice\nsee\nhow\nthey\nrun\n', true);
    var editor = newEditor(ctx);

    ctx.remove(6, 11);
    ctx.insert(6, 'evil\nrats\n');
    assert.equal('three\nevil\nrats\nsee\nhow\nthey\nrun\n', editor.getValue());
  });
});

describe('Stub context', function () {
  it('can insert at the beginning', function () {
    var ctx = new Ctx('abcdefg');
    ctx.insert(0, '123');
    assert.equal('123abcdefg', ctx.get());
  });

  it('can insert in the middle', function () {
    var ctx = new Ctx('abcdefg');
    ctx.insert(2, '123');
    assert.equal('ab123cdefg', ctx.get());
  });

  it('can insert at the end', function () {
    var ctx = new Ctx('abcdefg');
    ctx.insert(ctx.get().length, '123');
    assert.equal('abcdefg123', ctx.get());
  });

  it('can remove from the beginning', function () {
    var ctx = new Ctx('abcdefg');
    ctx.remove(0, 2);
    assert.equal('cdefg', ctx.get());
  });

  it('can remove from the middle', function () {
    var ctx = new Ctx('abcdefg');
    ctx.remove(2, 3);
    assert.equal('abfg', ctx.get());
  });

  it('can remove from the end', function () {
    var ctx = new Ctx('abcdefg');
    ctx.remove(5, 2);
    assert.equal('abcde', ctx.get());
  });
})

function Ctx(text, fireEvents) {
  this.provides = { text: true };

  this.get = function () {
    // Replicate a sharejs bug where empty docs return undefined.
    return text == '' ? undefined : text;
  };

  this.insert = function (startPos, newText) {
    var before = text.substring(0, startPos);
    var after = text.substring(startPos);
    text = before + newText + after;
    fireEvents && this.onInsert && this.onInsert(startPos, newText);
  };

  this.remove = function (startPos, length) {
    var before = text.substring(0, startPos);
    var after = text.substring(startPos + length);
    text = before + after;
    fireEvents && this.onRemove && this.onRemove(startPos, length);
  };
}
