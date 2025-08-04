const fs = require('fs');
const path = require('path');

module.exports = async () => {
  // Clean up test database file
  const testDbPath = path.resolve(__dirname, '../test.db');
  if (fs.existsSync(testDbPath)) {
    fs.unlinkSync(testDbPath);
    console.log('🧹 Test database cleaned up');
  }
  
  // Clean up test uploads
  const testUploadsPath = path.resolve(__dirname, '../storage/test-uploads');
  if (fs.existsSync(testUploadsPath)) {
    fs.rmSync(testUploadsPath, { recursive: true, force: true });
    console.log('🧹 Test uploads cleaned up');
  }
  
  console.log('✅ Test environment cleaned up');
}; 