// index.js (server)
const io = require('socket.io')(process.env.PORT || 8000, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});


const users = {};       // socketId -> name
const messages = [];    // chat history stored here

function currentUsers() {
  return Object.values(users);
}

io.on('connection', (socket) => {
  console.log('socket connected', socket.id);

  socket.on('new-user-joined', (name) => {
    users[socket.id] = name;
    console.log(`${name} joined (${socket.id})`);

    // 🔥 Send full chat history ONLY to the newly joined user
    socket.emit('chat-history', messages);

    // notify everyone
    io.emit('user-joined', name);
    io.emit('update-user-list', currentUsers());
  });

  socket.on('send', (message) => {
    const name = users[socket.id] || 'Unknown';

    const msgObj = {
      message,
      name,
      time: Date.now()
    };

    // 🔥 Save message into history
    messages.push(msgObj);

    // broadcast to others
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
      console.log(`${name} disconnected`);
      socket.broadcast.emit('left', name);
      delete users[socket.id];
      io.emit('update-user-list', currentUsers());
    }
  });
});
