const mongoose = require("mongoose");

const ShippingRateSchema = new mongoose.Schema(
  {
    minDistance: {
      type: Number,
      required: true,
    },
    maxDistance: {
      type: Number,
      required: true,
    },
    price: {
      type: Number,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true, // mặc định bật mức phí
    },
    createdAt: {
      type: Date,
      default: Date.now, // ngày tạo tự động
    },
  },
  {
    timestamps: true, // thêm createdAt & updatedAt tự động
  }
);

module.exports = mongoose.model("ShippingRate", ShippingRateSchema);
