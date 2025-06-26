const Order = require('../models/orders.model');
const OrderDetail = require('../models/order_details.model');
const Cart = require('../models/carts.model');
const Voucher = require('../models/vouchers.model');
const UserVoucher = require('../models/user_vouchers.model');
const ShoesVariant = require('../models/shoes_variant.model');
const User = require('../models/user.model'); // Sửa từ users.model thành user.model
const mongoose = require('mongoose');
const PaymentHistory = require('../models/payment_history.model'); // Thêm import này
const NotificationUser = require('../models/notification_user.model');
const Notification = require('../models/notification.model');

// Hàm tạo thông báo đơn hàng mới
const createOrderNotification = async (order) => {
    try {
        // Tạo thông báo mới
        const newNotification = new Notification({
            title: 'Đơn hàng mới',
            content: `Có đơn hàng mới #${order._id.toString().slice(-6)} cần xử lý`,
            type: 'order',
            createdAt: new Date()
        });

        const savedNotification = await newNotification.save();

        // Chỉ tạo thông báo cho admin
        const admins = await User.find({ role: 'admin' });
        if (admins && admins.length > 0) {
            // Tạo mảng thông báo cho admin
            const adminNotifications = admins.map(admin => ({
                notification_id: savedNotification._id,
                user_id: admin._id,
                is_read: false,
                received_at: new Date()
            }));

            // Thêm unique index để tránh duplicate
            await NotificationUser.collection.createIndex(
                { notification_id: 1, user_id: 1 },
                { unique: true }
            );

            // Lưu thông báo chỉ cho admin
            await NotificationUser.insertMany(adminNotifications, { ordered: false });
        }

    } catch (error) {
        console.error('Error creating order notification:', error);
    }
};

