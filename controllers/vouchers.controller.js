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
                type,
                discount_type,
                discount_value,
                minimum_order_value,
                maximum_discount,
                start_date,
                end_date,
                quantity
            } = req.body;

            // Validate required fields
            if (!name || !code || !type || !discount_type || !discount_value ||
                !minimum_order_value || !maximum_discount || !start_date || !end_date || !quantity) {
                return res.status(400).json({
                    status: 400,
                    message: "Vui lòng điền đầy đủ thông tin"
                });
            }

            // Validate discount value
            if (discount_type === 'percentage' && (discount_value <= 0 || discount_value > 100)) {
                return res.status(400).json({
                    status: 400,
                    message: "Giá trị phần trăm giảm giá phải từ 1-100"
                });
            }

            // Validate type
            if (!['order', 'shipping'].includes(type)) {
                return res.status(400).json({
                    status: 400,
                    message: "Loại voucher không hợp lệ"
                });
            }

            // Validate existing code
            const existingVoucher = await Voucher.findOne({ code });
            if (existingVoucher) {
                return res.status(400).json({
                    status: 400,
                    message: "Mã voucher đã tồn tại"
                });
            }

            const voucherData = {
                name,
                code,
                type,
                discount_type,
                discount_value: Number(discount_value),
                minimum_order_value: Number(minimum_order_value),
                maximum_discount: Number(maximum_discount), // Đảm bảo là số nguyên
                start_date,
                end_date,
                quantity: Number(quantity)
            };

            // Create voucher
            const newVoucher = new Voucher(voucherData);
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
                type,              // Thêm type
                discount_type,
                discount_value,
                minimum_order_value,
                maximum_discount,
                start_date,
                end_date,
                quantity
            } = req.body;

            if (!['order', 'shipping'].includes(type)) {
                return res.status(400).json({
                    status: 400,
                    message: "Loại voucher không hợp lệ"
                });
            }

            const voucher = await Voucher.findById(req.params.id);
            if (!voucher) {
                return res.status(404).json({
                    status: 404,
                    message: "Không tìm thấy voucher"
                });
            }

            // Cập nhật thông tin
            voucher.name = name;
            voucher.type = type;
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
    },

    searchVouchers: async (req, res) => {
        try {
            const { keyword } = req.query;

            let query = {};
            if (keyword) {
                query = {
                    $or: [
                        { name: { $regex: keyword, $options: 'i' } },
                        { code: { $regex: keyword, $options: 'i' } }
                    ]
                };
            }

            const vouchers = await Voucher.find(query).sort({ createdAt: -1 });

            res.status(200).json({
                status: 200,
                message: "Kết quả tìm kiếm",
                data: vouchers
            });
        } catch (error) {
            res.status(500).json({
                status: 500,
                message: "Lỗi khi tìm kiếm voucher",
                error: error.message
            });
        }
    }
};