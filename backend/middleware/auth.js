const jwt = require('jsonwebtoken');
const { findUserById } = require('../services/userStore');

const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ message: 'Access denied. No token provided.' });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ message: 'Invalid or expired token.' });
    }
    const user = await findUserById(decoded.id);

    if (!user) {
      return res.status(401).json({ message: 'Invalid token.' });
    }

    req.user = { ...user, password: undefined };
    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid token.' });
  }
};

module.exports = auth;
