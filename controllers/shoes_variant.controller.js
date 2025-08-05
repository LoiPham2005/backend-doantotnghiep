const ShoesVariant = require('../models/shoes_variant.model');
const Shoes = require('../models/shoes.model');

module.exports = {
    // Thêm variant mới 
    addVariant: async (req, res) => {
        try {
            const { shoes_id, price, quantity_in_stock, size_id, color_id, status } = req.body; // Thêm status

            // Kiểm tra sản phẩm tồn tại
            const shoe = await Shoes.findById(shoes_id);
            if (!shoe) {
                return res.status(404).json({
                    status: 404,
                    message: "Không tìm thấy sản phẩm"
                });
            }

            // Kiểm tra variant đã tồn tại
            const existingVariant = await ShoesVariant.findOne({
                shoes_id,
                size_id,
                color_id
            });

            if (existingVariant) {
                return res.status(400).json({
                    status: 400,
                    message: "Variant này đã tồn tại"
                });
            }

            const newVariant = new ShoesVariant({
                shoes_id,
                price,
                quantity_in_stock,
                size_id,
                color_id,
                status: status || 'available' // Thêm status với giá trị mặc định
            });

            const savedVariant = await newVariant.save();

            const populatedVariant = await ShoesVariant.findById(savedVariant._id)
                .populate('size_id')
                .populate('color_id')
                .populate('shoes_id');

            res.status(200).json({
                status: 200,
                message: "Thêm variant thành công",
                data: populatedVariant
            });
        } catch (error) {
            res.status(500).json({
                status: 500,
                message: "Lỗi khi thêm variant",
                error: error.message
            });
        }
    },

    // Lấy tất cả variants của một sản phẩm
    getVariantsByShoeId: async (req, res) => {
        try {
            const { shoes_id } = req.params;

            const variants = await ShoesVariant.find({ shoes_id })
                .populate('size_id')
                .populate('color_id')
                .populate('shoes_id');

            res.status(200).json({
                status: 200,
                message: "Danh sách variants",
                data: variants
            });
        } catch (error) {
            res.status(500).json({
                status: 500,
                message: "Lỗi khi lấy danh sách variants",
                error: error.message
            });
        }
    },

    // Lấy chi tiết một variant
    getVariantById: async (req, res) => {
        try {
            const variant = await ShoesVariant.findById(req.params.id)
                .populate('size_id')
                .populate('color_id')
                .populate('shoes_id');

            if (!variant) {
                return res.status(404).json({
                    status: 404,
                    message: "Không tìm thấy variant"
                });
            }

            res.status(200).json({
                status: 200,
                message: "Chi tiết variant",
                data: variant
            });
        } catch (error) {
            res.status(500).json({
                status: 500,
                message: "Lỗi khi lấy chi tiết variant",
                error: error.message
            });
        }
    },

    // Cập nhật variant
    updateVariant: async (req, res) => {
        try {
            const { price, quantity_in_stock, status, color_id, size_id } = req.body; 

            const updatedVariant = await ShoesVariant.findByIdAndUpdate(
                req.params.id,
                {
                    price,
                    quantity_in_stock,
                    status,
                    color_id, 
                    size_id   
                },
                { new: true }
            )
                .populate('size_id')
                .populate('color_id')
                .populate('shoes_id');

            if (!updatedVariant) {
                return res.status(404).json({
                    status: 404,
                    message: "Không tìm thấy variant"
                });
            }

            res.status(200).json({
                status: 200,
                message: "Cập nhật variant thành công",
                data: updatedVariant
            });
        } catch (error) {
            res.status(500).json({
                status: 500,
                message: "Lỗi khi cập nhật variant",
                error: error.message
            });
        }
    },

    // Xóa variant
    deleteVariant: async (req, res) => {
        try {
            const deletedVariant = await ShoesVariant.findByIdAndDelete(req.params.id);

            if (!deletedVariant) {
                return res.status(404).json({
                    status: 404,
                    message: "Không tìm thấy variant"
                });
            }

            res.status(200).json({
                status: 200,
                message: "Xóa variant thành công"
            });
        } catch (error) {
            res.status(500).json({
                status: 500,
                message: "Lỗi khi xóa variant",
                error: error.message
            });
        }
    }
};