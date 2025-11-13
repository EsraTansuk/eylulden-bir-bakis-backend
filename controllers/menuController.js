// controllers/menuController.js
const Category = require('../models/Category');

// @desc    Tüm menüleri getir (kategori tabanlı hiyerarşik yapı ile)
// @route   GET /api/admin/menus
// @access  Private (JWT)
const getMenus = async (req, res) => {
  try {
    // Tüm kategorileri getir (menü özellikleri ile)
    const allCategories = await Category.find()
      .populate('parentCategory', 'name _id')
      .sort({ menuOrder: 1, createdAt: -1 });
    
    // Ana kategoriler ve alt kategorileri ayır
    const mainCategories = allCategories.filter(cat => !cat.parentCategory);
    const subCategories = allCategories.filter(cat => cat.parentCategory);
    
    // Hiyerarşik yapı oluştur - tüm kategoriler menü olarak gösterilir
    const hierarchicalMenus = mainCategories.map(mainCat => {
      const children = subCategories
        .filter(subCat => 
          subCat.parentCategory && 
          subCat.parentCategory._id.toString() === mainCat._id.toString()
        )
        .map(subCat => ({
          _id: subCat._id,
          name: subCat.name,
          parentCategory: subCat.parentCategory,
          likes: subCat.likes || 0,
          link: subCat.link || '',
          icon: subCat.icon || '',
          menuOrder: subCat.menuOrder || 0,
          isActiveInMenu: subCat.isActiveInMenu !== undefined ? subCat.isActiveInMenu : true,
          menuTarget: subCat.menuTarget || '_self',
          createdAt: subCat.createdAt,
          updatedAt: subCat.updatedAt
        }));
      
      return {
        _id: mainCat._id,
        name: mainCat.name,
        parentCategory: null,
        likes: mainCat.likes || 0,
        link: mainCat.link || '',
        icon: mainCat.icon || '',
        menuOrder: mainCat.menuOrder || 0,
        isActiveInMenu: mainCat.isActiveInMenu !== undefined ? mainCat.isActiveInMenu : true,
        menuTarget: mainCat.menuTarget || '_self',
        subCategories: children,
        createdAt: mainCat.createdAt,
        updatedAt: mainCat.updatedAt
      };
    });
    
    res.json(hierarchicalMenus);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    Tek menü getir (kategori ID'si ile)
// @route   GET /api/admin/menus/:id
// @access  Private
const getMenu = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id)
      .populate({
        path: 'parentCategory',
        select: 'name _id'
      });
    
    if (!category) {
      return res.status(404).json({ message: 'Kategori/Menü bulunamadı' });
    }
    
    // Eğer ana kategori ise, alt kategorilerini de getir
    if (!category.parentCategory) {
      const subCategories = await Category.find({ 
        parentCategory: category._id 
      })
      .select('_id name parentCategory likes link icon menuOrder isActiveInMenu menuTarget createdAt updatedAt')
      .sort({ menuOrder: 1 });
      
      return res.json({
        ...category.toObject(),
        subCategories
      });
    }
    
    res.json(category);
  } catch (err) {
    if (err.name === 'CastError') {
      return res.status(400).json({ message: 'Geçersiz kategori/menü ID' });
    }
    res.status(500).json({ message: err.message });
  }
};

// @desc    Menü güncelle (kategori menü özelliklerini güncelle)
// @route   PUT /api/admin/menus/:id
// @access  Private
const updateMenu = async (req, res) => {
  try {
    const { icon, menuOrder, isActiveInMenu, menuTarget } = req.body;
    const category = await Category.findById(req.params.id);
    
    if (!category) {
      return res.status(404).json({ message: 'Kategori/Menü bulunamadı' });
    }
    
    // Menü özelliklerini güncelle
    if (icon !== undefined) {
      category.icon = icon.trim();
    }
    
    if (menuOrder !== undefined) {
      category.menuOrder = menuOrder;
    }
    
    if (isActiveInMenu !== undefined) {
      category.isActiveInMenu = isActiveInMenu;
    }
    
    if (menuTarget !== undefined) {
      if (!['_self', '_blank'].includes(menuTarget)) {
        return res.status(400).json({ 
          message: 'MenuTarget değeri _self veya _blank olmalıdır' 
        });
      }
      category.menuTarget = menuTarget;
    }
    
    // Önce slug'ı oluştur (name değiştiyse)
    await category.save();
    
    // Her zaman slug bazlı link oluştur (otomatik)
    if (category.slug) {
      if (category.parentCategory) {
        const parent = await Category.findById(category.parentCategory);
        if (parent && parent.slug) {
          category.link = `/api/categories/${parent.slug}/${category.slug}`;
        } else {
          category.link = `/api/articles/category/${category._id}`;
        }
      } else {
        category.link = `/api/categories/${category.slug}`;
      }
    } else {
      category.link = `/api/articles/category/${category._id}`;
    }
    await category.save();
    await category.populate({
      path: 'parentCategory',
      select: 'name _id'
    });
    
    res.json(category);
  } catch (err) {
    if (err.name === 'CastError') {
      return res.status(400).json({ message: 'Geçersiz kategori/menü ID' });
    }
    res.status(400).json({ message: err.message });
  }
};

