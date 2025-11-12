// controllers/menuController.js
const Menu = require('../models/Menu');

// @desc    Tüm menüleri getir (hiyerarşik yapı ile)
// @route   GET /api/admin/menus
// @access  Private (JWT)
const getMenus = async (req, res) => {
  try {
    const allMenus = await Menu.find()
      .populate('parentMenu', 'name _id')
      .sort({ order: 1, createdAt: -1 });
    
    // Ana menüler ve alt menüleri ayır
    const mainMenus = allMenus.filter(menu => !menu.parentMenu);
    const subMenus = allMenus.filter(menu => menu.parentMenu);
    
    // Hiyerarşik yapı oluştur - ana menülere alt menülerini ekle
    const hierarchicalMenus = mainMenus.map(mainMenu => {
      const children = subMenus
        .filter(subMenu => 
          subMenu.parentMenu && 
          subMenu.parentMenu._id.toString() === mainMenu._id.toString()
        )
        .map(subMenu => ({
          _id: subMenu._id,
          name: subMenu.name,
          link: subMenu.link,
          icon: subMenu.icon,
          order: subMenu.order,
          isActive: subMenu.isActive,
          target: subMenu.target,
          parentMenu: subMenu.parentMenu,
          createdAt: subMenu.createdAt,
          updatedAt: subMenu.updatedAt
        }));
      
      return {
        _id: mainMenu._id,
        name: mainMenu.name,
        link: mainMenu.link,
        icon: mainMenu.icon,
        order: mainMenu.order,
        isActive: mainMenu.isActive,
        target: mainMenu.target,
        parentMenu: null,
        subMenus: children,
        createdAt: mainMenu.createdAt,
        updatedAt: mainMenu.updatedAt
      };
    });
    
    res.json(hierarchicalMenus);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    Tek menü getir
// @route   GET /api/admin/menus/:id
// @access  Private
const getMenu = async (req, res) => {
  try {
    const menu = await Menu.findById(req.params.id)
      .populate('parentMenu', 'name _id');
    
    if (!menu) {
      return res.status(404).json({ message: 'Menü bulunamadı' });
    }
    
    // Eğer ana menü ise, alt menülerini de getir
    if (!menu.parentMenu) {
      const subMenus = await Menu.find({ 
        parentMenu: menu._id 
      }).sort({ order: 1 });
      return res.json({
        ...menu.toObject(),
        subMenus
      });
    }
    
    res.json(menu);
  } catch (err) {
    if (err.name === 'CastError') {
      return res.status(400).json({ message: 'Geçersiz menü ID' });
    }
    res.status(500).json({ message: err.message });
  }
};

// @desc    Yeni menü ekle (ana menü veya alt menü)
// @route   POST /api/admin/menus
// @access  Private
const createMenu = async (req, res) => {
  try {
    const { name, link, icon, order, isActive, target, parentMenu } = req.body;
    
    // Validasyon
    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Menü adı gerekli' });
    }
    
    if (!link || !link.trim()) {
      return res.status(400).json({ message: 'Menü linki gerekli' });
    }
    
    // Eğer parentMenu belirtilmişse, var olup olmadığını kontrol et
    if (parentMenu) {
      const parentExists = await Menu.findById(parentMenu);
      if (!parentExists) {
        return res.status(400).json({ message: 'Üst menü bulunamadı' });
      }
      
      // Alt menü, başka bir alt menünün altına eklenemez
      if (parentExists.parentMenu) {
        return res.status(400).json({ 
          message: 'Alt menü, başka bir alt menünün altına eklenemez' 
        });
      }
    }
    
    const menu = await Menu.create({ 
      name: name.trim(),
      link: link.trim(),
      icon: icon || '',
      order: order || 0,
      isActive: isActive !== undefined ? isActive : true,
      target: target || '_self',
      parentMenu: parentMenu || null
    });
    
    // Populate ile döndür
    await menu.populate('parentMenu', 'name');
    
    res.status(201).json(menu);
  } catch (err) {
    // Duplicate key hatası (aynı isimde menü)
    if (err.code === 11000) {
      return res.status(400).json({ 
        message: 'Bu isimde bir menü zaten mevcut' 
      });
    }
    res.status(400).json({ message: err.message });
  }
};

// @desc    Menü güncelle
// @route   PUT /api/admin/menus/:id
// @access  Private
const updateMenu = async (req, res) => {
  try {
    const { name, link, icon, order, isActive, target, parentMenu } = req.body;
    const menu = await Menu.findById(req.params.id);
    
    if (!menu) {
      return res.status(404).json({ message: 'Menü bulunamadı' });
    }
    
    // Validasyon ve güncelleme
    if (name !== undefined) {
      if (!name || !name.trim()) {
        return res.status(400).json({ message: 'Menü adı boş olamaz' });
      }
      menu.name = name.trim();
    }
    
    if (link !== undefined) {
      if (!link || !link.trim()) {
        return res.status(400).json({ message: 'Menü linki boş olamaz' });
      }
      menu.link = link.trim();
    }
    
    if (icon !== undefined) {
      menu.icon = icon.trim();
    }
    
    if (order !== undefined) {
      menu.order = order;
    }
    
    if (isActive !== undefined) {
      menu.isActive = isActive;
    }
    
    if (target !== undefined) {
      if (!['_self', '_blank'].includes(target)) {
        return res.status(400).json({ 
          message: 'Target değeri _self veya _blank olmalıdır' 
        });
      }
      menu.target = target;
    }
    
    // parentMenu güncelleme
    if (parentMenu !== undefined) {
      // null ise ana menü yap
      if (parentMenu === null) {
        menu.parentMenu = null;
      } else {
        // Üst menü var mı kontrol et
        const parentExists = await Menu.findById(parentMenu);
        if (!parentExists) {
          return res.status(400).json({ message: 'Üst menü bulunamadı' });
        }
        
        // Alt menü, başka bir alt menünün altına eklenemez
        if (parentExists.parentMenu) {
          return res.status(400).json({ 
            message: 'Alt menü, başka bir alt menünün altına eklenemez' 
          });
        }
        
        // Kendi altına eklenemez
        if (parentMenu === req.params.id) {
          return res.status(400).json({ 
            message: 'Menü kendi altına eklenemez' 
          });
        }
        
        // Alt menüleri varsa, ana menü yapılamaz
        const hasSubMenus = await Menu.findOne({ 
          parentMenu: menu._id 
        });
        if (hasSubMenus && parentMenu !== null) {
          return res.status(400).json({ 
            message: 'Alt menüleri olan bir menü, başka bir menünün altına eklenemez' 
          });
        }
        
        menu.parentMenu = parentMenu;
      }
    }
    
    await menu.save();
    await menu.populate('parentMenu', 'name');
    
    res.json(menu);
  } catch (err) {
    if (err.name === 'CastError') {
      return res.status(400).json({ message: 'Geçersiz menü ID' });
    }
    if (err.code === 11000) {
      return res.status(400).json({ 
        message: 'Bu isimde bir menü zaten mevcut' 
      });
    }
    res.status(400).json({ message: err.message });
  }
};

// @desc    Menü sil
// @route   DELETE /api/admin/menus/:id
// @access  Private
const deleteMenu = async (req, res) => {
  try {
    const menu = await Menu.findById(req.params.id);
    
    if (!menu) {
      return res.status(404).json({ message: 'Menü bulunamadı' });
    }
    
    // Alt menüleri var mı kontrol et
    const subMenus = await Menu.find({ 
      parentMenu: menu._id 
    });
    
    if (subMenus.length > 0) {
      return res.status(400).json({ 
        message: 'Alt menüleri olan bir menü silinemez. Önce alt menüleri silin.' 
      });
    }
    
    await Menu.findByIdAndDelete(req.params.id);
    
    res.json({ 
      message: 'Menü başarıyla silindi',
      deletedMenu: menu 
    });
  } catch (err) {
    if (err.name === 'CastError') {
      return res.status(400).json({ message: 'Geçersiz menü ID' });
    }
    res.status(500).json({ message: err.message });
  }
};

module.exports = { 
  getMenus, 
  getMenu,
  createMenu, 
  updateMenu,
  deleteMenu
};

