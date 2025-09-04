const User = require('../models/user.model');
const Order = require('../models/orders.model');
const OrderDetail = require('../models/order_details.model');
const ShoesVariant = require('../models/shoes_variant.model');
const Shoes = require('../models/shoes.model');

module.exports = {
    getDailyStats: async (req, res) => {
        try {
            const { startDate, endDate } = req.query;
            const dateQuery = {};

            if (startDate && endDate) {
                dateQuery.createdAt = {
                    $gte: new Date(startDate),
                    $lte: new Date(endDate)
                };
            }

            // Get total users (excluding admins)
            const totalUsers = await User.countDocuments({ role: 'user' });

            // Get orders within date range
            const totalOrders = await Order.countDocuments(dateQuery);

            // Get pending orders within date range
            const pendingOrders = await Order.countDocuments({
                ...dateQuery,
                status: 'pending'
            });

            // Get total revenue from completed orders within date range
            const completedOrders = await Order.find({
                ...dateQuery,
                status: { $in: ['delivered', 'received'] }
            });
            const totalRevenue = completedOrders.reduce((sum, order) =>
                sum + order.final_total, 0
            );

            // Calculate percentage changes compared to previous period
            const previousStart = new Date(startDate);
            previousStart.setDate(previousStart.getDate() -
                (new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24)
            );
            const previousEnd = new Date(startDate);

            // Get previous period orders
            const previousPeriodOrders = await Order.countDocuments({
                createdAt: {
                    $gte: previousStart,
                    $lt: previousEnd
                }
            });

            // Get previous period revenue
            const previousPeriodRevenue = await Order.aggregate([
                {
                    $match: {
                        createdAt: {
                            $gte: previousStart,
                            $lt: previousEnd
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

            // Calculate changes
            const ordersChange = previousPeriodOrders === 0
                ? 100
                : ((totalOrders - previousPeriodOrders) / previousPeriodOrders * 100).toFixed(1);

            const revenueChange = previousPeriodRevenue.length === 0
                ? 100
                : ((totalRevenue - previousPeriodRevenue[0].total) / previousPeriodRevenue[0].total * 100).toFixed(1);

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

    // getRevenueByDateRange: async (req, res) => {
    //     try {
    //         const { startDate, endDate } = req.query;
    //         const query = {
    //             status: { $in: ['delivered', 'received'] }
    //         };

    //         if (startDate && endDate) {
    //             query.createdAt = {
    //                 $gte: new Date(startDate),
    //                 $lte: new Date(endDate)
    //             };
    //         }

    //         // Group theo ngày và tính tổng doanh thu
    //         const revenue = await Order.aggregate([
    //             { $match: query },
    //             {
    //                 $group: {
    //                     _id: {
    //                         date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }
    //                     },
    //                     totalRevenue: { $sum: "$final_total" },
    //                     orderCount: { $sum: 1 }
    //                 }
    //             },
    //             { $sort: { "_id.date": 1 } }
    //         ]);

    //         // Format lại dữ liệu để trả về
    //         const formattedRevenue = revenue.map(item => ({
    //             date: item._id.date,
    //             totalRevenue: item.totalRevenue,
    //             orderCount: item.orderCount
    //         }));

    //         res.status(200).json({
    //             status: 200,
    //             message: "Thống kê doanh thu theo ngày",
    //             data: formattedRevenue
    //         });

    //     } catch (error) {
    //         res.status(500).json({
    //             status: 500,
    //             message: "Lỗi khi lấy thống kê doanh thu",
    //             error: error.message
    //         });
    //     }
    // },


    getRevenueByDateRange: async (req, res) => {
        try {
            const { startDate, endDate } = req.query;
            // const query = {
            //     status: { $in: ['delivered'] }
            // };
            // const start = new Date(startDate);
            // const end = new Date(endDate);

            // query.createdAt = {
            //     $gte: start,
            //     $lte: end
            // };

            // Chỉ lấy đơn đã giao thành công và có delivery_date
            const query = {
                status: 'delivered',
                delivery_date: {
                    $exists: true,
                    $ne: null,
                    $gte: new Date(startDate),
                    $lte: new Date(endDate)
                }
            };

            // Xử lý timezone - chuyển về đầu ngày và cuối ngày theo giờ VN
            // if (startDate && endDate) {
            //     const start = new Date(startDate);
            //     start.setHours(0, 0, 0, 0);
            //     // Trừ đi 7 tiếng để đảm bảo lấy từ 00:00 giờ VN
            //     start.setHours(start.getHours() - 7);

            //     const end = new Date(endDate);
            //     end.setHours(23, 59, 59, 999);
            //     // Trừ đi 7 tiếng để đảm bảo lấy đến 23:59:59 giờ VN
            //     end.setHours(end.getHours() - 7);

            //     query.createdAt = {
            //         $gte: start,
            //         $lte: end
            //     };
            // }



            console.log('Query:', JSON.stringify(query, null, 2));

            const revenue = await Order.aggregate([
                { $match: query },
                {
                    $addFields: {
                        // Convert sang timezone VN trước khi group
                        localDate: {
                            $dateToString: {
                                format: "%Y-%m-%d",
                                //  date: "$createdAt",
                                date: "$delivery_date",
                                timezone: "Asia/Ho_Chi_Minh"
                            }
                        }
                    }
                },
                {
                    $group: {
                        _id: "$localDate",
                        totalRevenue: { $sum: "$final_total" },
                        orderCount: { $sum: 1 }
                    }
                },
                {
                    $project: {
                        _id: 0,
                        date: "$_id",
                        totalRevenue: 1,
                        orderCount: 1
                    }
                },
                {
                    $sort: { "date": 1 }
                }
            ]);

            // Log để debug
            console.log('Raw Revenue Data:', JSON.stringify(revenue, null, 2));

            res.status(200).json({
                status: 200,
                message: "Thống kê doanh thu theo ngày",
                data: revenue
            });

        } catch (error) {
            console.error('Error getting revenue stats:', error);
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

            // Build match query for orders
            const matchQuery = {
                status: { $in: ['delivered', 'received'] }
            };

            if (startDate && endDate) {
                matchQuery.createdAt = {
                    $gte: new Date(startDate),
                    $lte: new Date(endDate)
                };
            }

            // Log để debug
            console.log('Match Query:', matchQuery);

            const topProducts = await Order.aggregate([
                { $match: matchQuery },
                {
                    $lookup: {
                        from: 'orderdetails',
                        localField: '_id',
                        foreignField: 'order_id',
                        as: 'details'
                    }
                },
                { $unwind: '$details' },
                {
                    $lookup: {
                        from: 'shoesvariants',
                        localField: 'details.variant_id',
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
                        brand_id: { $first: '$brand' },
                        category_id: { $first: '$category' },
                        totalSold: { $sum: '$details.quantity' },
                        totalRevenue: {
                            $sum: { $multiply: ['$details.price_at_purchase', '$details.quantity'] }
                        }
                    }
                },
                { $sort: { totalSold: -1 } },
                { $limit: 10 }
            ]);

            // Log để debug
            console.log('Found products:', topProducts.length);

            res.status(200).json({
                status: 200,
                message: "Top 10 sản phẩm bán chạy nhất",
                data: {
                    products: topProducts
                }
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
                        birthDate: '$user.birthDate',
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