const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const orderSchema = new Schema({
    user_id: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    total_price: {
        type: Number,
        required: true
    },
    order_voucher_id: {           // Đổi từ user_voucher_id thành order_voucher_id
        type: Schema.Types.ObjectId,
        ref: 'Voucher'            // Reference trực tiếp tới Voucher
    },
    order_discount_amount: {      // Thêm trường mới
        type: Number,
        default: 0
    },
    ship_voucher_id: {           // Thêm trường mới
        type: Schema.Types.ObjectId,
        ref: 'Voucher'
    },
    ship_discount_amount: {      // Thêm trường mới
        type: Number,
        default: 0
    },
    shipping_fee: {
        type: Number,
        required: true,
        default: 0
    },
    discount: {
        type: Number,
        default: 0
    },
    final_total: {
        type: Number,
        required: true
    },
    payment_method: {
        type: String,
        enum: ['COD', 'banking'],
        required: true
    },
    address_id: {
        type: Schema.Types.ObjectId,
        ref: 'Address',
        required: true
    },
    status: {
        type: String,
        enum: [
            // 'pending',            // Chờ xác nhận
            // 'confirmed',          // Đã xác nhận
            // 'processing',         // Đang xử lý / chuẩn bị hàng
            // 'shipping',           // Đang vận chuyển
            // 'delivered',          // Đã giao hàng
            // 'received',           // Khách đã nhận hàng
            // 'cancelled',          // Đã hủy
            // 'return_requested',   // Khách yêu cầu trả hàng
            // 'return_accepted',    // Admin chấp nhận trả hàng
            // 'return_rejected',    // Admin từ chối trả hàng
            // 'returned',           // Hàng đã được trả
            // 'refunded'            // Đã hoàn tiền (nếu có)


            'pending',     // Chờ xác nhận
            'processing',  // Đã xác nhận & chuẩn bị hàng
            'shipping',    // Đang giao hàng
            'delivered',   // Đã giao
            'returned',    // Trả hàng
            'cancelled',    // Đã hủy

        ],
        default: 'pending'
    },
    // user_voucher_id: {           // Thay đổi từ voucher_id thành user_voucher_id
    //     type: Schema.Types.ObjectId,
    //     ref: 'UserVoucher'       // Thay đổi reference sang UserVoucher
    // },
    momo_trans_id: {
        type: String,
        sparse: true
    },
    delivery_date: {
        type: Date,
        default: null
    },
    note: { // Ghi chú của khách hàng
        type: String,
        default: ''
    },
}, {
    timestamps: true
});

module.exports = mongoose.model('Order', orderSchema);