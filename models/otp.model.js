const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const OTPSchema = new Schema({
    email: { type: String, required: true },
    otp: { type: String, required: true },
    otpExpire: { type: Date, required: true },
}, {
    timestamps: true,
});

// Thêm TTL index để tự động xóa document hết hạn
OTPSchema.index({ "otpExpire": 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('OTP', OTPSchema);
