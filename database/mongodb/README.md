# MongoDB Database Structure

This directory contains MongoDB-specific database files for the Sports Excitement Backend Framework.

## Directory Structure

- `models/` - Mongoose model definitions
- `seeders/` - Database seeders for populating initial data
- `migrations/` - Database migration scripts (if needed)

## Usage

### Models
Place your Mongoose models in the `models/` directory. Example:

```javascript
// models/User.js
const mongoose = require('mongoose');

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
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('User', userSchema);
```

### Seeders
Create seeders in the `seeders/` directory to populate your databases with initial data.

### Multiple Databases
The framework supports two MongoDB connections:
- **Primary Database**: Main application data
- **Secondary Database**: Analytics, logs, or separate dataset

Configure both in your `.env` file using the `MONGODB_PRIMARY_*` and `MONGODB_SECONDARY_*` environment variables.

## Configuration

Set up your MongoDB connections in `.env`:

```bash
# Primary MongoDB (Required)
MONGODB_ENABLED=true
MONGODB_PRIMARY_HOST=localhost
MONGODB_PRIMARY_PORT=27017
MONGODB_PRIMARY_DATABASE=sports_excitement_primary
MONGODB_PRIMARY_USERNAME=your_username
MONGODB_PRIMARY_PASSWORD=your_password

# Secondary MongoDB (Optional)
MONGODB_SECONDARY_ENABLED=true
MONGODB_SECONDARY_HOST=localhost
MONGODB_SECONDARY_PORT=27017
MONGODB_SECONDARY_DATABASE=sports_excitement_secondary
MONGODB_SECONDARY_USERNAME=your_username
MONGODB_SECONDARY_PASSWORD=your_password
```

## Access in Your Application

```javascript
const app = require('./bootstrap/app');

// Get MongoDB service
const mongoService = app.application.getService('MongoDB');

// Get primary connection
const primaryDb = mongoService.getConnection('primary');

// Get secondary connection (if configured)
const secondaryDb = mongoService.getConnection('secondary');

// Create models on specific connections
const UserModel = mongoService.createModel('User', userSchema, 'primary');
const AnalyticsModel = mongoService.createModel('Analytics', analyticsSchema, 'secondary');
```