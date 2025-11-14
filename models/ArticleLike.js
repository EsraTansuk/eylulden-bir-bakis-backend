// models/ArticleLike.js
const mongoose = require('mongoose');

const articleLikeSchema = new mongoose.Schema({
  article: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Article',
    required: true
  },
  ipAddress: {
    type: String,
    required: true
  }
}, { timestamps: true });

// Aynı IP'den aynı makale için tekrar beğeni yapılamaz
articleLikeSchema.index({ article: 1, ipAddress: 1 }, { unique: true });

module.exports = mongoose.model('ArticleLike', articleLikeSchema);

