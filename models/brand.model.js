const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const brand = new Schema({
    media: { type: String, required: true },
    name: { type: String, required: true, unique: true },
    is_active: { type: Boolean, default: true }, // Thêm trường is_active
}, {
    timestamps: true,
});

module.exports = mongoose.model('Brand', brand);
