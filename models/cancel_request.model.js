const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const cancelRequestSchema = new Schema({
    order_id: {
        type: Schema.Types.ObjectId,
        ref: 'Order',
        required: true
    },
    user_id: {
        type: Schema.Types.ObjectId, 
        ref: 'User',
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
}, {
    timestamps: true
});

module.exports = mongoose.model('CancelRequest', cancelRequestSchema);