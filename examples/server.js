var http = require('http');
var browserChannel = require('browserchannel').server;
var express = require('express');
var livedb = require('livedb');
var sharejs = require('share');
var shareAce = require('..');
var shareAceBc = require('../lib/bc');

var backend = livedb.client(livedb.memory());
var share = sharejs.server.createClient({backend: backend});

var app = express();
app.use(express.static(__dirname));
app.use(express.static(__dirname + '/ace-builds/src-noconflict'))
app.use(express.static(shareAce.scriptsDir));
app.use(express.static(sharejs.scriptsDir));

app.use(browserChannel(shareAceBc(share)));

var server = http.createServer(app);
server.listen(7007, function (err) {
  if (err) throw err;

  console.log('Listening on http://%s:%s', server.address().address, server.address().port);
});
