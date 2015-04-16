var shareAceCursor = require('./cursor');
var Duplex = require('stream').Duplex;


var server = function(share) {

return function (client) {
  var stream = new Duplex({objectMode: true});
  stream._write = function (chunk, encoding, callback) {
    if (client.state !== 'closed') {
      client.send(chunk);
    }
    callback();
  };
  stream._read = function () {
  };
  stream.headers = client.headers;
  stream.remoteAddress = stream.address;
  client.on('message', function (data) {
    if(shareAceCursor.isCursorOp(data)) {
      shareAceCursor.sendCursorOp(client, data);
      return;
    }
    stream.push(data);
  });
  stream.on('error', function (msg) {
    client.stop();
    shareAceCursor.removeCursorOp(client);
  });
  client.on('close', function (reason) {
    shareAceCursor.removeCursorOp(client);
    shareAceCursor.removeClient(client);
    stream.emit('close');
    stream.emit('end');
    stream.end();
  });

  var agent = share.listen(stream);
  shareAceCursor.addClient(client, agent);

};};

module.exports = exports = server;