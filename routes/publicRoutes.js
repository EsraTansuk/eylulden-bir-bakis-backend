// routes/publicRoutes.js
const express = require('express');
const router = express.Router();
const {
  getPublicArticles,
  getPublicArticle,
  getArticlesByCategory
} = require('../controllers/articleController');
const {
  getPublicMenus
} = require('../controllers/menuController');

// Public makale endpoint'leri (JWT gerekmez)
// ÖNEMLİ: Daha spesifik route'lar önce gelmeli
router.get('/articles/category/:categoryId', getArticlesByCategory);
router.get('/articles', getPublicArticles);
router.get('/articles/:slugOrId', getPublicArticle);

// Public menü endpoint'leri (JWT gerekmez)
router.get('/menus', getPublicMenus);

module.exports = router;

