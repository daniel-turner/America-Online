var PORT = 8000;
var SOCKET_CONNECTION = "connection";
var SOCKET_USER_MESSAGE = "user message";
var SOCKET_USER_REGISTRATION = "user registration";
var SOCKET_USERLIST_UPDATE = "userlist update";
var SOCKET_USER_KICK = "kick";
var SOCKET_PRIVATE_MESSAGE = "pm";
var SERVER_USER = "admin";
var socketIO = require("socket.io");
var moment = require("moment");
var nicknames = {};
var SERVER_RATE_LIMIT = 10;
var SERVER_RATE_INTERVAL = 1000;
var SERVER_AUTOKICK_LIMIT = 3;
var rates = {};
var bans = {};

//listening for socket connections on port 8000
var server = socketIO.listen(PORT);

process.stdin.setEncoding('utf8');
process.stdin.on('data', function(chunk) {

  processServerCommands(chunk);
});

//handle connection events
server.sockets.on(SOCKET_CONNECTION, function(socket) {

  socket.on(SOCKET_USER_MESSAGE, function(message) {

    var limited = checkRateLimiter(socket);

    //broadcast this message to all connections
    if(!limited)  {

      socket.broadcast.emit(SOCKET_USER_MESSAGE, socket.nickname, message);
    }
  });

  socket.on(SOCKET_USER_REGISTRATION, function(nickname, callback) {

    if(getBannedUserByNickname(nickname)) {

      socket.disconnect(true);
    }

    if(getBannedUserByIP(socket.handshake.address)) {

      socket.disconnect(true);
    }

    if(nicknames.hasOwnProperty(nickname)) { //not available

      callback(false);

    } else { //available

      nicknames[nickname] = {
        nickname: nickname,
        rate_violations : 0
      };

      rates[nickname] = [];
      var nicknameList = Object.keys(nicknames).sort();
      // console.log(nicknameList);

      socket.nickname = nickname;

      socket.broadcast.emit(SOCKET_USER_MESSAGE,
                            SERVER_USER,
                            nickname + " has connected");
      server.emit(SOCKET_USERLIST_UPDATE, nicknameList);
      callback(true);
    }
  });

  socket.on(SOCKET_PRIVATE_MESSAGE, function(messagePackage) {

    var limited = checkRateLimiter(socket);

    if(!limited) {

      var target = getClientByNickname(messagePackage.target);

      if(target === null) {

        socket.emit(SOCKET_USER_MESSAGE, SERVER_USER, "Target of private message was not found");
        return;
      }

      target.emit(SOCKET_PRIVATE_MESSAGE, messagePackage);
    }
  });
});

function processServerCommands(chunk) {

  process.stdout.setEncoding('utf8');

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

      var socket = getClientByNickname(commandInput[1]);

      if(socket === null) {

        process.stdout.write("Could not find client to ban");
        return;
      }

      var reason = "no reason specified";

      if(commandInput.length > 2) {

        commandInput.splice(0,2);

        reason = commandInput.join(" ");
      }

      kickUser(socket, reason);
      break;

    case "/ban":

      if(commandInput.length < 2) {

        process.stdout.write("Must specify a username or ip address to ban");
        return;
      }

      banUser(commandInput);


      break;

    case "/unban":

      if(commandInput.length < 2) {

        process.stdout.write("Must specify a username or ip address to unban");
        return;
      }

      unbanUser(commandInput);

      return;

    default:

      process.stdout.write("Unrecognized command");
      break;
  };
};

function banUser(commandInput) {

  var ban = getBannedUserByNickname(commandInput[1]);

  if(ban === null) {

    ban = getBannedUserByIP(commandInput[1]);
  }

  if(ban !== null) {

    process.stdout.write("User already banned");
    return;
  }

  var client = getClientByNickname(commandInput[1]);

  if(client === null) {

    client = getBannedUserByIP(commandInput[1]);
  }

  if(client === null) {

    process.stdout.write("Could not locate client to ban");
    return;
  }

  var clientToBeKicked = getClientByIP(client.handshake.address);

  while(clientToBeKicked !== null) {

    server.emit(SOCKET_USER_MESSAGE, SERVER_USER, clientToBeKicked.nickname + " (" + clientToBeKicked.ipAddress + ") is now banned.");
    bans[clientToBeKicked.nickname] = {
      nickname:clientToBeKicked.nickname,
      ipAddress:clientToBeKicked.handshake.address
    };

    kickUser(clientToBeKicked, "banhammer");
    clientToBeKicked = getClientByIP(client.handshake.address);
  }
};

function unbanUser(commandInput) {

  var ban = getBannedUserByNickname(commandInput[1]);

  if(ban === null) {

    ban = getBannedUserByIP(commandInput[1]);
  }

  if(ban === null) {

    process.stdout.write("Could not find nickname/IP address on ban list");
    return;
  }

  while(ban !== null) {

    delete bans[ban.nickname];

    server.emit(SOCKET_USER_MESSAGE,
                SERVER_USER,
                ban.nickname + " has been removed from ban list");
    process.stdout.write(ban.nickname + " has been removed from ban list\n");

    ban = getBannedUserByIP(ban.ipAddress);
  }
}

function kickUser(client, reason) {

  client.emit(SOCKET_USER_KICK, {

    reason:reason
  });

  server.emit(SOCKET_USER_MESSAGE,
                        SERVER_USER,
                        client.nickname + " is being kicked.");

  var ip = client.handshake.address;
  var nickname = client.nickname;
  delete nicknames[nickname];
  delete rates[nickname];

  client.disconnect(true);

  process.stdout.write(nickname + " at " + ip + " has been kicked.");

};

function checkRateLimiter(socket, message) {

  var clientNickname = socket.nickname;

  var rateQueue = rates[clientNickname];

  // console.log(rateQueue);

  rateQueue.push(Date.now());

  while(rateQueue[0] + SERVER_RATE_INTERVAL < Date.now()) {

    rateQueue.shift();
    // console.log("popping queue");
  }

  if(rateQueue.length > SERVER_RATE_LIMIT) {

    server.emit(SOCKET_USER_MESSAGE, SERVER_USER, clientNickname +
                " has reached the allowed message limit");

    nicknames[clientNickname].rate_violations++;

    if(nicknames[clientNickname].rate_violations > SERVER_AUTOKICK_LIMIT) {

      kickUser(socket, "Too many violations of the message limit");
    }

    return true;
  }

  return false;
}

function getBannedUserByNickname(nickname) {

  if(bans.hasOwnProperty(nickname)) {

    return bans[nickname];
  }

  return null;

};

function getBannedUserByIP(ip) {

  var banList = Object.keys(bans);

  for(var i = 0; i < banList.length; i++) {

    if(bans[banList[i]].ipAddress === ip) {

      return bans[banList[i]];
    }
  }

  return null;

};

function getClientByNickname(nickname) {

  var namespace = server.of("/");
  var connections = namespace.connected;

  for(var index in connections) {

    if(connections[index].nickname === nickname) {

      return connections[index];
    }
  }

  return null;
};

function getClientByIP(ip) {

  var namespace = server.of("/");
  var connections = namespace.connected;

  for(var index in connections) {

    if(connections[index].handshake.address == ip) {

      return connections[index];
    }
  }

  return null;
}