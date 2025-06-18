const UserVoucher = require('../models/user_vouchers.model');
const Voucher = require('../models/vouchers.model');

module.exports = {
    // Lưu voucher vào ví của user
    saveVoucherToUser: async (req, res) => {
        try {
            const { user_id, voucher_id } = req.body;

            // Kiểm tra voucher có tồn tại và còn hiệu lực
            const voucher = await Voucher.findById(voucher_id);
            if (!voucher) {
                return res.status(404).json({
                    status: 404,
                    message: "Voucher không tồn tại"
                });
            }

            // Kiểm tra user đã có voucher này chưa
            const existingUserVoucher = await UserVoucher.findOne({
                user_id,
                voucher_id
            });

            if (existingUserVoucher) {
                return res.status(400).json({
                    status: 400,
                    message: "User đã có voucher này"
                });
            }

            // Tạo user_voucher mới
            const newUserVoucher = new UserVoucher({
                user_id,
                voucher_id
            });

            await newUserVoucher.save();

            res.status(200).json({
                status: 200,
                message: "Thêm voucher cho user thành công",
                data: newUserVoucher
            });
        } catch (error) {
            res.status(500).json({
                status: 500,
                message: "Lỗi khi thêm voucher cho user",
                error: error.message
            });
        }
    },

    // Lấy danh sách voucher của user
    getUserVouchers: async (req, res) => {
        try {
            const { user_id } = req.params;
            const { status } = req.query;

            const query = { user_id };
            if (status) {
                query.status = status;
            }

            const userVouchers = await UserVoucher.find(query)
                .populate('voucher_id')
                .sort({ createdAt: -1 });

            res.status(200).json({
                status: 200,
                message: "Danh sách voucher của user",
                data: userVouchers
            });
        } catch (error) {
            res.status(500).json({
                status: 500,
                message: "Lỗi khi lấy danh sách voucher",
                error: error.message
            });
        }
    },

    // Sử dụng voucher
    useVoucher: async (req, res) => {
        try {
            const { user_id, voucher_id } = req.body;

            const userVoucher = await UserVoucher.findOne({
                user_id,
                voucher_id,
                status: 'available'
            });

            if (!userVoucher) {
                return res.status(404).json({
                    status: 404,
                    message: "Không tìm thấy voucher hoặc voucher đã được sử dụng"
                });
            }

            userVoucher.status = 'used';
            userVoucher.used_date = new Date();
            await userVoucher.save();

            res.status(200).json({
                status: 200,
                message: "Sử dụng voucher thành công",
                data: userVoucher
            });
        } catch (error) {
            res.status(500).json({
                status: 500,
                message: "Lỗi khi sử dụng voucher",
                error: error.message
            });
        }
    },

    // Lấy danh sách users của một voucher
    getUsersByVoucherId: async (req, res) => {
        try {
            const { voucher_id } = req.params;

            const userVouchers = await UserVoucher.find({ voucher_id })
                .populate('user_id', 'username email')
                .sort({ createdAt: -1 });

            res.status(200).json({
                status: 200,
                message: "Danh sách người dùng của voucher",
                data: userVouchers
            });

        } catch (error) {
            res.status(500).json({
                status: 500,
                message: "Lỗi khi lấy danh sách người dùng",
                error: error.message
            });
        }
    },

    // Xóa tất cả user vouchers theo voucher_id
    removeAllUserVouchers: async (req, res) => {
        try {
            const { voucher_id } = req.params;

            await UserVoucher.deleteMany({ voucher_id });

            res.status(200).json({
                status: 200,
                message: "Đã xóa tất cả user vouchers"
            });
        } catch (error) {
            res.status(500).json({
                status: 500,
                message: "Lỗi khi xóa user vouchers",
                error: error.message
            });
        }
    }
};