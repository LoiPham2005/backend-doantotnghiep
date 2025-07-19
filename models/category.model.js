const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const categorys = new Schema({
    media: { type: String, required: true },
    cloudinary_id: { type: String, required: true },
    name: { type: String, required: true, unique: true },
    brand_id: { type: Schema.Types.ObjectId, ref: 'Brand', required: true }, // Thêm trường brand_id
    is_active: { type: Boolean, default: true },
}, {
    timestamps: true,
});

module.exports = mongoose.model('Category', categorys);
