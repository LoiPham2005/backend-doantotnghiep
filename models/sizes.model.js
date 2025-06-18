const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const size = new Schema({
    size_value: { type: String, required: true, unique: true },
}, {
    timestamps: true,
});

module.exports = mongoose.model('Size', size);
