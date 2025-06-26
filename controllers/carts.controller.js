const Cart = require('../models/carts.model');
const User = require('../models/user.model');
const Shoes = require('../models/shoes.model');
const ShoesVariant = require('../models/shoes_variant.model');

module.exports = {
    // Thêm sản phẩm vào giỏ hàng
    addToCart: async (req, res) => {
        try {
            const { user_id, variant_id, quantity } = req.body;

            // Kiểm tra user tồn tại
            const user = await User.findById(user_id);
            if (!user) {
                return res.status(404).json({
                    status: 404,
                    message: "Không tìm thấy người dùng"
                });
            }

            // Kiểm tra variant tồn tại
            const variant = await ShoesVariant.findById(variant_id).populate({
                path: 'shoes_id',
                select: 'status'
            });

            if (!variant) {
                return res.status(404).json({
                    status: 404,
                    message: "Không tìm thấy sản phẩm hoặc biến thể"
                });
            }

            // Kiểm tra trạng thái sản phẩm
            if (variant.shoes_id.status === 'out of stock' || variant.shoes_id.status === 'importing goods') {
                return res.status(400).json({
                    status: 400,
                    message: "Sản phẩm hiện không có sẵn để mua"
                });
            }

            // Kiểm tra số lượng trong kho
            if (variant.quantity_in_stock < quantity) {
                return res.status(400).json({
                    status: 400,
                    message: "Số lượng sản phẩm trong kho không đủ"
                });
            }

            // Kiểm tra sản phẩm đã có trong giỏ hàng chưa
            let cartItem = await Cart.findOne({ user_id, variant_id });

            if (cartItem) {
                // Nếu đã có, cập nhật số lượng
                cartItem.quantity += quantity;
                if (cartItem.quantity > variant.quantity_in_stock) {
                    return res.status(400).json({
                        status: 400,
                        message: "Số lượng vượt quá số lượng trong kho"
                    });
                }
                await cartItem.save();
            } else {
                // Nếu chưa có, tạo mới
                cartItem = new Cart({
                    user_id,
                    variant_id,
                    quantity
                });
                await cartItem.save();
            }

            // Populate thông tin đầy đủ
            const populatedCart = await Cart.findById(cartItem._id)
                .populate({
                    path: 'variant_id',
                    populate: {
                        path: 'shoes_id',
                        select: 'name status media'
                    }
                })
                .populate('user_id');

            res.status(200).json({
                status: 200,
                message: "Thêm vào giỏ hàng thành công",
                data: populatedCart
            });

        } catch (error) {
            res.status(500).json({
                status: 500,
                message: "Lỗi khi thêm vào giỏ hàng",
                error: error.message
            });
        }
    },

    // Lấy giỏ hàng của user
    getCartByUser: async (req, res) => {
        try {
            const { user_id } = req.params;

            const cartItems = await Cart.find({ user_id })
                .populate('variant_id')
                .sort({ createdAt: -1 });

            // Tính tổng tiền
            let totalAmount = 0;
            cartItems.forEach(item => {
                totalAmount += item.variant_id.price * item.quantity;
            });

            res.status(200).json({
                status: 200,
                message: "Giỏ hàng của người dùng",
                data: {
                    items: cartItems,
                    totalAmount: totalAmount
                }
            });

        } catch (error) {
            res.status(500).json({
                status: 500,
                message: "Lỗi khi lấy giỏ hàng",
                error: error.message
            });
        }
    },

    // Cập nhật số lượng trong giỏ hàng
    updateCartItem: async (req, res) => {
        try {
            const { id } = req.params;
            const { quantity } = req.body;

            const cartItem = await Cart.findById(id);
            if (!cartItem) {
                return res.status(404).json({
                    status: 404,
                    message: "Không tìm thấy sản phẩm trong giỏ hàng"
                });
            }

            // Kiểm tra số lượng trong kho
            const variant = await ShoesVariant.findById(cartItem.variant_id);
            if (quantity > variant.quantity_in_stock) {
                return res.status(400).json({
                    status: 400,
                    message: "Số lượng vượt quá số lượng trong kho"
                });
            }

            cartItem.quantity = quantity;
            await cartItem.save();

            const updatedCart = await Cart.findById(id)
                .populate('variant_id');

            res.status(200).json({
                status: 200,
                message: "Cập nhật giỏ hàng thành công",
                data: updatedCart
            });

        } catch (error) {
            res.status(500).json({
                status: 500,
                message: "Lỗi khi cập nhật giỏ hàng",
                error: error.message
            });
        }
    },

    // Xóa sản phẩm khỏi giỏ hàng
    removeFromCart: async (req, res) => {
        try {
            const { id } = req.params;

            const result = await Cart.findByIdAndDelete(id);
            if (!result) {
                return res.status(404).json({
                    status: 404,
                    message: "Không tìm thấy sản phẩm trong giỏ hàng"
                });
            }

            res.status(200).json({
                status: 200,
                message: "Đã xóa sản phẩm khỏi giỏ hàng"
            });

        } catch (error) {
            res.status(500).json({
                status: 500,
                message: "Lỗi khi xóa khỏi giỏ hàng",
                error: error.message
            });
        }
    },

    // Xóa toàn bộ giỏ hàng của user
    clearCart: async (req, res) => {
        try {
            const { user_id } = req.params;

            await Cart.deleteMany({ user_id });

            res.status(200).json({
                status: 200,
                message: "Đã xóa toàn bộ giỏ hàng"
            });

        } catch (error) {
            res.status(500).json({
                status: 500,
                message: "Lỗi khi xóa giỏ hàng",
                error: error.message
            });
        }
    }
};