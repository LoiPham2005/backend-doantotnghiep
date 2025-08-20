const ReturnRequest = require('../models/return_request.model');
const Order = require('../models/orders.model');
const { uploadToCloudinary, deleteFromCloudinary } = require('../utils/fileUtils');

module.exports = {
    // Tạo yêu cầu trả hàng
    createReturnRequest: async (req, res) => {
        try {
            const { order_id, user_id, reason, quality } = req.body;

            // Kiểm tra đơn hàng tồn tại
            const order = await Order.findById(order_id);
            if (!order) {
                return res.status(404).json({
                    status: 404,
                    message: "Không tìm thấy đơn hàng"
                });
            }

            // Kiểm tra trạng thái đơn hàng
            if (order.status !== 'delivered') {
                return res.status(400).json({
                    status: 400,
                    message: "Chỉ có thể trả hàng với đơn hàng đã giao"
                });
            }

            // Kiểm tra đã có yêu cầu trả hàng chưa
            const existingRequest = await ReturnRequest.findOne({
                order_id,
                status: { $nin: ['rejected'] }
            });

            if (existingRequest) {
                return res.status(400).json({
                    status: 400,
                    message: "Đã tồn tại yêu cầu trả hàng cho đơn hàng này"
                });
            }

            // Upload ảnh lên Cloudinary
            let uploadedImages = [];
            if (req.files && req.files.length > 0) {
                for (const file of req.files) {
                    const result = await uploadToCloudinary(file.path, 'return-requests');
                    uploadedImages.push({
                        url: result.url,
                        public_id: result.public_id
                    });
                }
            }

            const returnRequest = new ReturnRequest({
                order_id,
                user_id,
                reason,
                quality,
                images: uploadedImages
            });

            await returnRequest.save();

            res.status(200).json({
                status: 200,
                message: "Tạo yêu cầu trả hàng thành công",
                data: returnRequest
            });

        } catch (error) {
            console.error('Error creating return request:', error);
            res.status(500).json({
                status: 500,
                message: "Lỗi khi tạo yêu cầu trả hàng",
                error: error.message
            });
        }
    },

    // Lấy chi tiết yêu cầu trả hàng
    getReturnRequestById: async (req, res) => {
        try {
            // Tìm kiếm theo order_id thay vì _id
            const returnRequest = await ReturnRequest.findOne({ order_id: req.params.id })
                .populate({
                    path: 'order_id',
                    populate: {
                        path: 'user_id',
                        select: 'username email'
                    }
                })
                .populate('user_id', 'username email');

            if (!returnRequest) {
                return res.status(404).json({
                    status: 404,
                    message: "Không tìm thấy yêu cầu trả hàng cho đơn hàng này"
                });
            }

            // Format lại dữ liệu trả về
            const formattedResponse = {
                _id: returnRequest._id,
                order_id: returnRequest.order_id._id,
                user: {
                    _id: returnRequest.user_id._id,
                    username: returnRequest.user_id.username,
                    email: returnRequest.user_id.email
                },
                reason: returnRequest.reason,
                quality: returnRequest.quality,
                status: returnRequest.status,
                images: returnRequest.images,
                createdAt: returnRequest.createdAt,
                updatedAt: returnRequest.updatedAt
            };

            res.status(200).json({
                status: 200,
                message: "Chi tiết yêu cầu trả hàng",
                data: formattedResponse
            });

        } catch (error) {
            console.error('Error getting return request:', error);
            res.status(500).json({
                status: 500,
                message: "Lỗi khi lấy chi tiết yêu cầu trả hàng",
                error: error.message
            });
        }
    },

    // Cập nhật trạng thái yêu cầu trả hàng
    updateReturnRequestStatus: async (req, res) => {
        try {
            const { status } = req.body;
            const returnRequest = await ReturnRequest.findById(req.params.id)
                .populate('order_id');

            if (!returnRequest) {
                return res.status(404).json({
                    status: 404,
                    message: "Không tìm thấy yêu cầu trả hàng"
                });
            }

            // Validate status transition
            const validTransitions = {
                'pending': ['approved', 'rejected'],
                'approved': [],
                'rejected': []
            };

            if (!validTransitions[returnRequest.status].includes(status)) {
                return res.status(400).json({
                    status: 400,
                    message: "Trạng thái không hợp lệ"
                });
            }

            // Nếu approve thì cập nhật trạng thái đơn hàng
            if (status === 'approved') {
                await Order.findByIdAndUpdate(returnRequest.order_id._id, {
                    status: 'returned'
                });
            }

            returnRequest.status = status;
            await returnRequest.save();

            res.status(200).json({
                status: 200,
                message: "Cập nhật trạng thái thành công",
                data: returnRequest
            });

        } catch (error) {
            console.error('Error updating return request status:', error);
            res.status(500).json({
                status: 500,
                message: "Lỗi khi cập nhật trạng thái",
                error: error.message
            });
        }
    },

    deleteReturnRequest: async (req, res) => {
        try {
            const returnRequest = await ReturnRequest.findById(req.params.id);

            if (!returnRequest) {
                return res.status(404).json({
                    status: 404,
                    message: "Không tìm thấy yêu cầu trả hàng"
                });
            }

            // Xóa ảnh khỏi Cloudinary
            for (const image of returnRequest.images) {
                await deleteFromCloudinary(image.public_id);
            }

            await ReturnRequest.findByIdAndDelete(req.params.id);

            res.status(200).json({
                status: 200,
                message: "Yêu cầu trả hàng đã được xóa thành công"
            });

        } catch (error) {
            console.error('Error deleting return request:', error);
            res.status(500).json({
                status: 500,
                message: "Lỗi khi xóa yêu cầu trả hàng",
                error: error.message
            });
        }
    }
};