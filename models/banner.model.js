const mongoose = require('mongoose');

const bannerSchema = new mongoose.Schema({
    media: { type: String, required: true },
    cloudinary_id: { type: String, required: true }
}, {
    timestamps: true
});

module.exports = mongoose.model('Banner', bannerSchema);
