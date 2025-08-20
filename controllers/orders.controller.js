const Order = require('../models/orders.model');
const OrderDetail = require('../models/order_details.model');
const Cart = require('../models/carts.model');
const Voucher = require('../models/vouchers.model');
const UserVoucher = require('../models/user_vouchers.model');
const ShoesVariant = require('../models/shoes_variant.model');
const User = require('../models/user.model');
const mongoose = require('mongoose');
const PaymentHistory = require('../models/payment_history.model');
const NotificationUser = require('../models/notification_user.model');
const Notification = require('../models/notification.model');
const shoesModel = require('../models/shoes.model');
const CancelRequest = require('../models/cancel_request.model');
const ReturnRequest = require('../models/return_request.model');


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

// Thêm hàm helper để kiểm tra và cập nhật trạng thái sản phẩm
const updateProductStatus = async (shoesId) => {
    try {
        // Lấy tất cả variants của sản phẩm
        const variants = await ShoesVariant.find({ shoes_id: shoesId });

        // Kiểm tra nếu tất cả variants đều hết hàng
        const allOutOfStock = variants.every(v => v.quantity_in_stock === 0);

        if (allOutOfStock) {
            // Cập nhật trạng thái sản phẩm thành hết hàng
            await shoesModel.findByIdAndUpdate(shoesId, {
                status: 'out_of_stock',
                update_at: new Date()
            });
        }
    } catch (error) {
        console.error('Error updating product status:', error);
    }
};

// Thêm hàm kiểm tra số lượng tồn kho
const checkStockAvailability = async (orderDetails) => {
    for (const detail of orderDetails) {
        const variant = await ShoesVariant.findById(detail.variant_id);
        if (!variant) {
            throw new Error(`Không tìm thấy biến thể sản phẩm với ID: ${detail.variant_id}`);
        }
        if (variant.quantity_in_stock < detail.quantity) {
            throw new Error(`Sản phẩm ${variant.shoes_id.name || variant._id} chỉ còn ${variant.quantity_in_stock} sản phẩm trong kho`);
        }
    }
    return true;
};

// Thêm hàm kiểm tra voucher
const validateVoucher = async (orderVoucherId, shipVoucherId, totalPrice) => {
    try {
        let orderDiscount = 0;
        let shipDiscount = 0;

        // Validate order voucher
        // if (orderVoucherId) {
        //     const orderVoucher = await Voucher.findById(orderVoucherId);
        //     if (!orderVoucher || orderVoucher.type !== 'order') {
        //         throw new Error('Voucher giảm giá không hợp lệ');
        //     }
        //     // Validate và tính giảm giá đơn hàng
        //     orderDiscount = calculateDiscount(orderVoucher, totalPrice);
        // }

        // // Validate shipping voucher
        // if (shipVoucherId) {
        //     const shipVoucher = await Voucher.findById(shipVoucherId);
        //     if (!shipVoucher || shipVoucher.type !== 'shipping') {
        //         throw new Error('Voucher giảm phí ship không hợp lệ');
        //     }
        //     // Tính giảm giá ship
        //     shipDiscount = calculateShipDiscount(shipVoucher);
        // }

        return {
            isValid: true,
            orderDiscount,
            shipDiscount
        };
    } catch (error) {
        return {
            isValid: false,
            error: error.message
        };
    }
};