module.exports = {
    // Tạo đơn hàng mới
    createOrder: async (req, res) => {
        try {
            const {
                user_id,
                address_id,
                total_price,
                shipping_fee,
                discount,
                final_total,
                payment_method,
                user_voucher_id,
                orderDetails
            } = req.body;

            // Kiểm tra role của người dùng
            const user = await User.findById(user_id);
            if (!user || user.role !== 'user') {
                return res.status(403).json({
                    status: 403,
                    message: "Chỉ người dùng mới có thể tạo đơn hàng"
                });
            }

            // 1. Tạo đơn hàng mới
            const newOrder = new Order({
                user_id,
                address_id,
                total_price,
                shipping_fee,
                discount,
                final_total,
                payment_method,
                user_voucher_id,
                status: 'pending'
            });

            const savedOrder = await newOrder.save();

            // Tạo thông báo chỉ cho admin sau khi lưu đơn hàng
            await createOrderNotification(savedOrder);

            // 2. Tạo chi tiết đơn hàng
            const orderDetailsPromises = orderDetails.map(async (detail) => {
                // Kiểm tra và cập nhật số lượng trong kho
                const variant = await ShoesVariant.findById(detail.variant_id);

                if (!variant) {
                    throw new Error(`Không tìm thấy biến thể sản phẩm với ID: ${detail.variant_id}`);
                }

                if (variant.quantity_in_stock < detail.quantity) {
                    throw new Error(`Sản phẩm ${variant._id} không đủ số lượng trong kho`);
                }

                // Cập nhật số lượng trong kho
                variant.quantity_in_stock -= detail.quantity;
                await variant.save();

                // Tạo chi tiết đơn hàng
                return new OrderDetail({
                    order_id: savedOrder._id,
                    variant_id: detail.variant_id,
                    quantity: detail.quantity,
                    price_at_purchase: detail.price
                }).save();
            });

            const savedOrderDetails = await Promise.all(orderDetailsPromises);

            // 3. Nếu có sử dụng voucher, cập nhật trạng thái voucher
            if (user_voucher_id) {
                await UserVoucher.findByIdAndUpdate(user_voucher_id, {
                    status: 'used',
                    used_date: new Date()
                });
            }

            // 4. Xóa giỏ hàng của user
            await Cart.deleteMany({ user_id });

            // 5. Tạo payment history
            const newPayment = new PaymentHistory({
                user_id,
                order_id: savedOrder._id,
                amount: final_total // Sử dụng final_total đã tính cả shipping và discount
            });

            await newPayment.save();

            res.status(200).json({
                status: 200,
                message: "Đặt hàng thành công",
                data: {
                    order: savedOrder,
                    orderDetails: savedOrderDetails,
                    payment: newPayment
                }
            });

        } catch (error) {
            console.error("Error creating order:", error);
            res.status(500).json({
                status: 500,
                message: "Lỗi khi tạo đơn hàng",
                error: error.message
            });
        }
    },

    createOrderDetails: async (req, res) => {
        try {
            const newOrder = new OrderDetail(req.body);
            const savedOrder = await newOrder.save();

            // Nếu có order details thì lưu
            // if (req.body.order_details && Array.isArray(req.body.order_details)) {
            //     const orderDetailsPromises = req.body.order_details.map(detail => {
            //         return new OrderDetail({
            //             order_id: savedOrder._id,
            //             variant_id: detail.variant_id,
            //             price_at_purchase: detail.price,
            //             quantity: detail.quantity
            //         }).save();
            //     });

            //     await Promise.all(orderDetailsPromises);
            // }

            res.status(200).json({
                status: 200,
                message: "Đặt hàng thành công",
                data: {
                    order: savedOrder
                }
            });
        } catch (error) {
            res.status(500).json({
                status: 500,
                message: "Lỗi khi tạo đơn hàng",
                error: error.message
            });
        }
    },

    // Lấy danh sách đơn hàng (admin)
    getAllOrders: async (req, res) => {
        try {
            const {
                status,
                page = 1,
                limit = 1000
            } = req.query;
            const query = {};

            if (status) {
                query.status = status;
            }

            const orders = await Order.find(query)
                .populate('user_id', 'username email')
                .populate('address_id')
                .populate({
                    path: 'user_voucher_id',
                    populate: {
                        path: 'voucher_id'
                    }
                })
                .sort({ createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(limit);

            const total = await Order.countDocuments(query);

            res.status(200).json({
                status: 200,
                message: "Danh sách đơn hàng",
                data: {
                    orders,
                    total,
                    currentPage: parseInt(page),
                    totalPages: Math.ceil(total / limit)
                }
            });
        } catch (error) {
            res.status(500).json({
                status: 500,
                message: "Lỗi khi lấy danh sách đơn hàng",
                error: error.message
            });
        }
    },

    // Lấy chi tiết đơn hàng theo ID
    getOrderById: async (req, res) => {
        try {
            const order = await Order.findById(req.params.id)
                .populate('user_id', 'username email')
                .populate('address_id')
                .populate({
                    path: 'user_voucher_id',
                    populate: {
                        path: 'voucher_id'
                    }
                });

            if (!order) {
                return res.status(404).json({
                    status: 404,
                    message: "Không tìm thấy đơn hàng"
                });
            }

            const orderDetails = await OrderDetail.find({ order_id: order._id })
                .populate({
                    path: 'variant_id',
                    populate: [
                        { path: 'shoes_id' },
                        { path: 'size_id' },
                        { path: 'color_id' }
                    ]
                });

            res.status(200).json({
                status: 200,
                message: "Chi tiết đơn hàng",
                data: {
                    order,
                    orderDetails
                }
            });
        } catch (error) {
            res.status(500).json({
                status: 500,
                message: "Lỗi khi lấy chi tiết đơn hàng",
                error: error.message
            });
        }
    },

    // Cập nhật trạng thái đơn hàng
    updateOrderStatus: async (req, res) => {
        try {
            const { status } = req.body;
            console.log('Received status:', status); // Debug log

            const order = await Order.findById(req.params.id);
            if (!order) {
                return res.status(404).json({
                    status: 404,
                    message: "Không tìm thấy đơn hàng"
                });
            }

            // Cập nhật validate status transition
            const validTransitions = {
                'pending': ['confirmed', 'cancelled'],
                'confirmed': ['processing', 'cancelled'],
                'processing': ['shipping', 'cancelled'],
                'shipping': ['delivered', 'cancelled'],
                'delivered': ['received', 'return_requested'],
                'received': ['return_requested'],
                'return_requested': ['return_accepted', 'return_rejected'],
                'return_accepted': ['returned'],
                'return_rejected': ['cancelled'],
                'returned': ['refunded'],
                'refunded': [], // Trạng thái cuối
                'cancelled': [] // Trạng thái cuối
            };

            if (!validTransitions[order.status]?.includes(status)) {
                return res.status(400).json({
                    status: 400,
                    message: `Không thể chuyển từ trạng thái ${order.status} sang ${status}`
                });
            }

            order.status = status;
            await order.save();

            res.status(200).json({
                status: 200,
                message: "Cập nhật trạng thái đơn hàng thành công",
                data: order
            });

        } catch (error) {
            console.error('Update order status error:', error); // Debug log
            res.status(500).json({
                status: 500,
                message: "Lỗi khi cập nhật trạng thái đơn hàng",
                error: error.message
            });
        }
    },

    // Lấy danh sách đơn hàng của user 
    getUserOrders: async (req, res) => {
        try {
            const { user_id } = req.params;
            const { status } = req.query;
            const query = { user_id };

            if (status) {
                query.status = status;
            }

            const orders = await Order.find(query)
                .populate('address_id')
                .populate({
                    path: 'user_voucher_id',
                    populate: {
                        path: 'voucher_id'
                    }
                })
                .sort({ createdAt: -1 });

            const ordersWithDetails = await Promise.all(orders.map(async (order) => {
                const details = await OrderDetail.find({ order_id: order._id })
                    .populate({
                        path: 'variant_id',
                        populate: [
                            { path: 'shoes_id' },
                            { path: 'size_id' },
                            { path: 'color_id' }
                        ]
                    });
                return {
                    ...order._doc,
                    details
                };
            }));

            res.status(200).json({
                status: 200,
                message: "Danh sách đơn hàng của user",
                data: ordersWithDetails
            });
        } catch (error) {
            console.error('Error getting user orders:', error);
            res.status(500).json({
                status: 500,
                message: "Lỗi khi lấy danh sách đơn hàng",
                error: error.message
            });
        }
    },

    // Add search orders method
    searchOrders: async (req, res) => {
        try {
            const { keyword } = req.query;

            // Tìm users theo username hoặc email
            const users = await User.find({
                $or: [
                    { username: { $regex: keyword, $options: 'i' } },
                    { email: { $regex: keyword, $options: 'i' } }
                ]
            });

            // Lấy user IDs để tìm orders
            const userIds = users.map(user => user._id);

            let query = {};
            if (keyword) {
                query = {
                    $or: [
                        // Tìm theo ID nếu keyword là một ObjectId hợp lệ
                        ...(mongoose.Types.ObjectId.isValid(keyword) ? [{ _id: new mongoose.Types.ObjectId(keyword) }] : []),
                        // Tìm theo user đã tìm thấy
                        { user_id: { $in: userIds } },
                        // Tìm theo trạng thái
                        { status: { $regex: keyword, $options: 'i' } },
                        // Tìm theo phương thức thanh toán
                        { payment_method: { $regex: keyword, $options: 'i' } }
                    ]
                };
            }

            const orders = await Order.find(query)
                .populate('user_id', 'username email')
                .populate('address_id')
                .populate({
                    path: 'user_voucher_id',
                    populate: {
                        path: 'voucher_id'
                    }
                })
                .sort({ createdAt: -1 });

            res.status(200).json({
                status: 200,
                message: "Kết quả tìm kiếm",
                data: {
                    orders
                }
            });
        } catch (error) {
            console.error("Error searching orders:", error);
            res.status(500).json({
                status: 500,
                message: "Lỗi khi tìm kiếm đơn hàng",
                error: error.message
            });
        }
    }
};