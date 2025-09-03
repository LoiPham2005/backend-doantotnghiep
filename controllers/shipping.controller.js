const ShippingRate = require("../models/shippingrate.model");

// Lấy toàn bộ bảng giá (chỉ hiển thị những mức đang active)
exports.getAllRates = async (req, res) => {
  try {
    const rates = await ShippingRate.find().sort({ minDistance: 1 });

    res.status(200).json({
                status: 200,
                message: "Danh sách bảng giá shipping",
                data: rates
            });
  } catch (err) {
      res.status(500).json({
                    status: 500,
                    message: "Lỗi khi lấy danh sách bảng giá shipping",
                    error: error.message
                });
  }
};

// Thêm phí vận chuyển
exports.addRate = async (req, res) => {
  try {
    const { minDistance, maxDistance, price, isActive } = req.body;

    if (!minDistance || !maxDistance || !price) {
      return res.status(400).json({ error: "Thiếu thông tin" });
    }

    const newRate = new ShippingRate({
      minDistance,
      maxDistance,
      price,
      isActive: isActive ?? true, // nếu không truyền thì mặc định là true
    });

    await newRate.save();
    res.status(200).json({
      status: 200,
      message: "Thêm bảng giá shipping thành công",
      data: newRate
    });
  } catch (err) {
    res.status(500).json({
      status: 500,
      message: "Lỗi khi thêm bảng giá shipping",
      error: err.message
    });
  }
};

// Sửa phí vận chuyển
exports.updateRate = async (req, res) => {
  try {
    const { id } = req.params;
    const { minDistance, maxDistance, price, isActive } = req.body;

    const updatedRate = await ShippingRate.findByIdAndUpdate(
      id,
      { minDistance, maxDistance, price, isActive },
      { new: true }
    );

    if (!updatedRate) {
      return res.status(404).json({ error: "Không tìm thấy mức giá" });
    }

     res.status(200).json({
                status: 200,
                message: "Sửa bảng giá shipping thành công",
                data: updatedRate
            });
  } catch (err) {
    res.status(500).json({
      status: 500,
      message: "Lỗi khi cập nhật bảng giá shipping",
      error: err.message
    });
  }
};

// Xóa phí vận chuyển
exports.deleteRate = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedRate = await ShippingRate.findByIdAndDelete(id);

    if (!deletedRate) {
      return res.status(404).json({ error: "Không tìm thấy mức giá" });
    }
     res.status(200).json({
                status: 200,
                message: "Xóa thành công giá shipping",
                data: deletedRate
            });
  } catch (err) {
    res.status(500).json({
      status: 500,
      message: "Lỗi khi xóa bảng giá shipping",
      error: err.message
    });
  }
};

// API tính phí vận chuyển dựa trên khoảng cách (chỉ lấy mức đang active)
exports.calculateShippingFee = async (req, res) => {
  try {
    const distance = parseFloat(req.query.distance);

    // Kiểm tra khoảng cách hợp lệ
    if (isNaN(distance) || distance < 0) {
      return res.status(400).json({
        status: 400,
        message: "Khoảng cách không hợp lệ",
        data: null
      });
    }

    // Lấy bảng giá từ DB, chỉ lấy mức đang active
    const rates = await ShippingRate.find({ isActive: true }).sort({ minDistance: 1 });

    // Nếu chưa cấu hình bảng giá
    if (!rates || rates.length === 0) {
      return res.status(404).json({
        status: 404,
        message: "Chưa có cấu hình phí vận chuyển",
        data: {
          distance,
          price: 0
        }
      });
    }

    // Tìm mức giá phù hợp
    const matchedRate = rates.find(rate =>
      distance >= rate.minDistance && distance <= rate.maxDistance
    );

    // Nếu tìm thấy mức giá phù hợp
    if (matchedRate) {
      return res.status(200).json({
        status: 200,
        message: `Phí vận chuyển: ${matchedRate.price.toLocaleString("vi-VN")} VNĐ`,
        data: {
          distance,
          price: matchedRate.price,
          createdAt: matchedRate.createdAt
        }
      });
    }

    // Nếu khoảng cách vượt quá tất cả mức trong DB → tính thêm 10k/km
    const maxRate = rates[rates.length - 1];
    if (distance > maxRate.maxDistance) {
      const extraDistance = distance - maxRate.maxDistance;
      const extraPrice = maxRate.price + extraDistance * 10000;

      return res.status(200).json({
        status: 200,
        message: `Khoảng cách vượt mức tối đa, cộng thêm ${extraDistance} km. Phí vận chuyển: ${extraPrice.toLocaleString("vi-VN")} VNĐ`,
        data: {
          distance,
          price: extraPrice,
          createdAt: maxRate.createdAt
        }
      });
    }

    // Trường hợp không tìm thấy mức giá nào phù hợp
    return res.status(404).json({
      status: 404,
      message: "Không tìm thấy mức giá phù hợp",
      data: {
        distance,
        price: 0
      }
    });

  } catch (err) {
    console.error("Lỗi khi tính phí vận chuyển:", err);
    return res.status(500).json({
      status: 500,
      message: "Lỗi khi tính phí vận chuyển",
      error: err.message
    });
  }
};

