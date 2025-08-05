const Notification = require('../models/notification.model');
const NotificationUser = require('../models/notification_user.model');
const User = require('../models/user.model');

module.exports = {
    // Tạo thông báo mới (admin only)
    createNotification: async (req, res) => {
        try {
            const { title, content, type, selectedUsers } = req.body;

            const newNotification = new Notification({
                title,
                content,
                type
            });

            const savedNotification = await newNotification.save();

            // Xử lý tạo notification cho users
            let notificationUsers = [];
            if (type === 'order' && Array.isArray(selectedUsers) && selectedUsers.length > 0) {
                notificationUsers = selectedUsers.map(userId => ({
                    notification_id: savedNotification._id,
                    user_id: userId
                }));
            } else if (type === 'system' || type === 'promotion') {
                const users = await User.find({ role: 'user' });
                notificationUsers = users.map(user => ({
                    notification_id: savedNotification._id,
                    user_id: user._id
                }));
            }

            // Lưu notification_users
            if (notificationUsers.length > 0) {
                await NotificationUser.insertMany(notificationUsers);
            }

            // Emit socket event
            const io = req.app.get('io');
            if (io) {
                if (type === 'order' && selectedUsers?.length > 0) {
                    // Emit cho từng user được chọn
                    for (const userId of selectedUsers) {
                        const userNotification = await NotificationUser.findOne({
                            notification_id: savedNotification._id,
                            user_id: userId
                        }).populate({
                            path: 'notification_id',
                            select: 'title content type createdAt'
                        });

                        io.to(`notification_${userId}`).emit('notification_received', {
                            notification: userNotification
                        });
                    }
                } else {
                    // Emit cho tất cả users với system/promotion notification
                    const allUsers = await User.find({ role: 'user' });
                    for (const user of allUsers) {
                        const userNotification = await NotificationUser.findOne({
                            notification_id: savedNotification._id,
                            user_id: user._id
                        }).populate({
                            path: 'notification_id',
                            select: 'title content type createdAt'
                        });

                        io.to(`notification_${user._id}`).emit('notification_received', {
                            notification: userNotification
                        });
                    }
                }
            }

            res.status(200).json({
                status: 200,
                message: "Tạo thông báo thành công",
                data: savedNotification
            });

        } catch (error) {
            console.error('Error creating notification:', error);
            res.status(500).json({
                status: 500,
                message: "Lỗi khi tạo thông báo",
                error: error.message
            });
        }
    },

    // Lấy danh sách thông báo (admin)
    getAllNotifications: async (req, res) => {
        try {
            const notifications = await Notification.find()
                .sort({ created_at: -1 });

            res.status(200).json({
                status: 200,
                message: "Danh sách thông báo",
                data: notifications
            });
        } catch (error) {
            res.status(500).json({
                status: 500,
                message: "Lỗi khi lấy danh sách thông báo",
                error: error.message
            });
        }
    },

    // Cập nhật thông báo
    updateNotification: async (req, res) => {
        try {
            const { title, content, type, selectedUsers } = req.body;
            console.log('Update notification request:', { title, content, type, selectedUsers });

            const notification = await Notification.findById(req.params.id);
            if (!notification) {
                return res.status(404).json({
                    status: 404,
                    message: "Không tìm thấy thông báo"
                });
            }

            // Cập nhật thông tin cơ bản
            notification.title = title;
            notification.content = content;
            notification.type = type;

            const savedNotification = await notification.save();

            // Xóa tất cả notification_users cũ
            await NotificationUser.deleteMany({ notification_id: notification._id });

            // Tạo notification_users mới
            if (type === 'order' && Array.isArray(selectedUsers) && selectedUsers.length > 0) {
                const notificationUsers = selectedUsers.map(userId => ({
                    notification_id: savedNotification._id,
                    user_id: userId
                }));
                await NotificationUser.insertMany(notificationUsers);
            }
            else if (type === 'system' || type === 'promotion') {
                const users = await User.find({ role: 'user' });
                const notificationUsers = users.map(user => ({
                    notification_id: savedNotification._id,
                    user_id: user._id
                }));
                await NotificationUser.insertMany(notificationUsers);
            }

            res.status(200).json({
                status: 200,
                message: "Cập nhật thông báo thành công",
                data: savedNotification
            });

        } catch (error) {
            console.error('Error updating notification:', error);
            res.status(500).json({
                status: 500,
                message: "Lỗi khi cập nhật thông báo",
                error: error.message
            });
        }
    },

    // Xóa thông báo (admin only)
    deleteNotification: async (req, res) => {
        try {
            const notification = await Notification.findById(req.params.id);
            if (!notification) {
                return res.status(404).json({
                    status: 404,
                    message: "Không tìm thấy thông báo"
                });
            }

            // Xóa tất cả notification_users liên quan
            await NotificationUser.deleteMany({ notification_id: notification._id });
            console.log('Deleted notification users');

            // Xóa notification
            await Notification.findByIdAndDelete(req.params.id);
            console.log('Deleted notification');

            res.status(200).json({
                status: 200,
                message: "Xóa thông báo thành công"
            });
        } catch (error) {
            console.error('Error deleting notification:', error);
            res.status(500).json({
                status: 500,
                message: "Lỗi khi xóa thông báo",
                error: error.message
            });
        }
    },

    // Search notifications
    searchNotifications: async (req, res) => {
        try {
            const { keyword } = req.query;

            let query = {};
            if (keyword) {
                query = {
                    $or: [
                        { title: { $regex: keyword, $options: 'i' } },
                        { content: { $regex: keyword, $options: 'i' } },
                        { type: { $regex: keyword, $options: 'i' } }
                    ]
                };
            }

            const notifications = await Notification.find(query)
                .sort({ created_at: -1 });

            res.status(200).json({
                status: 200,
                message: "Kết quả tìm kiếm",
                data: notifications
            });
        } catch (error) {
            res.status(500).json({
                status: 500,
                message: "Lỗi khi tìm kiếm thông báo",
                error: error.message
            });
        }
    }
};