// models/About.js
const mongoose = require('mongoose');

const aboutSchema = new mongoose.Schema({
  photo: {
    type: String,
    default: null
  },
  text: {
    type: String,
    required: true,
    trim: true
  },
  quote: {
    type: String,
    default: null,
    trim: true
  }
}, { timestamps: true });

module.exports = mongoose.model('About', aboutSchema);

