(function() {
  var SERVER_ADDRESS = "http://localhost:8000";
  var SOCKET_CONNECT = "connect";
  var SOCKET_DISCONNECT = "disconnect";
  var SOCKET_RECONNECTING = "reconnecting";
  var SOCKET_RECONNECT = "reconnect";
  var SOCKET_ERROR = "error";
  var SOCKET_USER_MESSAGE = "user message";
  var SOCKET_USER_MENTION = "mention";
  var SOCKET_USER_KICK = "kick";
  var SYSTEM = "System";
  var SERVER_USER = "admin";
  var SOCKET_USER_REGISTRATION = "user registration";
  var SOCKET_USERLIST_UPDATE = "userlist update";
  var SOCKET_PRIVATE_MESSAGE = "pm";
  var myNickname = "";

  //manage state
  //show registration
  //default state
  var registration = $('#registration');
  var chatroom = $('#chatroom');

  //hide chatroom
  chatroom.hide();
  // connectedUsersContainer.hide();

  var socket = io.connect(SERVER_ADDRESS);

  socket.on(SOCKET_CONNECT, function() {
    message(SYSTEM, 'Connected to ' + SERVER_ADDRESS);
  });
  socket.on(SOCKET_DISCONNECT, function() {
    message(SYSTEM, 'Disconnected from ' + SERVER_ADDRESS);
  });
  socket.on(SOCKET_RECONNECTING, function() {
    message(SYSTEM, 'Attempting to reconnect to ' + SERVER_ADDRESS);
  });
  socket.on(SOCKET_RECONNECT, function() {
    message(SYSTEM, 'Reconnected to ' + SERVER_ADDRESS);
  });
  socket.on(SOCKET_ERROR, function() {

    if(err !== undefined) {

      message(SYSTEM,err);

    } else {

      message(SYSTEM, 'An unknown error occurred');
    }
  });

  socket.on(SOCKET_USER_KICK, function(reason) {

    message(SERVER_USER, "Contemplate your sin: " + reason.reason);

    $('#registration_error').text("You have been kicked. Reason: " + reason.reason);
    changeStateToRegistration();
  });

  socket.on(SOCKET_PRIVATE_MESSAGE, function(messagePackage) {

    var sender = "Private message from " + messagePackage.sender;

    message(sender, messagePackage.message);
  });

  socket.on(SOCKET_USER_MESSAGE, function(from, userMessage) {

    message(from, userMessage);
  });

  socket.on(SOCKET_USERLIST_UPDATE, function(userList) {

    connectedUsersUpdate(userList);

  });

  function message(from, message) {

    from = moment().format("h:mm:ss a") + " : " + from + " : ";

    var formattedNickname = $("<span>", {

      text: " " + myNickname + " ",
      class: "mention"
    });

    var mentionedMessage = message.replace(" " + myNickname + " ", formattedNickname.get(0).outerHTML);

    var fromTag = $('<b>', {
        html:from
    });
    var newMessage = $('<p>');

    if(message !== mentionedMessage) {

      fromTag.addClass("fromMention");

    }

    var messageTag = $('<span>', {
      html:mentionedMessage
    });

    newMessage.append(fromTag);
    newMessage.append(messageTag);

    // console.log(newMessage);

    $('#chatlog').append(newMessage).get(0).scrollTop = 100000000;
  };

  function connectedUsersUpdate(connectedUsers) {

    var list = $("#userList");
    list.empty();
    var listItem;

    connectedUsers.forEach(function(user) {

      listItem = document.createElement("li");
      listItem.innerHTML = user;
      list.append(listItem);
    });
  };

  $('#messageForm').submit(function() {
    var messageField = $('#message');
    var theMessage = messageField.val();

    theMessage = processClientCommands(theMessage);

    if(theMessage !== null) {
      //add message to chatlog
      message(myNickname,theMessage);
      //send message to server
      socket.emit(SOCKET_USER_MESSAGE, theMessage);
    }
    //clear message input field
    messageField.val('');

    return false;
  });

  $('#registration_form').submit(function() {

    var nickname = $('#nickname').val();
    //send nickname to server
    socket.emit(SOCKET_USER_REGISTRATION, nickname, function(available){

      //if nickname is available
      // goto chatroom
      if(available) {

        changeStateToChatRoom();
        myNickname = nickname;

      } else {// else show error

        $('#registration_error').text('Nickname is taken!');
      }

    });
    return false;
  });

  function processClientCommands(message) {

    var commandInput = message.split(" ");

    if(commandInput.length < 1) {

      return message;
    }

    switch(commandInput[0]) {

      case "/pm":

        if(commandInput.length < 2) {

          $('#chatlog').append("Recipient of private message is unspecified").get(0).scrollTop = 100000000;
          return null;
        }

        var target;

        if(commandInput.length < 3) {

          theMessage = "";
          target = commandInput[1];

        } else {

          target = commandInput[1];
          commandInput.splice(0,2);
          theMessage = commandInput.join(" ");
        }

        socket.emit(SOCKET_PRIVATE_MESSAGE, {

          target: target,
          sender: myNickname,
          message: theMessage
        });

        var from = "Private Message To: " + target;

        message(from, theMessage);
        return null;
        break;

      default:
        return message;
    }

    return message;
  };

  function changeStateToChatRoom() {

    chatroom.show();
    // connectedUsersContainer.show();
    registration.hide();
  };

  function changeStateToRegistration() {

    chatroom.hide();
    registration.show();
  };
})();