const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const Users = new Schema({
    avatar: { type: String, default: null },
    cloudinary_id: { type: String, default: null }, // Thêm trường riêng cho cloudinary_id
    fullname: { type: String },
    username: { type: String, unique: true, required: true },
    email: { type: String, required: true },
    password: { type: String, required: true },
    phone: { type: String, default: '' },
    sex: { type: String, default: '' },
    birthDate: { type: Date, default: Date.now },
    role: {
        type: String,
        enum: ['user', 'admin'],
        default: 'user'
    },
    refreshToken: {
        type: String,
        required: false
    },
    is_active: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true,
});

// Method to check if user is admin
Users.methods.isAdmin = function () {
    return this.role === 'admin';
};

module.exports = mongoose.model('User', Users);