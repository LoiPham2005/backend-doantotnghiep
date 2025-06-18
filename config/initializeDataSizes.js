const Size = require('../models/sizes.model');

const initializeSizes = async () => {
    try {
        // Kiểm tra xem đã có size nào chưa
        const existingSizes = await Size.find();
        if (existingSizes.length > 0) {
            console.log('Sizes already initialized');
            return;
        }

        // Tạo mảng các size từ 1-100
        const sizePromises = Array.from({ length: 100 }, (_, i) => {
            return new Size({
                size_value: (i + 1).toString()
            }).save();
        });

        await Promise.all(sizePromises);
        console.log('Successfully initialized 100 sizes');
    } catch (error) {
        console.error('Error initializing sizes:', error);
    }
};

module.exports = initializeSizes;