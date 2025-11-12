// server.js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Static dosyalar (resimler için)
app.use('/uploads', express.static('uploads'));

// Rotalar
app.use('/api/admin', require('./routes/adminRoutes'));

// Ana yol
app.get('/', (req, res) => {
  res.send('Kuzenim Site Backend Çalışıyor!');
});

// MongoDB Bağlantısı
const connectDB = async () => {
  if (!process.env.MONGO_URI) {
    console.error('HATA: MONGO_URI environment değişkeni tanımlı değil!');
    process.exit(1);
  }

  try {
    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000, // 5 saniye içinde bağlanamazsa hata ver
      socketTimeoutMS: 45000,
    });
    console.log('MongoDB Bağlandı');
  } catch (err) {
    console.error('DB Bağlantı Hatası:', err.message);
    console.error('MongoDB bağlantısı kurulamadı. 5 saniye sonra tekrar denenecek...');
    // 5 saniye sonra tekrar dene
    setTimeout(connectDB, 5000);
  }
};

// MongoDB bağlantı olaylarını dinle
mongoose.connection.on('connected', () => {
  console.log('MongoDB bağlantısı aktif');
});

mongoose.connection.on('error', (err) => {
  console.error('MongoDB bağlantı hatası:', err.message);
});

mongoose.connection.on('disconnected', () => {
  console.warn('MongoDB bağlantısı kesildi');
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Backend http://localhost:${PORT} adresinde çalışıyor`);
});

// MongoDB'ye bağlan
connectDB();