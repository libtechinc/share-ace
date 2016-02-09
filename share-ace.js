(function() {
	'use strict';

	/**
	 * @param editor -
	 *            Ace Session instance
	 * @param ctx -
	 *            Share context
	 */
	function shareAceEditor(editor, ctx) {
		if (!ctx.provides.text)
			throw new Error('Cannot attach to non-text document');

		var suppress = false;
		var text = ctx.get() || ''; // Due to a bug in share - get() returns
									// undefined for empty docs.
		editor.setValue(text);
		check();

		// *** helpers

		var newline = editor.getDocument().getNewLineCharacter();
		var newlineLength = newline.length;

		var countChar = function(lines) {

			var cnt = 0;
			for (var i = 0, l = lines.length; i < l; i++) {
				cnt += lines[i].length;
			}
			return cnt + lines.length * newlineLength;
		};

		var indexToPosition = function(index) {
			var line = '';
			for (var i = 0, l = editor.getLength(); i < l; i++) {
				line = editor.getLine(i);
				index -= line.length + newlineLength;
				if (index < 0)
					return {
						row : i,
						column : index + line.length + newlineLength
					};
			}
			return {
				row : l - 1,
				column : line.length
			};
		};

		// *** remote -> local changes

		ctx.onInsert = function(pos, text) {
			suppress = true
			var index = indexToPosition(pos);
			editor.insert(index, text);
			suppress = false;
			check();
		};

		ctx.onRemove = function(pos, length) {
			suppress = true;
			var range = {
				start : indexToPosition(pos),
				end : indexToPosition(pos + length)
			}
			editor.remove(range);
			suppress = false;
			check();
		};

		// *** local -> remote changes

		editor.on('change', onLocalChange);

		function onLocalChange(change) {
			if (suppress)
				return;
			applyToShareJS(change);
			check();
		}

		editor.detachShareJsDoc = function() {
			ctx.onRemove = null;
			ctx.onInsert = null;
			editor.off('change', onLocalChange);
		}

		// Convert a CodeMirror change into an op understood by share.js
		function applyToShareJS(data) {

			// console.log(JSON.stringify(change));
			var startPos = 0;

			if (data.start.row - 1 >= 0)
				startPos = countChar(editor.getLines(0, data.start.row - 1));
			startPos += (data.start.column);

			if (data.action === "insert") {
				var text = "";
				for (var i = 0, l = data.lines.length; i < l; i++)
					text += data.lines[i] + (i < l - 1 ? newline : '');
				ctx.insert(startPos, text);
			} else if (data.action === "remove") {
				var cnt = 0;
				for (var i = 0, l = data.lines.length; i < l; i++)
					cnt += data.lines[i].length + (i < l - 1 ? newlineLength : 0);
				ctx.remove(startPos, cnt);
			} else {
				console.error('unknown action:' + data.action)
			}
		}

		function check() {
			setTimeout(function() {
				var cmText = editor.getValue();
				var otText = ctx.get() || '';

				if (cmText != otText) {
					console.error("Text does not match!");
					console.error("editor: " + cmText);
					console.error("ot: " + otText);
					// Replace the editor text with the ctx snapshot.
					suppress = true;
					// editor.setValue(ctx.get() || '');
					// editor.getUndoManager().reset();
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
			define([], function() {
				return shareAceEditor;
			});
		} else {
			// Browser, no AMD
			window.sharejs.Doc.prototype.attachAceEditor = function(editor, ctx) {
				if (!ctx)
					ctx = this.createContext();
				shareAceEditor(editor, ctx);
			};
		}
	}
})();
