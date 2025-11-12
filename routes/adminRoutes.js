// routes/adminRoutes.js
const express = require('express');
const router = express.Router();
const { login } = require('../controllers/authController');
const { 
  getCategories, 
  getCategory,
  createCategory, 
  updateCategory,
  deleteCategory
} = require('../controllers/categoryController');
const { protect } = require('../middleware/auth');

// Public
router.post('/login', login);

// Protected (JWT gerekli)
// Kategori işlemleri
router.get('/categories', protect, getCategories);
router.get('/categories/:id', protect, getCategory);
router.post('/categories', protect, createCategory);
router.put('/categories/:id', protect, updateCategory);
router.delete('/categories/:id', protect, deleteCategory);

module.exports = router;