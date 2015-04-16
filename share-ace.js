(function () {
  'use strict';

  /**
   * @param editor - Ace Session instance
   * @param ctx - Share context
   */
  function shareAceEditor(editor, ctx, doc) {
    if (!ctx.provides.text) throw new Error('Cannot attach to non-text document');

    var suppress = false;
    var text = ctx.get() || ''; // Due to a bug in share - get() returns undefined for empty docs.
    editor.setValue(text);
    check();


    // *** helpers
    
    var newline = editor.getDocument().getNewLineCharacter();
    var newlineLength = newline.length;

    
    var countChar = function(lines) {
      
      var cnt = 0;
      for(var i = 0, l = lines.length; i < l; i++) {
        cnt += lines[i].length;
      }
      return cnt + lines.length*newlineLength;
    };

    var indexToPosition = function(index) {
      var line = '';
      for (var i = 0, l = editor.getLength(); i < l; i++) {
        line = editor.getLine(i);
        index -= line.length + newlineLength;
        if (index < 0)
          return {row: i, column: index + line.length + newlineLength};
      }
      return {row: l-1, column: line.length};
    };


    // *** remote -> local changes
/*    
    var cursors = {};
    var selections = {};
    
    var Range = ace.require('ace/range').Range;
    ctx.onCursor = function(msg) {
      console.log('blah:', msg)
      var r = msg.p.row;
      var c = msg.p.column;
      var u = msg.u;
      
      if(cursors[u])
        editor.removeMarker(cursors[u]);
      
      if(r >= 0 && c >= 0)
        cursors[u] = editor.addMarker(new Range(r,c,r,c+1),"bar", "text", false);
        
      console.log(cursors[u])
    }
    
    ctx.onSelection = function(msg) {
      console.log('blah:', msg)
      var sr = msg.p.start.row;
      var er = msg.p.end.row;
      var sc = msg.p.start.column;
      var ec = msg.p.end.column;
      var u = msg.u;
      
      if(selections[u])
        editor.removeMarker(selections[u]);
      
      if(sr >= 0 && sc >= 0)
        selections[u] = editor.addMarker(new Range(sr,sc,er,ec),"foo", "text", false);
        
      console.log(selections[u])
    }    
*/    
    
    ctx.onInsert = function (pos, text) {
      suppress = true
      var index = indexToPosition(pos);
      editor.insert(index, text);
      suppress = false;
      check();
    };

    ctx.onRemove = function (pos, length) {
      suppress = true;
      var range = { 
        start: indexToPosition(pos),
        end: indexToPosition(pos + length)
      }
      editor.remove(range);
      suppress = false;
      check();
    };

    // *** local -> remote changes
/*    
    var sel = editor.selection;
    sel.on('changeCursor', function() {
      
      console.log(JSON.stringify(sel.getCursor()))
      
      doc.connection.socket.send({
        a: 'cursor',
        d: doc.name,
        c: doc.collection,
        p: sel.getCursor()
      });
      
    });
    
    sel.on('changeSelection', function() {

      doc.connection.socket.send({
        a: 'selection',
        d: doc.name,
        c: doc.collection,
        p: sel.getRange()
      });

      
    });
*/
    editor.on('change', onLocalChange);

    function onLocalChange(change) {
      if (suppress) return;
      applyToShareJS(change);
      check();
    }

    editor.detachShareJsDoc = function () {
      ctx.onRemove = null;
      ctx.onInsert = null;
      editor.off('change', onLocalChange);
    }

    // Convert a CodeMirror change into an op understood by share.js
    function applyToShareJS(change) {
      
      //console.log(JSON.stringify(change));
      var data = change.data;
      var startPos = 0;

      if(data.range.start.row-1 >= 0)
        startPos = countChar(editor.getLines(0, data.range.start.row-1));
      startPos += (data.range.start.column);
      
      if(data.action==="insertText") {
        ctx.insert(startPos, data.text);
      } else if(data.action==="removeText") {
        ctx.remove(startPos, data.text.length); 
      } else if(data.action==="removeLines") {
        var cnt = 0;
        for(var i = 0, l = data.lines.length; i < l; i++)
          cnt += data.lines[i].length + newlineLength;
        ctx.remove(startPos, cnt); 
      } else if(data.action==="insertLines") {
        var text = "";
        for(var i = 0, l = data.lines.length; i < l; i++)
          text += data.lines[i] + newline;
        ctx.insert(startPos, text);
      } else {
        console.error('unknown action:' + change.action)
      }
    }

    function check() {
      setTimeout(function () {
        var cmText = editor.getValue();
        var otText = ctx.get() || '';

        if (cmText != otText) {
          console.error("Text does not match!");
          console.error("editor: " + cmText);
          console.error("ot: " + otText);
          // Replace the editor text with the ctx snapshot.
          suppress = true;
//          editor.setValue(ctx.get() || '');
//          editor.getUndoManager().reset();
          suppress = false;
        }
      }, 0);
    }

    return ctx;
  }

  if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
    // Node.js
    module.exports = shareAceEditor;
    module.exports.scriptsDir = __dirname;
  } else {
    if (typeof define === 'function' && define.amd) {
      // AMD
      define([], function () {
        return shareAceEditor;
      });
    } else {
      // Browser, no AMD
      window.sharejs.Doc.prototype.attachAceEditor = function (editor, ctx) {
        if (!ctx) ctx = this.createContext();
        shareAceEditor(editor, ctx, this);
      };
/*      
      // overwrite the sharejs _onMessage function to include our cursor methods
      // this will break if _onMessage inteface changes or is removed
      window.sharejs.Doc.prototype._onMessageOrig = window.sharejs.Doc.prototype._onMessage;
      window.sharejs.Doc.prototype._onMessage = function(msg) {
        if (!(msg.c === this.collection && msg.d === this.name)) {
          // This should never happen - its a sanity check for bugs in the connection code.
          throw new Error('Got message for wrong document. ' + this.collection + ' ' + this.name);
        }

        switch (msg.a) {
          case 'cursor':
            console.log('got cursor event:', msg);
            var contexts = this.editingContexts;
            for (var i = 0; i < contexts.length; i++) {
              var c = contexts[i];
              if (c.onCursor) c.onCursor(msg);
            }
            break;
          case 'selection':
            console.log('got selection event:', msg);
            var contexts = this.editingContexts;
            for (var i = 0; i < contexts.length; i++) {
              var c = contexts[i];
              if (c.onSelection) c.onSelection(msg);
            }
            break;
          default:
            this._onMessageOrig(msg);
            break;          
        }
      }
*/      
    }
  }
})();
