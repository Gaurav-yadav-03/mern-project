const express = require('express');
const { ClerkExpressWithAuth, getAuth, users } = require('@clerk/clerk-sdk-node');
const User = require('../models/User');
const router = express.Router();

const clerkAuth = ClerkExpressWithAuth({ secretKey: process.env.CLERK_SECRET_KEY });

// Example protected route with MongoDB user sync
router.get('/protected', clerkAuth, async (req, res) => {
  const { userId } = getAuth(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  // Fetch user info from Clerk
  const clerkUser = await users.getUser(userId);

  // Sync to MongoDB
  let user = await User.findOne({ clerkId: userId });
  if (!user) {
    user = await User.create({
      clerkId: userId,
      email: clerkUser.emailAddresses[0].emailAddress,
      name: `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim(),
      picture: clerkUser.imageUrl
    });
  }

  res.json({ message: 'Authenticated', user });
});

module.exports = router;