var express = require('express');
var router = express.Router();

var userController = require('../controllers/user.controller');
var mdw = require('../middleware/middleware');
var forgotPassword = require('../controllers/forgotPassword.controller');
var bannerController = require('../controllers/banner.controller');
var categoryController = require('../controllers/category.controller');
var brand = require('../controllers/brand.controller');
var cartController = require('../controllers/carts.controller');
const shoesController = require('../controllers/shoes.controller');
const upload = require('../config/upload');
const shoesVariantController = require('../controllers/shoes_variant.controller');
const colorController = require('../controllers/color.controller');
const sizesController = require('../controllers/sizes.controller');
const favouritesController = require('../controllers/favourites.controller');
const addressController = require('../controllers/address.controller');
const postsController = require('../controllers/posts.controller');
const vouchersController = require('../controllers/vouchers.controller');
const userVouchersController = require('../controllers/user_vouchers.controller');
const notificationsController = require('../controllers/notification.controller');
const notificationUsersController = require('../controllers/notification_user.controller');
const ordersController = require('../controllers/orders.controller');
const paymentHistoryController = require('../controllers/payment_history.controller');
const reviewsController = require('../controllers/reviews.controller');
const returnRequestController = require('../controllers/return_request.controller');
const messagesController = require('../controllers/message.controller');
const momo = require('../controllers/momo.controller');
const statisticsController = require('../controllers/statistics.controller');

// đăng kí , đăng nhập
router.post('/users/login', userController.login);
router.post('/users/reg', userController.register);
router.get('/users/list', mdw.api_auth, userController.getAllUsers);
router.post('/users/logout', mdw.api_auth, userController.logout);
router.post('/refresh-token', userController.refreshToken);

//cập nhật thông tin user
router.patch('/users/edit/:id', mdw.api_auth, upload.single('avatar'), userController.editUser);
router.get('/users/getAdmin', mdw.api_auth, userController.getAdmin);
router.put('/users/change-password/:id', mdw.api_auth, userController.changePassword);
router.get('/users/search', mdw.api_auth, userController.searchUsers);
router.put('/users/toggle-active/:id', mdw.api_auth, userController.toggleUserActive);

// quên mật khẩu
router.post('/check/sendOtp', forgotPassword.sendOtp);
router.post('/check/checkOTP', forgotPassword.checkOtpValidity);
router.put('/check/reset-password/:email', forgotPassword.resetPassword);
router.delete('/check/deleteOTP/:email', forgotPassword.deleteOtp);

// API banner
router.post('/banner/add', mdw.api_auth, upload.single('media'), bannerController.add);
router.get('/banner/list', bannerController.list);
router.put('/banner/edit/:id', mdw.api_auth, bannerController.edit);
router.delete('/banner/delete/:id', mdw.api_auth, bannerController.delete);

// thêm sửa xoá hiển thị category
router.post('/category/add', mdw.api_auth, upload.single('media'), categoryController.add);
router.get('/category/list', categoryController.list);
router.get('/category/getbyid/:id', categoryController.getbyid);
router.put('/category/edit/:id', mdw.api_auth, upload.single('media'), categoryController.edit);
router.delete('/category/delete/:id', mdw.api_auth, categoryController.delete);
router.get('/category/search', categoryController.search);
router.put('/category/toggle-active/:id', mdw.api_auth, categoryController.toggleActive);

// thêm sửa xoá hiển thị brand
router.post('/brand/add', mdw.api_auth, upload.single('media'), brand.add);
router.get('/brand/list', brand.list);
router.get('/brand/getbyid/:id', brand.getbyid);
router.put('/brand/edit/:id', mdw.api_auth, upload.single('media'), brand.edit);
router.delete('/brand/delete/:id', mdw.api_auth, brand.delete);
router.get('/brand/search', brand.search);
router.put('/brand/toggle-active/:id', mdw.api_auth, brand.toggleActive);

// API quản lý sản phẩm
router.get('/shoes/filter-by-brand-category', shoesController.getShoesByBrandAndCategory); // Di chuyển lên trên
router.get('/shoes/top-selling', shoesController.getTopSellingProducts);
router.get('/shoes/list', shoesController.getAllShoes);
router.get('/shoes/list-web', shoesController.getAllShoesWeb);
router.get('/shoes/search', shoesController.searchShoes); // Thêm route tìm kiếm sản phẩm
router.get('/shoes/filter', shoesController.filterShoes);
router.get('/shoes/filterShoesAZ', shoesController.filterShoesAZ);

router.post('/shoes/add', mdw.api_auth, upload.array('media', 10), shoesController.addShoes);
router.get('/shoes/:id', shoesController.getShoeById); // Di chuyển xuống dưới
router.put('/shoes/edit/:id', mdw.api_auth, upload.array('media', 10), shoesController.updateShoe);
router.delete('/shoes/delete/:id', mdw.api_auth, shoesController.deleteShoe);
router.get('/shoes/similar/:id', shoesController.getSimilarProducts);

