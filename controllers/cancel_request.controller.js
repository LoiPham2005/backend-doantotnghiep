const CancelRequest = require('../models/cancel_request.model');
const Order = require('../models/orders.model');
const Notification = require('../models/notification.model'); // Import model thông báo
const { uploadToCloudinary, deleteFromCloudinary, deleteFile } = require('../utils/fileUtils');

module.exports = {
    // Tạo yêu cầu hủy đơn
    createCancelRequest: async (req, res) => {
        try {
            const { order_id, user_id, reason, is_admin_cancel } = req.body;
            console.log('Create cancel request:', { order_id, user_id, reason, is_admin_cancel });

            // Validate input
            if (!order_id || !user_id || !reason) {
                return res.status(400).json({
                    status: 400,
                    message: "Missing required fields"
                });
            }

            // Kiểm tra đơn hàng tồn tại
            const order = await Order.findById(order_id);
            if (!order) {
                return res.status(404).json({
                    status: 404,
                    message: "Không tìm thấy đơn hàng"
                });
            }

            // Kiểm tra trạng thái đơn hàng
            if (!['pending', 'processing'].includes(order.status)) {
                return res.status(400).json({
                    status: 400,
                    message: "Chỉ có thể hủy đơn hàng ở trạng thái chờ xác nhận hoặc đang xử lý"
                });
            }

            // Tạo yêu cầu hủy 
            const cancelRequest = new CancelRequest({
                order_id,
                user_id,
                reason,
                status: 'approved', // Auto approve 
                is_admin_cancel: is_admin_cancel || false
            });

            await cancelRequest.save();

            // Cập nhật trạng thái đơn hàng thành cancelled
            await Order.findByIdAndUpdate(order_id, {
                status: 'cancelled'
            });

            // Tạo thông báo
            const notification = new Notification({
                title: 'Đơn hàng đã bị hủy',
                content: `Đơn hàng #${order._id.toString().slice(-6)} đã bị hủy. ${is_admin_cancel ? 'Lý do từ admin: ' : 'Lý do: '}${reason}`,
                type: 'order'
            });

            await notification.save();

            res.status(200).json({
                status: 200,
                message: "Hủy đơn hàng thành công",
                data: cancelRequest
            });

        } catch (error) {
            console.error("Error creating cancel request:", error);
            res.status(500).json({
                status: 500,
                message: "Lỗi khi hủy đơn hàng",
                error: error.message
            });
        }
    },

    // Lấy danh sách yêu cầu hủy (admin)
    getAllCancelRequests: async (req, res) => {
        try {
            const { status, page = 1, limit = 10 } = req.query;
            const query = {};

            if (status) {
                query.status = status;
            }

            const cancelRequests = await CancelRequest.find(query)
                .populate('order_id')
                .populate('user_id', 'username email')
                .sort({ createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(limit);

            const total = await CancelRequest.countDocuments(query);

            res.status(200).json({
                status: 200,
                message: "Danh sách yêu cầu hủy đơn",
                data: {
                    cancelRequests,
                    pagination: {
                        total,
                        page: parseInt(page),
                        total_pages: Math.ceil(total / limit)
                    }
                }
            });

        } catch (error) {
            res.status(500).json({
                status: 500,
                message: "Lỗi khi lấy danh sách yêu cầu hủy đơn",
                error: error.message
            });
        }
    },

    // Lấy chi tiết yêu cầu hủy
    getCancelRequestById: async (req, res) => {
        try {
            const cancelRequest = await CancelRequest.findById(req.params.id)
                .populate('order_id')
                .populate('user_id', 'username email');

            if (!cancelRequest) {
                return res.status(404).json({
                    status: 404,
                    message: "Không tìm thấy yêu cầu hủy đơn"
                });
            }

            res.status(200).json({
                status: 200,
                message: "Chi tiết yêu cầu hủy đơn",
                data: cancelRequest
            });

        } catch (error) {
            res.status(500).json({
                status: 500,
                message: "Lỗi khi lấy chi tiết yêu cầu hủy đơn",
                error: error.message
            });
        }
    },

    // Lấy yêu cầu hủy của user
    getUserCancelRequests: async (req, res) => {
        try {
            const { user_id } = req.params;
            const cancelRequests = await CancelRequest.find({ user_id })
                .populate('order_id')
                .sort({ createdAt: -1 });

            res.status(200).json({
                status: 200,
                message: "Danh sách yêu cầu hủy đơn của user",
                data: cancelRequests
            });

        } catch (error) {
            res.status(500).json({
                status: 500,
                message: "Lỗi khi lấy yêu cầu hủy đơn của user",
                error: error.message
            });
        }
    },

    // Cập nhật trạng thái yêu cầu hủy (admin)
    updateCancelRequestStatus: async (req, res) => {
        try {
            const { status } = req.body;
            const cancelRequest = await CancelRequest.findById(req.params.id)
                .populate('order_id');

            if (!cancelRequest) {
                return res.status(404).json({
                    status: 404,
                    message: "Không tìm thấy yêu cầu hủy đơn"
                });
            }

            // Validate status transition
            const validTransitions = {
                'pending': ['approved', 'rejected'],
                'approved': [],
                'rejected': []
            };

            if (!validTransitions[cancelRequest.status].includes(status)) {
                return res.status(400).json({
                    status: 400,
                    message: "Trạng thái không hợp lệ"
                });
            }

            // Nếu approve thì hủy đơn hàng
            if (status === 'approved') {
                await Order.findByIdAndUpdate(cancelRequest.order_id._id, {
                    status: 'cancelled'
                });
            }

            cancelRequest.status = status;
            await cancelRequest.save();

            res.status(200).json({
                status: 200,
                message: "Cập nhật trạng thái thành công",
                data: cancelRequest
            });

        } catch (error) {
            res.status(500).json({
                status: 500,
                message: "Lỗi khi cập nhật trạng thái",
                error: error.message
            });
        }
    },

    // Xóa yêu cầu hủy
    deleteCancelRequest: async (req, res) => {
        try {
            const cancelRequest = await CancelRequest.findById(req.params.id);

            if (!cancelRequest) {
                return res.status(404).json({
                    status: 404,
                    message: "Không tìm thấy yêu cầu hủy đơn"
                });
            }

            if (!['pending', 'rejected'].includes(cancelRequest.status)) {
                return res.status(400).json({
                    status: 400,
                    message: "Chỉ có thể xóa yêu cầu đang chờ xử lý hoặc đã bị từ chối"
                });
            }

            // Xóa ảnh từ Cloudinary
            for (const img of cancelRequest.images) {
                if (img.public_id) {
                    await deleteFromCloudinary(img.public_id);
                }
            }

            await cancelRequest.remove();

            res.status(200).json({
                status: 200,
                message: "Xóa yêu cầu hủy đơn thành công"
            });

        } catch (error) {
            res.status(500).json({
                status: 500,
                message: "Lỗi khi xóa yêu cầu hủy đơn",
                error: error.message
            });
        }
    },

    // Lấy yêu cầu hủy theo order_id
    getCancelRequestByOrderId: async (req, res) => {
        try {
            // Tìm kiếm theo order_id
            const cancelRequest = await CancelRequest.findOne({ order_id: req.params.id })
                .populate({
                    path: 'order_id',
                    populate: {
                        path: 'user_id',
                        select: 'username email'
                    }
                })
                .populate('user_id', 'username email');

            if (!cancelRequest) {
                return res.status(404).json({
                    status: 404,
                    message: "Không tìm thấy yêu cầu hủy đơn cho đơn hàng này"
                });
            }

            // Format lại dữ liệu trả về
            const formattedResponse = {
                _id: cancelRequest._id,
                order_id: cancelRequest.order_id._id,
                user: {
                    _id: cancelRequest.user_id._id,
                    username: cancelRequest.user_id.username,
                    email: cancelRequest.user_id.email
                },
                reason: cancelRequest.reason,
                status: cancelRequest.status,
                createdAt: cancelRequest.createdAt,
                updatedAt: cancelRequest.updatedAt
            };

            res.status(200).json({
                status: 200,
                message: "Chi tiết yêu cầu hủy đơn",
                data: formattedResponse
            });

        } catch (error) {
            console.error('Error getting cancel request:', error);
            res.status(500).json({
                status: 500,
                message: "Lỗi khi lấy chi tiết yêu cầu hủy đơn",
                error: error.message
            });
        }
    }
};