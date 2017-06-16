

var $window = $(window);
var $usernameInput = $('.usernameInput'); // Input for username ---> possibly not necessary
var $messages = $('.messages'); // Messages area
var $inputMessage = $('.inputMessage') // Input message input box
var $messageDiv = $('.message.div');  // message input div

var $loginPage = $('.login.page');
var $chatPage = $('.chat.page'); 
var $purgatoryPage = $('.purgatory.page');
var $roomPage = $('.room.page');
var $availableRooms = $('.available.rooms');

var ICE_SERVERS = [{url:"stun:stun.l.google.com:19302"}];

var socket = io();
var userName = "";
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

var peerMediaElements = {} // keep track of <video> tags, indexed by peer_id
var peers = {};            // keep track of our peer connections, indexed by peerId(socket.id)
var local_media_stream = null;
var USE_AUDIO = true;
var USE_VIDEO = true;
var MUTE_AUDIO_BY_DEFAULT = false;

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
        socket.emit('newMessage', message, userName);
        handleMessage(message, userName);
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
    $messages[0].scrollTop = $messages[0].scrollHeight;
}

socket.on('toRoom', function(room){
    $chatPage.fadeOut();
    $roomPage.show();
    
    //adding room name to room
    var roomName = room.name;
    $('.room.page').prepend('<h1> Room: ' + roomName + '</h1>');
    
    startVideo(room);
});

socket.on('getRoomID', function(id){
    myRoomId = id; 
    console.log(myRoomId);
});

socket.on('doubleCheckDestroy', function(room){
    if(confirm('Destroy room ' + room.name + '?') == true) {
        socket.emit('Destroy', room);
        $roomPage.fadeOut();
        $chatPage.show();
    }
});
socket.on('noAuthority', function(owner){
    alert('Only room owner ' + owner + ' can destroy this room'); 
});
socket.on('notifyLobby', function(user){
    alertify.set('notifier', 'position', 'top-left');
    alertify.success(user + ' entered Lobby');
});
socket.on('usernameTaken', function(user){
    nameInput(2);
});
socket.on('nameTaken', function(type,name){
    if(!alertify.errorAlert){
  //define a new errorAlert base on alert
  alertify.dialog('errorAlert',function factory(){
    return{
            build:function(){
                var errorHeader = '<span class="fa fa-times-circle fa-2x" '
                +    'style="vertical-align:middle;color:#e10000;">'
                + '</span> Application Error';
                this.setHeader(errorHeader);
            }
        };
    },true,'alert');
}
    alertify.errorAlert('There is already ' + type + ' with name: ' + name);
})
socket.on('notifySocket', function(user){
    insideLobby = true;
    alertify.set('notifier', 'position', 'top-left');
    alertify.success('Welcome ' + user);
    showChatPage();
});
socket.on('newMessage', function(data, name){
    if (data && insideLobby) {
        console.log('recived ' + data + ' from ' + name);
        handleMessage(data, name);
    }
});
socket.on('Error', function(message){
   alert(message); 
});
var rooms_i_know_about = [];

socket.on('roomAdded', function(room){
    var roomName = room.name;
    if (rooms_i_know_about.includes(roomName)){
        return;
    }
    else {;
        rooms_i_know_about.push(roomName);
        $('.roomList').append('<li>' + roomName + '</li>');
    }
    alertify.set('notifier', 'position', 'top-left');
    alertify.notify('New room created', 'custom', 2, function(){console.log('dismissed');});
});

// worst function ever writen
function nameInput(num) {
    if (num == 1) {
        alertify.prompt("Please introduce yourself", "name",
            function(evt, value ){
                userName = value;
                alertify.set('notifier', 'position', 'top-left');
                socket.emit('enterLobby', userName);
                
        },
        function(){
            alertify.set('notifier', 'position', 'top-left');
            alertify.error('Access Denied');
        }).set('labels', {ok:'Enter Lobby'}).setHeader('AppChat');
    }
    else {
        alertify.prompt("Username already taken. Please choose another one", "name",
            function(evt, value ){
                userName = value;
                alertify.set('notifier', 'position', 'top-left');
                socket.emit('enterLobby', userName);
                
        },
        function(){
            alertify.error('Access Denied');
        }).set('labels', {ok:'Enter Lobby'}).set({transition:'flipy'});
    }
}


function createRoom() {
    var name = "";
     alertify.prompt("Name Room", "room1",
            function(evt, value ){
                name = value;
                alertify.set('notifier', 'position', 'top-left');
                socket.emit('createRoom', name);
                
        },
        function(){
            alertify.error('Error creating room');
        }).set('labels', {ok:'Create Room'}).setHeader('AppChat');
}
function goToMyRoom() {
    alert('not implemented');
}
function joinRoom(){
    var roomName = prompt('Confirm room name:');
    socket.emit('joinRoom', roomName);
}

function leaveRoom() {
    var roomId = myRoomId;
    socket.emit('leaveRoom', roomId);
    $roomPage.fadeOut();
    $chatPage.show();
    myRoomId = null;
    local_media_stream.getTracks().forEach(track => track.stop());
}
function destroyRoom(){
    var roomId = myRoomId;
    socket.emit('destroyRoom', roomId);
}



