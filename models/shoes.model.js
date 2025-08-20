// models/Shoe.js
const mongoose = require('mongoose');

const ShoeSchema = new mongoose.Schema({
    // media: {
    //     type: String, 
    //     required: false
    // },
    media: [{
        type: {
            type: String,
            enum: ['image', 'video'],
            required: false
        },
        url: {
            type: String,
            required: false
        },
        public_id: String 
    }],
    name: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        required: false
    },
    brand_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Brand',
        required: true
    },
    // brand: {
    //     type: String,
    //     required: false
    // },
    rating: { 
        type: Number,
        default: 0,
        min: 0,
        max: 5
    },
    status: {
        type: String,
        enum: ['active', 'out_of_stock', 'importing_goods', 'hidden'],
        default: 'active'
    },
    category_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',
        required: true
    },
    created_at: {
        type: Date,
        default: Date.now
    },
    update_at: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Shoes', ShoeSchema);
