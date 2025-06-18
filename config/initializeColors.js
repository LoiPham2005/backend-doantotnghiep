const Color = require('../models/color.model');

const defaultColors = [
    { name: "Đen", value: "#000000" },
    { name: "Trắng", value: "#FFFFFF" },
    { name: "Đỏ", value: "#FF0000" },
    { name: "Xanh lá", value: "#008000" },
    { name: "Xanh dương", value: "#0000FF" },
    { name: "Vàng", value: "#FFFF00" },
    { name: "Tím", value: "#800080" },
    { name: "Cam", value: "#FFA500" },
    { name: "Nâu", value: "#A52A2A" },
    { name: "Xám", value: "#808080" },
    { name: "Hồng", value: "#FFC0CB" },
    { name: "Bạc", value: "#C0C0C0" },
    { name: "Vàng nghệ", value: "#FFD700" },
    { name: "Navy", value: "#000080" },
    { name: "Xanh ngọc", value: "#40E0D0" },
    { name: "Đỏ đô", value: "#800000" },
    { name: "Olive", value: "#808000" },
    { name: "Đỏ tươi", value: "#FF4500" },
    { name: "Hồng đậm", value: "#FF1493" },
    { name: "Tím đậm", value: "#4B0082" },
    { name: "Xanh rêu", value: "#556B2F" },
    { name: "Nâu đỏ", value: "#8B4513" },
    { name: "Xám đậm", value: "#696969" },
    { name: "Xanh biển", value: "#4169E1" },
    { name: "Xanh mint", value: "#98FF98" },
    { name: "Be", value: "#F5F5DC" },
    { name: "Kem", value: "#FFFDD0" },
    { name: "Đỏ hồng", value: "#FF69B4" },
    { name: "Tím nhạt", value: "#E6E6FA" },
    { name: "Xanh nhạt", value: "#ADD8E6" }
];

const initializeColors = async () => {
    try {
        // Kiểm tra xem đã có màu nào chưa
        const existingColors = await Color.find();
        if (existingColors.length > 0) {
            console.log('Colors already initialized');
            return;
        }

        // Thêm các màu mặc định
        await Color.insertMany(defaultColors);
        console.log('Successfully initialized default colors');
    } catch (error) {
        console.error('Error initializing colors:', error);
    }
};

module.exports = initializeColors;