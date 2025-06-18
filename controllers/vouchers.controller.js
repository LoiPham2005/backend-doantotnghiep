const Voucher = require('../models/vouchers.model');
const UserVoucher = require('../models/user_vouchers.model');
const User = require('../models/user.model');

module.exports = {
    // Tạo voucher mới (chỉ admin)
    createVoucher: async (req, res) => {
        try {
            const {
                name,
                code,
                discount_type,
                discount_value,
                minimum_order_value,
                maximum_discount,
                start_date,
                end_date,
                quantity
            } = req.body;

            // Validate code
            const existingVoucher = await Voucher.findOne({ code });
            if (existingVoucher) {
                return res.status(400).json({
                    status: 400,
                    message: "Mã voucher đã tồn tại"
                });
            }

            // Create new voucher
            const newVoucher = new Voucher({
                name,
                code,
                discount_type,
                discount_value,
                minimum_order_value,
                maximum_discount,
                start_date,
                end_date,
                quantity
            });

            await newVoucher.save();

            res.status(200).json({
                status: 200,
                message: "Tạo voucher thành công",
                data: newVoucher
            });

        } catch (error) {
            console.error("Error creating voucher:", error);
            res.status(500).json({
                status: 500,
                message: "Lỗi khi tạo voucher",
                error: error.message
            });
        }
    },

    // Lấy danh sách voucher cho admin
    getAllVouchers: async (req, res) => {
        try {
            const vouchers = await Voucher.find()
                .sort({ createdAt: -1 });

            res.status(200).json({
                status: 200,
                message: "Danh sách voucher",
                data: vouchers
            });
        } catch (error) {
            res.status(500).json({
                status: 500,
                message: "Lỗi khi lấy danh sách voucher",
                error: error.message
            });
        }
    },

    // Lấy danh sách voucher có thể sử dụng
    getAvailableVouchers: async (req, res) => {
        try {
            const vouchers = await Voucher.find({
                quantity: { $gt: 0 },
                end_date: { $gt: new Date() }
            }).sort({ createdAt: -1 });

            res.status(200).json({
                status: 200,
                message: "Danh sách voucher có thể sử dụng",
                data: vouchers
            });
        } catch (error) {
            res.status(500).json({
                status: 500,
                message: "Lỗi khi lấy danh sách voucher",
                error: error.message
            });
        }
    },

    // Cập nhật voucher
    updateVoucher: async (req, res) => {
        try {
            const {
                name,
                discount_type,
                discount_value,
                minimum_order_value,
                maximum_discount,
                start_date,
                end_date,
                quantity
            } = req.body;

            const voucher = await Voucher.findById(req.params.id);
            if (!voucher) {
                return res.status(404).json({
                    status: 404,
                    message: "Không tìm thấy voucher"
                });
            }

            // Cập nhật thông tin
            voucher.name = name;
            voucher.discount_type = discount_type;
            voucher.discount_value = discount_value;
            voucher.minimum_order_value = minimum_order_value;
            voucher.maximum_discount = maximum_discount;
            voucher.start_date = start_date;
            voucher.end_date = end_date;
            voucher.quantity = quantity;

            await voucher.save();

            res.status(200).json({
                status: 200,
                message: "Cập nhật voucher thành công",
                data: voucher
            });
        } catch (error) {
            res.status(500).json({
                status: 500,
                message: "Lỗi khi cập nhật voucher",
                error: error.message
            });
        }
    },

    // Xóa voucher
    deleteVoucher: async (req, res) => {
        try {
            const voucher = await Voucher.findByIdAndDelete(req.params.id);

            if (!voucher) {
                return res.status(404).json({
                    status: 404,
                    message: "Không tìm thấy voucher"
                });
            }

            // Xóa tất cả user_vouchers liên quan
            await UserVoucher.deleteMany({ voucher_id: req.params.id });

            res.status(200).json({
                status: 200,
                message: "Xóa voucher thành công"
            });
        } catch (error) {
            res.status(500).json({
                status: 500,
                message: "Lỗi khi xóa voucher",
                error: error.message
            });
        }
    }
};