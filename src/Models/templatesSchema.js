const mongoose = require('mongoose');
const { collection } = require('./creationSchema');
const { Schema } = mongoose;
const templatesSchema = new Schema({
    name: { type: String, required: true },
    category: { type: String, required: true },
    imageUrl: { type: String, required: true },
    tags: { type: [String], default: [] },
},
    { timestamps: true },
    { collection: 'templates' }
);
module.exports = mongoose.model('Template', templatesSchema);