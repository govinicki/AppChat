/* TASKS:
            1. Handle user connections to server
                -> store user name
                -> don't allow equal usernames
                
                
*/



var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var uuid = require('node-uuid');

//var Room = require('./room.js'); Do the users first


var allNames = [''];



app.use('/static', express.static('public'));
app.use('/static', express.static('node_modules'));
app.get('/', function(req,res){
    res.sendFile('/dev/TEST/FinalProject/index.html');
});


io.sockets.on('connection', function(socket){
    console.log('new client connected to the server');
    
    socket.on('enterLobby', function(user){
        if(allNames.includes(user)){
            socket.emit('usernameTaken', user);
        }
        else {
        allNames.push(user);
        console.log(user + ' entered lobby');
        socket.emit('notifySocket', user); // Username is OK, notify user that he is in the Lobby
        socket.broadcast.emit('notifyLobby', user); // Notify everybody that new user joined
        }
    });
    
    socket.on('newMessage', function(data, name){
        socket.broadcast.emit('newMessage', data,name);
    });
    
});





http.listen(3000, function(){
    console.log('listening on *:3000');
    console.log ('       CTRL + C    ---->     http://localhost:3000');
});