// controllers/authController.js
require('dotenv').config(); // EN ÜSTTE OLMALI!
const mongoose = require('mongoose');
const User = require('../models/User');
const jwt = require('jsonwebtoken');

const generateToken = (id) => {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET eksik!');
  }
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d'
  });
};

const login = async (req, res) => {
  try {
    // MongoDB bağlantı kontrolü
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ 
        message: 'Veritabanı bağlantısı yok. Lütfen daha sonra tekrar deneyin.' 
      });
    }

    const { email, password } = req.body;

    // Validasyon
    if (!email || !password) {
      return res.status(400).json({ message: 'Email ve şifre giriniz' });
    }

    // Kullanıcıyı bul
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({ message: 'Geçersiz kimlik bilgileri' });
    }

    // Şifre kontrol
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Geçersiz kimlik bilgileri' });
    }

    // Token oluştur
    const token = generateToken(user._id);

    // Başarılı yanıt
    res.json({
      message: 'Giriş başarılı',
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name || 'Admin'
      }
    });

  } catch (err) {
    console.error('LOGIN HATASI:', err);
    // Geliştirme ortamında detaylı hata mesajı göster
    const errorMessage = process.env.NODE_ENV === 'production' 
      ? 'Sunucu hatası' 
      : err.message || 'Sunucu hatası';
    res.status(500).json({ 
      message: 'Sunucu hatası',
      error: process.env.NODE_ENV !== 'production' ? errorMessage : undefined
    });
  }
};

module.exports = { login };