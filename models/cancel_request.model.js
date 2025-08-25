const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const cancelRequestSchema = new Schema({
    order_id: {
        type: Schema.Types.ObjectId,
        ref: 'Order',
        required: true
    },
    user_id: {
        type: Schema.Types.Mixed, // Cho phép cả ObjectId và string
        required: true
    },
    reason: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
    },
    is_admin_cancel: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('CancelRequest', cancelRequestSchema);