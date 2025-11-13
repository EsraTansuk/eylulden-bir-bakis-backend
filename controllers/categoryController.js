// controllers/categoryController.js
const Category = require("../models/Category");

// @desc    Tüm kategorileri getir (hiyerarşik yapı ile)
// @route   GET /api/admin/categories
// @access  Private (JWT)
const getCategories = async (req, res) => {
  try {
    const allCategories = await Category.find()
      .populate("parentCategory", "name _id")
      .sort({ createdAt: -1 });

    // Ana kategoriler ve alt kategorileri ayır
    const mainCategories = allCategories.filter((cat) => !cat.parentCategory);
    const subCategories = allCategories.filter((cat) => cat.parentCategory);

    // Hiyerarşik yapı oluştur - ana kategorilere alt kategorilerini ekle
    const hierarchicalCategories = mainCategories.map((mainCat) => {
      const children = subCategories
        .filter(
          (subCat) =>
            subCat.parentCategory &&
            subCat.parentCategory._id.toString() === mainCat._id.toString()
        )
        .map((subCat) => ({
          _id: subCat._id,
          name: subCat.name,
          parentCategory: subCat.parentCategory,
          likes: subCat.likes || 0,
          link: subCat.link || "",
          icon: subCat.icon || "",
          menuOrder: subCat.menuOrder || 0,
          isActiveInMenu:
            subCat.isActiveInMenu !== undefined ? subCat.isActiveInMenu : true,
          menuTarget: subCat.menuTarget || "_self",
          createdAt: subCat.createdAt,
          updatedAt: subCat.updatedAt,
        }));

      return {
        _id: mainCat._id,
        name: mainCat.name,
        parentCategory: null,
        likes: mainCat.likes || 0,
        link: mainCat.link || "",
        icon: mainCat.icon || "",
        menuOrder: mainCat.menuOrder || 0,
        isActiveInMenu:
          mainCat.isActiveInMenu !== undefined ? mainCat.isActiveInMenu : true,
        menuTarget: mainCat.menuTarget || "_self",
        subCategories: children,
        createdAt: mainCat.createdAt,
        updatedAt: mainCat.updatedAt,
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
    const {
      name,
      parentCategory,
      icon,
      menuOrder,
      isActiveInMenu,
      menuTarget,
    } = req.body;

    // Validasyon
    if (!name || !name.trim()) {
      return res.status(400).json({ message: "Kategori adı gerekli" });
    }

    // Eğer parentCategory belirtilmişse, var olup olmadığını kontrol et
    if (parentCategory) {
      const parentExists = await Category.findById(parentCategory);
      if (!parentExists) {
        return res.status(400).json({ message: "Üst kategori bulunamadı" });
      }

      // Alt kategori, başka bir alt kategorinin altına eklenemez
      if (parentExists.parentCategory) {
        return res
          .status(400)
          .json({
            message: "Alt kategori, başka bir alt kategorinin altına eklenemez",
          });
      }
    }

    const categoryData = {
      name: name.trim(),
      parentCategory: parentCategory || null,
    };

    // Menü özelliklerini ekle (icon, order, vb. - opsiyonel)
    if (icon !== undefined && icon !== null) {
      categoryData.icon = icon.trim();
    }
    if (menuOrder !== undefined && menuOrder !== null) {
      categoryData.menuOrder = Number(menuOrder);
    }
    if (isActiveInMenu !== undefined && isActiveInMenu !== null) {
      categoryData.isActiveInMenu = Boolean(isActiveInMenu);
    }
    if (menuTarget !== undefined && menuTarget !== null) {
      if (!["_self", "_blank"].includes(menuTarget)) {
        return res.status(400).json({
          message: "MenuTarget değeri _self veya _blank olmalıdır",
        });
      }
      categoryData.menuTarget = menuTarget;
    }

    const category = await Category.create(categoryData);

    // Slug oluşturulduktan sonra link'i otomatik oluştur
    await category.save(); // Slug'ı oluşturmak için save

    // Her zaman slug bazlı link oluştur
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

    // Populate ile döndür
    await category.populate("parentCategory", "name");

    res.status(201).json(category);
  } catch (err) {
    // Duplicate key hatası (aynı isimde kategori)
    if (err.code === 11000) {
      return res.status(400).json({
        message: "Bu isimde bir kategori zaten mevcut",
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
    const category = await Category.findById(req.params.id).populate(
      "parentCategory",
      "name"
    );

    if (!category) {
      return res.status(404).json({ message: "Kategori bulunamadı" });
    }

    // Eğer ana kategori ise, alt kategorilerini de getir
    if (!category.parentCategory) {
      const subCategories = await Category.find({
        parentCategory: category._id,
      }).select(
        "_id name parentCategory likes link icon menuOrder isActiveInMenu menuTarget createdAt updatedAt"
      );
      return res.json({
        ...category.toObject(),
        subCategories,
      });
    }

    res.json(category);
  } catch (err) {
    if (err.name === "CastError") {
      return res.status(400).json({ message: "Geçersiz kategori ID" });
    }
    res.status(500).json({ message: err.message });
  }
};

// @desc    Kategori güncelle
// @route   PUT /api/admin/categories/:id
// @access  Private
const updateCategory = async (req, res) => {
  try {
    const {
      name,
      parentCategory,
      icon,
      menuOrder,
      isActiveInMenu,
      menuTarget,
    } = req.body;
    const category = await Category.findById(req.params.id);

    if (!category) {
      return res.status(404).json({ message: "Kategori bulunamadı" });
    }

    // Validasyon
    if (name !== undefined) {
      if (!name || !name.trim()) {
        return res.status(400).json({ message: "Kategori adı boş olamaz" });
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
          return res.status(400).json({ message: "Üst kategori bulunamadı" });
        }

        // Alt kategori, başka bir alt kategorinin altına eklenemez
        if (parentExists.parentCategory) {
          return res.status(400).json({
            message: "Alt kategori, başka bir alt kategorinin altına eklenemez",
          });
        }

        // Kendi altına eklenemez
        if (parentCategory === req.params.id) {
          return res.status(400).json({
            message: "Kategori kendi altına eklenemez",
          });
        }

        // Alt kategorileri varsa, ana kategori yapılamaz
        const hasSubCategories = await Category.findOne({
          parentCategory: category._id,
        });
        if (hasSubCategories && parentCategory !== null) {
          return res.status(400).json({
            message:
              "Alt kategorileri olan bir kategori, başka bir kategorinin altına eklenemez",
          });
        }

        category.parentCategory = parentCategory;
      }
    }

    // Menü özelliklerini güncelle (varsa)
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
      if (!["_self", "_blank"].includes(menuTarget)) {
        return res.status(400).json({
          message: "MenuTarget değeri _self veya _blank olmalıdır",
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

    await category.populate("parentCategory", "name");

    res.json(category);
  } catch (err) {
    if (err.name === "CastError") {
      return res.status(400).json({ message: "Geçersiz kategori ID" });
    }
    if (err.code === 11000) {
      return res.status(400).json({
        message: "Bu isimde bir kategori zaten mevcut",
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
      return res.status(404).json({ message: "Kategori bulunamadı" });
    }

    // Alt kategorileri var mı kontrol et
    const subCategories = await Category.find({
      parentCategory: category._id,
    });

    if (subCategories.length > 0) {
      return res.status(400).json({
        message:
          "Alt kategorileri olan bir kategori silinemez. Önce alt kategorileri silin.",
      });
    }

    await Category.findByIdAndDelete(req.params.id);

    res.json({
      message: "Kategori başarıyla silindi",
      deletedCategory: category,
    });
  } catch (err) {
    if (err.name === "CastError") {
      return res.status(400).json({ message: "Geçersiz kategori ID" });
    }
    res.status(500).json({ message: err.message });
  }
};

// @desc    Kategori beğen
// @route   POST /api/admin/categories/:id/like
// @access  Private
const likeCategory = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);

    if (!category) {
      return res.status(404).json({ message: "Kategori bulunamadı" });
    }

    category.likes = (category.likes || 0) + 1;
    await category.save();

    res.json({
      message: "Kategori beğenildi",
      likes: category.likes,
      category,
    });
  } catch (err) {
    if (err.name === "CastError") {
      return res.status(400).json({ message: "Geçersiz kategori ID" });
    }
    res.status(500).json({ message: err.message });
  }
};

// @desc    Kategori beğenisini kaldır
// @route   POST /api/admin/categories/:id/unlike
// @access  Private
const unlikeCategory = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);

    if (!category) {
      return res.status(404).json({ message: "Kategori bulunamadı" });
    }

    category.likes = Math.max(0, (category.likes || 0) - 1);
    await category.save();

    res.json({
      message: "Kategori beğenisi kaldırıldı",
      likes: category.likes,
      category,
    });
  } catch (err) {
    if (err.name === "CastError") {
      return res.status(400).json({ message: "Geçersiz kategori ID" });
    }
    res.status(500).json({ message: err.message });
  }
};

// @desc    Tüm kategorilere slug ekle (mevcut kategoriler için)
// @route   POST /api/admin/categories/generate-slugs
// @access  Private
const generateSlugsForAllCategories = async (req, res) => {
  try {
    // Önce ana kategorileri işle
    const mainCategories = await Category.find({ parentCategory: null });
    let updated = 0;

    for (const category of mainCategories) {
      if (!category.slug && category.name) {
        category.slug = category.name
          .toLowerCase()
          .replace(/ğ/g, "g")
          .replace(/ü/g, "u")
          .replace(/ş/g, "s")
          .replace(/ı/g, "i")
          .replace(/ö/g, "o")
          .replace(/ç/g, "c")
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)/g, "");

        // Eğer link `/api/` ile başlamıyorsa, slug bazlı oluştur
        if (
          !category.link ||
          !category.link.trim() ||
          !category.link.startsWith("/api/")
        ) {
          category.link = `/api/categories/${category.slug}`;
        }

        await category.save();
        updated++;
      }
    }

    // Sonra alt kategorileri işle
    const subCategories = await Category.find({
      parentCategory: { $ne: null },
    });

    for (const category of subCategories) {
      if (!category.slug && category.name) {
        category.slug = category.name
          .toLowerCase()
          .replace(/ğ/g, "g")
          .replace(/ü/g, "u")
          .replace(/ş/g, "s")
          .replace(/ı/g, "i")
          .replace(/ö/g, "o")
          .replace(/ç/g, "c")
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)/g, "");

        // Eğer link `/api/` ile başlamıyorsa, slug bazlı oluştur
        if (
          !category.link ||
          !category.link.trim() ||
          !category.link.startsWith("/api/")
        ) {
          const parent = await Category.findById(category.parentCategory);
          if (parent && parent.slug) {
            category.link = `/api/categories/${parent.slug}/${category.slug}`;
          } else {
            category.link = `/api/articles/category/${category._id}`;
          }
        }

        await category.save();
        updated++;
      }
    }

    res.json({
      message: `${updated} kategori güncellendi`,
      updated,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  getCategories,
  getCategory,
  createCategory,
  updateCategory,
  deleteCategory,
  likeCategory,
  unlikeCategory,
  generateSlugsForAllCategories,
};
