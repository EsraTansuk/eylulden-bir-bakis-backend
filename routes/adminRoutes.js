// routes/adminRoutes.js
const express = require('express');
const router = express.Router();
const { login } = require('../controllers/authController');
const { 
  getCategories, 
  getCategory,
  createCategory, 
  updateCategory,
  deleteCategory,
  likeCategory,
  unlikeCategory
} = require('../controllers/categoryController');
const {
  getMenus,
  getMenu,
  createMenu,
  updateMenu,
  deleteMenu
} = require('../controllers/menuController');
const {
  getArticles,
  getArticle,
  createArticle,
  updateArticle,
  deleteArticle,
  updateArticleStatus
} = require('../controllers/articleController');
const {
  getContact,
  updateContact,
  deleteContact
} = require('../controllers/contactController');
const { protect } = require('../middleware/auth');
const upload = require('../middleware/upload');

// Public
router.post('/login', login);

// Protected (JWT gerekli)
// Kategori işlemleri
router.get('/categories', protect, getCategories);
router.get('/categories/:id', protect, getCategory);
router.post('/categories', protect, createCategory);
router.put('/categories/:id', protect, updateCategory);
router.delete('/categories/:id', protect, deleteCategory);
router.post('/categories/:id/like', protect, likeCategory);
router.post('/categories/:id/unlike', protect, unlikeCategory);

// Menü işlemleri
router.get('/menus', protect, getMenus);
router.get('/menus/:id', protect, getMenu);
router.post('/menus', protect, createMenu);
router.put('/menus/:id', protect, updateMenu);
router.delete('/menus/:id', protect, deleteMenu);

// Makale işlemleri
router.get('/articles', protect, getArticles);
router.get('/articles/:id', protect, getArticle);
router.post('/articles', protect, upload.single('image'), createArticle);
router.put('/articles/:id', protect, upload.single('image'), updateArticle);
router.delete('/articles/:id', protect, deleteArticle);
router.patch('/articles/:id/status', protect, updateArticleStatus);

// İletişim bilgileri işlemleri
router.get('/contact', protect, getContact);
router.put('/contact', protect, updateContact);
router.delete('/contact', protect, deleteContact);

module.exports = router;