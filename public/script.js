var $window = $(window);
var $usernameInput = $('.usernameInput'); // Input for username ---> possibly not necessary
var $messages = $('.messages'); // Messages area
var $inputMessage = $('.inputMessage') // Input message input box

var $loginPage = $('.login.page');
var $chatPage = $('.chat.page'); 
var $purgatoryPage = $('.purgatory.page');



var socket = io();
var userName = "";

// check if user is in the lobby i.e. check if user successfuly logged in
var insideLobby = false;

window.onkeypress = function(event) {
    if (event.keyCode == 13) {
        sendMessage();
    }
}

//each user will get random color
  var COLORS = [
    '#e21400', '#91580f', '#f8a700', '#f78b00',
    '#58dc00', '#287b00', '#a8f07a', '#4ae8c4',
    '#3b88eb', '#3824aa', '#a700ff', '#d300e7'
  ];


function login() {
    $loginPage.fadeOut();
    $purgatoryPage.show();
    $loginPage.off('click');
    
    nameInput(1);
}
function showChatPage() {
    $purgatoryPage.fadeOut();
    $chatPage.show();
}

// get message from input area
// send message
function sendMessage() {
    var message = $inputMessage.val();
    if (message && insideLobby) {
        $inputMessage.val('');
        socket.emit('newMessage', message, userName)
    }
}

//ger random color for username
function getUsernameColor (username) {
    // Compute hash code
    var hash = 7;
    for (var i = 0; i < username.length; i++) {
       hash = username.charCodeAt(i) + (hash << 5) - hash;
    }
    // Calculate color
    var index = Math.abs(hash % COLORS.length);
    return COLORS[index];
}

function handleMessage(data, name){
    var name = name + ": ";
    var $usernameDiv = $('<span class="messageBody">').text(name).css('color', getUsernameColor(name));
    var $messageBodyDiv = $('<span class="messageBody">').text(data);
    
    var $messageDiv = $('<li class="message"/>').data('username: ', name).append($usernameDiv, $messageBodyDiv);
    
    addMessageElement($messageDiv);
};

function addMessageElement(element){
    var $element = $(element);
    $messages.append($element);
}

socket.on('notifyLobby', function(user){
    alertify.set('notifier', 'position', 'top-right');
    alertify.success(user + ' entered Lobby');
});
socket.on('usernameTaken', function(user){
    nameInput(2);
});
socket.on('notifySocket', function(user){
    insideLobby = true;
    alertify.set('notifier', 'position', 'top-right');
    alertify.success('Welcome ' + user);
    showChatPage();
});
socket.on('newMessage', function(data, name){
    if (data && insideLobby) {
        console.log('recived ' + data + ' from ' + name);
        handleMessage(data, name);
    }
});
// worst function ever writen
function nameInput(num) {
    if (num == 1) {
        alertify.prompt("Please introduce yourself", "name",
            function(evt, value ){
                userName = value;
                alertify.set('notifier', 'position', 'top-right');
                socket.emit('enterLobby', userName);
                
        },
        function(){
            alertify.error('Access Denied');
        }).set('labels', {ok:'Enter Lobby'});
    }
    else {
        alertify.prompt("Username already taken. Please choose another one", "name",
            function(evt, value ){
                userName = value;
                alertify.set('notifier', 'position', 'top-right');
                socket.emit('enterLobby', userName);
                
        },
        function(){
            alertify.error('Access Denied');
        }).set('labels', {ok:'Enter Lobby'});
    }
}