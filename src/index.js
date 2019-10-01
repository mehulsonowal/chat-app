const path = require('path');
const express = require('express');
const http = require('http');
const socketio = require('socket.io');
const Filter = require('bad-words');
const {generateMessage, generateLocationMessage} = require('./utils/messages');
const {addUser, removeUser, getUser, getUsersinRoom} = require('./utils/users');

const app = express();
const server = http.createServer(app);
const io = socketio(server);

const port = process.env.PORT || 3000;

const staticDirPath = path.join(__dirname, '../public');

app.use(express.static(staticDirPath));

// let count = 0;

io.on('connection', (socket) => {
    console.log('New websocket connection!');

    socket.on('join', ({username, room}, cb) => {
	const { error, user } = addUser({ id: socket.id, username, room });

	if(error) {
	    return cb(error);
	}
	
	socket.join(user.room);

	socket.emit('message', generateMessage('Admin', 'Welcome!'));
	socket.broadcast.to(user.room).emit('message', generateMessage('Admin', user.username + ' has joined!'));
	io.to(user.room).emit('roomData', {
	    room: user.room,
	    users: getUsersinRoom(user.room)
	})

	cb();
    });

    socket.on('sendMessage', (message, cb) => {
	const filter = new Filter();

	if(filter.isProfane(message)){
	    return cb('Profanity is not allowed!');
	}
	const user = getUser(socket.id);
	
	io.to(user.room).emit('message', generateMessage(user.username, message));
	return cb();
    });

    socket.on('disconnect', () => {
	const user = removeUser(socket.id);

	if (user) {
	    io.to(user.room).emit('message', generateMessage('Admin', user.username + ' has left!'));
	    io.to(user.room).emit('roomData', {
		room: user.room,
		users: getUsersinRoom(user.room)
	    })
	}
    });

    socket.on('sendLocation', (coords, cb) => {
	const user = getUser(socket.id);
	
	io.to(user.room).emit('locationMessage', generateLocationMessage(user.username, 'https://google.com/maps?q=' + coords.latitude + ',' + coords.longitude));
	cb();
    });
    
    // socket.emit('countUpdated', count);

    // socket.on('increment', () => {
    // 	count++;
    // 	//socket.emit('countUpdated', count);
    // 	io.emit('countUpdated', count);
    // });
});

server.listen(port, () => {
    console.log(`Server is up and running on port ${port}`);
});
