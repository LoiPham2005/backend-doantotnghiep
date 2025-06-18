const Order = require('../models/orders.model');
const OrderDetail = require('../models/order_details.model');
const Cart = require('../models/carts.model');
const Voucher = require('../models/vouchers.model');
const UserVoucher = require('../models/user_vouchers.model');
const ShoesVariant = require('../models/shoes_variant.model');

module.exports = {
    // Tạo đơn hàng mới
    createOrder: async (req, res) => {
        try {
            const newOrder = new Order(req.body);
            const savedOrder = await newOrder.save();

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
            const { status, page = 1, limit = 10 } = req.query;
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
    }
};