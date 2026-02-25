// Configuración de Socket.io
const socket = io();

// Elementos del DOM
const loginScreen = document.getElementById('login-screen');
const chatScreen = document.getElementById('chat-screen');
const loginForm = document.getElementById('login-form');
const messageForm = document.getElementById('message-form');
const messageInput = document.getElementById('message-input');
const messagesDiv = document.getElementById('messages');
const typingIndicator = document.getElementById('typing-indicator');
const currentRoomSpan = document.getElementById('current-room');
const userStatus = document.getElementById('user-status');
const logoutBtn = document.getElementById('logout-btn');

// Estado de la aplicación
let currentUser = null;
let currentRoom = null;
let typingTimeout = null;

// Registrar Service Worker para PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(registration => {
        console.log('ServiceWorker registrado:', registration);
      })
      .catch(error => {
        console.log('Error registrando ServiceWorker:', error);
      });
  });
}

// Login
loginForm.addEventListener('submit', (e) => {
  e.preventDefault();
  
  const username = document.getElementById('username').value.trim();
  const room = document.getElementById('room').value.trim() || 'general';
  
  if (!username) return;
  
  currentUser = username;
  currentRoom = room;
  
  // Unirse a la sala
  socket.emit('join', { username, room });
  
  // Actualizar UI
  loginScreen.classList.add('hidden');
  chatScreen.classList.remove('hidden');
  currentRoomSpan.textContent = `Sala: ${room}`;
  userStatus.textContent = `Conectado como: ${username}`;
  
  // Limpiar mensajes anteriores
  messagesDiv.innerHTML = '';
});

// Recibir historial de mensajes
socket.on('history', (history) => {
  history.forEach(message => {
    displayMessage(message);
  });
});

// Recibir mensaje nuevo
socket.on('message', (data) => {
  displayMessage(data);
});

// Usuario se unió
socket.on('user joined', (data) => {
  const systemMessage = document.createElement('div');
  systemMessage.className = 'system-message';
  systemMessage.textContent = data.message;
  messagesDiv.appendChild(systemMessage);
  scrollToBottom();
});

// Usuario abandonó
socket.on('user left', (data) => {
  const systemMessage = document.createElement('div');
  systemMessage.className = 'system-message';
  systemMessage.textContent = data.message;
  messagesDiv.appendChild(systemMessage);
  scrollToBottom();
});

// Indicador de escritura
socket.on('typing', (data) => {
  if (data.isTyping) {
    typingIndicator.textContent = `${data.username} está escribiendo...`;
  } else {
    typingIndicator.textContent = '';
  }
});

// Enviar mensaje
messageForm.addEventListener('submit', (e) => {
  e.preventDefault();
  
  const text = messageInput.value.trim();
  if (!text) return;
  
  socket.emit('message', { text });
  messageInput.value = '';
  
  // Dejar de enviar señal de escritura
  socket.emit('typing', false);
});

// Detectar escritura
messageInput.addEventListener('input', () => {
  socket.emit('typing', true);
  
  clearTimeout(typingTimeout);
  typingTimeout = setTimeout(() => {
    socket.emit('typing', false);
  }, 1000);
});

// Logout
logoutBtn.addEventListener('click', () => {
  // Recargar la página para reiniciar todo
  window.location.reload();
});

// Función para mostrar mensaje
function displayMessage(data) {
  const messageDiv = document.createElement('div');
  messageDiv.className = `message ${data.username === currentUser ? 'own' : 'other'}`;
  
  const time = new Date(data.timestamp).toLocaleTimeString([], { 
    hour: '2-digit', 
    minute: '2-digit' 
  });
  
  messageDiv.innerHTML = `
    <div class="message-header">
      <strong>${data.username}</strong>
    </div>
    <div class="message-content">${escapeHtml(data.text)}</div>
    <div class="message-time">${time}</div>
  `;
  
  messagesDiv.appendChild(messageDiv);
  scrollToBottom();
}

// Función para escapar HTML
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Scroll al último mensaje
function scrollToBottom() {
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

// Solicitar permiso para notificaciones (opcional)
if ('Notification' in window) {
  Notification.requestPermission();
}
