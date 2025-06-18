const Review = require('../models/reviews.model');
const Order = require('../models/orders.model');
const fs = require('fs');
const path = require('path');

// Helper function để xóa file
const deleteFile = (filePath) => {
    return new Promise((resolve, reject) => {
        fs.unlink(filePath, (err) => {
            if (err) {
                console.error(`Error deleting file ${filePath}:`, err);
                reject(err);
            } else {
                resolve();
            }
        });
    });
};

module.exports = {
    // Thêm đánh giá mới
    createReview: async (req, res) => {
        try {
            const {
                user_id,
                product_id,
                order_id,
                rating,
                comment
            } = req.body;

            // Kiểm tra đơn hàng đã delivered
            const order = await Order.findById(order_id);
            if (!order || order.status !== 'delivered') {
                return res.status(400).json({
                    status: 400,
                    message: "Chỉ có thể đánh giá sản phẩm từ đơn hàng đã giao"
                });
            }

            // Kiểm tra đã đánh giá chưa
            const existingReview = await Review.findOne({
                user_id,
                product_id,
                order_id
            });

            if (existingReview) {
                return res.status(400).json({
                    status: 400,
                    message: "Bạn đã đánh giá sản phẩm này từ đơn hàng này"
                });
            }

            // Xử lý media files
            let mediaFiles = [];
            if (req.files && req.files.length > 0) {
                mediaFiles = req.files.map(file => ({
                    type: file.mimetype.startsWith('image/') ? 'image' : 'video',
                    url: `${req.protocol}://${req.get('host')}/uploads/${file.filename}`
                }));
            }

            const newReview = new Review({
                user_id,
                product_id,
                order_id,
                rating,
                comment,
                media: mediaFiles
            });

            await newReview.save();

            // Populate thông tin user và product
            const populatedReview = await Review.findById(newReview._id)
                .populate('user_id', 'username avatar')
                .populate('product_id')
                .populate('order_id');

            res.status(200).json({
                status: 200,
                message: "Thêm đánh giá thành công",
                data: populatedReview
            });

        } catch (error) {
            // Xóa files nếu có lỗi
            if (req.files) {
                for (const file of req.files) {
                    await deleteFile(file.path);
                }
            }
            res.status(500).json({
                status: 500,
                message: "Lỗi khi thêm đánh giá",
                error: error.message
            });
        }
    },

    // Lấy đánh giá của một sản phẩm
    getProductReviews: async (req, res) => {
        try {
            const { product_id } = req.params;
            const { page = 1, limit = 10, rating } = req.query;

            const query = {
                product_id,
                is_verified: true
            };

            if (rating) {
                query.rating = parseInt(rating);
            }

            const reviews = await Review.find(query)
                .populate('user_id', 'username avatar')
                .sort({ createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(limit);

            const total = await Review.countDocuments(query);

            // Tính rating trung bình
            const avgRating = await Review.aggregate([
                { $match: { product_id: mongoose.Types.ObjectId(product_id) } },
                {
                    $group: {
                        _id: null,
                        averageRating: { $avg: "$rating" },
                        totalReviews: { $sum: 1 }
                    }
                }
            ]);

            res.status(200).json({
                status: 200,
                message: "Danh sách đánh giá",
                data: {
                    reviews,
                    total,
                    currentPage: parseInt(page),
                    totalPages: Math.ceil(total / limit),
                    averageRating: avgRating[0]?.averageRating || 0,
                    totalReviews: avgRating[0]?.totalReviews || 0
                }
            });
        } catch (error) {
            res.status(500).json({
                status: 500,
                message: "Lỗi khi lấy danh sách đánh giá",
                error: error.message
            });
        }
    },

    // Lấy đánh giá của một user
    getUserReviews: async (req, res) => {
        try {
            const { user_id } = req.params;
            const { page = 1, limit = 10 } = req.query;

            const reviews = await Review.find({ user_id })
                .populate('product_id')
                .populate('order_id')
                .sort({ createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(limit);

            const total = await Review.countDocuments({ user_id });

            res.status(200).json({
                status: 200,
                message: "Danh sách đánh giá của user",
                data: {
                    reviews,
                    total,
                    currentPage: parseInt(page),
                    totalPages: Math.ceil(total / limit)
                }
            });
        } catch (error) {
            res.status(500).json({
                status: 500,
                message: "Lỗi khi lấy đánh giá của user",
                error: error.message
            });
        }
    },

    // Cập nhật đánh giá
    updateReview: async (req, res) => {
        try {
            const { rating, comment } = req.body;
            const review = await Review.findById(req.params.id);

            if (!review) {
                return res.status(404).json({
                    status: 404,
                    message: "Không tìm thấy đánh giá"
                });
            }

            // Xử lý media mới nếu có
            if (req.files && req.files.length > 0) {
                // Xóa files cũ
                for (const media of review.media) {
                    const filename = media.url.split('/').pop();
                    const filePath = path.join('public', 'uploads', filename);
                    await deleteFile(filePath);
                }

                review.media = req.files.map(file => ({
                    type: file.mimetype.startsWith('image/') ? 'image' : 'video',
                    url: `${req.protocol}://${req.get('host')}/uploads/${file.filename}`
                }));
            }

            review.rating = rating;
            review.comment = comment;
            await review.save();

            res.status(200).json({
                status: 200,
                message: "Cập nhật đánh giá thành công",
                data: review
            });
        } catch (error) {
            if (req.files) {
                for (const file of req.files) {
                    await deleteFile(file.path);
                }
            }
            res.status(500).json({
                status: 500,
                message: "Lỗi khi cập nhật đánh giá",
                error: error.message
            });
        }
    },

    // Admin xác minh đánh giá
    verifyReview: async (req, res) => {
        try {
            const review = await Review.findById(req.params.id);
            if (!review) {
                return res.status(404).json({
                    status: 404,
                    message: "Không tìm thấy đánh giá"
                });
            }

            review.is_verified = true;
            await review.save();

            res.status(200).json({
                status: 200,
                message: "Xác minh đánh giá thành công",
                data: review
            });
        } catch (error) {
            res.status(500).json({
                status: 500,
                message: "Lỗi khi xác minh đánh giá",
                error: error.message
            });
        }
    },

    // Xóa đánh giá
    deleteReview: async (req, res) => {
        try {
            const review = await Review.findById(req.params.id);

            if (!review) {
                return res.status(404).json({
                    status: 404,
                    message: "Không tìm thấy đánh giá"
                });
            }

            // Xóa media files
            if (review.media && review.media.length > 0) {
                for (const media of review.media) {
                    const filename = media.url.split('/').pop();
                    const filePath = path.join('public', 'uploads', filename);
                    await deleteFile(filePath);
                }
            }

            await review.remove();

            res.status(200).json({
                status: 200,
                message: "Xóa đánh giá thành công"
            });
        } catch (error) {
            res.status(500).json({
                status: 500,
                message: "Lỗi khi xóa đánh giá",
                error: error.message
            });
        }
    }
};