// API quản lý variants
router.post('/variants/add', mdw.api_auth, shoesVariantController.addVariant);
router.get('/variants/shoe/:shoes_id', shoesVariantController.getVariantsByShoeId);
router.get('/variants/:id', shoesVariantController.getVariantById);
router.put('/variants/edit/:id', mdw.api_auth, shoesVariantController.updateVariant);
router.delete('/variants/delete/:id', mdw.api_auth, shoesVariantController.deleteVariant);

// API quản lý màu sắc
router.post('/colors/add', mdw.api_auth, colorController.addColor);
router.get('/colors/list', colorController.getAllColors);
router.get('/colors/:id', colorController.getColorById);
router.put('/colors/edit/:id', mdw.api_auth, colorController.updateColor);
router.delete('/colors/delete/:id', mdw.api_auth, colorController.deleteColor);

// API quản lý size
router.post('/sizes/add', mdw.api_auth, sizesController.addSize);
router.get('/sizes/list', sizesController.getAllSizes);
router.get('/sizes/:id', sizesController.getSizeById);
router.put('/sizes/edit/:id', mdw.api_auth, sizesController.updateSize);
router.delete('/sizes/delete/:id', mdw.api_auth, sizesController.deleteSize);

// API quản lý yêu thích
router.post('/favourites/add', mdw.api_auth, favouritesController.addToFavourites);
router.get('/favourites/user/:user_id', mdw.api_auth, favouritesController.getFavouritesByUser);
router.get('/favourites/check/:user_id/:shoes_id', mdw.api_auth, favouritesController.checkFavourite);
router.delete('/favourites/remove/:user_id/:shoes_id', mdw.api_auth, favouritesController.removeFromFavourites);

// API quản lý giỏ hàng  
router.post('/cart/add', mdw.api_auth, cartController.addToCart);
router.get('/cart/user/:user_id', mdw.api_auth, cartController.getCartByUser);
router.put('/cart/update/:id', mdw.api_auth, cartController.updateCartItem);
router.delete('/cart/remove/:id', mdw.api_auth, cartController.removeFromCart);
router.delete('/cart/clear/:user_id', mdw.api_auth, cartController.clearCart);

// API quản lý địa chỉ
router.post('/address/add', mdw.api_auth, addressController.addAddress);
router.get('/address/user/:user_id', mdw.api_auth, addressController.getAddressesByUser);
router.put('/address/edit/:id', mdw.api_auth, addressController.updateAddress);
router.delete('/address/delete/:id', mdw.api_auth, addressController.deleteAddress);
router.put('/address/set-default/:id', mdw.api_auth, addressController.setDefaultAddress);

// API quản lý bài viết
router.post('/posts/add', mdw.api_auth, upload.array('media', 10), postsController.createPost);
router.get('/posts/list', postsController.getAllPosts);
router.get('/posts/getbyid/:id', postsController.getPostById);
router.put('/posts/edit/:id', mdw.api_auth, upload.array('media', 10), postsController.updatePost);
router.delete('/posts/delete/:id', mdw.api_auth, postsController.deletePost);
router.get('/posts/search', mdw.api_auth, postsController.searchPosts);

// API quản lý voucher
router.post('/vouchers/add', mdw.api_auth, vouchersController.createVoucher);
router.get('/vouchers/list', vouchersController.getAllVouchers);
router.get('/vouchers/available', vouchersController.getAvailableVouchers);
router.put('/vouchers/edit/:id', mdw.api_auth, vouchersController.updateVoucher);
router.delete('/vouchers/delete/:id', mdw.api_auth, vouchersController.deleteVoucher);
router.get('/vouchers/search', vouchersController.searchVouchers); // Thêm route search

// API quản lý voucher của user
router.post('/user-vouchers/save', mdw.api_auth, userVouchersController.saveVoucherToUser);
router.get('/user-vouchers/voucher/:voucher_id', mdw.api_auth, userVouchersController.getUsersByVoucherId);
router.get('/user-vouchers/:user_id', mdw.api_auth, userVouchersController.getUserVouchers);
router.post('/user-vouchers/use', mdw.api_auth, userVouchersController.useVoucher);
router.delete('/user-vouchers/voucher/:voucher_id', mdw.api_auth, userVouchersController.removeAllUserVouchers);

// API quản lý thông báo
router.post('/notifications/add', mdw.api_auth, notificationsController.createNotification);
router.get('/notifications/list', notificationsController.getAllNotifications);
router.put('/notifications/update/:id', mdw.api_auth, notificationsController.updateNotification);
router.delete('/notifications/delete/:id', mdw.api_auth, notificationsController.deleteNotification);
router.get('/notifications/search', mdw.api_auth, notificationsController.searchNotifications);

