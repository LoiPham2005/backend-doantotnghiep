// Thêm import jwt ở đầu file
const jwt = require('jsonwebtoken');
const md = require('../models/user.model');
const bcrypt = require('bcrypt');
const User = require('../models/user.model');
const path = require('path');
const fs = require('fs');
// const { createFileUrl, deleteFile } = require('../utils/fileUtils');
const { uploadToCloudinary, deleteFromCloudinary, deleteFile } = require('../utils/fileUtils');

// tạo toekn mới
const generateAuthToken = (userId) => {
    const accessToken = jwt.sign(
        { id: userId },
        process.env.JWT_SECRET,
        { expiresIn: '30d' }
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
            // Kiểm tra xem username đã tồn tại chưa
            const existingUsername = await md.findOne({ username: req.body.username });
            if (existingUsername) {
                return res.status(400).json({ message: 'Username đã tồn tại' });
            }

            // Kiểm tra xem email đã tồn tại chưa
            const existingEmail = await md.findOne({ email: req.body.email });
            if (existingEmail) {
                return res.status(400).json({ message: 'Email đã tồn tại' });
            }

            // Tạo salt ngẫu nhiên để mã hóa mật khẩu
            const salt = await bcrypt.genSalt(10);

            // Tạo user mới
            const user = new md({
                username: req.body.username,
                email: req.body.email,
                password: req.body.password,
            });

            // Mã hóa mật khẩu
            user.password = await bcrypt.hash(user.password, salt);

            // Tạo token
            const { accessToken, refreshToken } = generateAuthToken(user._id);
            user.accessToken = accessToken;
            user.refreshToken = refreshToken;

            // Lưu user
            const newUser = await user.save();

            res.json({
                status: 200,
                message: 'Đăng ký thành công',
                user: newUser,
                accessToken,
                refreshToken
            });

        } catch (error) {
            console.error(error);
            res.status(400).json({ message: 'Registration failed' });
        }
    },

    login: async (req, res) => {
        try {
            const { email, password, platform } = req.body;

            const user = await md.findOne({ email });
            if (!user) {
                return res.status(400).json({
                    status: 400,
                    message: 'Email không tồn tại'
                });
            }

            // Kiểm tra trạng thái active của tài khoản
            if (!user.is_active) {
                return res.status(403).json({
                    status: 403,
                    message: 'Tài khoản đã bị vô hiệu hóa'
                });
            }

            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch) {
                return res.status(400).json({
                    status: 400,
                    message: 'Mật khẩu không đúng'
                });
            }

            // Kiểm tra platform và role
            if (platform === 'web' && user.role !== 'admin') {
                return res.status(403).json({
                    status: 403,
                    message: 'Chỉ tài khoản Admin mới có thể đăng nhập vào trang quản trị'
                });
            }

            if (platform === 'mobile' && user.role !== 'user') {
                return res.status(403).json({
                    status: 403,
                    message: 'Chỉ tài khoản User mới có thể đăng nhập vào ứng dụng'
                });
            }

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
                    fullname: user.fullname,
                    email: user.email,
                    role: user.role,
                    avatar: user.avatar,
                    sex: user.sex,
                    phone: user.phone,
                    birth_date: user.birthDate
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
            res.json({
                status: 200,
                message: 'User logged out successfully'
            });
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

            const user = await User.findById(userId);
            if (!user) {
                return res.status(404).json({
                    status: 404,
                    message: "Không tìm thấy người dùng"
                });
            }

            // Validate dữ liệu đầu vào
            const updateData = {
                username: req.body.username,
                fullname: req.body.fullname,
                phone: req.body.phone,
                sex: req.body.sex,
                birthDate: req.body.birthDate
            };

            // Kiểm tra username đã tồn tại chưa
            if (updateData.username) {
                const existingUser = await User.findOne({
                    username: updateData.username,
                    _id: { $ne: userId }
                });

                if (existingUser) {
                    return res.status(400).json({
                        status: 400,
                        message: "Username đã tồn tại"
                    });
                }
            }

            // Xử lý upload avatar
            if (req.file) {
                try {
                    // Xóa avatar cũ nếu có
                    if (user.cloudinary_id) {
                        console.log('Deleting old avatar:', user.cloudinary_id);
                        await deleteFromCloudinary(user.cloudinary_id);
                    }

                    // Upload avatar mới
                    const result = await uploadToCloudinary(req.file.path, 'avatars');
                    console.log('Upload result:', result);

                    updateData.avatar = result.url;
                    updateData.cloudinary_id = result.public_id;

                } catch (uploadError) {
                    console.error('Error handling avatar:', uploadError);
                    // Xóa file tạm nếu upload thất bại
                    await deleteFile(req.file.path);
                    throw uploadError;
                }
            }

            // Loại bỏ các trường undefined/null
            Object.keys(updateData).forEach(key => {
                if (updateData[key] === undefined || updateData[key] === null) {
                    delete updateData[key];
                }
            });

            console.log('Final update data:', updateData);

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
                data: {
                    _id: result._id,
                    username: result.username,
                    fullname: result.fullname,
                    email: result.email,
                    phone: result.phone,
                    sex: result.sex,
                    birthDate: result.birthDate,
                    avatar: result.avatar,
                    cloudinary_id: result.cloudinary_id,
                    role: result.role
                }
            });

        } catch (error) {
            // Đảm bảo xóa file tạm nếu có lỗi
            if (req.file) {
                await deleteFile(req.file.path);
            }

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
            const { keyword } = req.query;

            let query = {
                role: 'user' // Only search for users, not admins
            };

            if (keyword) {
                query.$or = [
                    { username: { $regex: keyword, $options: 'i' } },
                    { email: { $regex: keyword, $options: 'i' } },
                    { phone: { $regex: keyword, $options: 'i' } }
                ];
            }

            const users = await User.find(query)
                .select('-password')
                .sort({ createdAt: -1 });

            res.status(200).json({
                status: 200,
                message: "Kết quả tìm kiếm",
                data: users
            });
        } catch (error) {
            res.status(500).json({
                status: 500,
                message: "Lỗi khi tìm kiếm người dùng",
                error: error.message
            });
        }
    },

    toggleUserActive: async (req, res) => {
        try {
            const { id } = req.params;
            const user = await User.findById(id);

            if (!user) {
                return res.status(404).json({
                    status: 404,
                    message: "Không tìm thấy người dùng"
                });
            }

            // Toggle trạng thái active
            user.is_active = !user.is_active;
            await user.save();

            res.status(200).json({
                status: 200,
                message: `Tài khoản đã được ${user.is_active ? 'kích hoạt' : 'vô hiệu hóa'}`,
                data: {
                    user_id: user._id,
                    is_active: user.is_active
                }
            });

        } catch (error) {
            console.error("Error toggling user status:", error);
            res.status(500).json({
                status: 500,
                message: "Lỗi khi thay đổi trạng thái tài khoản",
                error: error.message
            });
        }
    },
};