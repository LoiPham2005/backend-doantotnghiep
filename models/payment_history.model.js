const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const paymentHistorySchema = new Schema({
    user_id: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    order_id: {
        type: Schema.Types.ObjectId,
        ref: 'Order',
        required: true
    },
    amount: {
        type: Number,
        required: true
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('PaymentHistory', paymentHistorySchema);