const path = require('path');
const Banner = require('../models/banner.model');
const { createFileUrl, deleteFile } = require('../utils/fileUtils');

module.exports = {
    // Thêm banner
    add: async (req, res) => {
        try {
            const count = await Banner.countDocuments();
            if (count >= 3) {
                return res.status(400).json({
                    status: 400,
                    message: "Chỉ cho phép tối đa 3 banner"
                });
            }

            if (!req.file) {
                return res.status(400).json({
                    status: 400,
                    message: "Vui lòng tải lên hình ảnh"
                });
            }

            const media = createFileUrl(req, req.file.filename);

            const banner = new Banner({ media });
            const saved = await banner.save();

            res.status(200).json({
                status: 200,
                message: "Thêm banner thành công",
                data: saved
            });
        } catch (error) {
            if (req.file) {
                await deleteFile(req.file.path);
            }
            res.status(500).json({
                status: 500,
                message: "Lỗi khi thêm banner",
                error: error.message
            });
        }
    },

    // Lấy danh sách banner
    list: async (req, res) => {
        try {
            const banners = await Banner.find().sort({ createdAt: -1 });
            res.status(200).json({
                status: 200,
                message: "Danh sách banner",
                data: banners
            });
        } catch (error) {
            res.status(500).json({
                status: 500,
                message: "Lỗi khi lấy danh sách banner",
                error: error.message
            });
        }
    },

    // Cập nhật banner
    edit: async (req, res) => {
        try {
            const banner = await Banner.findById(req.params.id);
            if (!banner) {
                return res.status(404).json({
                    status: 404,
                    message: "Không tìm thấy banner"
                });
            }

            if (req.file) {
                // Xóa ảnh cũ
                const oldFilename = banner.media.split('/').pop();
                const oldFilePath = path.join(__dirname, '../public/uploads', oldFilename);
                try {
                    await deleteFile(oldFilePath);
                } catch (error) {
                    console.error("Lỗi xóa file cũ:", error);
                }

                // Gán media mới
                banner.media = createFileUrl(req, req.file.filename);
            }

            const updated = await banner.save();
            res.status(200).json({
                status: 200,
                message: "Cập nhật banner thành công",
                data: updated
            });

        } catch (error) {
            if (req.file) {
                await deleteFile(req.file.path);
            }
            res.status(500).json({
                status: 500,
                message: "Lỗi khi cập nhật banner",
                error: error.message
            });
        }
    },

    // Xóa banner
    delete: async (req, res) => {
        try {
            const banner = await Banner.findById(req.params.id);
            if (!banner) {
                return res.status(404).json({
                    status: 404,
                    message: "Không tìm thấy banner"
                });
            }

            // Xóa file ảnh
            const filename = banner.media.split('/').pop();
            const filePath = path.join('public', 'uploads', filename);
            await deleteFile(filePath);

            await Banner.deleteOne({ _id: req.params.id });

            res.status(200).json({
                status: 200,
                message: "Xóa banner thành công"
            });
        } catch (error) {
            res.status(500).json({
                status: 500,
                message: "Lỗi khi xóa banner",
                error: error.message
            });
        }
    },
};
