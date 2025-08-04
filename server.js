require('dotenv').config();

const { application } = require('./bootstrap/app');

/**
 * Start the Sports Excitement Core Server
 */
async function startServer() {
  try {
    const port = process.env.PORT || 3000;
    await application.start(port);
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
startServer(); 