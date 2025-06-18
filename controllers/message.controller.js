const Message = require('../models/message.model');
const Chat = require('../models/chat.model');
const User = require('../models/user.model');

module.exports = {
    // Lấy hoặc tạo chat
    getOrCreateChat: async (req, res) => {
        try {
            const { user_id, admin_id } = req.query;

            let chat = await Chat.findOne({
                user_id,
                admin_id
            });

            if (!chat) {
                chat = new Chat({
                    user_id,
                    admin_id
                });
                await chat.save();
            }

            const messages = await Message.find({ chat_id: chat._id })
                .populate('sender_id', 'username avatar')
                .sort({ createdAt: -1 })
                .limit(50);

            res.status(200).json({
                status: 200,
                message: "Chat retrieved successfully",
                data: {
                    chat,
                    messages: messages.reverse()
                }
            });

        } catch (error) {
            res.status(500).json({
                status: 500,
                message: "Error getting chat",
                error: error.message
            });
        }
    },

    // Gửi tin nhắn
    sendMessage: async (req, res) => {
        try {
            const { chat_id, sender_id, content } = req.body;

            const message = new Message({
                chat_id,
                sender_id,
                content
            });

            await message.save();

            // Update last message in chat
            await Chat.findByIdAndUpdate(chat_id, {
                last_message: message._id,
                updated_at: new Date()
            });

            const populatedMessage = await Message.findById(message._id)
                .populate('sender_id', 'username avatar');

            // Get io instance
            const io = req.app.get('io');
            if (io) {
                const chat = await Chat.findById(chat_id);
                io.to(chat.user_id.toString()).to(chat.admin_id.toString()).emit('new message', populatedMessage);
            }

            res.status(200).json({
                status: 200,
                message: "Message sent successfully",
                data: populatedMessage
            });

        } catch (error) {
            res.status(500).json({
                status: 500,
                message: "Error sending message",
                error: error.message
            });
        }
    },

    // Lấy danh sách chat của admin 
    getAdminChats: async (req, res) => {
        try {
            const chats = await Chat.find()
                .populate('user_id', 'username email avatar')
                .populate('admin_id', 'username')
                .populate('last_message')
                .sort({ updated_at: -1 });

            res.status(200).json({
                status: 200,
                message: "Admin chats retrieved successfully",
                data: chats
            });

        } catch (error) {
            res.status(500).json({
                status: 500,
                message: "Error getting admin chats",
                error: error.message
            });
        }
    },

    // Thêm hàm lấy lịch sử chat
    getChatHistory: async (req, res) => {
        try {
            const { user1_id, user2_id } = req.params;

            // Tìm chat giữa 2 user
            const chat = await Chat.findOne({
                $or: [
                    { user_id: user1_id, admin_id: user2_id },
                    { user_id: user2_id, admin_id: user1_id }
                ]
            });

            if (!chat) {
                return res.status(200).json({
                    status: 200,
                    message: "No chat history",
                    data: {
                        messages: []
                    }
                });
            }

            // Lấy tin nhắn của chat
            const messages = await Message.find({ chat_id: chat._id })
                .populate('sender_id', 'username avatar')
                .sort({ createdAt: 1 });

            res.status(200).json({
                status: 200,
                message: "Chat history retrieved successfully",
                data: {
                    chat,
                    messages
                }
            });

        } catch (error) {
            console.error('Error getting chat history:', error);
            res.status(500).json({
                status: 500,
                message: "Error getting chat history",
                error: error.message
            });
        }
    }
};