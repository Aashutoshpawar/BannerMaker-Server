const mongoose = require('mongoose');

const creationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, required: true },
  isDraft: { type: Boolean, default: true },

  canvas: {
    width: { type: Number, required: true },
    height: { type: Number, required: true },
  },

  texts: [
    {
      id: { type: String, required: true },
      value: { type: String, required: true },
      font: { type: String, default: "Arial" },
      size: { type: Number, default: 16 },
      color: { type: String, default: "#000000" },
      opacity: { type: Number, default: 1 },
      bold: { type: Boolean, default: false },
      italic: { type: Boolean, default: false },
      underline: { type: Boolean, default: false },
      format: { type: String, enum: ["uppercase", "lowercase", "capitalize", "none"], default: "none" },
      align: { type: String, enum: ["left", "center", "right"], default: "left" },
      rotation: { type: Number, default: 0 },
      scale: { type: Number, default: 1 },
      x: { type: Number, required: true },
      y: { type: Number, required: true },
    },
  ],

  stickers: [
    {
      id: { type: String, required: true },
      uri: { type: String, required: true },
      opacity: { type: Number, default: 1 },
      hue: { type: Number, default: 0 },
      rotation: { type: Number, default: 0 },
      scale: { type: Number, default: 1 },
      x: { type: Number, required: true },
      y: { type: Number, required: true },
    },
  ],

  images: [
    {
      id: { type: String, required: true },
      uri: { type: String, required: true },
      rotation: { type: Number, default: 0 },
      scale: { type: Number, default: 1 },
      x: { type: Number, required: true },
      y: { type: Number, required: true },
    },
  ],

  background: {
    isGradient: { type: Boolean, default: false },
    gradientColors: [{ type: String }],
    image: { type: String, default: null },
  },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
},
  { collection: 'Creation', versionKey: false }
);

// exactly match your MongoDB collection name
module.exports = mongoose.model('Creation', creationSchema);

// module.exports = mongoose.model('CollectionName', schema);
// CollectionName should be the plural form of the model name (e.g., 'Banner' -> 'Banners')
