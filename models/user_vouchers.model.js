const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const userVoucherSchema = new Schema({
    user_id: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    voucher_id: {
        type: Schema.Types.ObjectId,
        ref: 'Voucher',
        required: true
    },
    status: {
        type: String,
        enum: ['available', 'used', 'expired'],
        default: 'available'
    }
}, {
    timestamps: true
});

// Đảm bảo mỗi user chỉ có thể nhận mỗi voucher một lần
userVoucherSchema.index({ user_id: 1, voucher_id: 1 }, { unique: true });

module.exports = mongoose.model('UserVoucher', userVoucherSchema);