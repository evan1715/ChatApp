const path = require('path');
const http = require('http');
const express = require('express');
const socketio = require('socket.io');
const Filter = require('bad-words');
const { generateMessage, generateLocationMessage } = require('./utils/messages.js');
const { addUser, getUser, getUsersInRoom, removeUser } = require('./utils/users.js');

const app = express();
const server = http.createServer(app);
const io = socketio(server);

app.use(express.static(path.join(__dirname, '../public')));

io.on('connection', (socket) => {
    console.log("New WebSocket connection.");

    socket.on('join', (params, callback) => {
        //socket.id is socketIO's unique identifier for a user. Params will hold username & room.
        const { error, user } = addUser({ id: socket.id, ...params });

        if (error) {
            return callback(error);
        }

        //Officially join the room
        socket.join(user.room);

        socket.emit('message', generateMessage('Admin', 'Welcome!'));
        socket.broadcast.to(user.room).emit('message', generateMessage('Admin', `${user.username} has joined!`));
        io.to(user.room).emit('roomInfo', {
            room: user.room,
            users: getUsersInRoom(user.room)
        });

        //Calling callback to let the user know they were able to join.
        callback();
    });

    socket.on('sendMessage', (message, callback) => {
        const filter = new Filter();
        const user = getUser(socket.id);

        if (filter.isProfane(message)) {
            return callback("Profanity is not allowed");
        }

        io.to(user.room).emit('message', generateMessage(user.username, message));
        callback();
    });

    socket.on('sendLocation', (coords, callback) => {
        const user = getUser(socket.id);

        io.to(user.room).emit('locationMessage', generateLocationMessage(user.username, `https://bing.com/maps?q=${coords.latitude},${coords.longitude}`));
        callback();
    });

    socket.on('disconnect', () => {
        const user = removeUser(socket.id);

        if (user) {
            io.to(user.room).emit('message', generateMessage('Admin', `${user.username} has left the room.`));
            io.to(user.room).emit('roomInfo', {
                room: user.room,
                users: getUsersInRoom(user.room)
            });
        }
    });
});

server.listen(process.env.PORT, () => {
    console.log("Server is up on port " +process.env.PORT +".");
});