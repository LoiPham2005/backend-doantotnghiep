var express = require('express');
var router = express.Router();
const brandModel = require('../models/brand.model');
const path = require('path');
const { createFileUrl, deleteFile } = require('../utils/fileUtils');

module.exports = {
    // Thêm thương hiệu mới
    add: async (req, res) => {
        try {
            const { name } = req.body;
            // Kiểm tra tên thương hiệu đã tồn tại
            const existingBrand = await brandModel.findOne({ name });
            if (existingBrand) {
                return res.status(400).json({
                    status: 400,
                    message: "Tên thương hiệu đã tồn tại",
                    data: []
                });
            }

            // Kiểm tra file media
            if (!req.file) {
                return res.status(400).json({
                    status: 400,
                    message: "Vui lòng tải lên hình ảnh cho thương hiệu"
                });
            }

            const media = createFileUrl(req, req.file.filename);

            const newBrand = new brandModel({
                name,
                media
            });

            const result = await newBrand.save();
            res.status(200).json({
                status: 200,
                message: "Thêm thương hiệu thành công",
                data: result
            });

        } catch (error) {
            // Xóa file nếu có lỗi
            if (req.file) {
                await deleteFile(req.file.path);
            }
            res.status(500).json({
                status: 500,
                message: "Lỗi khi thêm thương hiệu",
                error: error.message
            });
        }
    },

    // Lấy danh sách thương hiệu
    list: async (req, res) => {
        try {
            const isAdmin = req.query.isAdmin === 'true';
            let query = {};

            // Nếu không phải admin, chỉ lấy các thương hiệu active
            if (!isAdmin) {
                query.is_active = true;
            }

            const brands = await brandModel.find(query).sort({ name: 1 });

            res.status(200).json({
                status: 200,
                message: "Danh sách thương hiệu",
                data: brands
            });
        } catch (error) {
            res.status(500).json({
                status: 500,
                message: "Lỗi khi lấy danh sách thương hiệu",
                error: error.message
            });
        }
    },

    // Lấy chi tiết thương hiệu
    getbyid: async (req, res) => {
        try {
            const brand = await brandModel.findById(req.params.id);
            if (!brand) {
                return res.status(404).json({
                    status: 404,
                    message: "Không tìm thấy thương hiệu",
                    data: []
                });
            }

            res.status(200).json({
                status: 200,
                message: "Chi tiết thương hiệu",
                data: brand
            });
        } catch (error) {
            res.status(500).json({
                status: 500,
                message: "Lỗi khi lấy chi tiết thương hiệu",
                error: error.message
            });
        }
    },

    // Cập nhật thương hiệu
    edit: async (req, res) => {
        try {
            const { name } = req.body;
            console.log('Request body:', req.body);
            console.log('Request file:', req.file);

            const brand = await brandModel.findById(req.params.id);
            if (!brand) {
                return res.status(404).json({
                    status: 404,
                    message: "Không tìm thấy thương hiệu",
                    data: []
                });
            }

            // Kiểm tra tên đã tồn tại
            const existingBrand = await brandModel.findOne({
                name,
                _id: { $ne: req.params.id }
            });

            if (existingBrand) {
                return res.status(400).json({
                    status: 400,
                    message: "Tên thương hiệu đã tồn tại",
                    data: []
                });
            }

            // Xử lý media mới nếu có
            if (req.file) {
                try {
                    // Xóa file cũ nếu có
                    if (brand.media) {
                        const oldFilename = brand.media.split('/').pop();
                        const oldFilePath = path.join(__dirname, '../public/uploads', oldFilename);
                        try {
                            await deleteFile(oldFilePath);
                        } catch (deleteError) {
                            console.error('Error deleting old file:', deleteError);
                        }
                    }

                    // Cập nhật media mới
                    brand.media = createFileUrl(req, req.file.filename);
                } catch (mediaError) {
                    console.error('Error handling media:', mediaError);
                    throw new Error('Lỗi khi xử lý file media');
                }
            }

            // Cập nhật tên
            brand.name = name;

            // Lưu thay đổi
            const updatedBrand = await brand.save();
            console.log('Updated brand:', updatedBrand);

            res.status(200).json({
                status: 200,
                message: "Cập nhật thành công",
                data: updatedBrand
            });

        } catch (error) {
            console.error('Update error:', error);
            // Xóa file mới nếu có lỗi
            if (req.file) {
                try {
                    await deleteFile(req.file.path);
                } catch (deleteError) {
                    console.error('Error deleting new file:', deleteError);
                }
            }
            res.status(500).json({
                status: 500,
                message: "Lỗi khi cập nhật thương hiệu",
                error: error.message
            });
        }
    },

    // Xóa thương hiệu
    delete: async (req, res) => {
        try {
            const brand = await brandModel.findById(req.params.id);
            if (!brand) {
                return res.status(404).json({
                    status: 404,
                    message: "Không tìm thấy thương hiệu"
                });
            }

            // Xóa file media
            if (brand.media) {
                const filename = brand.media.split('/').pop();
                const filePath = path.join('public', 'uploads', filename);
                await deleteFile(filePath);
            }

            // Thay đổi từ remove() sang deleteOne()
            await brandModel.deleteOne({ _id: req.params.id });

            res.status(200).json({
                status: 200,
                message: "Xóa thương hiệu thành công"
            });
        } catch (error) {
            console.error("Delete brand error:", error); // Thêm log để debug
            res.status(500).json({
                status: 500,
                message: "Lỗi khi xóa thương hiệu",
                error: error.message
            });
        }
    },

    // Tìm kiếm thương hiệu
    search: async (req, res) => {
        try {
            console.log('Search query:', req.query); // Debug log

            const key = req.query.key || '';

            const brands = await brandModel.find({
                name: { $regex: key, $options: 'i' }
            }).sort({ name: 1 });

            console.log('Search results:', brands); // Debug log

            res.status(200).json({
                status: 200,
                message: "Kết quả tìm kiếm",
                data: brands
            });
        } catch (error) {
            console.error('Search error:', error); // Debug log
            res.status(500).json({
                status: 500,
                message: "Lỗi khi tìm kiếm thương hiệu",
                error: error.message
            });
        }
    },

    // Thêm hàm toggle active status
    toggleActive: async (req, res) => {
        try {
            const brand = await brandModel.findById(req.params.id);
            if (!brand) {
                return res.status(404).json({
                    status: 404,
                    message: "Không tìm thấy thương hiệu"
                });
            }

            brand.is_active = !brand.is_active;
            await brand.save();

            res.status(200).json({
                status: 200,
                message: `Đã ${brand.is_active ? 'bật' : 'tắt'} thương hiệu thành công`,
                data: brand
            });
        } catch (error) {
            res.status(500).json({
                status: 500,
                message: "Lỗi khi thay đổi trạng thái thương hiệu",
                error: error.message
            });
        }
    }
};

