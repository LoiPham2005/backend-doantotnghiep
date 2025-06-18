const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const color = new Schema({
    name: { type: String, required: true, unique: true },
    value: { type: String, required: true, unique: true },
}, {
    timestamps: true,
});

module.exports = mongoose.model('Color', color);
