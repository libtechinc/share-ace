(function () {
  'use strict';

  /**
   * This is a simplified implementation for cursor tracking. Cursor and selection
   * changes are emitted by the client and no transformations are done. The server
   * does not store client cursor data and just acts as a relay.
   * 
   * There will be synchronization issues (i.e. cursor lags behind update) during
   * typing since this is not integrated with the sharejs ops. When updates stop,
   * cursors should sychronize correctly.
   * 
   * Cursor CSS is stored in share-ace.css. 
   * 
   * @param editor - Ace Session instance
   * @param ctx - Share context
   * @param doc - Share doc
   */
  function shareAceEditorCursor(editor, ctx, doc) {
    if (!ctx.provides.text) throw new Error('Cannot attach to non-text document');

    var users = {};
    var nusers = 0;


    doc.connection.on('disconnected', function(e) {
      for(var u in users) {
        editor.removeMarker(users[u].cursor);
        editor.removeMarker(users[u].select);
      }
      users = {};
      nusers = 0;
    });

    // doesn't work as documented
    // doc.on('unsubscribe', function(e) {
    //   console.log('got unsubscribe event:', e)
    // });

    // *** remote -> local changes
    var Range = ace.require('ace/range').Range;
    ctx.onCursor = function(msg) {
      console.log('blah:', msg)
      var r = msg.p.row;
      var c = msg.p.column;
      var u = msg.u;
      
      if(users[u])
        editor.removeMarker(users[u].cursor);
      else {
        users[u] = {};
        users[u].n = nusers++;
      }
      
      if(r >= 0 && c >= 0)
        users[u].cursor = editor.addMarker(new Range(r,c,r,c+1),"ace-cursor-"+users[u].n%8, "text", false);
        
      console.log('cursor event' + nusers);
    }
    
    ctx.onSelection = function(msg) {
      console.log('blah:', msg)
      var sr = msg.p.start.row;
      var er = msg.p.end.row;
      var sc = msg.p.start.column;
      var ec = msg.p.end.column;
      var u = msg.u;
      
      if(users[u])
        editor.removeMarker(users[u].select);
      else {
        users[u] = {};
        users[u].n = nusers++;
      }
        
      if(sr >= 0 && sc >= 0)
        users[u].select = editor.addMarker(new Range(sr,sc,er,ec),"ace-select-"+users[u].n%8, "select-text", false);
        
      console.log('selection event' + nusers);
    }    
    
    
    // *** local -> remote changes
    
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


    return ctx;
  }

  if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
    // Node.js
    module.exports = shareAceEditorCursor;
    module.exports.scriptsDir = __dirname;
  } else {
    if (typeof define === 'function' && define.amd) {
      // AMD
      define([], function () {
        return shareAceEditorCursor;
      });
    } else {
      // Browser, no AMD
      window.sharejs.Doc.prototype.attachAceEditorCursor = function (editor, ctx) {
        if (!ctx) ctx = this.createContext();
        shareAceEditorCursor(editor, ctx, this);
      };
      
      // overwrite the sharejs _onMessage function to include custom cursor messages
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
    }
  }
})();
