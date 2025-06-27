const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const returnRequestSchema = new Schema({
    order_detail_id: {
        type: Schema.Types.ObjectId,
        ref: 'OrderDetail',
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
    quality: {
        type: Number,
        required: true,
        min: 1
    },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected', 'completed'],
        default: 'pending'
    },
    images: [{
        // type: String,
        // required: true
        url: { type: String, required: true },
        public_id: { type: String, required: true }
    }]
}, {
    timestamps: true
});

module.exports = mongoose.model('ReturnRequest', returnRequestSchema);