const { Server } = require('socket.io');
const appConfig = require('./app.config');

exports.setupSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: appConfig.FRONTEND_URL.replace(/\/$/, ''),
      methods: ['GET', 'POST'],
      credentials: true,
    },
    pingTimeout: 60000,
    transports: ['websocket', 'polling'],
  });

  io.on('connection', (socket) => {
    console.log(`[SOCKET] User connected: ${socket.id}`);

    socket.on('joinPoll', (pollCode) => {
      if (!pollCode || typeof pollCode !== 'string') {
        socket.emit('error', { message: 'Invalid poll code' });
        return;
      }
      socket.join(`poll_${pollCode}`);
      console.log(`[SOCKET] User ${socket.id} joined poll: ${pollCode}`);
    });

    socket.on('leavePoll', (pollCode) => {
      if (!pollCode || typeof pollCode !== 'string') return;
      socket.leave(`poll_${pollCode}`);
      console.log(`[SOCKET] User ${socket.id} left poll: ${pollCode}`);
    });

    socket.on('disconnect', () => {
      console.log(`[SOCKET] User disconnected: ${socket.id}`);
    });

    socket.on('error', (error) => {
      console.error(`[SOCKET] Error for ${socket.id}:`, error);
    });
  });

  global._io = io;
  console.log('[SOCKET] Socket.IO initialized successfully');
};
