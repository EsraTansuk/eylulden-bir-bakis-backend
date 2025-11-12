// routes/adminRoutes.js
const express = require('express');
const router = express.Router();
const { login } = require('../controllers/authController');
const { getCategories, createCategory } = require('../controllers/categoryController');
const { protect } = require('../middleware/auth');

// Public
router.post('/login', login);

// Protected (JWT gerekli)
router.get('/categories', protect, getCategories);
router.post('/categories', protect, createCategory);

module.exports = router;