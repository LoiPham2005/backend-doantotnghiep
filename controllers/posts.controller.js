const Posts = require('../models/posts.model');
const fs = require('fs');
const path = require('path');

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
    createPost: async (req, res) => {
        try {
            const { admin_id, title, message } = req.body;
            console.log('Received data:', { admin_id, title, message }); // Debug log

            // Validate required fields
            if (!admin_id || !title || !message) {
                return res.status(400).json({
                    status: 400,
                    message: "Missing required fields"
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

            const newPost = new Posts({
                admin_id,
                title,
                message,
                media: mediaFiles,
                is_active: true
            });

            const savedPost = await newPost.save();
            console.log('Saved post:', savedPost); // Debug log

            res.status(200).json({
                status: 200,
                message: "Tạo bài viết thành công",
                data: savedPost
            });
        } catch (error) {
            console.error('Error creating post:', error);
            // Delete uploaded files if error occurs
            if (req.files) {
                for (const file of req.files) {
                    await deleteFile(file.path);
                }
            }
            res.status(500).json({
                status: 500,
                message: "Lỗi khi tạo bài viết",
                error: error.message
            });
        }
    },

    getAllPosts: async (req, res) => {
        try {
            const posts = await Posts.find()
                .populate('admin_id', 'username')
                .sort({ createdAt: -1 });

            res.status(200).json({
                status: 200,
                message: "Danh sách bài viết",
                data: posts
            });
        } catch (error) {
            res.status(500).json({
                status: 500,
                message: "Lỗi khi lấy danh sách bài viết",
                error: error.message
            });
        }
    },

    updatePost: async (req, res) => {
        try {
            const { title, message } = req.body;
            console.log('Received update data:', { title, message, files: req.files });

            const post = await Posts.findById(req.params.id);
            if (!post) {
                return res.status(404).json({
                    status: 404,
                    message: "Không tìm thấy bài viết"
                });
            }

            // Xử lý media mới nếu có
            if (req.files && req.files.length > 0) {
                // Xóa files cũ
                if (post.media && post.media.length > 0) {
                    for (const media of post.media) {
                        const filename = media.url.split('/').pop();
                        const filePath = path.join('public', 'uploads', filename);
                        await deleteFile(filePath);
                    }
                }

                // Thêm media mới
                post.media = req.files.map(file => ({
                    type: file.mimetype.startsWith('image/') ? 'image' : 'video',
                    url: `${req.protocol}://${req.get('host')}/uploads/${file.filename}`
                }));
            }

            // Cập nhật thông tin cơ bản
            post.title = title;
            post.message = message;

            const updatedPost = await post.save();
            console.log('Updated post:', updatedPost);

            res.status(200).json({
                status: 200,
                message: "Cập nhật bài viết thành công",
                data: updatedPost
            });
        } catch (error) {
            console.error('Error updating post:', error);
            // Xóa files mới nếu có lỗi
            if (req.files) {
                for (const file of req.files) {
                    await deleteFile(file.path);
                }
            }
            res.status(500).json({
                status: 500,
                message: "Lỗi khi cập nhật bài viết",
                error: error.message
            });
        }
    },

    deletePost: async (req, res) => {
        try {
            const post = await Posts.findById(req.params.id);
            if (!post) {
                return res.status(404).json({
                    status: 404,
                    message: "Không tìm thấy bài viết"
                });
            }

            // Xóa media files
            if (post.media && post.media.length > 0) {
                for (const media of post.media) {
                    const filename = media.url.split('/').pop();
                    const filePath = path.join('public', 'uploads', filename);
                    await deleteFile(filePath);
                }
            }

            await Posts.findByIdAndDelete(req.params.id);

            res.status(200).json({
                status: 200,
                message: "Xóa bài viết thành công"
            });
        } catch (error) {
            res.status(500).json({
                status: 500,
                message: "Lỗi khi xóa bài viết",
                error: error.message
            });
        }
    },

    // Xem chi tiết bài viết
    getPostById: async (req, res) => {
        try {
            const post = await Posts.findById(req.params.id)
                .populate('admin_id', 'username'); // Lấy thêm thông tin admin đăng bài

            if (!post) {
                return res.status(404).json({
                    status: 404,
                    message: "Không tìm thấy bài viết"
                });
            }

            res.status(200).json({
                status: 200,
                message: "Chi tiết bài viết",
                data: post
            });
        } catch (error) {
            console.error('Error getting post details:', error);
            res.status(500).json({
                status: 500,
                message: "Lỗi khi lấy chi tiết bài viết",
                error: error.message
            });
        }
    }
};