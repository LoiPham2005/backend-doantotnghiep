const Favourite = require('../models/favourites.model');
const User = require('../models/user.model');
const Shoes = require('../models/shoes.model');

module.exports = {
    // Thêm sản phẩm vào danh sách yêu thích
    addToFavourites: async (req, res) => {
        try {
            const { user_id, shoes_id } = req.body;

            // Kiểm tra user tồn tại
            const user = await User.findById(user_id);
            if (!user) {
                return res.status(404).json({
                    status: 404,
                    message: "Không tìm thấy người dùng"
                });
            }

            // Kiểm tra sản phẩm tồn tại
            const shoes = await Shoes.findById(shoes_id);
            if (!shoes) {
                return res.status(404).json({
                    status: 404,
                    message: "Không tìm thấy sản phẩm"
                });
            }

            // Thêm vào favorites
            const favourite = new Favourite({ user_id, shoes_id });
            await favourite.save();

            // Populate thông tin
            const populatedFavourite = await Favourite.findById(favourite._id)
                .populate('shoes_id')
                .populate('user_id');

            res.status(200).json({
                status: 200,
                message: "Đã thêm vào danh sách yêu thích",
                data: populatedFavourite
            });

        } catch (error) {
            // Xử lý lỗi duplicate key (đã thêm vào yêu thích rồi)
            if (error.code === 11000) {
                return res.status(400).json({
                    status: 400,
                    message: "Sản phẩm đã có trong danh sách yêu thích"
                });
            }

            res.status(500).json({
                status: 500,
                message: "Lỗi khi thêm vào yêu thích",
                error: error.message
            });
        }
    },

    // Lấy danh sách yêu thích của một user
    getFavouritesByUser: async (req, res) => {
        try {
            const { user_id } = req.params;

            const favourites = await Favourite.find({ user_id })
                .populate('shoes_id')
                .sort({ createdAt: -1 });

            res.status(200).json({
                status: 200,
                message: "Danh sách yêu thích",
                data: favourites
            });

        } catch (error) {
            res.status(500).json({
                status: 500,
                message: "Lỗi khi lấy danh sách yêu thích",
                error: error.message
            });
        }
    },

    // Kiểm tra sản phẩm có trong danh sách yêu thích không
    checkFavourite: async (req, res) => {
        try {
            const { user_id, shoes_id } = req.params;

            const favourite = await Favourite.findOne({ user_id, shoes_id });

            res.status(200).json({
                status: 200,
                isFavourited: !!favourite
            });

        } catch (error) {
            res.status(500).json({
                status: 500,
                message: "Lỗi khi kiểm tra yêu thích",
                error: error.message
            });
        }
    },

    // Xóa khỏi danh sách yêu thích
    removeFromFavourites: async (req, res) => {
        try {
            const { user_id, shoes_id } = req.params;

            const result = await Favourite.findOneAndDelete({ user_id, shoes_id });

            if (!result) {
                return res.status(404).json({
                    status: 404,
                    message: "Không tìm thấy trong danh sách yêu thích"
                });
            }

            res.status(200).json({
                status: 200,
                message: "Đã xóa khỏi danh sách yêu thích"
            });

        } catch (error) {
            res.status(500).json({
                status: 500,
                message: "Lỗi khi xóa khỏi yêu thích",
                error: error.message
            });
        }
    }
};