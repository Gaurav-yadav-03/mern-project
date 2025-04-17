require('dotenv').config();
const mongoose = require('mongoose');

const testConnection = async () => {
  try {
    console.log('Attempting to connect to MongoDB...');
    console.log('Connection URI:', process.env.MONGODB_URI);

    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000
    });

    console.log('Successfully connected to MongoDB!');
    console.log('Connection Details:');
    console.log('Host:', mongoose.connection.host);
    console.log('Database:', mongoose.connection.name);
    console.log('Port:', mongoose.connection.port);

    // Test database operation
    console.log('\nTesting database operation...');
    await mongoose.connection.db.admin().ping();
    console.log('Database operation successful!');

  } catch (error) {
    console.error('\nFailed to connect to MongoDB:');
    console.error('Error:', error.message);
    if (error.name === 'MongoServerSelectionError') {
      console.error('\nPossible causes:');
      console.error('1. MongoDB service is not running');
      console.error('2. Wrong connection string in .env file');
      console.error('3. Network connectivity issues');
      console.error('4. MongoDB server is down');
    }
  } finally {
    await mongoose.connection.close();
    process.exit();
  }
};

testConnection(); 