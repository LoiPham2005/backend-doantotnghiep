const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const addressSchema = new Schema({
    user_id: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    full_name: {
        type: String,
        required: true
    },
    phone: {
        type: String,
        required: true
    },
    province: {
        type: String,
        required: true
    },
    district: {
        type: String, 
        required: true
    },
    commune: {
        type: String,
        required: true
    },
    receiving_address: {
        type: String,
        required: true
    },
    is_default: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Address', addressSchema);