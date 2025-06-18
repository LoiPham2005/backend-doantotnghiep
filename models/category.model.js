const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const categorys = new Schema({
    media: { type: String, required: true },
    name: { type: String, required: true, unique: true },
}, {
    timestamps: true,
});

module.exports = mongoose.model('Category', categorys);
