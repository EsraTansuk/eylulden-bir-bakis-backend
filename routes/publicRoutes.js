// routes/publicRoutes.js
const express = require('express');
const router = express.Router();
const {
  getPublicArticles,
  getLatestArticles,
  getPublicArticle,
  getArticlesByCategory,
  getArticlesByCategorySlug,
  getPopularArticles,
  likeArticle,
  unlikeArticle
} = require('../controllers/articleController');
const {
  getPublicMenus
} = require('../controllers/menuController');
const {
  getPublicContact
} = require('../controllers/contactController');

// Public makale endpoint'leri (JWT gerekmez)
// ÖNEMLİ: Daha spesifik route'lar önce gelmeli
router.get('/articles/popular', getPopularArticles);
router.get('/articles/latest', getLatestArticles);
router.get('/articles/category/:categoryId', getArticlesByCategory);
router.get('/articles', getPublicArticles);
// ÖNEMLİ: Beğeni endpoint'leri slug'dan önce gelmeli
router.post('/articles/:slugOrId/like', likeArticle);
router.post('/articles/:slugOrId/unlike', unlikeArticle);
router.get('/articles/:slugOrId', getPublicArticle);

// Public kategori endpoint'leri (slug bazlı)
// ÖNEMLİ: Daha spesifik route'lar önce gelmeli (parent/child)
router.get('/categories/:parentSlug/:childSlug', getArticlesByCategorySlug);
router.get('/categories/:slug', getArticlesByCategorySlug);

// Public menü endpoint'leri (JWT gerekmez)
router.get('/menus', getPublicMenus);

// Public iletişim bilgileri endpoint'leri (JWT gerekmez)
router.get('/contact', getPublicContact);

module.exports = router;

