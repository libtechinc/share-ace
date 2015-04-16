var http = require('http');
var Duplex = require('stream').Duplex;
var browserChannel = require('browserchannel').server;
var express = require('express');
var livedb = require('livedb');
var sharejs = require('share');
var shareAce = require('..');
var shareAceCursor = require('../lib/cursor');

var backend = livedb.client(livedb.memory());
var share = sharejs.server.createClient({backend: backend});

var app = express();
app.use(express.static(__dirname));
app.use(express.static(__dirname + '/ace-builds/src-noconflict'))
app.use(express.static(shareAce.scriptsDir));
app.use(express.static(sharejs.scriptsDir));


app.use(browserChannel(function (client) {
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

  
}));

var server = http.createServer(app);
server.listen(7007, function (err) {
  if (err) throw err;

  console.log('Listening on http://%s:%s', server.address().address, server.address().port);
});
