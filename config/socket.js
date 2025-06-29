const socketIO = require('socket.io');
const Chat = require('../models/chat.model');
const Message = require('../models/message.model');

function initializeSocket(server) {
  const io = socketIO(server, {
    cors: {
      // origin: ["http://localhost:5173", "http://localhost:3000", "https://web-admin-doantotnghiep.onrender.com"],
      origin: "*", // Allow all origins
      methods: ["GET", "POST"],
      credentials: true
    }
  });

  // Store connected users
  const connectedUsers = new Map();

  io.on('connection', (socket) => {
    console.log('New socket connected:', socket.id);

    // User joins with their ID
    socket.on('join', (userId) => {
      console.log(`User ${userId} joined`);
      connectedUsers.set(userId, socket.id);
      socket.userId = userId;
    });

    // Join chat room
    socket.on('join chat', async ({ userId, partnerId }) => {
      console.log('Join chat request:', { userId, partnerId });

      try {
        // Tìm hoặc tạo chat
        let chat = await Chat.findOne({
          $or: [
            { user_id: partnerId, admin_id: userId },
            { user_id: userId, admin_id: partnerId }
          ]
        });

        if (!chat) {
          chat = new Chat({
            user_id: partnerId,
            admin_id: userId
          });
          await chat.save();
        }

        // Join room với chat._id
        const roomId = chat._id.toString();
        socket.join(roomId);
        console.log('Joined room:', roomId);

        // Gửi chat info về client
        socket.emit('chat info', chat);

      } catch (error) {
        console.error('Error joining chat:', error);
      }
    });

    socket.on('new message', async (data) => {
      try {
        const { chat_id, sender_id, content } = data;
        console.log('New message:', { chat_id, sender_id, content });

        const chat = await Chat.findById(chat_id);
        if (!chat) {
          throw new Error('Chat not found');
        }

        // Save message with sent_at
        const message = new Message({
          chat_id: chat._id,
          sender_id,
          content,
          sent_at: new Date()
        });
        await message.save();

        // Update last message in chat
        chat.last_message = message._id;
        chat.updated_at = new Date();
        await chat.save();

        // Populate message with sender info  
        const populatedMessage = await Message.findById(message._id)
          .populate('sender_id', 'username avatar');

        // Emit to all users in chat room
        const roomId = chat._id.toString();
        console.log('Emitting message to room:', roomId);
        io.to(roomId).emit('message received', populatedMessage);

      } catch (error) {
        console.error('Error handling message:', error);
      }
    });

    // Handle new notification
    socket.on('new notification', (notification) => {
      if (notification.selectedUsers && notification.selectedUsers.length > 0) {
        notification.selectedUsers.forEach(userId => {
          const userSocketId = connectedUsers.get(userId);
          if (userSocketId) {
            io.to(userSocketId).emit('notification received', notification);
            
            // Trigger cập nhật danh sách thông báo
            io.to(userId.toString()).emit('refresh notifications');
          }
        });
      } else {
        // Gửi thông báo cho tất cả user nếu là thông báo hệ thống/khuyến mãi
        socket.broadcast.emit('notification received', notification);
      }
    });

    socket.on('disconnect', () => {
      if (socket.userId) {
        connectedUsers.delete(socket.userId);
      }
      console.log('Socket disconnected:', socket.id);
    });
  });

  return io;
}

module.exports = initializeSocket;