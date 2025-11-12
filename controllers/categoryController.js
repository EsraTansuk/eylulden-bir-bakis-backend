// controllers/categoryController.js
const Category = require('../models/Category');

// @desc    Tüm kategorileri getir (hiyerarşik yapı ile)
// @route   GET /api/admin/categories
// @access  Private (JWT)
const getCategories = async (req, res) => {
  try {
    const allCategories = await Category.find()
      .populate('parentCategory', 'name _id')
      .sort({ createdAt: -1 });
    
    // Ana kategoriler ve alt kategorileri ayır
    const mainCategories = allCategories.filter(cat => !cat.parentCategory);
    const subCategories = allCategories.filter(cat => cat.parentCategory);
    
    // Hiyerarşik yapı oluştur - ana kategorilere alt kategorilerini ekle
    const hierarchicalCategories = mainCategories.map(mainCat => {
      const children = subCategories
        .filter(subCat => 
          subCat.parentCategory && 
          subCat.parentCategory._id.toString() === mainCat._id.toString()
        )
        .map(subCat => ({
          _id: subCat._id,
          name: subCat.name,
          parentCategory: subCat.parentCategory,
          createdAt: subCat.createdAt,
          updatedAt: subCat.updatedAt
        }));
      
      return {
        _id: mainCat._id,
        name: mainCat.name,
        parentCategory: null,
        subCategories: children,
        createdAt: mainCat.createdAt,
        updatedAt: mainCat.updatedAt
      };
    });
    
    // Sadece hiyerarşik yapıyı döndür
    res.json(hierarchicalCategories);
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

// @desc    Tek kategori getir
// @route   GET /api/admin/categories/:id
// @access  Private
const getCategory = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id)
      .populate('parentCategory', 'name');
    
    if (!category) {
      return res.status(404).json({ message: 'Kategori bulunamadı' });
    }
    
    // Eğer alt kategori ise, alt kategorilerini de getir
    if (!category.parentCategory) {
      const subCategories = await Category.find({ 
        parentCategory: category._id 
      });
      return res.json({
        ...category.toObject(),
        subCategories
      });
    }
    
    res.json(category);
  } catch (err) {
    if (err.name === 'CastError') {
      return res.status(400).json({ message: 'Geçersiz kategori ID' });
    }
    res.status(500).json({ message: err.message });
  }
};

// @desc    Kategori güncelle
// @route   PUT /api/admin/categories/:id
// @access  Private
const updateCategory = async (req, res) => {
  try {
    const { name, parentCategory } = req.body;
    const category = await Category.findById(req.params.id);
    
    if (!category) {
      return res.status(404).json({ message: 'Kategori bulunamadı' });
    }
    
    // Validasyon
    if (name !== undefined) {
      if (!name || !name.trim()) {
        return res.status(400).json({ message: 'Kategori adı boş olamaz' });
      }
      category.name = name.trim();
    }
    
    // parentCategory güncelleme
    if (parentCategory !== undefined) {
      // null ise ana kategori yap
      if (parentCategory === null) {
        category.parentCategory = null;
      } else {
        // Üst kategori var mı kontrol et
        const parentExists = await Category.findById(parentCategory);
        if (!parentExists) {
          return res.status(400).json({ message: 'Üst kategori bulunamadı' });
        }
        
        // Alt kategori, başka bir alt kategorinin altına eklenemez
        if (parentExists.parentCategory) {
          return res.status(400).json({ 
            message: 'Alt kategori, başka bir alt kategorinin altına eklenemez' 
          });
        }
        
        // Kendi altına eklenemez
        if (parentCategory === req.params.id) {
          return res.status(400).json({ 
            message: 'Kategori kendi altına eklenemez' 
          });
        }
        
        // Alt kategorileri varsa, ana kategori yapılamaz
        const hasSubCategories = await Category.findOne({ 
          parentCategory: category._id 
        });
        if (hasSubCategories && parentCategory !== null) {
          return res.status(400).json({ 
            message: 'Alt kategorileri olan bir kategori, başka bir kategorinin altına eklenemez' 
          });
        }
        
        category.parentCategory = parentCategory;
      }
    }
    
    await category.save();
    await category.populate('parentCategory', 'name');
    
    res.json(category);
  } catch (err) {
    if (err.name === 'CastError') {
      return res.status(400).json({ message: 'Geçersiz kategori ID' });
    }
    if (err.code === 11000) {
      return res.status(400).json({ 
        message: 'Bu isimde bir kategori zaten mevcut' 
      });
    }
    res.status(400).json({ message: err.message });
  }
};

// @desc    Kategori sil
// @route   DELETE /api/admin/categories/:id
// @access  Private
const deleteCategory = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    
    if (!category) {
      return res.status(404).json({ message: 'Kategori bulunamadı' });
    }
    
    // Alt kategorileri var mı kontrol et
    const subCategories = await Category.find({ 
      parentCategory: category._id 
    });
    
    if (subCategories.length > 0) {
      return res.status(400).json({ 
        message: 'Alt kategorileri olan bir kategori silinemez. Önce alt kategorileri silin.' 
      });
    }
    
    await Category.findByIdAndDelete(req.params.id);
    
    res.json({ 
      message: 'Kategori başarıyla silindi',
      deletedCategory: category 
    });
  } catch (err) {
    if (err.name === 'CastError') {
      return res.status(400).json({ message: 'Geçersiz kategori ID' });
    }
    res.status(500).json({ message: err.message });
  }
};

module.exports = { 
  getCategories, 
  getCategory,
  createCategory, 
  updateCategory,
  deleteCategory
};