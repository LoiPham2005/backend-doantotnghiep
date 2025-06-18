const fs = require('fs');
// Hàm helper để xóa file
exports.deleteFile = (filePath) => {
    return new Promise((resolve, reject) => {
        fs.unlink(filePath, (err) => {
            if (err) {
                console.error(`Error deleting file ${filePath}:`, err);
                reject(err);
            } else {
                console.log(`Successfully deleted file ${filePath}`);
                resolve();
            }
        });
    });
};

// Hàm tạo URL cho file
exports.createFileUrl = (req, filename) => {
    return `${req.protocol}://${req.get('host')}/uploads/${filename}`;
};