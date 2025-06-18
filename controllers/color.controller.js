const Color = require('../models/color.model');

module.exports = {
    // Thêm màu mới
    addColor: async (req, res) => {
        try {
            const { name, value } = req.body;

            // Kiểm tra name hoặc value đã tồn tại
            const existingColor = await Color.findOne({
                $or: [{ name }, { value }]
            });

            if (existingColor) {
                return res.status(400).json({
                    status: 400,
                    message: "Tên màu hoặc mã màu đã tồn tại"
                });
            }

            const newColor = new Color({ name, value });
            const savedColor = await newColor.save();

            res.status(200).json({
                status: 200,
                message: "Thêm màu thành công",
                data: savedColor
            });
        } catch (error) {
            res.status(500).json({
                status: 500,
                message: "Lỗi khi thêm màu",
                error: error.message
            });
        }
    },

    // Lấy danh sách màu
    getAllColors: async (req, res) => {
        try {
            const colors = await Color.find().sort({ name: 1 });
            res.status(200).json({
                status: 200,
                message: "Danh sách màu",
                data: colors
            });
        } catch (error) {
            res.status(500).json({
                status: 500,
                message: "Lỗi khi lấy danh sách màu",
                error: error.message
            });
        }
    },

    // Lấy chi tiết màu
    getColorById: async (req, res) => {
        try {
            const color = await Color.findById(req.params.id);
            if (!color) {
                return res.status(404).json({
                    status: 404,
                    message: "Không tìm thấy màu"
                });
            }

            res.status(200).json({
                status: 200,
                message: "Chi tiết màu",
                data: color
            });
        } catch (error) {
            res.status(500).json({
                status: 500,
                message: "Lỗi khi lấy chi tiết màu",
                error: error.message
            });
        }
    },

    // Cập nhật màu
    updateColor: async (req, res) => {
        try {
            const { name, value } = req.body;

            // Kiểm tra name hoặc value đã tồn tại (trừ màu hiện tại)
            const existingColor = await Color.findOne({
                $or: [{ name }, { value }],
                _id: { $ne: req.params.id }
            });

            if (existingColor) {
                return res.status(400).json({
                    status: 400,
                    message: "Tên màu hoặc mã màu đã tồn tại"
                });
            }

            const updatedColor = await Color.findByIdAndUpdate(
                req.params.id,
                { name, value },
                { new: true }
            );

            if (!updatedColor) {
                return res.status(404).json({
                    status: 404,
                    message: "Không tìm thấy màu"
                });
            }

            res.status(200).json({
                status: 200,
                message: "Cập nhật màu thành công",
                data: updatedColor
            });
        } catch (error) {
            res.status(500).json({
                status: 500,
                message: "Lỗi khi cập nhật màu",
                error: error.message
            });
        }
    },

    // Xóa màu
    deleteColor: async (req, res) => {
        try {
            const deletedColor = await Color.findByIdAndDelete(req.params.id);

            if (!deletedColor) {
                return res.status(404).json({
                    status: 404,
                    message: "Không tìm thấy màu"
                });
            }

            res.status(200).json({
                status: 200,
                message: "Xóa màu thành công"
            });
        } catch (error) {
            res.status(500).json({
                status: 500,
                message: "Lỗi khi xóa màu",
                error: error.message
            });
        }
    }
};