const http = require('http');
const app = require('./src/app');
const { connectDB } = require('./src/config/db.config');
const config = require('./src/config/app.config');
const { setupSocket } = require('./src/config/socket.config');

const server = http.createServer(app);

const io = setupSocket(server);

const gracefulShutdown = async (signal) => {
  console.log(`\n[${signal}] Received. Starting graceful shutdown...`);

  const timeout = setTimeout(() => {
    console.error(
      'Could not close connections in time, forcefully shutting down'
    );
    process.exit(1);
  }, 10000);

  try {
    if (io) {
      io.close(() => {
        console.log('[SOCKET] Socket.IO closed');
      });
    }

    server.close(() => {
      console.log('[SERVER] HTTP server closed');
    });

    const mongoose = require('mongoose');
    await mongoose.connection.close();
    console.log('[MONGO] Database connection closed');

    clearTimeout(timeout);
    console.log('Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    console.error('Error during shutdown:', error);
    process.exit(1);
  }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
  gracefulShutdown('UNHANDLED_REJECTION');
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

connectDB()
  .then(() => {
    server.listen(config.PORT, () => {
      console.log(`[SERVER] Running at ${config.BASE_URL}`);
      console.log(`[SERVER] Client URL ${config.FRONTEND_URL}`);
      console.log(`[SERVER] Environment: ${config.NODE_ENV}`);
    });
  })
  .catch((err) => {
    console.error('[MONGO] Connection failed:', err.message || err);
    process.exit(1);
  });
