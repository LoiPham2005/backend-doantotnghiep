const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const voucherSchema = new Schema({
    name: {
        type: String,
        required: true
    },
    code: {
        type: String,
        required: true,
        unique: true
    },
    type: {                      // Thêm trường type để phân biệt
        type: String,
        enum: ['order', 'shipping'],  // Voucher giảm giá đơn hoặc giảm phí ship
        required: true
    },
    discount_type: {
        type: String,
        enum: ['percentage', 'fixed'],
        required: true
    },
    discount_value: {
        type: Number,
        required: true
    },
    minimum_order_value: {
        type: Number,
        required: true,
        default: 0
    },
    maximum_discount: {
        type: Number,
        required: true
    },
    start_date: {
        type: Date,
        required: true
    },
    end_date: {
        type: Date,
        required: true
    },
    quantity: {
        type: Number,
        required: true,
        min: 0
    },
    is_active: {                // Thêm trường trạng thái
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Voucher', voucherSchema);