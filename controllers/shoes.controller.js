const express = require('express');
const router = express.Router();
const Shoes = require('../models/shoes.model');
const ShoesVariant = require('../models/shoes_variant.model');
const path = require('path'); // Thêm import path
const Brand = require('../models/brand.model'); // Import model Brand
const Category = require('../models/category.model'); // Import model Category
const Size = require('../models/sizes.model'); // Import model Category
const Review = require('../models/reviews.model');
// const { createFileUrl, deleteFile } = require('../utils/fileUtils');
const { uploadToCloudinary, deleteFromCloudinary, deleteFile } = require('../utils/fileUtils');

// Helper function để kiểm tra role 
const isAdmin = (req) => req.user?.role === 'admin';

module.exports = {
    // Thêm sản phẩm mới
    addShoes: async (req, res) => {
        try {

            const { name, description, brand_id, category_id, variants } = req.body;

            // // Xử lý media files
            // let mediaFiles = [];
            // if (req.files && req.files.length > 0) {
            //     mediaFiles = req.files.map(file => ({
            //         type: file.mimetype.startsWith('image/') ? 'image' : 'video',
            //         url: createFileUrl(req, file.filename)  // Thêm req vào đây
            //     }));
            // }

            let mediaFiles = [];

            if (req.files && req.files.length > 0) {
                for (const file of req.files) {
                    const result = await uploadToCloudinary(file.path, 'shoes');
                    mediaFiles.push({
                        type: result.resource_type,
                        url: result.url,
                        public_id: result.public_id
                    });
                }
            }

            // Tạo sản phẩm mới
            const newShoes = new Shoes({
                name,
                description,
                brand_id,
                category_id,
                media: mediaFiles
            });

            // Lưu sản phẩm
            const savedShoes = await newShoes.save();

            // Xử lý variants
            let savedVariants = [];
            if (variants) {
                const variantsArray = typeof variants === 'string' ?
                    JSON.parse(variants) : variants;

                const variantPromises = variantsArray.map(variant => {
                    return new ShoesVariant({
                        shoes_id: savedShoes._id,
                        price: variant.price,
                        quantity_in_stock: variant.quantity_in_stock,
                        size_id: variant.size_id,
                        color_id: variant.color_id
                    }).save();
                });

                savedVariants = await Promise.all(variantPromises);
            }

            res.status(200).json({
                status: 200,
                message: "Thêm sản phẩm thành công",
                data: {
                    shoes: savedShoes,
                    variants: savedVariants
                }
            });
        } catch (error) {
            // Nếu có lỗi, xóa các file đã upload
            if (req.files) {
                for (const file of req.files) {
                    await deleteFile(file.path);
                }
            }
            console.error("Error adding shoes:", error);
            res.status(500).json({
                status: 500,
                message: "Lỗi khi thêm sản phẩm",
                error: error.message
            });
        }
    },

    // Lấy tất cả sản phẩm cho admin (hiện tất cả sản phẩm)
    getAllShoesWeb: async (req, res) => {
        try {
            const shoes = await Shoes.find()
                .populate('brand_id')
                .populate('category_id');

            const shoesWithVariants = await Promise.all(shoes.map(async (shoe) => {
                const variants = await ShoesVariant.find({ shoes_id: shoe._id })
                    .populate('size_id')
                    .populate('color_id');
                return {
                    ...shoe._doc,
                    variants
                };
            }));

            res.status(200).json({
                status: 200,
                message: "Danh sách sản phẩm",
                data: shoesWithVariants
            });
        } catch (error) {
            res.status(500).json({
                status: 500,
                message: "Lỗi khi lấy danh sách sản phẩm",
                error: error.message
            });
        }
    },

    // Lấy danh sách sản phẩm (với filter)
    getAllShoes: async (req, res) => {
        try {
            const {
                page = 1,
                limit = 10,
                category_id,
                brand_id,
                price_min,
                price_max,
                sort_by,
                search
            } = req.query;

            const skip = (page - 1) * limit;

            // Build base query
            let query = {};

            // Chỉ ẩn sản phẩm hidden với user
            if (!isAdmin(req)) {
                query.status = { $ne: 'hidden' };
            }

            // Thêm các điều kiện filter
            if (category_id) {
                query.category_id = category_id;
            }

            if (brand_id) {
                query.brand_id = brand_id;
            }

            if (search) {
                query.$or = [
                    { name: { $regex: search, $options: 'i' } },
                    { description: { $regex: search, $options: 'i' } }
                ];
            }

            // Get total count
            const totalShoes = await Shoes.countDocuments(query);

            // Get shoes with filters and populate
            let shoes = await Shoes.find(query)
                .populate('brand_id')
                .populate('category_id')
                .skip(skip)
                .limit(limit);

            // Get variants and apply price filter
            const shoesWithVariants = await Promise.all(shoes.map(async (shoe) => {
                const variants = await ShoesVariant.find({ shoes_id: shoe._id })
                    .populate('size_id')
                    .populate('color_id');

                // Calculate min and max prices
                const prices = variants.map(v => v.price);
                const minPrice = Math.min(...prices);
                const maxPrice = Math.max(...prices);

                // Filter by price range if specified
                if ((price_min && minPrice < price_min) ||
                    (price_max && maxPrice > price_max)) {
                    return null;
                }

                return {
                    ...shoe._doc,
                    variants,
                    minPrice,
                    maxPrice
                };
            }));

            // Remove null items (filtered out by price)
            const filteredShoes = shoesWithVariants.filter(shoe => shoe !== null);

            // Apply sorting
            if (sort_by) {
                switch (sort_by) {
                    case 'price_asc':
                        filteredShoes.sort((a, b) => a.minPrice - b.minPrice);
                        break;
                    case 'price_desc':
                        filteredShoes.sort((a, b) => b.maxPrice - a.maxPrice);
                        break;
                    case 'name_asc':
                        filteredShoes.sort((a, b) => a.name.localeCompare(b.name));
                        break;
                    case 'name_desc':
                        filteredShoes.sort((a, b) => b.name.localeCompare(a.name));
                        break;
                    case 'newest':
                        filteredShoes.sort((a, b) => b.created_at - a.created_at);
                        break;
                    case 'oldest':
                        filteredShoes.sort((a, b) => a.created_at - b.created_at);
                        break;
                }
            }

            res.status(200).json({
                status: 200,
                message: "Danh sách sản phẩm",
                data: {
                    currentPage: parseInt(page),
                    totalPages: Math.ceil(totalShoes / limit),
                    totalItems: totalShoes,
                    itemsPerPage: parseInt(limit),
                    shoes: filteredShoes
                }
            });

        } catch (error) {
            console.error("Error getting shoes:", error);
            res.status(500).json({
                status: 500,
                message: "Lỗi khi lấy danh sách sản phẩm",
                error: error.message
            });
        }
    },

    // Lấy chi tiết sản phẩm
    getShoeById: async (req, res) => {
        try {
            const shoe = await Shoes.findById(req.params.id)
                .populate('brand_id')
                .populate('category_id');

            if (!shoe) {
                return res.status(404).json({
                    status: 404,
                    message: "Không tìm thấy sản phẩm"
                });
            }

            // Kiểm tra quyền xem sản phẩm hidden
            if (!isAdmin(req) && shoe.status === 'hidden') {
                return res.status(403).json({
                    status: 403,
                    message: "Không có quyền xem sản phẩm này"
                });
            }

            const variants = await ShoesVariant.find({ shoes_id: shoe._id })
                .populate('size_id')
                .populate('color_id');

            const reviews = await Review.find({ product_id: shoe._id })
                .populate('user_id', 'username email avatar')
                .populate({
                    path: 'variant_id',
                    populate: [
                        // { path: 'shoes_id', select: 'name media' },
                        { path: 'color_id', select: 'name value' },
                        { path: 'size_id', select: 'size_value' }
                    ]
                });
            const totalReviews = await Review.countDocuments({ product_id: shoe._id });

            res.status(200).json({
                status: 200,
                message: "Chi tiết sản phẩm",
                data: {
                    ...shoe._doc,
                    variants,
                    reviews: reviews,
                    totalReviews: totalReviews
                }
            });

        } catch (error) {
            res.status(500).json({
                status: 500,
                message: "Lỗi khi lấy chi tiết sản phẩm",
                error: error.message
            });
        }
    },

    // Cập nhật sản phẩm
    updateShoe: async (req, res) => {
        try {
            const { name, description, brand_id, category_id, status } = req.body;
            const existingMedia = JSON.parse(req.body.existing_media || '[]');

            // Tìm sản phẩm cũ
            const oldShoe = await Shoes.findById(req.params.id);
            if (!oldShoe) {
                return res.status(404).json({
                    status: 404,
                    message: "Không tìm thấy sản phẩm"
                });
            }

            // Cập nhật thông tin cơ bản
            oldShoe.name = name;
            oldShoe.description = description;
            oldShoe.brand_id = brand_id;
            oldShoe.category_id = category_id;
            oldShoe.status = status;

            // Xử lý media
            // let mediaFiles = [...existingMedia]; // Giữ lại các media đã chọn

            // // Xóa các file cũ không còn được sử dụng
            // if (oldShoe.media) {
            //     for (const oldMedia of oldShoe.media) {
            //         if (!existingMedia.some(media => media.url === oldMedia.url)) {
            //             const filename = oldMedia.url.split('/').pop();
            //             const filePath = path.join('public', 'uploads', filename);
            //             try {
            //                 await deleteFile(filePath);
            //             } catch (err) {
            //                 console.error('Error deleting old file:', err);
            //             }
            //         }
            //     }
            // }

            // // Thêm files mới
            // if (req.files && req.files.length > 0) {
            //     const newMediaFiles = req.files.map(file => ({
            //         type: file.mimetype.startsWith('image/') ? 'image' : 'video',
            //         url: createFileUrl(req, file.filename)
            //     }));
            //     mediaFiles = [...mediaFiles, ...newMediaFiles];
            // }

            // ✅ Giữ lại media còn dùng
            let mediaFiles = existingMedia;

            // ✅ Xoá media không dùng nữa trên Cloudinary
            for (const oldMedia of oldShoe.media) {
                if (!existingMedia.some(media => media.url === oldMedia.url)) {
                    if (oldMedia.public_id) {
                        await deleteFromCloudinary(oldMedia.public_id, oldMedia.type);
                    }
                }
            }

            // ✅ Thêm media mới
            if (req.files && req.files.length > 0) {
                for (const file of req.files) {
                    const result = await uploadToCloudinary(file.path, 'shoes');
                    mediaFiles.push({
                        type: result.resource_type,
                        url: result.url,
                        public_id: result.public_id
                    });
                }
            }

            // Cập nhật mảng media
            oldShoe.media = mediaFiles;

            // Lưu thay đổi
            await oldShoe.save();

            res.status(200).json({
                status: 200,
                message: "Cập nhật sản phẩm thành công",
                data: {
                    shoes: oldShoe
                }
            });

        } catch (error) {
            // Xóa files mới nếu có lỗi
            if (req.files) {
                for (const file of req.files) {
                    await deleteFile(file.path);
                }
            }
            console.error("Error updating shoe:", error);
            res.status(500).json({
                status: 500,
                message: "Lỗi khi cập nhật sản phẩm",
                error: error.message
            });
        }
    },

    // Xóa sản phẩm
    deleteShoe: async (req, res) => {
        try {
            // Tìm sản phẩm
            const shoe = await Shoes.findById(req.params.id);
            if (!shoe) {
                return res.status(404).json({
                    status: 404,
                    message: "Không tìm thấy sản phẩm"
                });
            }

            // Xóa files
            // if (shoe.media && shoe.media.length > 0) {
            //     for (const media of shoe.media) {
            //         const filename = media.url.split('/').pop();
            //         const filePath = path.join('public', 'uploads', filename);
            //         await deleteFile(filePath);
            //     }
            // }

            // ✅ Xoá media trên Cloudinary
            for (const media of shoe.media) {
                if (media.public_id) {
                    await deleteFromCloudinary(media.public_id, media.type);
                }
            }

            // Xóa variants
            await ShoesVariant.deleteMany({ shoes_id: req.params.id });

            // Xóa sản phẩm
            await Shoes.findByIdAndDelete(req.params.id);

            res.status(200).json({
                status: 200,
                message: "Xóa sản phẩm thành công"
            });
        } catch (error) {
            res.status(500).json({
                status: 500,
                message: "Lỗi khi xóa sản phẩm",
                error: error.message
            });
        }
    },

    // Lọc sản phẩm
    // 

    filterShoes: async (req, res) => {
        try {
            const {
                category_id,
                brand_id,
                size_value, // ✅ đổi từ size_id sang size_value
                min_price,
                max_price,
                sort_by,
                page = 1,
                limit = 10
            } = req.query;

            // Build base query
            const query = { status: { $ne: 'hidden' } };

            if (category_id) query.category_id = category_id;
            if (brand_id) query.brand_id = brand_id;

            // Tìm tất cả sản phẩm thỏa query
            let shoes = await Shoes.find(query)
                .populate('brand_id')
                .populate('category_id');

            // Nếu có truyền size_value, tìm size_id tương ứng
            let sizeIdFilter = null;
            if (size_value) {
                const size = await Size.findOne({ size_value: size_value });
                if (size) {
                    sizeIdFilter = size._id;
                } else {
                    // Không tìm thấy size -> trả rỗng luôn
                    return res.status(200).json({
                        status: 200,
                        message: "Không có sản phẩm phù hợp với size.",
                        data: {
                            currentPage: parseInt(page),
                            totalPages: 0,
                            totalItems: 0,
                            limit: parseInt(limit),
                            shoes: []
                        }
                    });
                }
            }

            const shoesWithVariants = await Promise.all(shoes.map(async (shoe) => {
                let variantQuery = { shoes_id: shoe._id };

                if (sizeIdFilter) {
                    variantQuery.size_id = sizeIdFilter;
                }

                if (min_price || max_price) {
                    variantQuery.price = {};
                    if (min_price) variantQuery.price.$gte = parseFloat(min_price);
                    if (max_price) variantQuery.price.$lte = parseFloat(max_price);
                }

                const variants = await ShoesVariant.find(variantQuery)
                    .populate('size_id')
                    .populate('color_id');

                return {
                    ...shoe._doc,
                    variants
                };
            }));

            // Lọc các sản phẩm có ít nhất 1 variant
            let filteredShoes = shoesWithVariants.filter(shoe => shoe.variants.length > 0);

            // Sorting
            if (sort_by) {
                switch (sort_by) {
                    case 'price_asc':
                        filteredShoes.sort((a, b) =>
                            Math.min(...a.variants.map(v => v.price)) -
                            Math.min(...b.variants.map(v => v.price))
                        );
                        break;
                    case 'price_desc':
                        filteredShoes.sort((a, b) =>
                            Math.max(...b.variants.map(v => v.price)) -
                            Math.max(...a.variants.map(v => v.price))
                        );
                        break;
                    case 'name_asc':
                        filteredShoes.sort((a, b) => a.name.localeCompare(b.name));
                        break;
                    case 'name_desc':
                        filteredShoes.sort((a, b) => b.name.localeCompare(a.name));
                        break;
                }
            }

            // Pagination
            const totalItems = filteredShoes.length;
            const totalPages = Math.ceil(totalItems / limit);
            const startIndex = (page - 1) * limit;
            const endIndex = startIndex + limit;

            filteredShoes = filteredShoes.slice(startIndex, endIndex);

            res.status(200).json({
                status: 200,
                message: "Danh sách sản phẩm đã lọc",
                data: {
                    currentPage: parseInt(page),
                    totalPages,
                    totalItems,
                    limit: parseInt(limit),
                    shoes: filteredShoes,
                }
            });

        } catch (error) {
            console.error("Error filtering shoes:", error);
            res.status(500).json({
                status: 500,
                message: "Lỗi khi lọc sản phẩm",
                error: error.message
            });
        }
    },


    // Lấy sản phẩm bán chạy
    getTopSellingProducts: async (req, res) => {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const skip = (page - 1) * limit;

            // Aggregate để tính tổng số lượng đã bán của mỗi sản phẩm
            const topProducts = await ShoesVariant.aggregate([
                // Nhóm theo shoes_id và tính tổng số lượng đã bán
                {
                    $group: {
                        _id: "$shoes_id",
                        totalSold: { $sum: "$sold_quantity" },
                    }
                },
                // Sắp xếp theo số lượng bán giảm dần
                { $sort: { totalSold: -1 } },
                // Đếm tổng số sản phẩm để tính pagination
                {
                    $facet: {
                        metadata: [{ $count: "total" }],
                        data: [
                            { $skip: skip },
                            { $limit: limit }
                        ]
                    }
                }
            ]);

            const totalProducts = topProducts[0].metadata[0]?.total || 0;
            const productsData = topProducts[0].data;

            // Lấy thông tin chi tiết của sản phẩm
            const populatedProducts = await Promise.all(productsData.map(async (product) => {
                const shoeDetails = await Shoes.findById(product._id)
                    .populate('brand_id')
                    .populate('category_id');

                const variants = await ShoesVariant.find({ shoes_id: product._id })
                    .populate('size_id')
                    .populate('color_id');

                return {
                    ...shoeDetails._doc,
                    totalSold: product.totalSold,
                    variants
                };
            }));

            res.status(200).json({
                status: 200,
                message: "Danh sách sản phẩm bán chạy",
                data: {
                    // pagination: {
                    //     currentPage: page,
                    //     totalPages: Math.ceil(totalProducts / limit),
                    //     totalItems: totalProducts,
                    //     itemsPerPage: limit
                    // },
                    currentPage: page,
                    totalPages: Math.ceil(totalProducts / limit),
                    totalItems: totalProducts,
                    itemsPerPage: limit,
                    shoes: populatedProducts
                }
            });

        } catch (error) {
            console.error("Error getting top selling products:", error);
            res.status(500).json({
                status: 500,
                message: "Lỗi khi lấy danh sách sản phẩm bán chạy",
                error: error.message
            });
        }
    },

    // Lấy sản phẩm theo brand và category
    getShoesByBrandAndCategory: async (req, res) => {
        try {
            const { brand_id, category_id } = req.query;
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const skip = (page - 1) * limit;

            // Build query
            let query = {};
            if (brand_id) {
                query.brand_id = brand_id;
            }
            if (category_id) {
                query.category_id = category_id;
            }

            // Get total count for pagination
            const totalShoes = await Shoes.countDocuments(query);

            // Get shoes with pagination
            const shoes = await Shoes.find(query)
                .populate('brand_id')
                .populate('category_id')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit);

            // Get variants for each shoe
            // const shoesWithVariants = await Promise.all(shoes.map(async (shoe) => {
            //     const variants = await ShoesVariant.find({ shoes_id: shoe._id })
            //         .populate('size_id')
            //         .populate('color_id');
            //     return {
            //         ...shoe._doc,
            //         variants
            //     };
            // }));


            // Get variants for each shoe and calculate min/max prices
            const shoesWithVariants = await Promise.all(shoes.map(async (shoe) => {
                const variants = await ShoesVariant.find({ shoes_id: shoe._id })
                    .populate('size_id')
                    .populate('color_id');

                // Calculate min and max prices from variants
                const prices = variants.map(v => v.price);
                const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
                const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;

                return {
                    _id: shoe._id,
                    media: shoe.media,
                    name: shoe.name,
                    description: shoe.description,
                    brand_id: shoe.brand_id,
                    status: shoe.status,
                    category_id: shoe.category_id,
                    created_at: shoe.created_at,
                    update_at: shoe.update_at,
                    __v: shoe.__v,
                    minPrice,
                    maxPrice,
                    variants
                };
            }));

            res.status(200).json({
                status: 200,
                message: "Danh sách sản phẩm theo thương hiệu và danh mục",
                data: {
                    currentPage: page,
                    totalPages: Math.ceil(totalShoes / limit),
                    totalItems: totalShoes,
                    itemsPerPage: limit,
                    shoes: shoesWithVariants,
                    // pagination: {
                    //     currentPage: page,
                    //     totalPages: Math.ceil(totalShoes / limit),
                    //     totalItems: totalShoes,
                    //     itemsPerPage: limit
                    // }
                }
            });

        } catch (error) {
            console.error("Error getting shoes by brand and category:", error);
            res.status(500).json({
                status: 500,
                message: "Lỗi khi lấy danh sách sản phẩm",
                error: error.message
            });
        }
    },

    getShoesByBrand: async (req, res) => {
        try {
            const { brand_id } = req.query;
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const skip = (page - 1) * limit;

            // Build query
            let query = {};
            if (brand_id) {
                query.brand_id = brand_id;
            }

            // Get total count for pagination
            const totalShoes = await Shoes.countDocuments(query);

            // Get shoes with pagination
            const shoes = await Shoes.find(query)
                .populate('brand_id')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit);

            // Get variants for each shoe and calculate min/max prices
            const shoesWithVariants = await Promise.all(shoes.map(async (shoe) => {
                const variants = await ShoesVariant.find({ shoes_id: shoe._id })
                    .populate('color_id');

                // Calculate min and max prices from variants
                const prices = variants.map(v => v.price);
                const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
                const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;

                return {
                    _id: shoe._id,
                    media: shoe.media,
                    name: shoe.name,
                    description: shoe.description,
                    brand: shoe.brand_id,
                    status: shoe.status,
                    category: shoe.category_id,
                    created_at: shoe.created_at,
                    update_at: shoe.update_at,
                    __v: shoe.__v,
                    minPrice,
                    maxPrice,
                    variants
                };
            }));

            res.status(200).json({
                status: 200,
                message: "Danh sách sản phẩm theo thương hiệu",
                data: {
                    currentPage: page,
                    totalPages: Math.ceil(totalShoes / limit),
                    totalItems: totalShoes,
                    itemsPerPage: limit,
                    shoes: shoesWithVariants,
                }
            });

        } catch (error) {
            console.error("Error getting shoes by brand and category:", error);
            res.status(500).json({
                status: 500,
                message: "Lỗi khi lấy danh sách sản phẩm",
                error: error.message
            });
        }
    },

    // Lấy sản phẩm tương tự
    getSimilarProducts: async (req, res) => {
        try {
            const { id } = req.params;
            const shoe = await Shoes.findById(id);

            if (!shoe) {
                return res.status(404).json({
                    status: 404,
                    message: "Không tìm thấy sản phẩm"
                });
            }

            // Tìm sản phẩm cùng category hoặc brand
            const similarProducts = await Shoes.find({
                $and: [
                    { _id: { $ne: id } }, // Loại bỏ sản phẩm hiện tại
                    {
                        $or: [
                            { category_id: shoe.category_id },
                            { brand_id: shoe.brand_id }
                        ]
                    }
                ]
            })
                .populate('brand_id')
                .populate('category_id')
                .limit(8); // Giới hạn 8 sản phẩm

            // Lấy variants cho mỗi sản phẩm
            const productsWithVariants = await Promise.all(
                similarProducts.map(async (product) => {
                    const variants = await ShoesVariant.find({ shoes_id: product._id })
                        .populate('size_id')
                        .populate('color_id');
                    return {
                        ...product._doc,
                        variants
                    };
                })
            );

            res.status(200).json({
                status: 200,
                message: "Danh sách sản phẩm tương tự",
                data: productsWithVariants
            });

        } catch (error) {
            console.error("Error getting similar products:", error);
            res.status(500).json({
                status: 500,
                message: "Lỗi khi lấy sản phẩm tương tự",
                error: error.message
            });
        }
    },

    filterShoesAZ: async (req, res) => {
        try {
            const {
                sort_by,
                page = 1,
                limit = 10
            } = req.query;

            // Get initial shoes list
            let shoes = await Shoes.find()
                .populate('brand_id')
                .populate('category_id');

            // Get variants for each shoe
            const shoesWithVariants = await Promise.all(shoes.map(async (shoe) => {
                const variants = await ShoesVariant.find({ shoes_id: shoe._id })
                    .populate('size_id')
                    .populate('color_id');
                return {
                    ...shoe._doc,
                    variants
                };
            }));

            // Sort products
            if (sort_by) {
                switch (sort_by) {
                    case 'name_asc':
                        shoesWithVariants.sort((a, b) =>
                            a.name.localeCompare(b.name, 'vi-VN')
                        );
                        break;
                    case 'name_desc':
                        shoesWithVariants.sort((a, b) =>
                            b.name.localeCompare(a.name, 'vi-VN')
                        );
                        break;
                }
            }

            // Pagination
            const totalItems = shoesWithVariants.length;
            const totalPages = Math.ceil(totalItems / limit);
            const skip = (page - 1) * limit;
            const paginatedShoes = shoesWithVariants.slice(skip, skip + limit);

            res.status(200).json({
                status: 200,
                message: "Danh sách sản phẩm",
                data: {
                    currentPage: parseInt(page),
                    totalPages,
                    totalItems,
                    itemsPerPage: parseInt(limit),
                    shoes: paginatedShoes,
                    // pagination: {
                    //     currentPage: parseInt(page),
                    //     totalPages,
                    //     totalItems,
                    //     itemsPerPage: parseInt(limit)
                    // }
                }
            });

        } catch (error) {
            console.error("Error filtering shoes:", error);
            res.status(500).json({
                status: 500,
                message: "Lỗi khi lọc sản phẩm",
                error: error.message
            });
        }
    },

    // Tìm kiếm sản phẩm (ẩn sản phẩm hidden với user)
    searchShoes: async (req, res) => {
        try {
            const { keyword } = req.query;
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const skip = (page - 1) * limit;

            // Kiểm tra role
            const isAdmin = req.user?.role === 'admin';

            // Build query tìm kiếm
            let query = {};

            if (keyword) {
                // Tìm brand và category có tên chứa keyword
                const brands = await Brand.find({
                    name: { $regex: keyword, $options: 'i' }
                });
                const categories = await Category.find({
                    name: { $regex: keyword, $options: 'i' }
                });

                const brandIds = brands.map(brand => brand._id);
                const categoryIds = categories.map(category => category._id);

                query.$or = [
                    { name: { $regex: keyword, $options: 'i' } }, // Tìm theo tên sản phẩm
                    { description: { $regex: keyword, $options: 'i' } }, // Tìm theo mô tả
                    { brand_id: { $in: brandIds } }, // Tìm theo thương hiệu
                    { category_id: { $in: categoryIds } } // Tìm theo danh mục
                ];
            }

            // Thêm điều kiện ẩn sản phẩm hidden nếu là user
            if (!isAdmin) {
                query.status = { $ne: 'hidden' };
            }

            const totalShoes = await Shoes.countDocuments(query);
            const shoes = await Shoes.find(query)
                .populate('brand_id')
                .populate('category_id')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit);

            // Get variants cho mỗi sản phẩm
            const shoesWithVariants = await Promise.all(shoes.map(async (shoe) => {
                const variants = await ShoesVariant.find({ shoes_id: shoe._id })
                    .populate('size_id')
                    .populate('color_id');
                return {
                    ...shoe._doc,
                    variants
                };
            }));

            res.status(200).json({
                status: 200,
                message: "Kết quả tìm kiếm",
                data: {
                    currentPage: page,
                    totalPages: Math.ceil(totalShoes / limit),
                    totalItems: totalShoes,
                    itemsPerPage: limit,
                    shoes: shoesWithVariants
                }
            });
        } catch (error) {
            console.error("Error searching shoes:", error);
            res.status(500).json({
                status: 500,
                message: "Lỗi khi tìm kiếm sản phẩm",
                error: error.message
            });
        }
    }
};