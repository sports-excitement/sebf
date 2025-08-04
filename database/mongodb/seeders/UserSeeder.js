const mongoose = require('mongoose');

/**
 * User Seeder for MongoDB
 * 
 * Seeds the database with initial user data
 */

// User Schema (you can also import from models directory)
const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Sample users data
const usersData = [
  {
    name: 'Admin User',
    email: 'admin@example.com',
    password: '$2a$10$N9qo8uLOickgx2ZMRZoMye.EjZZF8J0r2.N2FZL2VQdV7rJ7GQ2GS', // hashed 'password'
    role: 'admin',
    isActive: true
  },
  {
    name: 'John Doe',
    email: 'john@example.com',
    password: '$2a$10$N9qo8uLOickgx2ZMRZoMye.EjZZF8J0r2.N2FZL2VQdV7rJ7GQ2GS', // hashed 'password'
    role: 'user',
    isActive: true
  },
  {
    name: 'Jane Smith',
    email: 'jane@example.com',
    password: '$2a$10$N9qo8uLOickgx2ZMRZoMye.EjZZF8J0r2.N2FZL2VQdV7rJ7GQ2GS', // hashed 'password'
    role: 'user',
    isActive: true
  }
];

/**
 * Seed users in a specific database
 */
async function seedUsers(connection, databaseName = 'primary') {
  try {
    console.log(`🌱 Seeding users in ${databaseName} database...`);
    
    // Create User model on the specific connection
    const User = connection.model('User', userSchema);
    
    // Clear existing users
    await User.deleteMany({});
    console.log('   ✅ Cleared existing users');
    
    // Insert new users
    const insertedUsers = await User.insertMany(usersData);
    console.log(`   ✅ Inserted ${insertedUsers.length} users`);
    
    return insertedUsers;
  } catch (error) {
    console.error(`   ❌ Error seeding users in ${databaseName}:`, error.message);
    throw error;
  }
}

/**
 * Run seeder
 * Usage: node database/mongodb/seeders/UserSeeder.js
 */
async function runSeeder() {
  try {
    // Load environment variables
    require('dotenv').config();
    
    // Connect to MongoDB
    const primaryUri = buildMongoUri('primary');
    const primaryConnection = await mongoose.createConnection(primaryUri);
    
    console.log('🔗 Connected to MongoDB');
    
    // Seed primary database
    await seedUsers(primaryConnection, 'primary');
    
    // Seed secondary database if configured
    if (process.env.MONGODB_SECONDARY_ENABLED === 'true') {
      try {
        const secondaryUri = buildMongoUri('secondary');
        const secondaryConnection = await mongoose.createConnection(secondaryUri);
        await seedUsers(secondaryConnection, 'secondary');
        await secondaryConnection.close();
      } catch (error) {
        console.warn('⚠️ Secondary database seeding failed:', error.message);
      }
    }
    
    // Close connections
    await primaryConnection.close();
    console.log('✅ Seeding completed successfully');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error.message);
    process.exit(1);
  }
}

/**
 * Build MongoDB connection URI
 */
function buildMongoUri(type = 'primary') {
  const prefix = type.toUpperCase();
  const host = process.env[`MONGODB_${prefix}_HOST`] || 'localhost';
  const port = process.env[`MONGODB_${prefix}_PORT`] || '27017';
  const database = process.env[`MONGODB_${prefix}_DATABASE`];
  const username = process.env[`MONGODB_${prefix}_USERNAME`];
  const password = process.env[`MONGODB_${prefix}_PASSWORD`];
  
  if (!database) {
    throw new Error(`MONGODB_${prefix}_DATABASE environment variable is required`);
  }
  
  let uri = 'mongodb://';
  
  if (username && password) {
    uri += `${encodeURIComponent(username)}:${encodeURIComponent(password)}@`;
  }
  
  uri += `${host}:${port}/${database}`;
  
  return uri;
}

// Export for use in other modules
module.exports = {
  seedUsers,
  usersData,
  userSchema
};

// Run seeder if called directly
if (require.main === module) {
  runSeeder();
}