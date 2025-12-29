const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const users = {};
const messages = [];

function currentUsers() {
  return Object.values(users);
}

// Serve a simple HTML file for testing
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

io.on('connection', (socket) => {
  console.log('socket connected', socket.id);

  socket.on('new-user-joined', (name) => {
    users[socket.id] = name;
    socket.emit('chat-history', messages);
    io.emit('user-joined', name);
    io.emit('update-user-list', currentUsers());
  });

  socket.on('send', (message) => {
    const name = users[socket.id] || 'Unknown';
    const msgObj = { message, name, time: Date.now() };
    messages.push(msgObj);
    socket.broadcast.emit('receive', msgObj);
  });

  socket.on('typing', () => {
    const name = users[socket.id];
    if (name) socket.broadcast.emit('typing', name);
  });

  socket.on('stop-typing', () => {
    socket.broadcast.emit('stop-typing');
  });

  socket.on('disconnect', () => {
    const name = users[socket.id];
    if (name) {
      socket.broadcast.emit('left', name);
      delete users[socket.id];
      io.emit('update-user-list', currentUsers());
    }
  });
});

const PORT = process.env.PORT || 8000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
