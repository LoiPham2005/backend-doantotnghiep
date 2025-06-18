const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const brand = new Schema({
    // media: {
    //     type: {
    //         type: String,
    //         enum: ['image', 'video'],
    //         default: 'image'
    //     },
    //     url: {
    //         type: String,
    //         required: false
    //     },
    // },
    media: { type: String, required: true },
    name: { type: String, required: true, unique: true },
}, {
    timestamps: true,
});

module.exports = mongoose.model('Brand', brand);
