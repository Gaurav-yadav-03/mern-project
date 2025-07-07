const { verifyToken } = require('@clerk/clerk-sdk-node');

const authenticateClerkToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access denied. No token provided.' });
  }

  try {
    const payload = await verifyToken(token);
    req.user = payload;
    next();
  } catch (error) {
    res.status(403).json({ message: 'Invalid token' });
  }
};

module.exports = { authenticateClerkToken };