socket.on('newClientInRoom', function(data){
   console.log(data); 
});
socket.on('notifyRoomRemoving', function(name){
    var roomId = myRoomId;
    alert('Room ' + name + ' removed');
    socket.emit('onRoomRemoving', roomId);
    $roomPage.fadeOut();
    $chatPage.show();
});
socket.on('leaveRoom', function(room){
    $roomPage.fadeOut();
    $chatPage.show();
});
socket.on('invalidRoomName', function(roomName){
    alert(roomName + " doesn't exist");
});

function startVideo(room) {
    console.log('Inside room, starting communication');
    var roomId = room.id;
    var peerId = socket.id
    
    setup_local_media(function(){
        join_chat_channel(roomId, peerId);
    });
    
    function join_chat_channel(roomId, peerId){
        socket.emit('videoRoom', {'roomID': roomId, 'peerId': peerId});
    }
    
    
    
    socket.on('addPeer', function(config){
        console.log('Server said to add peer: ', config);
        var peerId = config.peerId;
        
         var peerConnection = new RTCPeerConnection(
                        {"iceServers": ICE_SERVERS},
                        {"optional": [{"DtlsSrtpKeyAgreement": true}]})
             
        peers[peerId] = peerConnection;
        
        peerConnection.onicecandidate = function(event) {
            if (event.candidate) {
                socket.emit('passIceCandidate', {'peerId': peerId, 'iceCandidate': {'sdpMLineIndex': event.candidate.sdpMLineIndex, 'candidate': event.candidate.candidate}});
            }
        }
        
        peerConnection.onaddstream = function(event) {
            console.log("onAddStream", event);
            var remote_media = USE_VIDEO ? $("<video>") : $("<audio>");
            remote_media.attr("autoplay", "autoplay");
            if (MUTE_AUDIO_BY_DEFAULT) {
                remote_media.attr("muted", "true");
            }
            remote_media.attr("controls", "");
            remote_media.attr("width", "320");
            remote_media.attr("height", "240");
            peerMediaElements[peerId] = remote_media;
            $('.videos').append(remote_media);
            attachMediaStream(remote_media[0], event.stream);
        }
        
        peerConnection.addStream(local_media_stream);
        
        
        if (config.createOffer) {
            peerConnection.createOffer(function (local_description) {
                peerConnection.setLocalDescription(local_description, function() {
                    socket.emit('passSessionDescription', {'peerId': peerId, 'sesionDescription': local_description});
                },
                function() {Alert("Offer setLocalDescription failed!"); }
            );
            },
            function (error) {
                console.log('Error sending offer: ', error);
            });
        }
    });
    
    
        socket.on('sessionDescription', function(config){
            var peerId = config.peerId;
            var peer = peers[peerId];
            var remoteDescription = config.sessionDescription;
            
            
            var desc = new RTCSessionDescription(remoteDescription);
            var stuff = peer.setRemoteDescription(desc, function() {
                if (remoteDescription.type == "offer") {
                    peer.createAnswer(function(localDescription){
                        peer.setLocalDescription(localDescription, function(){
                            socket.emit('passSessionDescription', {'peerId': peerId, 'sesionDescription':localDescription});
                        }, function() {Alert("Answer setLocalDescription failed"); }
                    );
                    }, function(error){
                        console.log('Error creating answer: ', error);
                        console.log(peer);
                    });
                }
            }, function(error) {
                console.log('setRemoteDescription eror: ', error);
            });
        });
        
        
        socket.on('iceCandidate', function(config){
            var peer = peers[config.peerId];
            var iceCandidate = config.iceCandidate;
            peer.addIceCandidate(new RTCIceCandidate(iceCandidate));
        });
  
}

function setup_local_media(callback, errorback) {
                if (local_media_stream != null) {  
                    if (callback) callback();
                    return; 
                }
                console.log("Requesting access to local audio / video inputs");


                navigator.getUserMedia = ( navigator.getUserMedia ||
                       navigator.webkitGetUserMedia ||
                       navigator.mozGetUserMedia ||
                       navigator.msGetUserMedia);

                /*attachMediaStream = function(element, stream) {
                    console.log('DEPRECATED, attachMediaStream will soon be removed.');
                    element.srcObject = stream;
                 };*/

                navigator.getUserMedia({"audio":USE_AUDIO, "video":USE_VIDEO},
                    function(stream) { 
                        console.log("Access granted to audio/video");
                        local_media_stream = stream;
                        var local_media = USE_VIDEO ? $("<video>") : $("<audio>");
                        local_media.attr("autoplay", "autoplay");
                        local_media.attr("muted", "true"); 
                        local_media.attr("controls", "");
                        local_media.attr("width", "320");
                        local_media.attr("height", "240");
                        $('.videos').append(local_media);
                        attachMediaStream(local_media[0], stream);

                        if (callback) callback();
                    },
                    function() { 
                        console.log("Access denied for audio/video");
                        alert("You chose not to provide access to the camera/microphone, demo will not work.");
                        if (errorback) errorback();
                    });
            }   

var attachMediaStream = function(element, stream) {
    element.srcObject = stream;
}










