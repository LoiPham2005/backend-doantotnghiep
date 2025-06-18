const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const cartSchema = new Schema({
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    variant_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ShoesVariant',
        required: true
    },
    quantity: {
        type: Number,
        required: true,
        min: 1
    }
}, {
    timestamps: true
});

// Thêm index để đảm bảo một user không thể thêm cùng một variant nhiều lần
cartSchema.index({ user_id: 1, variant_id: 1 }, { unique: true });

module.exports = mongoose.model('Cart', cartSchema);