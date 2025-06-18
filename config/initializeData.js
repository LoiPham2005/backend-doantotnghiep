const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('../models/user.model'); 

const initializeData = async () => {
    try {
        // Kiểm tra xem tài khoản admin đã tồn tại chưa
        const adminExists = await User.findOne({ username: 'admin' });
        if (!adminExists) {
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash('admin@', salt);

            const adminUser = new User({
                username: 'admin',
                email: 'admin@gmail.com',
                password: hashedPassword,
                role: 'admin'
            });

            await adminUser.save();
            console.log('Admin user created successfully');
        }

        // Kiểm tra xem tài khoản loi001 đã tồn tại chưa
        const loi001Exists = await User.findOne({ username: 'user001' });
        if (!loi001Exists) {
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash('user001', salt);

            const loi001User = new User({
                username: 'user001',
                email: 'user001@gmail.com',
                password: hashedPassword,
                role: 'user'
            });

            await loi001User.save();
            console.log('User user001 created successfully');
        }

        // Kiểm tra xem tài khoản loi002 đã tồn tại chưa
        const loi002Exists = await User.findOne({ username: 'user002' });
        if (!loi002Exists) {
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash('user002', salt);

            const loi002User = new User({
                username: 'user002',
                email: 'user002@gmail.com',
                password: hashedPassword,
                role: 'user'
            });

            await loi002User.save();
            console.log('User user002 created successfully');
        }
    } catch (error) {
        console.error('Error initializing data:', error);
    }
};

module.exports = initializeData;