// API quản lý thông báo của user
router.post('/notifications/user/add', mdw.api_auth, notificationUsersController.createUserNotification);
router.get('/notifications/user/:user_id', mdw.api_auth, notificationUsersController.getUserNotifications);
router.put('/notifications/user/:user_id/:notification_id', mdw.api_auth, notificationUsersController.updateUserNotification);
router.put('/notifications/read/:user_id/:notification_id', mdw.api_auth, notificationUsersController.markAsRead);
router.put('/notifications/read-all/:user_id', mdw.api_auth, notificationUsersController.markAllAsRead);
router.delete('/notifications/user/:user_id/:notification_id', mdw.api_auth, notificationUsersController.deleteUserNotification);
router.get('/notifications/:notification_id/users', mdw.api_auth, notificationUsersController.getUsersByNotificationId);

// Thêm route cho admin notifications
router.get('/notifications/admin', mdw.api_auth, notificationUsersController.getAdminNotifications);

// API quản lý đơn hàng
router.post('/orders/add', mdw.api_auth, ordersController.createOrder);
router.post('/orders-details/add', mdw.api_auth, ordersController.createOrderDetails);
router.get('/orders/list', mdw.api_auth, ordersController.getAllOrders);
router.get('/orders/getbyid/:id', mdw.api_auth, ordersController.getOrderById);
router.put('/orders/status/:id', mdw.api_auth, ordersController.updateOrderStatus);
router.get('/orders/user/:user_id', mdw.api_auth, ordersController.getUserOrders);
router.get('/orders/search', mdw.api_auth, ordersController.searchOrders);

// API quản lý lịch sử thanh toán
router.post('/payment-history/add', mdw.api_auth, paymentHistoryController.createPaymentHistory);
router.get('/payment-history/list', mdw.api_auth, paymentHistoryController.getAllPaymentHistory);
router.get('/payment-history/:id', mdw.api_auth, paymentHistoryController.getPaymentById);
router.get('/payment-history/user/:user_id', mdw.api_auth, paymentHistoryController.getUserPaymentHistory);
router.get('/payment-history/statistics', mdw.api_auth, paymentHistoryController.getPaymentStatistics);
router.get('/payment-history/search', mdw.api_auth, paymentHistoryController.searchPaymentHistory);

// Thanh toán ví Momo
router.post('/momo/create', mdw.api_auth, momo.createPayment);
router.post('/momo/callback', momo.handleCallback);

// API quản lý đánh giá
router.get('/reviews/product/:product_id', reviewsController.getProductReviews);
router.post('/reviews/add', mdw.api_auth, upload.array('media', 5), reviewsController.createReview);
router.get('/reviews/user/:user_id', mdw.api_auth, reviewsController.getUserReviews);
router.put('/reviews/verify/:id', mdw.api_auth, reviewsController.verifyReview);
router.delete('/reviews/:id', mdw.api_auth, reviewsController.deleteReview);

// API quản lý trả hàng
router.post('/return-requests/add', mdw.api_auth, upload.array('images', 5), returnRequestController.createReturnRequest);
router.get('/return-requests/list', mdw.api_auth, returnRequestController.getAllReturnRequests);
router.get('/return-requests/:id', mdw.api_auth, returnRequestController.getReturnRequestById);
router.get('/return-requests/user/:user_id', mdw.api_auth, returnRequestController.getUserReturnRequests);
router.put('/return-requests/status/:id', mdw.api_auth, returnRequestController.updateReturnRequestStatus);
router.delete('/return-requests/:id', mdw.api_auth, returnRequestController.deleteReturnRequest);

// API quản lý tin nhắn
router.post('/messages/send', mdw.api_auth, messagesController.sendMessage);
router.get('/messages/history/:user1_id/:user2_id', mdw.api_auth, messagesController.getChatHistory);
router.get('/chats/admin', mdw.api_auth, messagesController.getAdminChats);
router.get('/chats', mdw.api_auth, messagesController.getOrCreateChat);

// API thống kê
router.get('/statistics/daily', mdw.api_auth, statisticsController.getDailyStats);
router.get('/statistics/revenue', mdw.api_auth, statisticsController.getRevenueByDateRange);
router.get('/statistics/top-products', mdw.api_auth, statisticsController.getTopProducts);
router.get('/statistics/top-customers', mdw.api_auth, statisticsController.getTopCustomers);

// Thêm routes cho đánh dấu đã đọc thông báo
router.put('/notifications/user/read/:notification_id', mdw.api_auth, notificationUsersController.markAsRead);
router.put('/notifications/user/mark-all-read', mdw.api_auth, notificationUsersController.markAllAsRead);

// Sửa route cho đánh dấu đã đọc thông báo
router.put('/notifications/read/:notification_id', mdw.api_auth, notificationUsersController.markAsRead);

// Lấy danh mục theo brand
router.get('/category/by-brand/:brand_id', categoryController.getCategoriesByBrand);

module.exports = router;
