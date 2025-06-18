const Address = require('../models/address.model');
const User = require('../models/user.model');

module.exports = {
    // Thêm địa chỉ mới
    addAddress: async (req, res) => {
        try {
            const {
                user_id,
                full_name,
                phone,
                province,
                district,
                commune,
                receiving_address,
                is_default
            } = req.body;

            // Kiểm tra user tồn tại
            const user = await User.findById(user_id);
            if (!user) {
                return res.status(404).json({
                    status: 404,
                    message: "Không tìm thấy người dùng"
                });
            }

            // Nếu địa chỉ mới là mặc định, cập nhật các địa chỉ khác thành không mặc định
            if (is_default) {
                await Address.updateMany(
                    { user_id: user_id },
                    { is_default: false }
                );
            }

            // Tạo địa chỉ mới
            const newAddress = new Address({
                user_id,
                full_name,
                phone,
                province,
                district,
                commune,
                receiving_address,
                is_default
            });

            await newAddress.save();

            res.status(200).json({
                status: 200,
                message: "Thêm địa chỉ thành công",
                data: newAddress
            });

        } catch (error) {
            res.status(500).json({
                status: 500,
                message: "Lỗi khi thêm địa chỉ",
                error: error.message
            });
        }
    },

    // Lấy danh sách địa chỉ của user
    getAddressesByUser: async (req, res) => {
        try {
            const { user_id } = req.params;

            const addresses = await Address.find({ user_id })
                .sort({ is_default: -1, createdAt: -1 });

            res.status(200).json({
                status: 200,
                message: "Danh sách địa chỉ",
                data: addresses
            });

        } catch (error) {
            res.status(500).json({
                status: 500,
                message: "Lỗi khi lấy danh sách địa chỉ",
                error: error.message
            });
        }
    },

    // Cập nhật địa chỉ
    updateAddress: async (req, res) => {
        try {
            const {
                full_name,
                phone,
                province,
                district,
                commune,
                receiving_address,
                is_default
            } = req.body;

            const address = await Address.findById(req.params.id);
            if (!address) {
                return res.status(404).json({
                    status: 404,
                    message: "Không tìm thấy địa chỉ"
                });
            }

            // Nếu đang cập nhật thành địa chỉ mặc định
            if (is_default && !address.is_default) {
                await Address.updateMany(
                    { user_id: address.user_id },
                    { is_default: false }
                );
            }

            const updatedAddress = await Address.findByIdAndUpdate(
                req.params.id,
                {
                    full_name,
                    phone,
                    province,
                    district,
                    commune,
                    receiving_address,
                    is_default
                },
                { new: true }
            );

            res.status(200).json({
                status: 200,
                message: "Cập nhật địa chỉ thành công",
                data: updatedAddress
            });

        } catch (error) {
            res.status(500).json({
                status: 500,
                message: "Lỗi khi cập nhật địa chỉ",
                error: error.message
            });
        }
    },

    // Xóa địa chỉ
    deleteAddress: async (req, res) => {
        try {
            const address = await Address.findById(req.params.id);
            if (!address) {
                return res.status(404).json({
                    status: 404,
                    message: "Không tìm thấy địa chỉ"
                });
            }

            // Không cho phép xóa địa chỉ mặc định
            // if (address.is_default) {
            //     return res.status(400).json({
            //         status: 400,
            //         message: "Không thể xóa địa chỉ mặc định"
            //     });
            // }

            await Address.deleteOne({ _id: req.params.id });

            res.status(200).json({
                status: 200,
                message: "Xóa địa chỉ thành công"
            });

        } catch (error) {
            res.status(500).json({
                status: 500,
                message: "Lỗi khi xóa địa chỉ",
                error: error.message
            });
        }
    },

    // Đặt địa chỉ mặc định
    setDefaultAddress: async (req, res) => {
        try {
            const address = await Address.findById(req.params.id);
            if (!address) {
                return res.status(404).json({
                    status: 404,
                    message: "Không tìm thấy địa chỉ"
                });
            }

            // Cập nhật tất cả địa chỉ của user thành không mặc định
            await Address.updateMany(
                { user_id: address.user_id },
                { is_default: false }
            );

            // Đặt địa chỉ hiện tại làm mặc định
            address.is_default = true;
            await address.save();

            res.status(200).json({
                status: 200,
                message: "Đặt địa chỉ mặc định thành công",
                data: address
            });

        } catch (error) {
            res.status(500).json({
                status: 500,
                message: "Lỗi khi đặt địa chỉ mặc định",
                error: error.message
            });
        }
    }
};