const { PrismaClient } = require('@prisma/client');
const { faker } = require('@faker-js/faker');
const bcrypt = require('bcryptjs');

// Import our enhanced Prisma service for better error handling
const { prismaService } = require('../../framework/config/prisma');

/**
 * User Seeder
 * 
 * Seeds the database with sample users for development and testing.
 */

class UserSeeder {
  constructor() {
    this.prisma = new PrismaClient();
    this.seedCount = parseInt(process.env.SEED_USER_COUNT || '10', 10);
  }

  /**
   * Main seeding method
   */
  async run() {
    try {
      console.log('🌱 Starting User seeding...');
      
      // Clear existing users in development environment
      if (process.env.NODE_ENV === 'development') {
        await this.clearExistingUsers();
      }

      // Create admin user
      await this.createAdminUser();

      // Create sample users
      await this.createSampleUsers();

      console.log('✅ User seeding completed successfully!');
    } catch (error) {
      console.error('❌ User seeding failed:', error);
      throw error;
    } finally {
      await this.prisma.$disconnect();
    }
  }

  /**
   * Clear existing users (development only)
   */
  async clearExistingUsers() {
    try {
      console.log('🧹 Clearing existing users...');
      
      // Clear related tables first due to foreign key constraints
      await this.prisma.notification.deleteMany({});
      await this.prisma.session.deleteMany({});
      await this.prisma.user.deleteMany({});
      
      console.log('✨ Existing users cleared');
    } catch (error) {
      console.error('Failed to clear existing users:', error);
      throw error;
    }
  }

  /**
   * Create admin user
   */
  async createAdminUser() {
    try {
      console.log('👑 Creating admin user...');
      
      const hashedPassword = await bcrypt.hash('admin123', 12);
      
      const adminUser = await this.prisma.user.create({
        data: {
          email: 'admin@sports-excitement.com',
          name: 'System Administrator',
          password: hashedPassword,
          isActive: true,
          emailVerified: true,
          emailVerifiedAt: new Date(),
          lastLoginAt: new Date()
        }
      });

      console.log(`✅ Admin user created: ${adminUser.email} (ID: ${adminUser.id})`);
      return adminUser;
    } catch (error) {
      // Check if user already exists
      if (error.code === 'P2002') {
        console.log('ℹ️ Admin user already exists, skipping...');
        return null;
      }
      
      console.error('Failed to create admin user:', error);
      throw error;
    }
  }

  /**
   * Create sample users
   */
  async createSampleUsers() {
    try {
      console.log(`👥 Creating ${this.seedCount} sample users...`);
      
      const users = [];
      const batchSize = 10; // Process in batches to avoid memory issues
      
      for (let i = 0; i < this.seedCount; i += batchSize) {
        const batch = [];
        const endIndex = Math.min(i + batchSize, this.seedCount);
        
        for (let j = i; j < endIndex; j++) {
          batch.push(this.generateUserData());
        }
        
        // Create batch of users
        const createdUsers = await this.createUserBatch(batch);
        users.push(...createdUsers);
        
        console.log(`📝 Created batch ${Math.floor(i / batchSize) + 1}: ${createdUsers.length} users`);
      }

      console.log(`✅ Created ${users.length} sample users`);
      return users;
    } catch (error) {
      console.error('Failed to create sample users:', error);
      throw error;
    }
  }

  /**
   * Generate user data with faker
   */
  generateUserData() {
    const isEmailVerified = faker.datatype.boolean(0.8); // 80% chance of being verified
    
    return {
      email: faker.internet.email().toLowerCase(),
      name: faker.person.fullName(),
      password: 'password123', // Will be hashed
      avatar: faker.image.avatar(),
      isActive: faker.datatype.boolean(0.95), // 95% active
      emailVerified: isEmailVerified,
      emailVerifiedAt: isEmailVerified ? faker.date.past() : null,
      lastLoginAt: faker.datatype.boolean(0.7) ? faker.date.recent() : null
    };
  }

