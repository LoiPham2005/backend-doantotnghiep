const cloudinary = require('../config/cloudinary');
const fs = require('fs');
const path = require('path');

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




// Upload file lên Cloudinary mỗi ảnh
// exports.uploadToCloudinary = async (filePath, folder = 'uploads') => {
//     try {
//         const result = await cloudinary.uploader.upload(filePath, {
//             folder: folder,
//             resource_type: "auto",
//             format: "png", // 👈 ép về PNG dù là SVG
//         });

//         // Xóa file tạm sau khi upload thành công
//         await exports.deleteFile(filePath);

//         return {
//             url: result.secure_url,
//             public_id: result.public_id
//         };

//     } catch (error) {
//         // Xóa file nếu upload thất bại
//         await exports.deleteFile(filePath);
//         throw error;
//     }
// };

// exports.deleteFromCloudinary = async (public_id) => {
//     try {
//         await cloudinary.uploader.destroy(public_id);
//     } catch (error) {
//         console.error("❌ Lỗi khi xóa file Cloudinary:", error.message);
//         throw error;
//     }
// };

// exports.deleteFile = (filePath) => {
//     return new Promise((resolve, reject) => {
//         fs.unlink(filePath, (err) => {
//             if (err) {
//                 if (err.code === 'ENOENT') {
//                     console.warn(`⚠️ File không tồn tại (bỏ qua): ${filePath}`);
//                     resolve();
//                 } else {
//                     console.error(`❌ Lỗi khi xóa file ${filePath}:`, err);
//                     reject(err);
//                 }
//             } else {
//                 console.log(`✅ Đã xóa file local: ${filePath}`);
//                 resolve();
//             }
//         });
//     });
// };



// ✅ Xác định loại file (image hoặc video)
const getResourceType = (filePath) => {
    const ext = path.extname(filePath).toLowerCase();
    const videoExts = ['.mp4', '.mov', '.avi', '.wmv', '.flv', '.mkv', '.webm'];
    return videoExts.includes(ext) ? 'video' : 'image';
};

// ✅ Upload file lên Cloudinary
exports.uploadToCloudinary = async (filePath, folder = 'uploads') => {
    try {
        const resourceType = getResourceType(filePath);

        const result = await cloudinary.uploader.upload(filePath, {
            folder,
            resource_type: resourceType,
            ...(resourceType === 'image' ? { format: 'png' } : {}) // ép ảnh về PNG nếu là ảnh
        });

        // ✅ Xóa file local sau khi upload
        await exports.deleteFile(filePath);

        return {
            url: result.secure_url,
            public_id: result.public_id,
            resource_type: resourceType
        };

    } catch (error) {
        // ❌ Nếu upload thất bại, vẫn xóa file local
        await exports.deleteFile(filePath);
        throw error;
    }
};

// ✅ Xóa file từ Cloudinary
exports.deleteFromCloudinary = async (public_id, type = 'image') => {
    try {
        await cloudinary.uploader.destroy(public_id, {
            resource_type: type
        });
    } catch (error) {
        console.error("❌ Lỗi khi xóa file Cloudinary:", error.message);
        throw error;
    }
};

// ✅ Xóa file local
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