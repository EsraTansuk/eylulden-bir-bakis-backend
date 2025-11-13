// models/Category.js
const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  parentCategory: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    default: null // null ise ana kategori, dolu ise alt kategori
  },
  likes: {
    type: Number,
    default: 0
  }
}, { timestamps: true });

// Aynı parentCategory altında name unique olmalı
categorySchema.index({ name: 1, parentCategory: 1 }, { unique: true });

module.exports = mongoose.model('Category', categorySchema);