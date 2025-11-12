// models/Menu.js
const mongoose = require('mongoose');

const menuSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  link: {
    type: String,
    required: true,
    trim: true
  },
  icon: {
    type: String,
    default: '',
    trim: true
  },
  order: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  target: {
    type: String,
    default: '_self', // _self veya _blank
    enum: ['_self', '_blank']
  },
  parentMenu: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Menu',
    default: null // null ise ana menü, dolu ise alt menü
  }
}, { timestamps: true });

// Aynı parentMenu altında name unique olmalı
menuSchema.index({ name: 1, parentMenu: 1 }, { unique: true });

// Sıralama için index
menuSchema.index({ order: 1 });

module.exports = mongoose.model('Menu', menuSchema);