// @desc    Menü sil (kategorinin menü özelliklerini sıfırla)
// @route   DELETE /api/admin/menus/:id
// @access  Private
const deleteMenu = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    
    if (!category) {
      return res.status(404).json({ message: 'Kategori/Menü bulunamadı' });
    }
    
    // Menü özelliklerini sıfırla (kategoriyi silme)
    category.link = '';
    category.icon = '';
    category.menuOrder = 0;
    category.isActiveInMenu = true;
    category.menuTarget = '_self';
    
    await category.save();
    
    res.json({ 
      message: 'Menü özellikleri sıfırlandı (kategori korundu)',
      category 
    });
  } catch (err) {
    if (err.name === 'CastError') {
      return res.status(400).json({ message: 'Geçersiz kategori/menü ID' });
    }
    res.status(500).json({ message: err.message });
  }
};

// @desc    Public - Aktif menüleri getir (kategori tabanlı hiyerarşik yapı ile)
// @route   GET /api/menus
// @access  Public
const getPublicMenus = async (req, res) => {
  try {
    // Sadece menüde aktif olan kategorileri getir
    const allCategories = await Category.find({ isActiveInMenu: true })
      .populate('parentCategory', 'name _id')
      .sort({ menuOrder: 1, createdAt: -1 });
    
    // Ana kategoriler ve alt kategorileri ayır
    const mainCategories = allCategories.filter(cat => !cat.parentCategory);
    const subCategories = allCategories.filter(cat => cat.parentCategory);
    
    // Hiyerarşik yapı oluştur - ana menülere alt menülerini ekle
    const hierarchicalMenus = mainCategories.map(mainCat => {
      const children = subCategories
        .filter(subCat => 
          subCat.parentCategory && 
          subCat.parentCategory._id.toString() === mainCat._id.toString()
        )
        .map(subCat => {
          // Alt kategori için slug oluştur (yoksa)
          let subSlug = subCat.slug;
          if (!subSlug && subCat.name) {
            subSlug = subCat.name
              .toLowerCase()
              .replace(/ğ/g, 'g')
              .replace(/ü/g, 'u')
              .replace(/ş/g, 's')
              .replace(/ı/g, 'i')
              .replace(/ö/g, 'o')
              .replace(/ç/g, 'c')
              .replace(/[^a-z0-9]+/g, '-')
              .replace(/(^-|-$)/g, '');
          }
          
          // Ana kategori için slug oluştur (yoksa)
          let mainSlug = mainCat.slug;
          if (!mainSlug && mainCat.name) {
            mainSlug = mainCat.name
              .toLowerCase()
              .replace(/ğ/g, 'g')
              .replace(/ü/g, 'u')
              .replace(/ş/g, 's')
              .replace(/ı/g, 'i')
              .replace(/ö/g, 'o')
              .replace(/ç/g, 'c')
              .replace(/[^a-z0-9]+/g, '-')
              .replace(/(^-|-$)/g, '');
          }
          
          // Alt kategori için link oluştur (slug bazlı - öncelik slug)
          let subLink = subCat.link;
          // Eğer link `/api/` ile başlamıyorsa veya boşsa, slug bazlı oluştur
          if (!subLink || !subLink.trim() || !subLink.startsWith('/api/')) {
            if (subSlug && mainSlug) {
              subLink = `/api/categories/${mainSlug}/${subSlug}`;
            } else {
              subLink = `/api/articles/category/${subCat._id}`;
            }
          }
          
          return {
            _id: subCat._id,
            name: subCat.name,
            slug: subSlug || null,
            link: subLink,
            icon: subCat.icon || '',
            menuOrder: subCat.menuOrder || 0,
            menuTarget: subCat.menuTarget || '_self'
          };
        });
      
      // Ana kategori için slug oluştur (yoksa)
      let mainSlug = mainCat.slug;
      if (!mainSlug && mainCat.name) {
        mainSlug = mainCat.name
          .toLowerCase()
          .replace(/ğ/g, 'g')
          .replace(/ü/g, 'u')
          .replace(/ş/g, 's')
          .replace(/ı/g, 'i')
          .replace(/ö/g, 'o')
          .replace(/ç/g, 'c')
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, '');
      }
      
      // Ana kategori için link oluştur (slug bazlı - öncelik slug)
      let mainLink = mainCat.link;
      // Eğer link `/api/` ile başlamıyorsa veya boşsa, slug bazlı oluştur
      if (!mainLink || !mainLink.trim() || !mainLink.startsWith('/api/')) {
        if (mainSlug) {
          mainLink = `/api/categories/${mainSlug}`;
        } else {
          mainLink = `/api/articles/category/${mainCat._id}`;
        }
      }
      
      return {
        _id: mainCat._id,
        name: mainCat.name,
        slug: mainSlug || null,
        link: mainLink,
        icon: mainCat.icon || '',
        menuOrder: mainCat.menuOrder || 0,
        menuTarget: mainCat.menuTarget || '_self',
        subMenus: children
      };
    });
    
    res.json(hierarchicalMenus);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { 
  getMenus, 
  getMenu,
  updateMenu,
  deleteMenu,
  getPublicMenus
};
