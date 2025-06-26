var express = require('express');
var router = express.Router();
const modelCategory = require('../models/category.model');
const path = require('path');
const { createFileUrl, deleteFile } = require('../utils/fileUtils');

module.exports = {
    // add data
    add: async (req, res) => {
        try {
            const { name } = req.body; // Assuming 'name' is the unique field
            const existingCategory = await modelCategory.findOne({ name });
            if (existingCategory) {
                return res.status(400).json({
                    "status": 400,
                    "message": "Tên danh mục đã tồn tại",
                    "data": []
                });
            }

            // Kiểm tra file media
            if (!req.file) {
                return res.status(400).json({
                    status: 400,
                    message: "Vui lòng tải lên hình ảnh cho danh mục"
                });
            }

            const media = createFileUrl(req, req.file.filename);

            const model = new modelCategory({
                name,
                media
            });
            console.log("Data to be saved:", model);
            const result = await model.save();
            if (result) {
                res.json({
                    "status": 200,
                    "message": "Thêm thành công",
                    "data": result
                });
            } else {
                res.json({
                    "status": 400,
                    "message": "Thêm thất bại",
                    "data": []
                });
            }
        } catch (err) {
            console.error("Error while saving user:", err);
            // Xóa file nếu có lỗi
            if (req.file) {
                await deleteFile(req.file.path);
            }
            res.status(500).json({
                status: 500,
                message: "Lỗi khi thêm danh mục",
                error: err.message
            });
        }
    },

    // lấy toàn bộ dữ liệu ra
    list: async (req, res) => {
        try {
            const isAdmin = req.query.isAdmin === 'true';
            let query = {};
            
            // Nếu không phải admin, chỉ lấy các danh mục active
            if (!isAdmin) {
                query.is_active = true;
            }

            const result = await modelCategory.find(query).sort({ name: 1 });

            res.json({
                status: 200,
                message: "Danh sách danh mục",
                data: result
            });
        } catch (err) {
            console.error("Error fetching categories:", err);
            res.status(500).json({
                status: 500,
                message: "Lỗi khi lấy danh sách danh mục",
                error: err.message
            });
        }
    },

    // lấy dữ liệu theo ID
    getbyid: async (req, res) => {
        try {
            const result = await modelCategory.findById(req.params.id);
            if (result) {
                // res.send(result);  
                res.json({
                    "status": 200,
                    "message": "Đã tìm thấy ID",
                    "data": result
                })
            } else {
                res.json({
                    "status": 400,
                    "message": "Không tìm thấy ID",
                    "data": []
                })
            }
        } catch (error) {
            if (error.name === 'CastError') {
                res.status(404).send('Invalid ID format');
            } else {
                console.log(error);
                res.status(500).send('Invalid Server format');
            }
        }
    },

    // sửa thông tin
    edit: async (req, res) => {
        try {
            const { name } = req.body;
            const category = await modelCategory.findById(req.params.id);

            if (!category) {
                return res.status(404).json({
                    status: 404,
                    message: "Không tìm thấy danh mục",
                    data: []
                });
            }

            // Kiểm tra tên danh mục đã tồn tại (trừ danh mục hiện tại)
            const existingCategory = await modelCategory.findOne({
                name,
                _id: { $ne: req.params.id }
            });

            if (existingCategory) {
                return res.status(400).json({
                    status: 400,
                    message: "Tên danh mục đã tồn tại",
                    data: []
                });
            }

            // Xử lý media mới nếu có
            if (req.file) {
                // Xóa file cũ
                const oldMediaUrl = category.media;
                if (oldMediaUrl) {
                    const filename = oldMediaUrl.split('/').pop();
                    const filePath = path.join('public', 'uploads', filename);
                    await deleteFile(filePath);
                }

                // Cập nhật media mới
                category.media = createFileUrl(req, req.file.filename);
            }

            // Cập nhật tên
            category.name = name;

            // Lưu thay đổi
            const updatedCategory = await category.save();

            res.json({
                status: 200,
                message: "Cập nhật thành công",
                data: updatedCategory
            });

        } catch (error) {
            // Xóa file mới nếu có lỗi
            if (req.file) {
                await deleteFile(req.file.path);
            }

            if (error.name === 'CastError') {
                res.status(404).json({
                    status: 404,
                    message: 'ID không hợp lệ'
                });
            } else {
                console.log(error);
                res.status(500).json({
                    status: 500,
                    message: "Lỗi khi cập nhật danh mục",
                    error: error.message
                });
            }
        }
    },

    // Xóa dữ liệu theo ID
    delete: async (req, res) => {
        try {
            const result = await modelCategory.findByIdAndDelete(req.params.id);
            if (result) {
                res.json({
                    "status": 200,
                    "message": "Xóa thành công",
                    "data": result
                });
            } else {
                res.json({
                    "status": 400,
                    "message": "Xóa thất bại",
                    "data": []
                });
            }
        } catch (error) {
            console.log(error);
        }
    },

    // search tìm kiếm
    search: async (req, res) => {
        try {
            const key = req.query.key || '';

            const result = await modelCategory.find({
                name: { $regex: key, $options: 'i' }
            }).sort({ name: 1 });

            if (result) {
                res.json({
                    "status": 200,
                    "message": "List",
                    "data": result
                });
            } else {
                res.json({
                    "status": 400,
                    "message": "Lỗi",
                    "data": []
                });
            }
        } catch (err) {
            console.error("Error while fetching users:", err); // In l��i chi tiết ra console
            res.status(500).send({ error: 'An error occurred while fetching data' }); // Trả về l��i cho client
        }
    },

    // Thêm hàm toggle active status
    toggleActive: async (req, res) => {
        try {
            const category = await modelCategory.findById(req.params.id);
            if (!category) {
                return res.status(404).json({
                    status: 404,
                    message: "Không tìm thấy danh mục"
                });
            }

            category.is_active = !category.is_active;
            await category.save();

            res.status(200).json({
                status: 200,
                message: `Đã ${category.is_active ? 'bật' : 'tắt'} danh mục thành công`,
                data: category
            });
        } catch (error) {
            res.status(500).json({
                status: 500,
                message: "Lỗi khi thay đổi trạng thái danh mục",
                error: error.message
            });
        }
    },
}

