const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const orderDetailSchema = new Schema({
    order_id: {
        type: Schema.Types.ObjectId,
        ref: 'Order',
        required: true
    },
    variant_id: {
        type: Schema.Types.ObjectId,
        ref: 'ShoesVariant',
        required: true
    },
    price_at_purchase: {
        type: Number,
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

module.exports = mongoose.model('OrderDetail', orderDetailSchema);