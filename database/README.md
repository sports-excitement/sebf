# Database (`/database`)

This directory contains database-related files including **dual database schema management**.

---

## 📁 **Directory Structure**

```
database/
├── seeders/           # Database seeders for initial data
│   └── UserSeeder.js  # User seeding logic
└── README.md         # This documentation
```

## 🗄️ **Dual Database Architecture**

SEBF uses **two separate databases**:

- **Main Database** (PostgreSQL) - Production and development
- **Test Database** (SQLite) - Fast testing and CI/CD

### **Database Schemas**

```
prisma/
├── schema.prisma          # 📊 Main database (PostgreSQL)
├── schema.test.prisma     # 🧪 Test database (SQLite)
└── generated/             # Generated Prisma clients
    ├── client/            # Main database client
    └── test-client/       # Test database client
```

## 🌱 **Database Seeders**

Seeders populate your database with initial or test data:

```javascript
// database/seeders/UserSeeder.js
const prismaService = require('../framework/config/prisma');
const bcrypt = require('bcryptjs');

class UserSeeder {
  async run() {
    // Create admin user
    await prismaService.user.create({
      data: {
        email: 'admin@example.com',
        password: await bcrypt.hash('admin123', 12),
        firstName: 'Admin',
        lastName: 'User',
        role: 'ADMIN',
        active: true,
        verified: true
      }
    });

    console.log('✅ Users seeded successfully');
  }
}

module.exports = UserSeeder;
```

## 🚀 **Database Commands**

### **Main Database (PostgreSQL)**
```bash
# Generate Prisma client
npm run prisma:generate

# Push schema changes
npm run prisma:push

# Run migrations
npm run prisma:migrate

# Open database admin
npm run prisma:studio

# Seed database
npm run db:seed

# Reset database (dangerous!)
npm run prisma:reset
```

### **Test Database (SQLite)**
```bash
# Generate test client
npm run prisma:test:generate

# Push test schema
npm run prisma:test:push

# Reset test database
npm run prisma:test:reset

# Setup test environment
npm run setup:test
```

## 🧪 **Testing with Dual Databases**

The framework automatically switches databases during testing:

```javascript
// tests/setup.js automatically handles database switching
describe('User Tests', () => {
  beforeAll(async () => {
    await setupDatabase(); // Uses SQLite automatically in test env
  });

  test('should create user', async () => {
    // This uses the SQLite test database
    const user = await UserService.createUser(userData);
    expect(user.id).toBeDefined();
  });
});
```

## 📋 **Adding New Seeders**

1. **Create seeder file**:
```javascript
// database/seeders/ProductSeeder.js
class ProductSeeder {
  async run() {
    await prismaService.product.createMany({
      data: [
        { name: 'Product 1', price: 99.99 },
        { name: 'Product 2', price: 149.99 }
      ]
    });
    console.log('✅ Products seeded');
  }
}

module.exports = ProductSeeder;
```

2. **Run via CLI**:
```bash
npm run control db:seed ProductSeeder
```

The dual database system ensures **fast testing** with SQLite while maintaining **production reliability** with PostgreSQL! 🚀