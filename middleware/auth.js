// middleware/auth.js
const jwt = require('jsonwebtoken');
require('dotenv').config();

const protect = (req, res, next) => {
  const authHeader = req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Token yok, erişim reddedildi' });
  }

  const token = authHeader.replace('Bearer ', '');
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ message: 'Token geçersiz' });
  }
};

module.exports = { protect };