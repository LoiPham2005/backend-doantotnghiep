const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const postSchema = new Schema({
    title: {
        type: String,
        required: true
    },
    message: {
        type: String,
        required: true
    },
    admin_id: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    media: [{
        type: {
            type: String,
            enum: ['image', 'video']
        },
        url: String,
        cloudinary_id: String
    }],
    is_active: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Post', postSchema);