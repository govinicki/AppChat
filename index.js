
var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var uuid = require('node-uuid');
var Room = require('./room.js');

var people = {}; // OBJECT FOR DESCRIBING PEOPLE CONNECTED TO THE SERVER
var clients = []; // ARRAY FOR ALL SOCKETS CONNECTED TO THE SERVER
var rooms = {}; 

var roomSelector = {};

var allNames_client = [''];
var allNames_room = [''];

var socket_in_room = {};
var allSockets = {};


app.use('/static', express.static('public'));
app.use('/static', express.static('node_modules'));
app.get('/', function(req,res){
    res.sendFile('/dev/TEST/FinalProject/index.html');
});


io.sockets.on('connection', function(socket){
    console.log('new client connected to the server');
    
    socket.on('enterLobby', function(user){
        roomID = null; // ROOM NOT CREATED SO IT'S CURRENTLY NULL
        if(allNames_client.includes(user)){
            socket.emit('usernameTaken', user);
        }
        else {
        allNames_client.push(user);
        people[socket.id] = {"name":user, "room":roomID} // POPULATE THE PEOPLE OBJECT
        clients.push(socket); // POPULATE CLIENTS ARRAY
        console.log(user + ' entered lobby');
        socket.emit('notifySocket', user); // Username is OK, notify user that he is in the Lobby
        socket.broadcast.emit('notifyLobby', user); // Notify everybody that new user joined
        }
        
        var allSockets = clients.length;
        for (id in rooms){
            for(var i=0; i<allSockets; i++){
                var reciver = clients[i];
                var room = rooms[id];
                reciver.emit('roomAdded', room);
            }
        }
        
    });
    
    socket.on('newMessage', function(data, name){
        socket.broadcast.emit('newMessage', data,name);
    });
    
    socket.on('createRoom', function(name){
        if(allNames_room.includes(name)){
            socket.emit('nameTaken', "room", name);
        }
        else {
            allNames_room.push(name);
            if (people[socket.id].room === null){
                var id = uuid.v4();            
                var room = new Room(name, id, socket.id);  
                rooms[id] = room; // POPULATE THE ROOM OBJECT
                socket.room = name //add property "room" to socket object, and set it to 'name'
                socket.join(socket.room);  //subscribe room creator socket(user) to that room
                people[socket.id].room = id //update the room attribute in people object with room id
                                    //when done room != null, so no more room can be created by that user
                roomSelector[name] = {"uuid": id};
                socket.emit('getRoomID', id);
                //socket.emit('toRoom', room.name);
                people[socket.id].inroom = id;
            }
            else {
                socket.emit('Error', "You have already created one room");
            }
        }
        var allSockets = clients.length;
        
        for (var i=0; i<allSockets; i++){
            var reciver = clients[i];
            reciver.emit('roomAdded', room);
        }
    });
    
    socket.on('joinRoom', function(roomName){
        if (allNames_room.indexOf(roomName) == -1){
            socket.emit('invalidRoomName', roomName);
        }
        else {
            var id = roomSelector[roomName].uuid;
            var room = rooms[id];
            allSockets[socket.id] = socket;
            
            if (socket.id === room.owner){
                socket.emit('toRoom', room);
            }
            
            else {
                // addPerson is method built in Room object
                room.addPerson(socket.id);
                people[socket.id].inroom = id; //add atribute to people that indicates in wich room they are
                socket.room = room.name;
                socket.join(socket.room); //subscribe socket to the room
                user = people[socket.id];
                socket.emit('getRoomID', id);
                socket.emit('toRoom', room);
            }
        }
    });
    
    socket.on('leaveRoom', function(roomId){
        var room = rooms[roomId];
        if (socket.id === room.owner){
            socket.emit('leaveRoom', room);
        }
        else {
            room.removePerson(socket.id);
            socket.leave(socket.room);
            delete socket.room
            delete people[socket.id].inroom;
        }
    });
    
    socket.on('destroyRoom', function(roomId){
        var room = rooms[roomId];
        if (socket.id === room.owner){
            socket.emit('doubleCheckDestroy', room);
        }
        else {
            socket.emit('noAuthority', room.owner);
        }
        socket.on('Destroy', function(data){
            //notify everybody that the room is to be removed
            io.local.emit('notifyRoomRemoving', data.name);
            
            socket.on('onRoomRemoving', function(id){
                if (id === roomId){
                    // this socket in room
                    room.removePerson(socket.id);
                    socket.leave(socket.room);
                    delete socket.room
                    delete people[socket.id].inroom;
                }
            });
            
            //unsubscribe socket from room
            socket.leave(socket.room);
            
            // remove roomName from allNames_room
            var index = allNames_room.indexOf(room.name);
            allNames_room.splice(index, room.name);
            
            // remove inroom attribute from people object
            var socketsInRoom = room.people;
            for(i=0; i<socketsInRoom.length; i++){
                var id = socketsInRoom[i];
                delete people[id].inroom;
            }
            
            //remove room attribute from socket
            delete socket.room;
            
            //delete room from rooms
            delete rooms[roomId];
            
            //remove link between creator and room
            people[socket.id].room = null;
        });
    });
    
/*/-------------------------------------------------------------------------------/*/
    
    socket.on('videoRoom', function(config){
        var roomId = config.roomID;
        var peerId = config.peerId;
        
        if (!(roomId in socket_in_room)){
            socket_in_room[roomId] = {};
        }
        
        for (id in socket_in_room[roomId]){
            socket_in_room[roomId][id].emit('addPeer', {'peerId': socket.id, 'createOffer': false});
            socket.emit('addPeer', {'peerId': id, 'createOffer': true});
        }
        
        socket_in_room[roomId][socket.id] = socket;
        
    });
    
    socket.on('passIceCandidate', function(config){
        var peerId = config.peerId;
        var iceCandidate = config.iceCandidate;
        console.log("["+ socket.id + "] relaying ICE candidate to [" + peerId + "] ", iceCandidate);
        
        if (peerId in allSockets){
            allSockets[peerId].emit('iceCandidate', {'peerId': socket.id, 'iceCandidate': iceCandidate});
        }
    });
    
    socket.on('passSessionDescription', function(config){
        var peerId = config.peerId;
        var sessionDescription = config.sesionDescription;
        
        console.log("["+ socket.id + "] relaying session description to [" + peerId + "] ", sessionDescription);
        
        if (peerId in allSockets){
            allSockets[peerId].emit('sessionDescription', {'peerId': socket.id, 'sessionDescription': sessionDescription});
        }
    });
    
    
    // handle user disconnecting from server
    socket.on('disonnect', function(){
        
    });

});





http.listen(3000, function(){
    console.log('listening on *:3000');
    console.log ('       CTRL + C    ---->     http://localhost:3000');
});