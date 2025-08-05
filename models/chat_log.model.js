const mongoose = require('mongoose');

const chatLogSchema = new mongoose.Schema({
  user_id: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  message: { 
    type: String, 
    required: true 
  },
  ai_response: { 
    type: String, 
    required: true 
  },
  selected_products: [{
    product_id: { 
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Shoes'  
    },
    name: String,
    image: String,
    price_range: String
  }],
  created_at: { 
    type: Date, 
    default: Date.now 
  },
  is_deleted: {
    type: Boolean,
    default: false
  }
});

module.exports = mongoose.model('ChatLog', chatLogSchema);
