var PORT = 8000;
var SOCKET_CONNECTION = "connection";
var SOCKET_USER_MESSAGE = "user message";
var SOCKET_USER_REGISTRATION = "user registration";
var SOCKET_USERLIST_UPDATE = "userlist update";
var SOCKET_USER_KICK = "kick";
var SERVER_USER = "admin";
var socketIO = require("socket.io");
var moment = require("moment");
var nicknames = {};

function processServerCommands(chunk) {

  var namespace = server.of("/");
  process.stdout.setEncoding('utf8');

  // console.log(namespace.connected);

  var connections = namespace.connected;

  var commandInput = chunk.substring(0,chunk.length-1).split(" ");

  if(commandInput.length < 1) {

    process.stdout.write("Could not process admin input");
    return;
  }

  switch (commandInput[0]) {

    case "/kick":

      if(commandInput.length < 2) {

        process.stdout.write("Must specify a user to kick");
        return;
      }

      if(!nicknames.hasOwnProperty(commandInput[1])) {

        process.stdout.write("Unrecognized user");
        return;
      }

      for(var id in connections) {

        if(connections[id].nickname === commandInput[1]) {

          var reason = null;

          if(commandInput.length > 2) {

            commandInput.splice(0,2);

            reason = commandInput.join(" ");
          }

          connections[id].emit(SOCKET_USER_KICK, {

            reason:reason
          });

          server.emit(SOCKET_USER_MESSAGE,
                                SERVER_USER,
                                commandInput[1] + " is being kicked.");

          var ip = connections[id].handshake.address;
          var nickname = connections[id].nickname;

          connections[id].disconnect(true);

          process.stdout.write(nickname + " at " + ip + " has been kicked.");

          return;
        }
      }

      process.stdout.write("Could not find user to kick");
      break;

    default:

      process.stdout.write("Unrecognized command");
      break;
  };
};

//listening for socket connections on port 8000
var server = socketIO.listen(PORT);

process.stdin.setEncoding('utf8');
process.stdin.on('data', function(chunk) {

  processServerCommands(chunk);
});

//handle connection events
server.sockets.on(SOCKET_CONNECTION, function(socket) {

  socket.on(SOCKET_USER_MESSAGE, function(message) {

    // var timeStamp = moment().format("h:mm:ss a");

    //broadcast this message to all connections
    socket.broadcast.emit(SOCKET_USER_MESSAGE, socket.nickname, message);
  });

  socket.on(SOCKET_USER_REGISTRATION, function(nickname,callback) {

    if(nicknames.hasOwnProperty(nickname)) { //not available

      callback(false);

    } else { //available

      nicknames[nickname] = nickname;
      var nicknameList = Object.keys(nicknames).sort();
      console.log(nicknameList);

      socket.nickname = nickname;

      socket.broadcast.emit(SOCKET_USER_MESSAGE, SERVER_USER, nickname + " has connected");
      server.emit(SOCKET_USERLIST_UPDATE, nicknameList);
      callback(true);
    }
  });
});


