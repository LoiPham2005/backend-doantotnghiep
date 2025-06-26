const PaymentHistory = require('../models/payment_history.model');
const Order = require('../models/orders.model');
const User = require('../models/user.model');
const mongoose = require('mongoose');

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
            const { page = 1, limit = 1000 } = req.query;

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
            const { page = 1, limit = 1000 } = req.query;

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
    },

    // Tìm kiếm lịch sử thanh toán
    searchPaymentHistory: async (req, res) => {
        try {
            const { keyword } = req.query;

            // Xây dựng query tìm kiếm cơ bản
            let query = {};

            if (keyword) {
                // Tìm users theo username hoặc email
                const users = await User.find({
                    $or: [
                        { username: { $regex: keyword, $options: 'i' } },
                        { email: { $regex: keyword, $options: 'i' } }
                    ]
                });

                // Lấy user IDs
                const userIds = users.map(user => user._id);

                query.$or = [];

                // Tìm theo user
                if (userIds.length > 0) {
                    query.$or.push({ user_id: { $in: userIds } });
                }

                // Tìm theo order ID nếu là ObjectId hợp lệ
                if (mongoose.Types.ObjectId.isValid(keyword)) {
                    query.$or.push({ order_id: new mongoose.Types.ObjectId(keyword) });
                }

                // Nếu không có điều kiện tìm kiếm nào khớp
                if (query.$or.length === 0) {
                    delete query.$or;
                }
            }

            // Thực hiện tìm kiếm với populate
            const payments = await PaymentHistory.find(query)
                .populate({
                    path: 'user_id',
                    select: 'username email'
                })
                .populate({
                    path: 'order_id',
                    select: 'payment_method status'
                })
                .sort({ createdAt: -1 });

            res.status(200).json({
                status: 200,
                message: "Kết quả tìm kiếm",
                data: {
                    payments
                }
            });

        } catch (error) {
            console.error("Error searching payment history:", error);
            res.status(500).json({
                status: 500,
                message: "Lỗi khi tìm kiếm lịch sử thanh toán",
                error: error.message
            });
        }
    }
};