// controllers/dashboardController.js
const Article = require('../models/Article');
const Category = require('../models/Category');

// @desc    Dashboard istatistiklerini getir
// @route   GET /api/admin/dashboard
// @access  Private (JWT)
const getDashboardStats = async (req, res) => {
  try {
    // Paralel olarak tüm istatistikleri getir
    const [
      totalCategories,
      totalArticles,
      publishedArticles,
      draftArticles,
      recentArticles
    ] = await Promise.all([
      // Toplam kategori sayısı
      Category.countDocuments(),
      
      // Toplam makale sayısı
      Article.countDocuments(),
      
      // Yayınlanan makale sayısı
      Article.countDocuments({ status: 'published' }),
      
      // Taslak makale sayısı
      Article.countDocuments({ status: 'draft' }),
      
      // Son eklenen 5 makale
      Article.find()
        .populate('category', 'name')
        .populate('author', 'name')
        .select('title status category author createdAt image')
        .sort({ createdAt: -1 })
        .limit(5)
    ]);
    
    res.json({
      stats: {
        totalCategories,
        totalArticles,
        publishedArticles,
        draftArticles
      },
      recentArticles
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { 
  getDashboardStats
};

