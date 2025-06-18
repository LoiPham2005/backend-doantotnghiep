const Size = require('../models/sizes.model');

module.exports = {
    // Thêm size mới
    addSize: async (req, res) => {
        try {
            const { size_value } = req.body;
            
            // Kiểm tra size đã tồn tại
            const existingSize = await Size.findOne({ size_value });
            if (existingSize) {
                return res.status(400).json({
                    status: 400,
                    message: "Size này đã tồn tại"
                });
            }

            const newSize = new Size({ size_value });
            const savedSize = await newSize.save();

            res.status(200).json({
                status: 200,
                message: "Thêm size thành công",
                data: savedSize
            });
        } catch (error) {
            res.status(500).json({
                status: 500,
                message: "Lỗi khi thêm size",
                error: error.message
            });
        }
    },

    // Lấy danh sách size
    getAllSizes: async (req, res) => {
        try {
            const sizes = await Size.find().sort({ size_value: 1 });
            res.status(200).json({
                status: 200,
                message: "Danh sách size",
                data: sizes
            });
        } catch (error) {
            res.status(500).json({
                status: 500,
                message: "Lỗi khi lấy danh sách size",
                error: error.message
            });
        }
    },

    // Lấy chi tiết size
    getSizeById: async (req, res) => {
        try {
            const size = await Size.findById(req.params.id);
            if (!size) {
                return res.status(404).json({
                    status: 404,
                    message: "Không tìm thấy size"
                });
            }

            res.status(200).json({
                status: 200,
                message: "Chi tiết size",
                data: size
            });
        } catch (error) {
            res.status(500).json({
                status: 500,
                message: "Lỗi khi lấy chi tiết size",
                error: error.message
            });
        }
    },

    // Cập nhật size
    updateSize: async (req, res) => {
        try {
            const { size_value } = req.body;

            // Kiểm tra size đã tồn tại (trừ size hiện tại)
            const existingSize = await Size.findOne({
                size_value,
                _id: { $ne: req.params.id }
            });

            if (existingSize) {
                return res.status(400).json({
                    status: 400,
                    message: "Size này đã tồn tại"
                });
            }

            const updatedSize = await Size.findByIdAndUpdate(
                req.params.id,
                { size_value },
                { new: true }
            );

            if (!updatedSize) {
                return res.status(404).json({
                    status: 404,
                    message: "Không tìm thấy size"
                });
            }

            res.status(200).json({
                status: 200,
                message: "Cập nhật size thành công",
                data: updatedSize
            });
        } catch (error) {
            res.status(500).json({
                status: 500,
                message: "Lỗi khi cập nhật size",
                error: error.message
            });
        }
    },

    // Xóa size
    deleteSize: async (req, res) => {
        try {
            const deletedSize = await Size.findByIdAndDelete(req.params.id);
            
            if (!deletedSize) {
                return res.status(404).json({
                    status: 404,
                    message: "Không tìm thấy size"
                });
            }

            res.status(200).json({
                status: 200,
                message: "Xóa size thành công"
            });
        } catch (error) {
            res.status(500).json({
                status: 500,
                message: "Lỗi khi xóa size",
                error: error.message
            });
        }
    }
};