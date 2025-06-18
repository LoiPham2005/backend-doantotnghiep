const User = require('../models/user.model');
const Order = require('../models/orders.model');
const OrderDetail = require('../models/order_details.model');

module.exports = {
    getDailyStats: async (req, res) => {
        try {
            // Get total users (excluding admins)
            const totalUsers = await User.countDocuments({ role: 'user' });

            // Get total orders
            const totalOrders = await Order.countDocuments();

            // Get pending orders
            const pendingOrders = await Order.countDocuments({ status: 'pending' });

            // Get total revenue from all completed orders
            const completedOrders = await Order.find({
                status: { $in: ['delivered', 'received'] }
            });
            const totalRevenue = completedOrders.reduce((sum, order) => sum + order.final_total, 0);

            // Calculate percentage changes
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            yesterday.setHours(0, 0, 0, 0);

            const todayOrders = await Order.countDocuments({
                createdAt: { $gte: yesterday }
            });

            const yesterdayStart = new Date(yesterday);
            const yesterdayEnd = new Date(yesterday);
            yesterdayStart.setDate(yesterdayStart.getDate() - 1);

            const yesterdayOrders = await Order.countDocuments({
                createdAt: {
                    $gte: yesterdayStart,
                    $lt: yesterdayEnd
                }
            });

            // Calculate revenue for today and yesterday
            const todayRevenue = await Order.aggregate([
                {
                    $match: {
                        createdAt: { $gte: yesterday },
                        status: { $in: ['delivered', 'received'] }
                    }
                },
                {
                    $group: {
                        _id: null,
                        total: { $sum: '$final_total' }
                    }
                }
            ]);

            const yesterdayRevenue = await Order.aggregate([
                {
                    $match: {
                        createdAt: {
                            $gte: yesterdayStart,
                            $lt: yesterdayEnd
                        },
                        status: { $in: ['delivered', 'received'] }
                    }
                },
                {
                    $group: {
                        _id: null,
                        total: { $sum: '$final_total' }
                    }
                }
            ]);

            // Calculate percentage changes
            const ordersChange = yesterdayOrders === 0
                ? 100
                : ((todayOrders - yesterdayOrders) / yesterdayOrders * 100).toFixed(1);

            const revenueChange = yesterdayRevenue.length === 0 || yesterdayRevenue[0].total === 0
                ? 100
                : (((todayRevenue[0]?.total || 0) - yesterdayRevenue[0].total) / yesterdayRevenue[0].total * 100).toFixed(1);

            res.status(200).json({
                status: 200,
                message: "Thống kê tổng quan",
                data: {
                    totalUsers,
                    totalOrders,
                    totalRevenue,
                    pendingOrders,
                    ordersChange: Number(ordersChange),
                    revenueChange: Number(revenueChange)
                }
            });

        } catch (error) {
            console.error('Error getting statistics:', error);
            res.status(500).json({
                status: 500,
                message: "Lỗi khi lấy thống kê",
                error: error.message
            });
        }
    },

    getRevenueByDateRange: async (req, res) => {
        try {
            const { startDate, endDate } = req.query;
            const query = {
                status: { $in: ['delivered', 'received'] }
            };

            if (startDate && endDate) {
                query.createdAt = {
                    $gte: new Date(startDate),
                    $lte: new Date(endDate)
                };
            }

            // Group theo ngày và tính tổng doanh thu
            const revenue = await Order.aggregate([
                { $match: query },
                {
                    $group: {
                        _id: {
                            date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }
                        },
                        totalRevenue: { $sum: "$final_total" },
                        orderCount: { $sum: 1 }
                    }
                },
                { $sort: { "_id.date": 1 } }
            ]);

            // Format lại dữ liệu để trả về
            const formattedRevenue = revenue.map(item => ({
                date: item._id.date,
                totalRevenue: item.totalRevenue,
                orderCount: item.orderCount
            }));

            res.status(200).json({
                status: 200,
                message: "Thống kê doanh thu theo ngày",
                data: formattedRevenue
            });

        } catch (error) {
            res.status(500).json({
                status: 500,
                message: "Lỗi khi lấy thống kê doanh thu",
                error: error.message
            });
        }
    },

    getTopProducts: async (req, res) => {
        try {
            const { startDate, endDate } = req.query;
            console.log('Query params:', { startDate, endDate }); // Debug log

            // Build match query for orders
            const orderMatchQuery = {
                status: { $in: ['delivered', 'received'] }
            };

            if (startDate && endDate) {
                orderMatchQuery.createdAt = {
                    $gte: new Date(startDate),
                    $lte: new Date(endDate)
                };
            }

            const topProducts = await OrderDetail.aggregate([
                {
                    $lookup: {
                        from: 'orders',
                        localField: 'order_id',
                        foreignField: '_id',
                        as: 'order'
                    }
                },
                { $unwind: '$order' },
                {
                    $match: {
                        'order.status': { $in: ['delivered', 'received'] }
                    }
                },
                {
                    $lookup: {
                        from: 'shoesvariants',
                        localField: 'variant_id',
                        foreignField: '_id',
                        as: 'variant'
                    }
                },
                { $unwind: '$variant' },
                {
                    $lookup: {
                        from: 'shoes',
                        localField: 'variant.shoes_id',
                        foreignField: '_id',
                        as: 'product'
                    }
                },
                { $unwind: '$product' },
                {
                    $lookup: {
                        from: 'brands',
                        localField: 'product.brand_id',
                        foreignField: '_id',
                        as: 'brand'
                    }
                },
                { $unwind: '$brand' },
                {
                    $lookup: {
                        from: 'categories',
                        localField: 'product.category_id',
                        foreignField: '_id',
                        as: 'category'
                    }
                },
                { $unwind: '$category' },
                {
                    $group: {
                        _id: '$product._id',
                        name: { $first: '$product.name' },
                        media: { $first: '$product.media' },
                        brand: { $first: '$brand.name' },
                        category: { $first: '$category.name' },
                        price: { $first: '$variant.price' },
                        totalSold: { $sum: '$quantity' },
                        totalRevenue: { $sum: { $multiply: ['$price_at_purchase', '$quantity'] } }
                    }
                },
                { $sort: { totalSold: -1 } },
                { $limit: 10 }
            ]);

            console.log('Top products result:', topProducts); // Debug log

            res.status(200).json({
                status: 200,
                message: "Top 10 sản phẩm bán chạy nhất",
                data: topProducts || [] // Return empty array if no results
            });

        } catch (error) {
            console.error('Error getting top products:', error);
            res.status(500).json({
                status: 500,
                message: "Lỗi khi lấy top sản phẩm",
                error: error.message
            });
        }
    },

    getTopCustomers: async (req, res) => {
        try {
            const { startDate, endDate } = req.query;
            const query = {
                status: { $in: ['delivered', 'received'] }
            };

            if (startDate && endDate) {
                query.createdAt = {
                    $gte: new Date(startDate),
                    $lte: new Date(endDate)
                };
            }

            const topCustomers = await Order.aggregate([
                { $match: query },
                {
                    $group: {
                        _id: '$user_id',
                        totalOrders: { $sum: 1 },
                        totalSpent: { $sum: '$final_total' },
                        lastPurchase: { $max: '$createdAt' }
                    }
                },
                {
                    $lookup: {
                        from: 'users',
                        localField: '_id',
                        foreignField: '_id',
                        as: 'user'
                    }
                },
                { $unwind: '$user' },
                {
                    $project: {
                        _id: 1,
                        username: '$user.username',
                        email: '$user.email',
                        phone: '$user.phone',
                        avatar: '$user.avatar',
                        birth_date: '$user.birth_date',
                        totalOrders: 1,
                        totalSpent: 1,
                        lastPurchase: 1
                    }
                },
                { $sort: { totalSpent: -1 } },
                { $limit: 10 }
            ]);

            res.status(200).json({
                status: 200,
                message: "Top 10 khách hàng",
                data: topCustomers
            });

        } catch (error) {
            res.status(500).json({
                status: 500,
                message: "Lỗi khi lấy top khách hàng",
                error: error.message
            });
        }
    }
};