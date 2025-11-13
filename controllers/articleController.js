// controllers/articleController.js
const mongoose = require('mongoose');
const Article = require('../models/Article');
const Category = require('../models/Category');
const fs = require('fs');
const path = require('path');

// @desc    Tüm makaleleri getir
// @route   GET /api/admin/articles
// @access  Private (JWT)
const getArticles = async (req, res) => {
  try {
    const { status, category, author, page = 1, limit = 10 } = req.query;
    
    // Filtre oluştur
    const filter = {};
    if (status) filter.status = status;
    if (category) filter.category = category;
    if (author) filter.author = author;
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const articles = await Article.find(filter)
      .populate('category', 'name')
      .populate('author', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    const total = await Article.countDocuments(filter);
    
    res.json({
      articles,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit))
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    Tek makale getir
// @route   GET /api/admin/articles/:id
// @access  Private
const getArticle = async (req, res) => {
  try {
    const article = await Article.findById(req.params.id)
      .populate('category', 'name')
      .populate('author', 'name email');
    
    if (!article) {
      return res.status(404).json({ message: 'Makale bulunamadı' });
    }
    
    res.json(article);
  } catch (err) {
    if (err.name === 'CastError') {
      return res.status(400).json({ message: 'Geçersiz makale ID' });
    }
    res.status(500).json({ message: err.message });
  }
};

// @desc    Yeni makale oluştur
// @route   POST /api/admin/articles
// @access  Private
const createArticle = async (req, res) => {
  try {
    const { title, content, category, socialMediaLinks, status } = req.body;
    
    // Validasyon
    if (!title || !title.trim()) {
      return res.status(400).json({ message: 'Makale başlığı gerekli' });
    }
    
    if (!content || !content.trim()) {
      return res.status(400).json({ message: 'Makale içeriği gerekli' });
    }
    
    if (!category) {
      return res.status(400).json({ message: 'Kategori seçilmelidir' });
    }
    
    // Kategori var mı kontrol et
    const categoryExists = await Category.findById(category);
    if (!categoryExists) {
      return res.status(400).json({ message: 'Kategori bulunamadı' });
    }
    
    // Sosyal medya linklerini işle
    let processedLinks = [];
    if (socialMediaLinks) {
      if (Array.isArray(socialMediaLinks)) {
        processedLinks = socialMediaLinks
          .filter(link => link && link.platform && link.url)
          .map(link => ({
            platform: link.platform.trim(),
            url: link.url.trim()
          }));
      } else if (typeof socialMediaLinks === 'string') {
        // Geriye dönük uyumluluk için string'i parse etmeyi deneyelim
        try {
          const parsed = JSON.parse(socialMediaLinks);
          if (Array.isArray(parsed)) {
            processedLinks = parsed
              .filter(link => link && link.platform && link.url)
              .map(link => ({
                platform: link.platform.trim(),
                url: link.url.trim()
              }));
          }
        } catch (e) {
          // String parse edilemezse boş bırak
        }
      }
    }
    
    // Resim yolu
    let imagePath = '';
    if (req.file) {
      imagePath = `/uploads/${req.file.filename}`;
    }
    
    // Yazar bilgisi (JWT'den alınacak)
    const author = req.user.id;
    
    const article = await Article.create({
      title: title.trim(),
      content: content.trim(),
      image: imagePath,
      category,
      author,
      socialMediaLinks: processedLinks,
      status: status || 'draft'
    });
    
    await article.populate('category', 'name');
    await article.populate('author', 'name email');
    
    res.status(201).json(article);
  } catch (err) {
    // Eğer resim yüklendiyse ve hata oluştuysa, resmi sil
    if (req.file) {
      const filePath = path.join(__dirname, '../uploads', req.file.filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
    
    if (err.code === 11000) {
      return res.status(400).json({ 
        message: 'Bu başlıkta bir makale zaten mevcut' 
      });
    }
    res.status(400).json({ message: err.message });
  }
};

// @desc    Makale güncelle
// @route   PUT /api/admin/articles/:id
// @access  Private
const updateArticle = async (req, res) => {
  try {
    const { title, content, category, socialMediaLinks, status } = req.body;
    const article = await Article.findById(req.params.id);
    
    if (!article) {
      return res.status(404).json({ message: 'Makale bulunamadı' });
    }
    
    // Yazar kontrolü - sadece kendi makalesini güncelleyebilir (veya admin)
    if (article.author.toString() !== req.user.id) {
      return res.status(403).json({ 
        message: 'Bu makaleyi güncelleme yetkiniz yok' 
      });
    }
    
    // Validasyon ve güncelleme
    if (title !== undefined) {
      if (!title || !title.trim()) {
        return res.status(400).json({ message: 'Makale başlığı boş olamaz' });
      }
      article.title = title.trim();
    }
    
    if (content !== undefined) {
      if (!content || !content.trim()) {
        return res.status(400).json({ message: 'Makale içeriği boş olamaz' });
      }
      article.content = content.trim();
    }
    
    if (category !== undefined) {
      const categoryExists = await Category.findById(category);
      if (!categoryExists) {
        return res.status(400).json({ message: 'Kategori bulunamadı' });
      }
      article.category = category;
    }
    
    if (socialMediaLinks !== undefined) {
      let processedLinks = [];
      if (Array.isArray(socialMediaLinks)) {
        processedLinks = socialMediaLinks
          .filter(link => link && link.platform && link.url)
          .map(link => ({
            platform: link.platform.trim(),
            url: link.url.trim()
          }));
      } else if (typeof socialMediaLinks === 'string') {
        // Geriye dönük uyumluluk için string'i parse etmeyi deneyelim
        try {
          const parsed = JSON.parse(socialMediaLinks);
          if (Array.isArray(parsed)) {
            processedLinks = parsed
              .filter(link => link && link.platform && link.url)
              .map(link => ({
                platform: link.platform.trim(),
                url: link.url.trim()
              }));
          }
        } catch (e) {
          // String parse edilemezse boş bırak
        }
      }
      article.socialMediaLinks = processedLinks;
    }
    
    if (status !== undefined) {
      if (!['draft', 'published'].includes(status)) {
        return res.status(400).json({ 
          message: 'Status değeri draft veya published olmalıdır' 
        });
      }
      article.status = status;
    }
    
    // Yeni resim yüklendiyse
    if (req.file) {
      // Eski resmi sil
      if (article.image) {
        const oldImagePath = path.join(__dirname, '..', article.image);
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }
      article.image = `/uploads/${req.file.filename}`;
    }
    
    await article.save();
    await article.populate('category', 'name');
    await article.populate('author', 'name email');
    
    res.json(article);
  } catch (err) {
    // Eğer resim yüklendiyse ve hata oluştuysa, resmi sil
    if (req.file) {
      const filePath = path.join(__dirname, '../uploads', req.file.filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
    
    if (err.name === 'CastError') {
      return res.status(400).json({ message: 'Geçersiz makale ID' });
    }
    if (err.code === 11000) {
      return res.status(400).json({ 
        message: 'Bu başlıkta bir makale zaten mevcut' 
      });
    }
    res.status(400).json({ message: err.message });
  }
};

// @desc    Makale sil
// @route   DELETE /api/admin/articles/:id
// @access  Private
const deleteArticle = async (req, res) => {
  try {
    const article = await Article.findById(req.params.id);
    
    if (!article) {
      return res.status(404).json({ message: 'Makale bulunamadı' });
    }
    
    // Yazar kontrolü - sadece kendi makalesini silebilir (veya admin)
    if (article.author.toString() !== req.user.id) {
      return res.status(403).json({ 
        message: 'Bu makaleyi silme yetkiniz yok' 
      });
    }
    
    // Resmi sil
    if (article.image) {
      const imagePath = path.join(__dirname, '..', article.image);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }
    
    await Article.findByIdAndDelete(req.params.id);
    
    res.json({ 
      message: 'Makale başarıyla silindi',
      deletedArticle: article 
    });
  } catch (err) {
    if (err.name === 'CastError') {
      return res.status(400).json({ message: 'Geçersiz makale ID' });
    }
    res.status(500).json({ message: err.message });
  }
};

// @desc    Makale durumunu değiştir (taslak/yayınla)
// @route   PATCH /api/admin/articles/:id/status
// @access  Private
const updateArticleStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const article = await Article.findById(req.params.id);
    
    if (!article) {
      return res.status(404).json({ message: 'Makale bulunamadı' });
    }
    
    if (!status || !['draft', 'published'].includes(status)) {
      return res.status(400).json({ 
        message: 'Status değeri draft veya published olmalıdır' 
      });
    }
    
    article.status = status;
    await article.save();
    
    await article.populate('category', 'name');
    await article.populate('author', 'name email');
    
    res.json(article);
  } catch (err) {
    if (err.name === 'CastError') {
      return res.status(400).json({ message: 'Geçersiz makale ID' });
    }
    res.status(400).json({ message: err.message });
  }
};

// @desc    Public - Yayınlanmış makaleleri getir
// @route   GET /api/articles
// @access  Public
const getPublicArticles = async (req, res) => {
  try {
    const { category, page = 1, limit = 10, search } = req.query;
    
    // Filtre oluştur - sadece yayınlanmış makaleler
    const filter = { status: 'published' };
    if (category) filter.category = category;
    
    // Arama filtresi
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } }
      ];
    }
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const articles = await Article.find(filter)
      .populate({
        path: 'category',
        select: 'name parentCategory',
        populate: {
          path: 'parentCategory',
          select: 'name _id'
        }
      })
      .populate('author', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    // İçeriğin ilk 200 karakterini al (özet için)
    const articlesWithExcerpt = articles.map(article => {
      const articleObj = article.toObject();
      if (articleObj.content) {
        // HTML etiketlerini temizle ve ilk 200 karakteri al
        const textContent = articleObj.content.replace(/<[^>]*>/g, '').trim();
        articleObj.excerpt = textContent.length > 200 
          ? textContent.substring(0, 200) + '...' 
          : textContent;
      } else {
        articleObj.excerpt = '';
      }
      // Tam içeriği kaldır
      delete articleObj.content;
      return articleObj;
    });
    
    const total = await Article.countDocuments(filter);
    
    res.json({
      articles: articlesWithExcerpt,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit))
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    Public - Tek makale getir (slug veya id ile)
// @route   GET /api/articles/:slugOrId
// @access  Public
const getPublicArticle = async (req, res) => {
  try {
    const { slugOrId } = req.params;
    
    // MongoDB ObjectId formatını kontrol et
    const isValidObjectId = mongoose.Types.ObjectId.isValid(slugOrId);
    
    // Filtre oluştur
    let filter = { status: 'published' };
    
    if (isValidObjectId) {
      // Geçerli ObjectId ise hem ID hem slug ile ara
      filter.$or = [
        { _id: slugOrId },
        { slug: slugOrId }
      ];
    } else {
      // Geçersiz ObjectId ise sadece slug ile ara
      filter.slug = slugOrId;
    }
    
    const article = await Article.findOne(filter)
      .populate({
        path: 'category',
        select: 'name parentCategory',
        populate: {
          path: 'parentCategory',
          select: 'name _id'
        }
      })
      .populate('author', 'name');
    
    if (!article) {
      return res.status(404).json({ message: 'Makale bulunamadı' });
    }
    
    // Görüntülenme sayısını artır
    article.views += 1;
    await article.save();
    
    res.json(article);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    Public - Kategoriye göre makaleleri getir
// @route   GET /api/articles/category/:categoryId
// @access  Public
const getArticlesByCategory = async (req, res) => {
  try {
    const { categoryId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    
    const filter = {
      status: 'published',
      category: categoryId
    };
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const articles = await Article.find(filter)
      .populate({
        path: 'category',
        select: 'name parentCategory',
        populate: {
          path: 'parentCategory',
          select: 'name _id'
        }
      })
      .populate('author', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    // İçeriğin ilk 200 karakterini al (özet için)
    const articlesWithExcerpt = articles.map(article => {
      const articleObj = article.toObject();
      if (articleObj.content) {
        // HTML etiketlerini temizle ve ilk 200 karakteri al
        const textContent = articleObj.content.replace(/<[^>]*>/g, '').trim();
        articleObj.excerpt = textContent.length > 200 
          ? textContent.substring(0, 200) + '...' 
          : textContent;
      } else {
        articleObj.excerpt = '';
      }
      // Tam içeriği kaldır
      delete articleObj.content;
      return articleObj;
    });
    
    const total = await Article.countDocuments(filter);
    
    res.json({
      articles: articlesWithExcerpt,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit))
    });
  } catch (err) {
    if (err.name === 'CastError') {
      return res.status(400).json({ message: 'Geçersiz kategori ID' });
    }
    res.status(500).json({ message: err.message });
  }
};

module.exports = { 
  getArticles, 
  getArticle,
  createArticle, 
  updateArticle,
  deleteArticle,
  updateArticleStatus,
  getPublicArticles,
  getPublicArticle,
  getArticlesByCategory
};

