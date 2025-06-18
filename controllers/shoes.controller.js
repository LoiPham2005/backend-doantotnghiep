const express = require('express');
const router = express.Router();
const Shoes = require('../models/shoes.model');
const ShoesVariant = require('../models/shoes_variant.model');
const fs = require('fs');
const path = require('path');

// Hàm helper để xóa file
const deleteFile = (filePath) => {
    return new Promise((resolve, reject) => {
        fs.unlink(filePath, (err) => {
            if (err) {
                console.error(`Error deleting file ${filePath}:`, err);
                reject(err);
            } else {
                console.log(`Successfully deleted file ${filePath}`);
                resolve();
            }
        });
    });
};

// Hàm tạo URL cho file
const createFileUrl = (req, filename) => {
    return `${req.protocol}://${req.get('host')}/uploads/${filename}`;
};

module.exports = {
    // Thêm sản phẩm mới
    addShoes: async (req, res) => {
        try {
            const { name, description, brand_id, category_id, variants } = req.body;

            // Xử lý media files
            let mediaFiles = [];
            if (req.files && req.files.length > 0) {
                mediaFiles = req.files.map(file => ({
                    type: file.mimetype.startsWith('image/') ? 'image' : 'video',
                    url: createFileUrl(req, file.filename)  // Thêm req vào đây
                }));
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

    // Lấy tất cả sản phẩm
    getAllShoes: async (req, res) => {
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

            const variants = await ShoesVariant.find({ shoes_id: shoe._id })
                .populate('size_id')
                .populate('color_id');

            res.status(200).json({
                status: 200,
                message: "Chi tiết sản phẩm",
                data: {
                    ...shoe._doc,
                    variants
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
            const { name, description, brand_id, category_id, status, variants } = req.body;
            
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

            // Xử lý media mới nếu có
            if (req.files && req.files.length > 0) {
                // Xóa file cũ
                if (oldShoe.media && oldShoe.media.length > 0) {
                    for (const media of oldShoe.media) {
                        const filename = media.url.split('/').pop();
                        const filePath = path.join('public', 'uploads', filename);
                        await deleteFile(filePath);
                    }
                }

                // Thêm media mới
                oldShoe.media = req.files.map(file => ({
                    type: file.mimetype.startsWith('image/') ? 'image' : 'video',
                    url: createFileUrl(req, file.filename)
                }));
            }

            // Lưu thay đổi
            await oldShoe.save();

            // Cập nhật variants nếu có
            if (variants) {
                // Xóa variants cũ
                await ShoesVariant.deleteMany({ shoes_id: oldShoe._id });

                // Thêm variants mới
                const variantsArray = typeof variants === 'string' ? 
                    JSON.parse(variants) : variants;

                const variantPromises = variantsArray.map(variant => 
                    new ShoesVariant({
                        shoes_id: oldShoe._id,
                        price: variant.price,
                        quantity_in_stock: variant.quantity_in_stock,
                        size_id: variant.size_id,
                        color_id: variant.color_id,
                        status: variant.status || 'available'
                    }).save()
                );

                const updatedVariants = await Promise.all(variantPromises);

                res.status(200).json({
                    status: 200,
                    message: "Cập nhật sản phẩm thành công",
                    data: {
                        shoes: oldShoe,
                        variants: updatedVariants
                    }
                });
            } else {
                res.status(200).json({
                    status: 200,
                    message: "Cập nhật sản phẩm thành công",
                    data: {
                        shoes: oldShoe
                    }
                });
            }

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
            if (shoe.media && shoe.media.length > 0) {
                for (const media of shoe.media) {
                    const filename = media.url.split('/').pop();
                    const filePath = path.join('public', 'uploads', filename);
                    await deleteFile(filePath);
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
    filterShoes: async (req, res) => {
        try {
            const { 
                category_id, 
                brand_id, 
                size_id,
                min_price,
                max_price,
                sort_by,
                page = 1,
                limit = 10
            } = req.query;

            // Build query
            let query = {};
            
            // Filter by category
            if (category_id) {
                query.category_id = category_id;
            }

            // Filter by brand  
            if (brand_id) {
                query.brand_id = brand_id;
            }

            // Get base shoes query
            let shoes = await Shoes.find(query)
                .populate('brand_id')
                .populate('category_id');

            // Get variants for all shoes
            const shoesWithVariants = await Promise.all(shoes.map(async (shoe) => {
                let variantQuery = { shoes_id: shoe._id };

                // Filter by size
                if (size_id) {
                    variantQuery.size_id = size_id;
                }

                // Filter by price range
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

            // Filter out shoes with no matching variants
            let filteredShoes = shoesWithVariants.filter(shoe => shoe.variants.length > 0);

            // Sort processing
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
                    shoes: filteredShoes,
                    pagination: {
                        currentPage: parseInt(page),
                        totalPages,
                        totalItems,
                        limit: parseInt(limit)
                    }
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
    }
};