const NotificationUser = require('../models/notification_user.model');
const Notification = require('../models/notification.model');
const User = require('../models/user.model');

module.exports = {
    // Tạo thông báo cho user
    createUserNotification: async (req, res) => {
        try {
            const { notification_id, user_id } = req.body;

            if (!notification_id || !user_id) {
                return res.status(400).json({
                    status: 400,
                    message: "notification_id và user_id là bắt buộc"
                });
            }

            // Kiểm tra notification tồn tại
            const notification = await Notification.findById(notification_id);
            if (!notification) {
                return res.status(404).json({
                    status: 404,
                    message: "Thông báo không tồn tại"
                });
            }

            // Kiểm tra user tồn tại
            const user = await User.findById(user_id);
            if (!user) {
                return res.status(404).json({
                    status: 404,
                    message: "Người dùng không tồn tại"
                });
            }

            // Kiểm tra đã tồn tại
            const existingNotification = await NotificationUser.findOne({
                notification_id,
                user_id
            });

            if (existingNotification) {
                return res.status(200).json({
                    status: 200,
                    message: "Người dùng đã có thông báo này",
                    data: existingNotification
                });
            }

            // Tạo notification_user mới
            const newUserNotification = new NotificationUser({
                notification_id,
                user_id,
                is_read: false
            });

            await newUserNotification.save();

            const populatedNotification = await NotificationUser.findById(newUserNotification._id)
                .populate('notification_id')
                .populate('user_id', 'username email');

            res.status(200).json({
                status: 200,
                message: "Tạo thông báo cho user thành công",
                data: populatedNotification
            });

        } catch (error) {
            console.error("Error creating user notification:", error);
            res.status(500).json({
                status: 500,
                message: "Lỗi khi tạo thông báo cho user",
                error: error.message
            });
        }
    },

    // Lấy danh sách thông báo của user
    getUserNotifications: async (req, res) => {
        try {
            const { user_id } = req.params;
            const { page = 1, limit = 10 } = req.query;

            const userNotifications = await NotificationUser.find({ user_id })
                .populate({
                    path: 'notification_id',
                    select: 'title content type createdAt'
                })
                .sort({ received_at: -1 })
                .skip((page - 1) * limit)
                .limit(limit);

            const total = await NotificationUser.countDocuments({ user_id });

            // Lấy socket instance
            const io = req.app.get('io');
            
            if (io) {
                // Emit event khi có thông báo mới cho user cụ thể
                io.to(user_id.toString()).emit('notifications_updated', {
                    notifications: userNotifications,
                    total,
                    currentPage: parseInt(page),
                    totalPages: Math.ceil(total / limit)
                });
            }

            res.status(200).json({
                status: 200,
                message: "Danh sách thông báo của user",
                data: {
                    notifications: userNotifications,
                    total,
                    currentPage: parseInt(page),
                    totalPages: Math.ceil(total / limit)
                }
            });

        } catch (error) {
            console.error("Error getting user notifications:", error);
            res.status(500).json({
                status: 500,
                message: "Lỗi khi lấy danh sách thông báo",
                error: error.message
            });
        }
    },

    // Cập nhật thông báo
    updateUserNotification: async (req, res) => {
        try {
            const { user_id, notification_id } = req.params;
            const { is_read } = req.body;

            const userNotification = await NotificationUser.findOneAndUpdate(
                { user_id, notification_id },
                { is_read },
                { new: true }
            ).populate('notification_id');

            if (!userNotification) {
                return res.status(404).json({
                    status: 404,
                    message: "Không tìm thấy thông báo"
                });
            }

            res.status(200).json({
                status: 200,
                message: "Cập nhật thông báo thành công",
                data: userNotification
            });
        } catch (error) {
            res.status(500).json({
                status: 500,
                message: "Lỗi khi cập nhật thông báo",
                error: error.message
            });
        }
    },

    // Đánh dấu thông báo đã đọc
    markAsRead: async (req, res) => {
        try {
            const { notification_id } = req.params;

            // Tìm và cập nhật notification_user
            const userNotification = await NotificationUser.findById(notification_id);
            
            if (!userNotification) {
                return res.status(404).json({
                    status: 404,
                    message: "Không tìm thấy thông báo"
                });
            }

            userNotification.is_read = true;
            await userNotification.save();

            const populatedNotification = await NotificationUser.findById(userNotification._id)
                .populate({
                    path: 'notification_id',
                    select: 'title content type createdAt'
                });

            res.status(200).json({
                status: 200,
                message: "Đã đánh dấu thông báo như đã đọc",
                data: populatedNotification
            });

        } catch (error) {
            console.error("Error marking notification as read:", error);
            res.status(500).json({
                status: 500,
                message: "Lỗi khi cập nhật trạng thái thông báo",
                error: error.message
            });
        }
    },

    // Đánh dấu tất cả thông báo đã đọc 
    markAllAsRead: async (req, res) => {
        try {
            const user_id = req.user._id;

            // Cập nhật tất cả thông báo chưa đọc của user thành đã đọc
            const result = await NotificationUser.updateMany(
                { 
                    user_id: user_id,
                    is_read: false 
                },
                { 
                    is_read: true 
                }
            );

            res.status(200).json({
                status: 200,
                message: "Đã đánh dấu tất cả thông báo như đã đọc",
                modifiedCount: result.modifiedCount
            });

        } catch (error) {
            console.error("Error marking all notifications as read:", error);
            res.status(500).json({
                status: 500,
                message: "Lỗi khi cập nhật trạng thái thông báo",
                error: error.message
            });
        }
    },

    // Xóa thông báo của user
    deleteUserNotification: async (req, res) => {
        try {
            const { user_id, notification_id } = req.params;

            const result = await NotificationUser.findOneAndDelete({
                user_id,
                notification_id
            });

            if (!result) {
                return res.status(404).json({
                    status: 404,
                    message: "Không tìm thấy thông báo"
                });
            }

            res.status(200).json({
                status: 200,
                message: "Xóa thông báo thành công"
            });
        } catch (error) {
            res.status(500).json({
                status: 500,
                message: "Lỗi khi xóa thông báo",
                error: error.message
            });
        }
    },

    // Lấy danh sách users của một notification
    getUsersByNotificationId: async (req, res) => {
        try {
            const { notification_id } = req.params;

            const notificationUsers = await NotificationUser.find({ notification_id })
                .populate('user_id', 'username email')
                .sort({ createdAt: -1 });

            res.status(200).json({
                status: 200,
                message: "Danh sách người dùng của thông báo",
                notifications: notificationUsers
            });

        } catch (error) {
            res.status(500).json({
                status: 500,
                message: "Lỗi khi lấy danh sách người dùng",
                error: error.message
            });
        }
    },

    // Thêm method để lấy thông báo cho admin
    getAdminNotifications: async (req, res) => {
        try {
            const notifications = await NotificationUser.find()
                .populate({
                    path: 'notification_id',
                    select: 'title content type createdAt'
                })
                .sort({ createdAt: -1 })
                .limit(20);

            res.status(200).json({
                status: 200,
                message: "Danh sách thông báo admin",
                data: {
                    notifications
                }
            });
        } catch (error) {
            console.error("Error getting admin notifications:", error);
            res.status(500).json({
                status: 500,
                message: "Lỗi khi lấy thông báo admin",
                error: error.message
            });
        }
    }
};