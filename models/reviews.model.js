const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const reviewSchema = new Schema({
    user_id: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    product_id: {
        type: Schema.Types.ObjectId,
        ref: 'Shoes',
        required: true
    },
    variant_id: {  // Thêm trường variant_id
        type: Schema.Types.ObjectId,
        ref: 'ShoesVariant',
        required: true
    },
    order_id: {
        type: Schema.Types.ObjectId,
        ref: 'Order',
        required: true
    },
    rating: {
        type: Number,
        required: true,
        min: 1,
        max: 5
    },
    comment: {
        type: String,
        required: true
    },
    media: [{
        type: {
            type: String,
            enum: ['image', 'video'],
        },
        url: String,
        public_id: String
    }],
    is_verified: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

// Sửa lại index để thêm variant_id
reviewSchema.index({ user_id: 1, product_id: 1, variant_id: 1, order_id: 1 }, { unique: true });

module.exports = mongoose.model('Review', reviewSchema);