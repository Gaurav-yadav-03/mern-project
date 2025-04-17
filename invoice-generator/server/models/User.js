const mongoose = require('mongoose');

// Add initialization function
async function initializeSchema() {
  try {
    // Get the existing collection
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    const userCollection = collections.find(c => c.name === 'users');

    if (userCollection) {
      // Drop all existing indexes
      await db.collection('users').dropIndexes();
    }
  } catch (error) {
    console.error('Schema initialization error:', error);
  }
}

// Initialize when connection is ready
mongoose.connection.once('connected', initializeSchema);

// Add isAdmin field to your User schema if it doesn't exist
const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  name: {
    type: String,
    required: true
  },
  googleId: {
    type: String,
    sparse: true,
    unique: true
  },
  picture: {
    type: String,
    default: null
  },
  password: String,
  isAdmin: {
    type: Boolean,
    default: false
  }
}, { 
  timestamps: true,
  collection: 'users' 
});

// Create model after schema is ready
const User = mongoose.model('User', userSchema);

// Create new indexes after model is ready
User.on('index', function(error) {
  if (error) {
    console.error('User index error:', error);
  }
});

module.exports = User;