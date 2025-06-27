const cloudinary = require('../config/cloudinary');
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


// Upload file lên Cloudinary
exports.uploadToCloudinary = async (filePath, folder = 'uploads') => {
    try {
      const result = await cloudinary.uploader.upload(filePath, {
        folder: folder,
        resource_type: "auto" // Tự động phát hiện loại file
      });
      
      // Xóa file tạm sau khi upload
      await exports.deleteFile(filePath);
      
      return {
        url: result.secure_url,
        public_id: result.public_id
      };
    } catch (error) {
      throw error;
    }
  };
  
  // Xóa file từ Cloudinary
  exports.deleteFromCloudinary = async (public_id) => {
    try {
      await cloudinary.uploader.destroy(public_id);
    } catch (error) {
      console.error(`Error deleting file from Cloudinary:`, error);
      throw error;
    }
  };
  
  // Xóa file local
  exports.deleteFile = (filePath) => {
    return new Promise((resolve, reject) => {
      fs.unlink(filePath, (err) => {
        if (err) {
          console.error(`Error deleting local file ${filePath}:`, err);
          reject(err);
        } else {
          console.log(`Successfully deleted local file ${filePath}`);
          resolve();
        }
      });
    });
  };