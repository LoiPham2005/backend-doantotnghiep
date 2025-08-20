const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const favouriteSchema = new Schema({
    user_id: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User',
        required: true 
    },
    shoes_id: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Shoes',
        required: true  
    }
}, {
    timestamps: true
});

// Thêm index để đảm bảo mỗi user chỉ có thể favourite một đôi giày một lần
favouriteSchema.index({ user_id: 1, shoes_id: 1 }, { unique: true });

module.exports = mongoose.model('Favourite', favouriteSchema);