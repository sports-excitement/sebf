const path = require('path');
const dotenv = require('dotenv');

module.exports = async () => {
  // Load test environment variables
  const testEnvPath = path.resolve(__dirname, '../.env.testing');
  dotenv.config({ path: testEnvPath });
  
  // Set NODE_ENV to testing
  process.env.NODE_ENV = 'testing';
  
  console.log('🧪 Test environment initialized');
  console.log(`   Database: ${process.env.DATABASE_URL}`);
  console.log(`   Redis DB: ${process.env.REDIS_DATABASE}`);
  console.log(`   Log Level: ${process.env.LOG_LEVEL}`);
}; 