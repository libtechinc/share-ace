
var clientList = {};
var agentList = {};


var addClient = function(client, agent) {
  clientList[client.id] = client;
  agentList[client.id] = agent;
};

var removeClient = function(client) {
  delete clientList[client.id];
  delete agentList[client.id];
};

var isCursorOp = function(data) {
  if(data['a'] && (data['a'] === 'cursor' || data['a'] === 'selection')) {
    return true;
  }
  return false;
};

var sendCursorOp = function(client, data) {
  for (var k in clientList) {
    if(client.id !== clientList[k].id) {
      if(agentList[k].session._isSubscribed(data.c, data.d)) {
        data.u = client.id;
        clientList[k].send(data);
      }
    }
  };
};

var removeCursorOp = function(client) {
  var session = agentList[client.id].session;
  for (var c in session.collections) {
    for (var d in session.collections[c]) {
      sendCursorOp(client, { a: 'cursor', c: c, d: d, p: {row: -1, column: -1}, u: client.id})
      sendCursorOp(client, { a: 'selection', c: c, d: d, p: {start: {row: -1, column: -1}, end: {row: -1, column: -1}}, u: client.id})
    }
  }
};


/*
 * Exports
 */
exports.addClient = addClient;
exports.removeClient = removeClient;
exports.sendCursorOp = sendCursorOp;
exports.removeCursorOp = removeCursorOp;
exports.isCursorOp = isCursorOp;

module.exports = exports;