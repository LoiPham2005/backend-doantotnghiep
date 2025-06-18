const mongoose = require("mongoose");
const mongoURI = process.env.MONGOOSE_URL;
const initializeData = require('./initializeData');
const initializeSizes = require('./initializeDataSizes');
const initializeColors = require('./initializeColors');

const connect = async () => {
    try {
        await mongoose.connect(mongoURI)
            .then(async () => {
                console.log("Kết nối mongodb thành công");
                // Đợi tất cả các hàm khởi tạo hoàn thành
                await Promise.all([
                    initializeData(),
                    initializeSizes(),
                    initializeColors()
                ]);
            })
            .catch((err) => {
                console.log("Kết nối thất bại");
            });
    } catch (error) {
        console.log("Kết nối thất bại" + error);
    }
};

module.exports = { connect };