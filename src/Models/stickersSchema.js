// src/Models/stickerSchema.js
const mongoose = require('mongoose');
const { Schema } = mongoose;

const stickerSchema = new Schema(
  {
    name: { type: String, required: true },
    category: { type: String, required: true },
    imageUrl: { type: String, required: true },
    tags: { type: [String], default: [] },
    width: Number,
    height: Number,
    format: String,
  },
  { timestamps: true, collection: 'stickers' }
);

module.exports = mongoose.model('Sticker', stickerSchema);
