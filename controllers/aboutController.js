// controllers/aboutController.js
const About = require('../models/About');
const fs = require('fs');
const path = require('path');
const upload = require('../middleware/upload');

// Resim path'ini tam URL'ye çevir
const getImageUrl = (imagePath) => {
  if (!imagePath || imagePath === "" || imagePath === null) {
    return null;
  }
  
  // Eğer zaten tam URL ise (http:// veya https:// ile başlıyorsa) olduğu gibi döndür
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath;
  }
  
  // Backend URL'ini al (environment variable'dan veya default)
  const backendUrl = process.env.BACKEND_URL || process.env.API_URL || `http://localhost:${process.env.PORT || 5000}`;
  
  // Relative path'i tam URL'ye çevir
  const cleanPath = imagePath.startsWith('/') ? imagePath : `/${imagePath}`;
  return `${backendUrl}${cleanPath}`;
};

// @desc    Hakkımda bilgisini getir
// @route   GET /api/admin/about
// @access  Private (JWT)
const getAbout = async (req, res) => {
  try {
    let about = await About.findOne();
    
    // Eğer hakkımda bilgisi yoksa boş bir obje oluştur
    if (!about) {
      about = await About.create({
        text: '',
        quote: null,
        photo: null
      });
    }

    const aboutObj = about.toObject();
    
    // Boş string photo'yu null'a çevir ve tam URL'ye çevir
    if (aboutObj.photo === "" || !aboutObj.photo) {
      aboutObj.photo = null;
    } else {
      aboutObj.photo = getImageUrl(aboutObj.photo);
    }

    res.json(aboutObj);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    Hakkımda bilgisini güncelle
// @route   PUT /api/admin/about
// @access  Private (JWT)
const updateAbout = async (req, res) => {
  try {
    const { text, quote } = req.body;

    // Validasyon
    if (text !== undefined && (!text || !text.trim())) {
      return res.status(400).json({ message: "Metin boş olamaz" });
    }

    let about = await About.findOne();

    // Eğer hakkımda bilgisi yoksa oluştur
    if (!about) {
      about = new About({
        text: text || '',
        quote: quote || null,
        photo: null
      });
    } else {
      // Mevcut bilgileri güncelle
      if (text !== undefined) {
        about.text = text.trim();
      }
      if (quote !== undefined) {
        about.quote = quote && quote.trim() ? quote.trim() : null;
      }
    }

    // Yeni fotoğraf yüklendiyse
    if (req.file) {
      // Eski fotoğrafı sil
      if (about.photo) {
        const oldPhotoPath = path.join(__dirname, "..", about.photo);
        if (fs.existsSync(oldPhotoPath)) {
          fs.unlinkSync(oldPhotoPath);
        }
      }
      about.photo = `/uploads/${req.file.filename}`;
    }

    await about.save();

    const aboutObj = about.toObject();
    
    // Boş string photo'yu null'a çevir ve tam URL'ye çevir
    if (aboutObj.photo === "" || !aboutObj.photo) {
      aboutObj.photo = null;
    } else {
      aboutObj.photo = getImageUrl(aboutObj.photo);
    }

    res.json({
      message: "Hakkımda bilgisi güncellendi",
      about: aboutObj
    });
  } catch (err) {
    // Eğer resim yüklendiyse ve hata oluştuysa, resmi sil
    if (req.file) {
      const filePath = path.join(__dirname, "../uploads", req.file.filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
    res.status(500).json({ message: err.message });
  }
};

// @desc    Hakkımda bilgisini sil (sıfırla)
// @route   DELETE /api/admin/about
// @access  Private (JWT)
const deleteAbout = async (req, res) => {
  try {
    const about = await About.findOne();

    if (!about) {
      return res.status(404).json({ message: "Hakkımda bilgisi bulunamadı" });
    }

    // Fotoğrafı sil
    if (about.photo) {
      const photoPath = path.join(__dirname, "..", about.photo);
      if (fs.existsSync(photoPath)) {
        fs.unlinkSync(photoPath);
      }
    }

    // Tüm alanları sıfırla
    about.text = '';
    about.quote = null;
    about.photo = null;
    await about.save();

    res.json({
      message: "Hakkımda bilgisi sıfırlandı",
      about: about
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    Public - Hakkımda bilgisini getir
// @route   GET /api/about
// @access  Public
const getPublicAbout = async (req, res) => {
  try {
    const about = await About.findOne();

    if (!about || !about.text) {
      return res.json({
        photo: null,
        text: '',
        quote: null
      });
    }

    const aboutObj = about.toObject();
    
    // Boş string photo'yu null'a çevir ve tam URL'ye çevir
    if (aboutObj.photo === "" || !aboutObj.photo) {
      aboutObj.photo = null;
    } else {
      aboutObj.photo = getImageUrl(aboutObj.photo);
    }

    res.json(aboutObj);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  getAbout,
  updateAbout,
  deleteAbout,
  getPublicAbout
};

