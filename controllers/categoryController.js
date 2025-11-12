// controllers/categoryController.js
const Category = require('../models/Category');

// @desc    Tüm kategorileri getir (hiyerarşik yapı ile)
// @route   GET /api/admin/categories
// @access  Private (JWT)
const getCategories = async (req, res) => {
  try {
    const categories = await Category.find()
      .populate('parentCategory', 'name')
      .sort({ createdAt: -1 });
    
    // Ana kategoriler ve alt kategorileri ayır
    const mainCategories = categories.filter(cat => !cat.parentCategory);
    const subCategories = categories.filter(cat => cat.parentCategory);
    
    // Hiyerarşik yapı oluştur
    const hierarchicalCategories = mainCategories.map(mainCat => {
      const children = subCategories.filter(
        subCat => subCat.parentCategory && 
        subCat.parentCategory._id.toString() === mainCat._id.toString()
      );
      return {
        ...mainCat.toObject(),
        subCategories: children
      };
    });
    
    res.json({
      categories: hierarchicalCategories,
      allCategories: categories // Tüm kategorileri de döndür
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    Yeni kategori ekle (ana kategori veya alt kategori)
// @route   POST /api/admin/categories
// @access  Private
const createCategory = async (req, res) => {
  try {
    const { name, parentCategory } = req.body;
    
    // Validasyon
    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Kategori adı gerekli' });
    }
    
    // Eğer parentCategory belirtilmişse, var olup olmadığını kontrol et
    if (parentCategory) {
      const parentExists = await Category.findById(parentCategory);
      if (!parentExists) {
        return res.status(400).json({ message: 'Üst kategori bulunamadı' });
      }
      
      // Alt kategori, başka bir alt kategorinin altına eklenemez
      if (parentExists.parentCategory) {
        return res.status(400).json({ message: 'Alt kategori, başka bir alt kategorinin altına eklenemez' });
      }
    }
    
    const category = await Category.create({ 
      name: name.trim(),
      parentCategory: parentCategory || null
    });
    
    // Populate ile döndür
    await category.populate('parentCategory', 'name');
    
    res.status(201).json(category);
  } catch (err) {
    // Duplicate key hatası (aynı isimde kategori)
    if (err.code === 11000) {
      return res.status(400).json({ 
        message: 'Bu isimde bir kategori zaten mevcut' 
      });
    }
    res.status(400).json({ message: err.message });
  }
};

module.exports = { getCategories, createCategory };