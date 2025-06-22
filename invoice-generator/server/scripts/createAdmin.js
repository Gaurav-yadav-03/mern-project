const mongoose = require('mongoose');
const bcrypt = require('bcryptjs'); // Changed from bcrypt to bcryptjs
const User = require('../models/User');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB connected for admin creation'))
  .catch(err => console.error('MongoDB connection error:', err));

async function createAdminUser() {
  try {
    // Check if admin user already exists
    const existingAdmin = await User.findOne({ email: 'luffy12@gmail.com' });
    
    if (existingAdmin) {
      console.log('Admin user already exists');
      
      // Update the password if admin exists
      const hashedPassword = await bcrypt.hash('luffy', 10);
      existingAdmin.password = hashedPassword;
      existingAdmin.isAdmin = true;
      await existingAdmin.save();
      console.log('Admin password updated');
    } else {
      // Create admin user
      const hashedPassword = await bcrypt.hash('luffy', 10);
      
      const adminUser = new User({
        name: 'Luffy',
        email: 'luffy12@gmail.com',
        password: hashedPassword,
        isAdmin: true
      });
      
      await adminUser.save();
      console.log('Admin user created successfully');
    }
  } catch (error) {
    console.error('Error creating admin user:', error);
  } finally {
    mongoose.disconnect();
    console.log('MongoDB disconnected');
  }
}

createAdminUser();