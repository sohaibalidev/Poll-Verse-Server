/**
 * PollVerse Configuration
 * --------------------------
 * Centralized configuration loaded from environment variables.
 */

require('dotenv').config({ quiet: true });

module.exports = {
  APP_NAME: process.env.APP_NAME || 'PollVerse',
  PORT: process.env.PORT || 3000,

  BASE_URL: process.env.BASE_URL || 'http://localhost:3000',
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173',

  NODE_ENV: process.env.NODE_ENV || 'development',

  DB_NAME: process.env.DB_NAME || 'pollverse',
  MONGODB_URI: process.env.MONGODB_URI,
};
