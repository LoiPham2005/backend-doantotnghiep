const cloudinary = require('../config/cloudinary');
const fs = require('fs');
// Hàm helper để xóa file
// exports.deleteFile = (filePath) => {
//     return new Promise((resolve, reject) => {
//         fs.unlink(filePath, (err) => {
//             if (err) {
//                 console.error(`Error deleting file ${filePath}:`, err);
//                 reject(err);
//             } else {
//                 console.log(`Successfully deleted file ${filePath}`);
//                 resolve();
//             }
//         });
//     });
// };

// // Hàm tạo URL cho file
// exports.createFileUrl = (req, filename) => {
//     return `${req.protocol}://${req.get('host')}/uploads/${filename}`;
// };


// Upload file lên Cloudinary

exports.uploadToCloudinary = async (filePath, folder = 'uploads') => {
    try {
        const result = await cloudinary.uploader.upload(filePath, {
            folder: folder,
            resource_type: "auto"
        });

        // Xóa file tạm sau khi upload thành công
        await exports.deleteFile(filePath);

        return {
            url: result.secure_url,
            public_id: result.public_id
        };
    } catch (error) {
        // Xóa file nếu upload thất bại
        await exports.deleteFile(filePath);
        throw error;
    }
};

exports.deleteFromCloudinary = async (public_id) => {
    try {
        await cloudinary.uploader.destroy(public_id);
    } catch (error) {
        console.error("❌ Lỗi khi xóa file Cloudinary:", error.message);
        throw error;
    }
};

exports.deleteFile = (filePath) => {
    return new Promise((resolve, reject) => {
        fs.unlink(filePath, (err) => {
            if (err) {
                if (err.code === 'ENOENT') {
                    console.warn(`⚠️ File không tồn tại (bỏ qua): ${filePath}`);
                    resolve();
                } else {
                    console.error(`❌ Lỗi khi xóa file ${filePath}:`, err);
                    reject(err);
                }
            } else {
                console.log(`✅ Đã xóa file local: ${filePath}`);
                resolve();
            }
        });
    });
};