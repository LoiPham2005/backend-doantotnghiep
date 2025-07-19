const mongoose = require('mongoose');

const shoesVariantSchema = new mongoose.Schema({
  shoes_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Shoes', // Tham chiếu đến bảng Shoes
    required: true
  },
  price: {
    type: Number,
    required: true
  },
  quantity_in_stock: {
    type: Number,
    required: true
  },
  size_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Size',
    required: true
  },
  color_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Color',
    required: true
  },
  status: {
    type: String,
    enum: ['available', 'out_of_stock', 'discontinued'], 
    default: 'available'
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

module.exports = mongoose.model('ShoesVariant', shoesVariantSchema);