  /**
   * Create a batch of users
   */
  async createUserBatch(userDataArray) {
    try {
      // Hash all passwords
      const usersWithHashedPasswords = await Promise.all(
        userDataArray.map(async (userData) => ({
          ...userData,
          password: await bcrypt.hash(userData.password, 12)
        }))
      );

      // Use createMany for better performance
      const result = await this.prisma.user.createMany({
        data: usersWithHashedPasswords,
        skipDuplicates: true // Skip if email already exists
      });

      // Get the created users (createMany doesn't return the data)
      const emails = usersWithHashedPasswords.map(u => u.email);
      const createdUsers = await this.prisma.user.findMany({
        where: {
          email: {
            in: emails
          }
        },
        select: {
          id: true,
          email: true,
          name: true,
          createdAt: true
        }
      });

      return createdUsers;
    } catch (error) {
      console.error('Failed to create user batch:', error);
      
      // Try creating users one by one as fallback
      return await this.createUsersIndividually(userDataArray);
    }
  }

  /**
   * Create users individually (fallback method)
   */
  async createUsersIndividually(userDataArray) {
    const createdUsers = [];
    
    for (const userData of userDataArray) {
      try {
        const hashedPassword = await bcrypt.hash(userData.password, 12);
        
        const user = await this.prisma.user.create({
          data: {
            ...userData,
            password: hashedPassword
          },
          select: {
            id: true,
            email: true,
            name: true,
            createdAt: true
          }
        });
        
        createdUsers.push(user);
      } catch (error) {
        if (error.code === 'P2002') {
          console.log(`⚠️ User with email ${userData.email} already exists, skipping...`);
        } else {
          console.error(`Failed to create user ${userData.email}:`, error.message);
        }
      }
    }
    
    return createdUsers;
  }

  /**
   * Create sample notifications for users
   */
  async createSampleNotifications() {
    try {
      console.log('📢 Creating sample notifications...');
      
      // Get all users
      const users = await this.prisma.user.findMany({
        select: { id: true }
      });

      if (users.length === 0) {
        console.log('ℹ️ No users found, skipping notifications...');
        return;
      }

      const notifications = [];
      const notificationTypes = ['email', 'push', 'in_app'];
      const notificationTitles = [
        'Welcome to Sports Excitement!',
        'Your profile has been updated',
        'New features available',
        'Security alert',
        'System maintenance',
        'Weekly summary'
      ];

      // Create 2-5 notifications per user
      for (const user of users) {
        const notificationCount = faker.number.int({ min: 2, max: 5 });
        
        for (let i = 0; i < notificationCount; i++) {
          notifications.push({
            userId: user.id,
            type: faker.helpers.arrayElement(notificationTypes),
            title: faker.helpers.arrayElement(notificationTitles),
            message: faker.lorem.sentence(),
            data: JSON.stringify({
              category: faker.helpers.arrayElement(['info', 'warning', 'success']),
              priority: faker.helpers.arrayElement(['low', 'medium', 'high'])
            }),
            isRead: faker.datatype.boolean(0.6), // 60% read
            readAt: faker.datatype.boolean(0.6) ? faker.date.recent() : null,
            createdAt: faker.date.past()
          });
        }
      }

      // Create notifications in batches
      const batchSize = 50;
      let createdCount = 0;
      
      for (let i = 0; i < notifications.length; i += batchSize) {
        const batch = notifications.slice(i, i + batchSize);
        
        await this.prisma.notification.createMany({
          data: batch
        });
        
        createdCount += batch.length;
      }

      console.log(`✅ Created ${createdCount} sample notifications`);
    } catch (error) {
      console.error('Failed to create sample notifications:', error);
      // Don't throw here as notifications are optional
    }
  }

  /**
   * Show seeding summary
   */
  async showSummary() {
    try {
      const userCount = await this.prisma.user.count();
      const notificationCount = await this.prisma.notification.count();
      
      console.log('\n📊 Seeding Summary:');
      console.log(`   Users: ${userCount}`);
      console.log(`   Notifications: ${notificationCount}`);
      console.log('');
    } catch (error) {
      console.error('Failed to show summary:', error);
    }
  }
}

/**
 * Main execution function
 */
async function main() {
  const seeder = new UserSeeder();
  
  try {
    await seeder.run();
    
    // Create notifications if requested
    if (process.env.SEED_NOTIFICATIONS === 'true') {
      await seeder.createSampleNotifications();
    }
    
    await seeder.showSummary();
    
    console.log('🎉 All seeding completed successfully!');
  } catch (error) {
    console.error('💥 Seeding failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = {
  UserSeeder,
  main
}; 