const PaymentHistory = require('../models/payment_history.model');
const Order = require('../models/orders.model');
const User = require('../models/user.model');

module.exports = {
    // Tạo lịch sử thanh toán mới
    createPaymentHistory: async (req, res) => {
        try {
            const { user_id, order_id, amount } = req.body;

            // Validate order exists
            const order = await Order.findById(order_id);
            if (!order) {
                return res.status(404).json({
                    status: 404,
                    message: "Không tìm thấy đơn hàng"
                });
            }

            // Validate user exists
            const user = await User.findById(user_id);
            if (!user) {
                return res.status(404).json({
                    status: 404,
                    message: "Không tìm thấy người dùng"
                });
            }

            const newPayment = new PaymentHistory({
                user_id,
                order_id,
                amount
            });

            await newPayment.save();

            res.status(200).json({
                status: 200,
                message: "Tạo lịch sử thanh toán thành công",
                data: newPayment
            });

        } catch (error) {
            res.status(500).json({
                status: 500,
                message: "Lỗi khi tạo lịch sử thanh toán",
                error: error.message
            });
        }
    },

    // Lấy tất cả lịch sử thanh toán (Admin)
    getAllPaymentHistory: async (req, res) => {
        try {
            const { page = 1, limit = 10 } = req.query;

            const payments = await PaymentHistory.find()
                .populate('user_id', 'username email')
                .populate('order_id')
                .sort('-createdAt')
                .skip((page - 1) * limit)
                .limit(limit);

            const total = await PaymentHistory.countDocuments();

            res.status(200).json({
                status: 200,
                message: "Danh sách lịch sử thanh toán",
                data: {
                    payments,
                    total,
                    currentPage: parseInt(page),
                    totalPages: Math.ceil(total / limit)
                }
            });
        } catch (error) {
            console.error('Error:', error);
            res.status(500).json({
                status: 500,
                message: "Lỗi khi lấy danh sách thanh toán",
                error: error.message
            });
        }
    },

    // Lấy chi tiết một thanh toán
    getPaymentById: async (req, res) => {
        try {
            const payment = await PaymentHistory.findById(req.params.id)
                .populate('user_id', 'username email')
                .populate('order_id');

            if (!payment) {
                return res.status(404).json({
                    status: 404,
                    message: "Không tìm thấy lịch sử thanh toán"
                });
            }

            res.status(200).json({
                status: 200,
                message: "Chi tiết thanh toán",
                data: payment
            });
        } catch (error) {
            res.status(500).json({
                status: 500,
                message: "Lỗi khi lấy chi tiết thanh toán",
                error: error.message
            });
        }
    },

    // Lấy lịch sử thanh toán của một user
    getUserPaymentHistory: async (req, res) => {
        try {
            const { user_id } = req.params;
            const { page = 1, limit = 10 } = req.query;

            const payments = await PaymentHistory.find({ user_id })
                .populate('order_id')
                .sort('-createdAt')
                .skip((page - 1) * limit)
                .limit(limit);

            const total = await PaymentHistory.countDocuments({ user_id });

            res.status(200).json({
                status: 200,
                message: "Lịch sử thanh toán của người dùng",
                data: {
                    payments,
                    total,
                    currentPage: parseInt(page),
                    totalPages: Math.ceil(total / limit)
                }
            });
        } catch (error) {
            res.status(500).json({
                status: 500,
                message: "Lỗi khi lấy lịch sử thanh toán của người dùng",
                error: error.message
            });
        }
    },

    // Thống kê thanh toán theo thời gian
    getPaymentStatistics: async (req, res) => {
        try {
            const { start_date, end_date } = req.query;

            const matchQuery = {};
            if (start_date && end_date) {
                matchQuery.createdAt = {
                    $gte: new Date(start_date),
                    $lte: new Date(end_date)
                };
            }

            const stats = await PaymentHistory.aggregate([
                { $match: matchQuery },
                {
                    $group: {
                        _id: {
                            year: { $year: "$createdAt" },
                            month: { $month: "$createdAt" },
                            day: { $dayOfMonth: "$createdAt" }
                        },
                        totalAmount: { $sum: "$amount" },
                        count: { $sum: 1 }
                    }
                },
                { $sort: { "_id.year": -1, "_id.month": -1, "_id.day": -1 } }
            ]);

            res.status(200).json({
                status: 200,
                message: "Thống kê thanh toán",
                data: stats
            });
        } catch (error) {
            res.status(500).json({
                status: 500,
                message: "Lỗi khi lấy thống kê thanh toán",
                error: error.message
            });
        }
    }
};