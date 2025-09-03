const admin = require('../config/firebase');
const User = require('../models/user.model'); // Thêm dòng này

const sendPushNotification = async (userId, title, body, data = {}) => {
  try {
    // Lấy FCM token từ user document
    const user = await User.findById(userId);
    if (!user?.fcmToken) return;

    const message = {
      notification: {
        title,
        body,
      },
      data: {
        ...data,
        click_action: 'NOTIFICATION_CLICK',
      },
      token: user.fcmToken,
    };

    const response = await admin.messaging().send(message);
    console.log('Successfully sent notification:', response);
    return response;
  } catch (error) {
    console.error('Error sending notification:', error);
    throw error;
  }
};

module.exports = { sendPushNotification };