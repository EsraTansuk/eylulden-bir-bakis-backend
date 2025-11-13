// models/Category.js
const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  slug: {
    type: String,
    unique: true,
    sparse: true,
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
  },
  // Menü özellikleri
  link: {
    type: String,
    default: '',
    trim: true
  },
  icon: {
    type: String,
    default: '',
    trim: true
  },
  menuOrder: {
    type: Number,
    default: 0
  },
  isActiveInMenu: {
    type: Boolean,
    default: true
  },
  menuTarget: {
    type: String,
    default: '_self',
    enum: ['_self', '_blank']
  }
}, { timestamps: true });

// Aynı parentCategory altında name unique olmalı
categorySchema.index({ name: 1, parentCategory: 1 }, { unique: true });
// Menü sıralama için index
categorySchema.index({ menuOrder: 1 });
// Slug index
categorySchema.index({ slug: 1 });

// Slug oluşturma (name'den)
categorySchema.pre('save', function(next) {
  // Slug yoksa veya name değiştiyse slug oluştur
  if (this.name && (!this.slug || this.isModified('name'))) {
    this.slug = this.name
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
  next();
});


module.exports = mongoose.model('Category', categorySchema);