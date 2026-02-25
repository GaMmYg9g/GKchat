const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const cors = require('cors');

const app = express();
const server = http.createServer(app);

// CONFIGURACIÓN CORRECTA - AHORA CON gammyg9g
const io = new Server(server, {
  cors: {
    origin: "https://gammyg9g.github.io", // TU DOMINIO CORRECTO
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Middleware
app.use(cors());
app.use(express.static(path.join(__dirname, '../public')));

// Health check
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

app.get('/', (req, res) => {
  res.send('🚀 Servidor de Chat GKactivo!');
});

// Almacenamiento en memoria
const users = new Map();
const messages = [];

io.on('connection', (socket) => {
  console.log('🟢 Usuario conectado:', socket.id);

  socket.on('join', ({ username, room }) => {
    if (users.has(socket.id)) {
      const oldRoom = users.get(socket.id).room;
      socket.leave(oldRoom);
    }

    users.set(socket.id, { username, room });
    socket.join(room);

    const roomMessages = messages.filter(m => m.room === room);
    socket.emit('history', roomMessages);

    socket.to(room).emit('user joined', { 
      username, 
      message: `${username} se ha unido al chat` 
    });

    console.log(`👤 ${username} se unió a sala: ${room}`);
  });

  socket.on('message', (data) => {
    const user = users.get(socket.id);
    if (!user) return;

    const messageData = {
      id: Date.now(),
      username: user.username,
      text: data.text,
      timestamp: new Date().toISOString(),
      room: user.room
    };

    messages.push(messageData);
    if (messages.length > 50) messages.shift();

    io.to(user.room).emit('message', messageData);
  });

  socket.on('typing', (isTyping) => {
    const user = users.get(socket.id);
    if (user) {
      socket.to(user.room).emit('typing', {
        username: user.username,
        isTyping
      });
    }
  });

  socket.on('disconnect', () => {
    const user = users.get(socket.id);
    if (user) {
      io.to(user.room).emit('user left', {
        username: user.username,
        message: `${user.username} ha abandonado el chat`
      });
      users.delete(socket.id);
    }
    console.log('🔴 Usuario desconectado:', socket.id);
  });
});

const PORT = process.env.PORT || 8000;
server.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
  console.log(`🔗 Conectado a frontend: https://gammyg9g.github.io/GKchat/`);
});
