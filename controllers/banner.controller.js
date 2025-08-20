const Banner = require('../models/banner.model');
const { uploadToCloudinary, deleteFromCloudinary, deleteFile } = require('../utils/fileUtils');

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

            try {
                // Upload lên Cloudinary
                const result = await uploadToCloudinary(req.file.path, 'banners');

                const banner = new Banner({
                    media: result.url,
                    cloudinary_id: result.public_id
                });

                const saved = await banner.save();

                res.status(200).json({
                    status: 200,
                    message: "Thêm banner thành công",
                    data: saved
                });

            } catch (uploadError) {
                // Nếu upload thất bại, xóa file tạm
                await deleteFile(req.file.path);
                throw uploadError;
            }

        } catch (error) {
            // Đảm bảo xóa file tạm nếu có lỗi
            if (req.file) {
                await deleteFile(req.file.path);
                console.error("❌ Lỗi khi thêm banner:", error);
            }
            res.status(500).json({
                status: 500,
                message: "Lỗi khi thêm banner",
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
                try {
                    // Xóa ảnh cũ trên Cloudinary
                    if (banner.cloudinary_id) {
                        await deleteFromCloudinary(banner.cloudinary_id);
                    }

                    // Upload ảnh mới
                    const result = await uploadToCloudinary(req.file.path, 'banners');
                    banner.media = result.url;
                    banner.cloudinary_id = result.public_id;

                } catch (uploadError) {
                    // Xóa file tạm nếu upload thất bại
                    await deleteFile(req.file.path);
                    throw uploadError;
                }
            }

            // Lưu banner dù có upload file mới hay không
            const updated = await banner.save();

            return res.status(200).json({
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

            // Xóa file từ Cloudinary
            if (banner.cloudinary_id) {
                await deleteFromCloudinary(banner.cloudinary_id);
            }

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
    }
};