module.exports = {
    // Tạo đơn hàng mới
    createOrder: async (req, res) => {
        let savedOrder = null;
        let savedOrderDetails = [];
        let newPayment = null;

        try {
            const {
                user_id,
                address_id,
                total_price,
                shipping_fee,
                discount,
                final_total,
                payment_method,
                // user_voucher_id,
                orderDetails,
                order_voucher_id,
                ship_voucher_id,
                note
            } = req.body;
            console.log('Discount from client:', discount);
            // Kiểm tra số lượng tồn kho
            await checkStockAvailability(orderDetails);

            // Validate voucher nếu có
            let validatedDiscount = 0;
            let shipDiscountAmount = 0;
            if (order_voucher_id || ship_voucher_id) {
                const voucherValidation = await validateVoucher(
                    order_voucher_id,
                    ship_voucher_id,
                    total_price
                );

                if (!voucherValidation.isValid) {
                    return res.status(400).json({
                        status: 400,
                        message: voucherValidation.error
                    });
                }

                validatedDiscount = voucherValidation.orderDiscount;
                shipDiscountAmount = voucherValidation.shipDiscount;

                // Giảm số lượng voucher
                // await Voucher.findByIdAndUpdate(
                //     voucherValidation.voucher._id,
                //     { $inc: { quantity: -1 } }
                // );
            }

            // Tính lại giá tiền cuối cùng
            // const calculatedFinalTotal = total_price + shipping_fee - validatedDiscount;

            // // Kiểm tra final_total có khớp không
            // if (Math.abs(calculatedFinalTotal - final_total) > 1) { // Cho phép sai số 1đ
            //     return res.status(400).json({
            //         status: 400,
            //         message: "Tổng tiền không hợp lệ"
            //     });
            // }

            // 1. Tạo đơn hàng mới
            const newOrder = new Order({
                user_id,
                address_id,
                total_price,
                shipping_fee,
                discount: discount,
                // final_total: calculatedFinalTotal,
                final_total,
                payment_method,
                // user_voucher_id,
                order_voucher_id,
                order_discount_amount: validatedDiscount,
                ship_voucher_id,
                ship_discount_amount: shipDiscountAmount,
                note,
                status: 'pending'
            });

            savedOrder = await newOrder.save();

            // 2. Tạo chi tiết đơn hàng và cập nhật số lượng tồn kho
            const orderDetailsPromises = orderDetails.map(async (detail) => {
                const variant = await ShoesVariant.findById(detail.variant_id);

                // Cập nhật số lượng và trạng thái variant
                variant.quantity_in_stock -= detail.quantity;
                variant.status = variant.quantity_in_stock === 0 ? 'out_of_stock' : 'available';
                await variant.save();

                // Kiểm tra và cập nhật trạng thái sản phẩm
                await updateProductStatus(variant.shoes_id);

                return new OrderDetail({
                    order_id: savedOrder._id,
                    variant_id: detail.variant_id,
                    quantity: detail.quantity,
                    price_at_purchase: detail.price
                }).save();
            });

            savedOrderDetails = await Promise.all(orderDetailsPromises);

            // 3. Các bước còn lại (cập nhật voucher, xóa giỏ hàng, tạo payment history)
            // if (user_voucher_id) {
            //     await UserVoucher.findByIdAndUpdate(user_voucher_id, {
            //         status: 'used',
            //         used_date: new Date()
            //     });
            // }

            // Xóa những sản phẩm đã mua khỏi giỏ hàng
            const variantIds = orderDetails.map(detail => detail.variant_id);
            await Cart.deleteMany({
                user_id,
                variant_id: { $in: variantIds }
            });

            // Cập nhật trạng thái của voucher nếu có sử dụng
            if (order_voucher_id) {
                await UserVoucher.findOneAndUpdate(
                    {
                        user_id,
                        voucher_id: order_voucher_id,
                        status: 'available'
                    },
                    {
                        status: 'used',
                        used_date: new Date()
                    }
                );
            }

            if (ship_voucher_id) {
                await UserVoucher.findOneAndUpdate(
                    {
                        user_id,
                        voucher_id: ship_voucher_id,
                        status: 'available'
                    },
                    {
                        status: 'used',
                        used_date: new Date()
                    }
                );
            }

            await Cart.deleteMany({ user_id });

            newPayment = new PaymentHistory({
                user_id,
                order_id: savedOrder._id,
                amount: final_total,
                payment_method,
                status: 'pending'
            });

            await newPayment.save();

            // 4. Tạo thông báo
            await createOrderNotification(savedOrder);

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
            // Rollback nếu có lỗi
            if (savedOrder) {
                await Order.findByIdAndDelete(savedOrder._id);
                if (savedOrderDetails.length > 0) {
                    await OrderDetail.deleteMany({ order_id: savedOrder._id });
                }
                if (newPayment) {
                    await PaymentHistory.findByIdAndDelete(newPayment._id);
                }
            }

            console.error("Error creating order:", error);
            res.status(400).json({
                status: 400,
                message: error.message || "Lỗi khi tạo đơn hàng"
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
            const { status, page = 1, limit = 1000 } = req.query;

            let query = {};
            if (status && status !== 'all') {
                query.status = status;
            }

            const orders = await Order.find(query)
                .populate('user_id', 'username email')
                .populate('address_id')
                .populate({
                    path: 'order_voucher_id',
                    select: 'name code discount_type discount_value'
                })
                .populate({
                    path: 'ship_voucher_id',
                    select: 'name code discount_type discount_value'
                })
                .sort({ createdAt: -1 });

            // Format orders và kiểm tra return request
            const formattedOrders = await Promise.all(orders.map(async order => {
                // Kiểm tra có return request không
                const returnRequest = await ReturnRequest.findOne({
                    order_id: order._id,
                    status: 'pending'  // Chỉ lấy những request đang pending
                });

                return {
                    _id: order._id,
                    username: order.user_id?.username || 'N/A',
                    email: order.user_id?.email || 'N/A',
                    total_price: order.total_price || 0,
                    shipping_fee: order.shipping_fee || 0,
                    discount: order.discount,
                    final_total: order.final_total || 0,
                    payment_method: order.payment_method,
                    address: order.address_id ? `${order.address_id.receiving_address}, ${order.address_id.commune}, ${order.address_id.district}, ${order.address_id.province}` : 'N/A',
                    created_at: order.createdAt ? new Date(order.createdAt).toLocaleString('vi-VN') : 'N/A',
                    status: order.status,
                    momo_trans_id: order.momo_trans_id,
                    has_return_request: !!returnRequest // Set dựa trên kết quả tìm kiếm
                };
            }));

            res.status(200).json({
                status: 200,
                message: "Danh sách đơn hàng",
                data: {
                    orders: formattedOrders,
                    total: formattedOrders.length,
                    currentPage: parseInt(page),
                    totalPages: Math.ceil(formattedOrders.length / limit)
                }
            });

        } catch (error) {
            console.error('Error getting orders:', error);
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
                    path: 'order_voucher_id',
                    select: 'name code discount_type discount_value'
                })
                .populate({
                    path: 'ship_voucher_id',
                    select: 'name code discount_type discount_value'
                });

            if (!order) {
                return res.status(404).json({
                    status: 404,
                    message: "Không tìm thấy đơn hàng"
                });
            }

            // Lấy chi tiết đơn hàng và populate thông tin cần thiết
            const orderDetails = await OrderDetail.find({ order_id: order._id })
                .populate({
                    path: 'variant_id',
                    populate: [
                        { path: 'shoes_id', select: 'name media' },
                        { path: 'color_id', select: 'name value' },
                        { path: 'size_id', select: 'size_value' }
                    ]
                });

            // Lấy thông tin cancel request nếu có
            const cancelRequest = await CancelRequest.findOne({ order_id: order._id });

            // Lấy thông tin return request nếu có
            const returnRequest = await ReturnRequest.findOne({ order_id: order._id });

            // Format lại dữ liệu theo yêu cầu
            const formattedResponse = {
                order: {
                    _id: order._id,
                    user: {
                        _id: order.user_id._id,
                        username: order.user_id.username,
                        email: order.user_id.email
                    },
                    total_price: order.total_price,
                    discount: order.discount,
                    order_discount_amount: order.order_discount_amount,
                    ship_discount_amount: order.ship_discount_amount,
                    final_total: order.final_total,
                    payment_method: order.payment_method,
                    status: order.status,
                    delivery_date: order.delivery_date,
                    shipping_fee: order.shipping_fee,
                    shipping_address: { // cho vào thành object dễ kiểm soát
                        full_name: order.address_id.full_name,
                        phone: order.address_id.phone,
                        receiving_address: order.address_id.receiving_address,
                        commune: order.address_id.commune,
                        district: order.address_id.district,
                        province: order.address_id.province,
                    },
                    vouchers: {
                        order_voucher: order.order_voucher_id,
                        ship_voucher: order.ship_voucher_id
                    },
                    full_name: order.address_id.full_name,
                    phone: order.address_id.phone,
                    receiving_address: order.address_id.receiving_address,
                    commune: order.address_id.commune,
                    district: order.address_id.district,
                    province: order.address_id.province,
                    createdAt: order.createdAt
                },
                orderDetails: orderDetails.map(detail => ({
                    _id: detail._id,
                    shoe_id: detail.variant_id.shoes_id._id,
                    productName: detail.variant_id.shoes_id.name,
                    image: detail.variant_id.shoes_id.media?.[0]?.url || '',
                    color: {
                        name: detail.variant_id.color_id.name,
                        hex: detail.variant_id.color_id.value
                    },
                    size: detail.variant_id.size_id.size_value,
                    price: detail.price_at_purchase,
                    quantity: detail.quantity
                })),
                cancel_request: cancelRequest, // Thêm thông tin cancel request
                return_request: returnRequest  // Thêm thông tin return request
            };

            res.status(200).json({
                status: 200,
                message: "Chi tiết đơn hàng",
                data: formattedResponse
            });

        } catch (error) {
            console.error('Error getting order details:', error);
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
            const order = await Order.findById(req.params.id)
                .populate('user_id', 'username email');

            if (!order) {
                return res.status(404).json({
                    status: 404,
                    message: "Không tìm thấy đơn hàng"
                });
            }

            // Validate status transition
            const validTransitions = {
                'pending': ['processing', 'cancelled'],
                'processing': ['shipping', 'cancelled'],
                'shipping': ['delivered', 'cancelled'],
                'delivered': ['returned'],
                'returned': [],
                'cancelled': []
            };

            if (!validTransitions[order.status]?.includes(status)) {
                return res.status(400).json({
                    status: 400,
                    message: `Không thể chuyển từ trạng thái ${order.status} sang ${status}`
                });
            }

            // Cập nhật trạng thái và delivery_date nếu status là delivered
            const updateData = {
                status: status
            };

            if (status === 'delivered') {
                updateData.delivery_date = new Date();
            }

            order.set(updateData);
            await order.save();

            // Tạo thông báo cho user
            const notificationTitle = `Cập nhật đơn hàng #${order._id.toString().slice(-6)}`;
            let notificationContent = '';
            switch (status) {
                case 'processing':
                    notificationContent = 'Đơn hàng của bạn đang được xử lý';
                    break;
                case 'shipping':
                    notificationContent = 'Đơn hàng đang được giao';
                    break;
                case 'delivered':
                    notificationContent = 'Đơn hàng đã được giao thành công';
                    break;
                case 'cancelled':
                    notificationContent = 'Đơn hàng đã bị hủy';
                    break;
                case 'returned':
                    notificationContent = 'Đơn hàng đã được hoàn trả';
                    break;
                default:
                    notificationContent = 'Trạng thái đơn hàng đã được cập nhật';
            }

            const newNotification = new Notification({
                title: notificationTitle,
                content: notificationContent,
                type: 'order'
            });

            const savedNotification = await newNotification.save();

            await NotificationUser.create({
                notification_id: savedNotification._id,
                user_id: order.user_id._id,
                is_read: false
            });

            // Gửi thông báo realtime
            const io = req.app.get('io');
            if (io) {
                io.to(`user_${order.user_id._id}`).emit('order_status_updated', {
                    orderId: order._id,
                    status: status,
                    title: notificationTitle,
                    message: notificationContent
                });
            }

            res.status(200).json({
                status: 200,
                message: "Cập nhật trạng thái đơn hàng thành công",
                data: order
            });

        } catch (error) {
            console.error('Update order status error:', error);
            res.status(500).json({
                status: 500,
                message: "Lỗi khi cập nhật trạng thái đơn hàng",
                error: error.message
            });
        }
    },

    // Lấy danh sách đơn hàng của user với thông tin chi tiết
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
                    path: 'order_voucher_id',
                    select: 'name code discount_type discount_value'
                })
                .populate({
                    path: 'ship_voucher_id',
                    select: 'name code discount_type discount_value'
                })
                .sort({ createdAt: -1 });

            const ordersWithDetails = await Promise.all(orders.map(async (order) => {
                const details = await OrderDetail.find({ order_id: order._id })
                    .populate({
                        path: 'variant_id',
                        populate: [
                            {
                                path: 'shoes_id',
                                select: 'name description media'
                            },
                            {
                                path: 'size_id',
                                select: 'size_value'
                            },
                            {
                                path: 'color_id',
                                select: 'name value'
                            }
                        ]
                    });

                // Transform order details để có cấu trúc dễ đọc hơn
                const transformedDetails = details.map(detail => {
                    // Kiểm tra nếu variant_id là null hoặc không có shoes_id
                    if (!detail.variant_id || !detail.variant_id.shoes_id) {
                        return {
                            _id: detail._id,
                            quantity: detail.quantity,
                            price_at_purchase: detail.price_at_purchase,
                            product: {
                                _id: null,
                                name: 'Sản phẩm không còn tồn tại',
                                description: '',
                                image: '',
                                media: []
                            },
                            variant: {
                                _id: null,
                                color: {
                                    name: 'N/A',
                                    value: '#000000'
                                },
                                size: 'N/A',
                                price: detail.price_at_purchase,
                                quantity_in_stock: 0
                            },
                            subtotal: detail.quantity * detail.price_at_purchase
                        };
                    }

                    // Nếu có đầy đủ thông tin
                    return {
                        _id: detail._id,
                        quantity: detail.quantity,
                        price_at_purchase: detail.price_at_purchase,
                        name: detail.variant_id.shoes_id.name,
                        description: detail.variant_id.shoes_id.description,
                        image: detail.variant_id.shoes_id.media?.[0]?.url || '',
                        media: detail.variant_id.shoes_id.media || []
                        ,
                        variant: {
                            _id: detail.variant_id._id,
                            color: {
                                name: detail.variant_id.color_id?.name || 'N/A',
                                value: detail.variant_id.color_id?.value || '#000000'
                            },
                            size: detail.variant_id.size_id?.size_value || 'N/A',
                            price: detail.variant_id.price || detail.price_at_purchase,
                            quantity_in_stock: detail.variant_id.quantity_in_stock || 0
                        },
                        subtotal: detail.quantity * detail.price_at_purchase
                    };
                });

                // Format response data
                return {
                    _id: order._id,
                    total_price: order.total_price,
                    shipping_fee: order.shipping_fee,
                    order_discount: order.order_discount_amount || 0,
                    ship_discount: order.ship_discount_amount || 0,
                    final_total: order.final_total,
                    payment_method: order.payment_method,
                    status: order.status,
                    created_at: order.createdAt,
                    shipping_address: {
                        full_name: order.address_id?.full_name,
                        phone: order.address_id?.phone,
                        receiving_address: order.address_id?.receiving_address,
                        commune: order.address_id?.commune,
                        district: order.address_id?.district,
                        province: order.address_id?.province
                    },
                    vouchers: {
                        order_voucher: order.order_voucher_id ? {
                            name: order.order_voucher_id.name,
                            code: order.order_voucher_id.code,
                            discount_type: order.order_voucher_id.discount_type,
                            discount_value: order.order_voucher_id.discount_value
                        } : null,
                        ship_voucher: order.ship_voucher_id ? {
                            name: order.ship_voucher_id.name,
                            code: order.ship_voucher_id.code,
                            discount_type: order.ship_voucher_id.discount_type,
                            discount_value: order.ship_voucher_id.discount_value
                        } : null
                    },
                    total_items: transformedDetails.length,
                    order_items: transformedDetails
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
                    path: 'order_voucher_id', // Thay thế user_voucher_id
                    select: 'name code discount_type discount_value'
                })
                .populate({
                    path: 'ship_voucher_id', // Thêm ship_voucher_id
                    select: 'name code discount_type discount_value'
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