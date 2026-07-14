const mongoose = require('mongoose');
const config = require('./app.config');

let isConnected = false;
let connectionPromise = null;

exports.connectDB = async () => {
  if (isConnected) return mongoose.connection;
  if (connectionPromise) return connectionPromise;

  connectionPromise = (async () => {
    try {
      await mongoose.connect(config.MONGODB_URI, {
        dbName: config.DB_NAME,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
      });
      isConnected = true;
      console.log('[MONGO] Connection Established');

      mongoose.connection.on('error', (err) => {
        console.error('[MONGO] Connection error:', err);
        isConnected = false;
      });

      mongoose.connection.on('disconnected', () => {
        console.log('[MONGO] Disconnected');
        isConnected = false;
      });

      return mongoose.connection;
    } catch (err) {
      connectionPromise = null;
      console.error('[MONGO] Connection error:', err.message);
      throw err;
    }
  })();

  return connectionPromise;
};

exports.getConnection = () => {
  if (!isConnected)
    throw new Error('Database not initialized. Call connectDB first.');
  return mongoose.connection;
};
