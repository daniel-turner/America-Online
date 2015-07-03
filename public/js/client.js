(function() {
  var SERVER_ADDRESS = 'http://localhost:8000';
  var SOCKET_CONNECT = 'connect';
  var SOCKET_DISCONNECT = 'disconnect';
  var SOCKET_RECONNECTING = 'reconnecting';
  var SOCKET_RECONNECT = 'reconnect';
  var SOCKET_ERROR = 'error';
  var SOCKET_USER_MESSAGE = 'user message';
  var SYSTEM = 'System';
  var SOCKET_USER_REGISTRATION = "user registration";
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

  socket.on(SOCKET_USER_MESSAGE, function(from, userMessage) {

    message('anonymous', userMessage);
  });

  function message(from, message) {

    var newMessage = $('<p>');
    var fromTag = $('<b>', {
      html:from
    });
    var messageTag = $('<span>', {
      html:message
    });

    newMessage.append(fromTag);
    newMessage.append(messageTag);
    $('#chatlog').append(newMessage).get(0).scrollTop = 100000000;
  }

  $('#messageForm').submit(function() {
    var messageField = $('#message');
    var theMessage = messageField.val();
    //add message to chatlog
    message('me',theMessage);
    //send message to server
    socket.emit(SOCKET_USER_MESSAGE, theMessage);
    //clear message input field
    messageField.val('');

    return false;
  });

  $('#registration_form').submit(function() {

    var nickname = $('#nickname').val();
    //send nickname to server
    socket.emit(SOCKET_USER_REGISTRATION, nickname, function(available){

      //   console.log('available', available);
      // });
      //if nickname is available
      // goto chatroom
      if(available) {

        changeStateToChatRoom();

      } else {

        $('#nickname_error').text('Nickname is taken!');
      }
      // else show error


    });
    return false;
  });

  //manage state
  var registration = $('#registration');
  var chatroom = $('#chatroom');

  //default state
  //show registration
  //hide chatroom
  chatroom.hide();

  function changeStateToChatRoom() {

    chatroom.show();
    registration.hide();
  };
})();