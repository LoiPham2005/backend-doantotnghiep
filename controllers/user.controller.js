// Thêm import jwt ở đầu file
const jwt = require('jsonwebtoken');
const md = require('../models/user.model');
const bcrypt = require('bcrypt');
const User = require('../models/user.model');

// tạo toekn mới
const generateAuthToken = (userId) => {
    const accessToken = jwt.sign(
        { id: userId },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
    );
    const refreshToken = jwt.sign(
        { id: userId },
        process.env.REFRESH_TOKEN_SECRET || 'refresh_secret_key',
        { expiresIn: '7d' }
    );
    return { accessToken, refreshToken };
};

module.exports = {
    getAllUsers: async (req, res) => {
        try {
            const users = await md.find({});
            if (users) {
                res.json(users);
            } else {
                res.status(404).json([]);
            }
        } catch (error) {
            console.error(error);
            res.status(500).json({
                status: 500,
                message: 'Server Error',
                error: error.message
            });
        }
    },

    register: async (req, res) => {
        try {
            ///Tạo salt ngẫu nhiên để mã hóa mật khẩu
            const salt = await bcrypt.genSalt(10);

            // Tạo user mới
            const user = new md({
                username: req.body.username,
                email: req.body.email,
                password: req.body.password,
            });

            //Mã hóa mật khẩu với salt
            user.password = await bcrypt.hash(user.password, salt);

            // Tạo token xác thực cho user mới bằng hàm generateAuthToken
            // user.accessToken = generateAuthToken(user._id);

            const { accessToken, refreshToken } = generateAuthToken(user._id);
            user.accessToken = accessToken;
            user.refreshToken = refreshToken;

            // Lưu user vào database      
            const newUser = await user.save();
            // res.status(200).json({ newUser });
            res.status(200).json({
                user: newUser,
                accessToken,
                refreshToken
            });

        } catch (error) {
            console.error(error);
            res.status(400).json({ message: 'Registration failed' });
        }
    },

    // đăng nhập
    login: async (req, res) => {
        try {
            const { email, password } = req.body;

            const user = await md.findOne({ email });
            if (!user) {
                return res.status(400).json({
                    status: 400,
                    message: 'Email không tồn tại'
                });
            }

            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch) {
                return res.status(400).json({
                    status: 400,
                    message: 'Mật khẩu không đúng'
                });
            }

            // Chỉ kiểm tra role admin
            // if (user.role !== 'admin') {
            //     return res.status(403).json({
            //         status: 403,
            //         message: 'Chỉ tài khoản Admin mới có thể đăng nhập vào trang quản trị'
            //     });
            // }

            const { accessToken, refreshToken } = generateAuthToken(user._id);
            user.accessToken = accessToken;
            user.refreshToken = refreshToken;

            await user.save();

            res.json({
                status: 200,
                message: 'Đăng nhập thành công',
                user: {
                    _id: user._id,
                    username: user.username,
                    email: user.email,
                    role: user.role,
                    avatar: user.avatar,
                    sex: user.sex,
                    phone: user.phone,
                    birth_date: user.birth_date
                },
                accessToken,
                refreshToken
            });

        } catch (error) {
            console.error('Login error:', error);
            res.status(500).json({
                status: 500,
                message: 'Lỗi server',
                error: error.message
            });
        }
    },

    // New refresh token endpoint
    refreshToken: async (req, res) => {
        try {
            const { refreshToken } = req.body;

            if (!refreshToken) {
                return res.status(401).json({ message: 'Refresh Token Required' });
            }

            const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
            const user = await md.findById(decoded.id);

            if (!user || user.refreshToken !== refreshToken) {
                return res.status(403).json({ message: 'Invalid Refresh Token' });
            }

            // Generate new tokens
            const { accessToken: newAccessToken, refreshToken: newRefreshToken } = generateAuthToken(user._id);

            user.accessToken = newAccessToken;
            user.refreshToken = newRefreshToken;
            await user.save();

            res.json({
                accessToken: newAccessToken,
                refreshToken: newRefreshToken
            });

        } catch (error) {
            console.error(error);
            res.status(403).json({ message: 'Invalid Refresh Token' });
        }
    },

    // đăng xuất
    logout: async (req, res) => {
        try {
            const user = req.user;
            user.accessToken = null;
            user.refreshToken = null;
            await user.save();
            res.json({ message: 'User logged out successfully' });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Server Error' });
        }
    },

    // sửa thông tin cá nhân
    editUser: async (req, res) => {
        try {
            const userId = req.params.id;
            console.log('Edit user request:', { userId, body: req.body, file: req.file });

            if (!userId) {
                return res.status(400).json({
                    status: 400,
                    message: "User ID is required"
                });
            }

            let updateData = { ...req.body };

            // Handle file upload if exists
            if (req.file) {
                updateData.avatar = `/uploads/${req.file.filename}`;
            }

            console.log('Update data:', updateData);

            const result = await User.findByIdAndUpdate(
                userId,
                updateData,
                { new: true }
            );

            if (!result) {
                return res.status(404).json({
                    status: 404,
                    message: "Không tìm thấy người dùng",
                    data: null
                });
            }

            res.status(200).json({
                status: 200,
                message: "Cập nhật thành công",
                data: result
            });

        } catch (error) {
            console.error("Error updating user:", error);
            res.status(500).json({
                status: 500,
                message: "Lỗi server",
                error: error.message
            });
        }
    },

    // Get admin user
    getAdmin: async (req, res) => {
        try {
            const admin = await md.findOne({ role: 'admin' });
            if (!admin) {
                return res.status(404).json({
                    status: 404,
                    message: "Admin user not found"
                });
            }

            res.json({
                status: 200,
                message: "Admin user found",
                data: admin
            });
        } catch (error) {
            console.error("Error getting admin:", error);
            res.status(500).json({
                status: 500,
                message: "Error getting admin user",
                error: error.message
            });
        }
    },

    // Add this to the module.exports object
    changePassword: async (req, res) => {
        try {
            const { oldPassword, newPassword } = req.body;
            const userId = req.params.id;

            // Find user
            const user = await md.findById(userId);
            if (!user) {
                return res.status(404).json({
                    status: 404,
                    message: "Không tìm thấy người dùng"
                });
            }

            // Verify old password
            const isMatch = await bcrypt.compare(oldPassword, user.password);
            if (!isMatch) {
                return res.status(400).json({
                    status: 400,
                    message: "Mật khẩu cũ không đúng"
                });
            }

            // Hash new password
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(newPassword, salt);

            // Update password
            user.password = hashedPassword;
            await user.save();

            res.json({
                status: 200,
                message: "Đổi mật khẩu thành công"
            });

        } catch (error) {
            console.error("Error changing password:", error);
            res.status(500).json({
                status: 500,
                message: "Lỗi server",
                error: error.message
            });
        }
    },

    // Thêm method search
    searchUsers: async (req, res) => {
        try {
            const { query } = req.query;
            let users = [];

            if (query) {
                users = await md.find({
                    $or: [
                        { _id: { $regex: query, $options: 'i' } },
                        { username: { $regex: query, $options: 'i' } },
                        { email: { $regex: query, $options: 'i' } }
                    ]
                }).limit(10);
            }

            res.json({
                status: 200,
                message: "Danh sách người dùng",
                data: users
            });
        } catch (error) {
            res.status(500).json({
                status: 500,
                message: "Lỗi tìm kiếm người dùng",
                error: error.message
            });
        }
    }
};