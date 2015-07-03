var PORT = 8000;
var SOCKET_CONNECTION = 'connection';
var SOCKET_USER_MESSAGE = 'user message';
var SOCKET_USER_REGISTRATION = 'user registration';
var SERVER_USER = 'The Server';
var socketIO = require('socket.io');
//listening for socket connections on port 8000
var server = socketIO.listen(PORT);
var nicknames = {};


//handle connection events
server.sockets.on(SOCKET_CONNECTION, function(socket) {

  socket.on(SOCKET_USER_MESSAGE, function(message) {

    //broadcast this message to all connections
    socket.broadcast.emit(SOCKET_USER_MESSAGE, socket.nickname, message);
  });

  socket.on(SOCKET_USER_REGISTRATION, function(nickname,callback) {
    if(nicknames.hasOwnProperty(nickname)) {

      //not available

      callback(false);

    } else {

      nicknames[nickname] = nickname;

      socket.nickname = nickname;

      socket.broadcast.emit(SOCKET_USER_MESSAGE, SERVER_USER, nickname + " has connected");

      callback(true);
    }
  });
});
