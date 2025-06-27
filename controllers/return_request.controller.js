const ReturnRequest = require('../models/return_request.model');
const OrderDetail = require('../models/order_details.model');
const Order = require('../models/orders.model');
const fs = require('fs');
const path = require('path');
// const { createFileUrl, deleteFile } = require('../utils/fileUtils');
const { uploadToCloudinary, deleteFromCloudinary, deleteFile } = require('../utils/fileUtils');

// Helper function to delete file
// const deleteFile = (filePath) => {
//     return new Promise((resolve, reject) => {
//         fs.unlink(filePath, (err) => {
//             if (err) {
//                 console.error(`Error deleting file ${filePath}:`, err);
//                 reject(err);
//             } else {
//                 resolve();
//             }
//         });
//     });
// };

module.exports = {
    // Tạo yêu cầu trả hàng
    createReturnRequest: async (req, res) => {
        try {
            const {
                order_detail_id,
                user_id,
                reason,
                quality
            } = req.body;

            // Kiểm tra order detail tồn tại
            const orderDetail = await OrderDetail.findById(order_detail_id)
                .populate('order_id');

            if (!orderDetail) {
                return res.status(404).json({
                    status: 404,
                    message: "Không tìm thấy chi tiết đơn hàng"
                });
            }

            // Kiểm tra trạng thái đơn hàng
            if (orderDetail.order_id.status !== 'delivered') {
                return res.status(400).json({
                    status: 400,
                    message: "Chỉ có thể trả hàng với đơn hàng đã giao"
                });
            }

            // Kiểm tra số lượng trả
            if (quality > orderDetail.quantity) {
                return res.status(400).json({
                    status: 400,
                    message: "Số lượng trả hàng không thể lớn hơn số lượng đã mua"
                });
            }

            // Kiểm tra đã có yêu cầu trả hàng chưa
            const existingRequest = await ReturnRequest.findOne({
                order_detail_id,
                status: { $nin: ['rejected'] }
            });

            if (existingRequest) {
                return res.status(400).json({
                    status: 400,
                    message: "Đã tồn tại yêu cầu trả hàng cho sản phẩm này"
                });
            }

            // Xử lý hình ảnh
            // let imageUrls = [];
            // if (req.files && req.files.length > 0) {
            //     imageUrls = req.files.map(file => 
            //         `${req.protocol}://${req.get('host')}/uploads/${file.filename}`
            //     );
            // }

            // const returnRequest = new ReturnRequest({
            //     order_detail_id,
            //     user_id,
            //     reason,
            //     quality,
            //     images: imageUrls
            // });

            // ✅ Upload ảnh lên Cloudinary
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
                order_detail_id,
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
            // Xóa files nếu có lỗi
            if (req.files) {
                for (const file of req.files) {
                    await deleteFile(file.path);
                }
            }
            console.error("❌ Lỗi khi tạo yêu cầu trả hàng:", error);
            res.status(500).json({
                status: 500,
                message: "Lỗi khi tạo yêu cầu trả hàng",
                error: error.message
            });
        }
    },

    // Lấy danh sách yêu cầu trả hàng (admin)
    getAllReturnRequests: async (req, res) => {
        try {
            const { status, page = 1, limit = 10 } = req.query;
            const query = {};

            if (status) {
                query.status = status;
            }

            const returnRequests = await ReturnRequest.find(query)
                .populate({
                    path: 'order_detail_id',
                    populate: {
                        path: 'shoes_id'
                    }
                })
                .populate('user_id', 'username email')
                .sort({ createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(limit);

            const total = await ReturnRequest.countDocuments(query);

            res.status(200).json({
                status: 200,
                message: "Danh sách yêu cầu trả hàng",
                data: {
                    returnRequests,
                    total,
                    currentPage: parseInt(page),
                    totalPages: Math.ceil(total / limit)
                }
            });
        } catch (error) {
            res.status(500).json({
                status: 500,
                message: "Lỗi khi lấy danh sách yêu cầu trả hàng",
                error: error.message
            });
        }
    },

    // Lấy chi tiết yêu cầu trả hàng
    getReturnRequestById: async (req, res) => {
        try {
            const returnRequest = await ReturnRequest.findById(req.params.id)
                .populate({
                    path: 'order_detail_id',
                    populate: {
                        path: 'shoes_id'
                    }
                })
                .populate('user_id', 'username email');

            if (!returnRequest) {
                return res.status(404).json({
                    status: 404,
                    message: "Không tìm thấy yêu cầu trả hàng"
                });
            }

            res.status(200).json({
                status: 200,
                message: "Chi tiết yêu cầu trả hàng",
                data: returnRequest
            });
        } catch (error) {
            res.status(500).json({
                status: 500,
                message: "Lỗi khi lấy chi tiết yêu cầu trả hàng",
                error: error.message
            });
        }
    },

    // Lấy yêu cầu trả hàng của user
    getUserReturnRequests: async (req, res) => {
        try {
            const { user_id } = req.params;
            const returnRequests = await ReturnRequest.find({ user_id })
                .populate({
                    path: 'order_detail_id',
                    populate: {
                        path: 'shoes_id'
                    }
                })
                .sort({ createdAt: -1 });

            res.status(200).json({
                status: 200,
                message: "Danh sách yêu cầu trả hàng của user",
                data: returnRequests
            });
        } catch (error) {
            res.status(500).json({
                status: 500,
                message: "Lỗi khi lấy yêu cầu trả hàng của user",
                error: error.message
            });
        }
    },

    // Cập nhật trạng thái yêu cầu trả hàng (admin)
    updateReturnRequestStatus: async (req, res) => {
        try {
            const { status } = req.body;

            const returnRequest = await ReturnRequest.findById(req.params.id)
                .populate('order_detail_id');

            if (!returnRequest) {
                return res.status(404).json({
                    status: 404,
                    message: "Không tìm thấy yêu cầu trả hàng"
                });
            }

            // Validate status transition
            const validTransitions = {
                'pending': ['approved', 'rejected'],
                'approved': ['completed'],
                'rejected': [],
                'completed': []
            };

            if (!validTransitions[returnRequest.status].includes(status)) {
                return res.status(400).json({
                    status: 400,
                    message: "Trạng thái không hợp lệ"
                });
            }

            // Nếu hoàn thành trả hàng, cập nhật số lượng trong order detail
            if (status === 'completed') {
                returnRequest.order_detail_id.quantity -= returnRequest.quality;
                await returnRequest.order_detail_id.save();
            }

            returnRequest.status = status;
            await returnRequest.save();

            res.status(200).json({
                status: 200,
                message: "Cập nhật trạng thái thành công",
                data: returnRequest
            });
        } catch (error) {
            res.status(500).json({
                status: 500,
                message: "Lỗi khi cập nhật trạng thái",
                error: error.message
            });
        }
    },

    // Xóa yêu cầu trả hàng (chỉ xóa được khi ở trạng thái pending hoặc rejected)
    deleteReturnRequest: async (req, res) => {
        try {
            const returnRequest = await ReturnRequest.findById(req.params.id);

            if (!returnRequest) {
                return res.status(404).json({
                    status: 404,
                    message: "Không tìm thấy yêu cầu trả hàng"
                });
            }

            if (!['pending', 'rejected'].includes(returnRequest.status)) {
                return res.status(400).json({
                    status: 400,
                    message: "Chỉ có thể xóa yêu cầu đang chờ xử lý hoặc đã bị từ chối"
                });
            }

            // Xóa files
            // for (const imageUrl of returnRequest.images) {
            //     const filename = imageUrl.split('/').pop();
            //     const filePath = path.join('public', 'uploads', filename);
            //     await deleteFile(filePath);
            // }

            // ✅ Xóa ảnh khỏi Cloudinary
            for (const img of returnRequest.images) {
                await deleteFromCloudinary(img.public_id);
            }

            await returnRequest.remove();

            res.status(200).json({
                status: 200,
                message: "Xóa yêu cầu trả hàng thành công"
            });
        } catch (error) {
            res.status(500).json({
                status: 500,
                message: "Lỗi khi xóa yêu cầu trả hàng",
                error: error.message
            });
        }
    }
};