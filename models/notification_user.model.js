const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const notificationUserSchema = new Schema({
    notification_id: {
        type: Schema.Types.ObjectId,
        ref: 'Notification',
        required: true
    },
    user_id: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    is_read: {
        type: Boolean,
        default: false
    },
    received_at: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Đảm bảo mỗi user chỉ nhận một thông báo một lần
notificationUserSchema.index({ notification_id: 1, user_id: 1 }, { unique: true });

module.exports = mongoose.model('NotificationUser', notificationUserSchema);