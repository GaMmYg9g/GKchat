const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(express.static(path.join(__dirname, '../public')));

// Almacenamiento en memoria para mensajes y usuarios
const users = new Map(); // socketId -> { username, room }
const messages = []; // Historial de mensajes

io.on('connection', (socket) => {
  console.log('🟢 Usuario conectado:', socket.id);

  // Unirse a una sala (chat entre 2 usuarios)
  socket.on('join', ({ username, room }) => {
    // Si ya estaba en una sala, salir
    if (users.has(socket.id)) {
      const oldRoom = users.get(socket.id).room;
      socket.leave(oldRoom);
    }

    // Guardar usuario
    users.set(socket.id, { username, room });
    socket.join(room);

    // Enviar historial al usuario que se conecta
    const roomMessages = messages.filter(m => m.room === room);
    socket.emit('history', roomMessages);

    // Notificar a otros en la sala
    socket.to(room).emit('user joined', { 
      username, 
      message: `${username} se ha unido al chat` 
    });

    console.log(`👤 ${username} se unió a sala: ${room}`);
  });

  // Enviar mensaje
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

    // Guardar en historial (limitado a últimos 50 mensajes)
    messages.push(messageData);
    if (messages.length > 50) messages.shift();

    // Enviar a todos en la sala
    io.to(user.room).emit('message', messageData);
  });

  // Indicador de escritura
  socket.on('typing', (isTyping) => {
    const user = users.get(socket.id);
    if (user) {
      socket.to(user.room).emit('typing', {
        username: user.username,
        isTyping
      });
    }
  });

  // Desconexión
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

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});
