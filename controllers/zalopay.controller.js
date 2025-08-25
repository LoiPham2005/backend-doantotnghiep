const crypto = require('crypto');
const moment = require('moment'); 
require('dotenv').config();

const zalopayConfig = {
    app_id: process.env.ZALOPAY_APP_ID,
    key1: process.env.ZALOPAY_KEY1,
    key2: process.env.ZALOPAY_KEY2,
    endpoint: "https://sb-openapi.zalopay.vn/v2/create",
    redirectUrl: "snakeup://zalopay/callback", 
    callbackUrl: process.env.API_URL + '/api/zalopay/callback'
};

module.exports = {
    createPayment: async (req, res) => {
        try {
            console.log("========= ZALOPAY REQUEST DEBUG =========");
            console.log("Request body:", req.body);

            const { amount, orderId, orderInfo } = req.body;

            // Test URL construction
            // const redirectUrl = `${zalopayConfig.redirectUrl}?status=1&amount=${amount}&order_id=${orderId}`;
            // redirect_url: `${zalopayConfig.redirectUrl}?order_id=${orderId}&amount=${amount}`
          const  redirectUrl= `${zalopayConfig.redirectUrl}?status=1&order_id=${orderId}&amount=${amount}`


            console.log("Constructed redirect URL:", redirectUrl);

            const embed_data = JSON.stringify({
                "redirecturl": zalopayConfig.redirectUrl,
                "promotioninfo": [],
                "merchantinfo": "embeddata123",
                "appid": zalopayConfig.app_id
            });

            const items = JSON.stringify([{
                "itemid": "knb",
                "itemname": "Payment for order",
                "itemprice": amount,
                "itemquantity": 1
            }]);

            const transID = Math.floor(Math.random() * 1000000);
            const appTransId = `${moment().format('YYMMDD')}_${transID}`; // Tạo app_trans_id 

            // Tạo order trước khi tính mac
            const order = {
                app_id: parseInt(zalopayConfig.app_id),
                app_trans_id: appTransId,
                app_user: "demo",
                app_time: Date.now(),
                item: items,
                embed_data: embed_data,
                amount: parseInt(amount),
                description: orderInfo,
                bank_code: "zalopayapp", // Thêm bank_code để bắt buộc mở app ZaloPay
                callback_url: zalopayConfig.callbackUrl,
                redirect_url: zalopayConfig.redirectUrl + "?status=1"  // Thêm status vào URL
            };

            // Tạo chữ ký
            const data = order.app_id + "|" + order.app_trans_id + "|" + order.app_user + "|" +
                order.amount + "|" + order.app_time + "|" + order.embed_data + "|" + order.item;

            // Thêm mac vào order sau khi đã tính
            order.mac = crypto.createHmac('sha256', zalopayConfig.key1)
                .update(data)
                .digest('hex');

            console.log("Sending ZaloPay request:", order);
            console.log("Redirect URL:", order.redirect_url);

            const response = await fetch(zalopayConfig.endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(order)
            });

            const responseData = await response.json();
            console.log("ZaloPay response:", responseData);

            console.log("ZaloPay aaaaaaaaa:", responseData.return_code);


            if (responseData.return_code === 1) {
                console.log("Success response URL:", responseData.order_url);
                res.json({
                    status: 200,
                    message: "Tạo đơn thanh toán thành công",
                    data: {
                        payUrl: responseData.order_url,
                        orderId: orderId,
                        transId: order.app_trans_id,
                        amount: amount,
                        qr_code: responseData.qr_code,
                        redirect_url: order.redirect_url
                    }
                });
            } else {
                throw new Error(responseData.return_message);
            }

        } catch (error) {
            console.error("ZaloPay payment error:", error);
            res.status(500).json({
                status: 500,
                message: "Lỗi khi tạo thanh toán",
                error: error.message
            });
        }
    },

    handleCallback: async (req, res) => {
        try {
            const {
                app_id,
                app_trans_id,
                zp_trans_id,
                amount,
                server_time,
                channel,
                merchant_user_id,
                user_fee_amount,
                discount_amount,
                status
            } = req.body;

            // Verify callback data
            const data = app_id + "|" + app_trans_id + "|" + zp_trans_id + "|" + amount + "|" + server_time + "|" + channel + "|" + merchant_user_id + "|" + user_fee_amount + "|" + discount_amount;
            const requestMac = req.body.mac;
            const mac = crypto.createHmac('sha256', zalopayConfig.key2)
                .update(data)
                .digest('hex');

            if (requestMac !== mac) {
                return res.status(403).json({
                    return_code: -1,
                    return_message: "MAC not match"
                });
            }

            // Trả về success ngay lập tức để ZaloPay không gọi lại
            res.json({ return_code: 1, return_message: "success" });

            // Xử lý cập nhật đơn hàng bất đồng bộ
            if (status === 1) {
                // Cập nhật trạng thái đơn hàng và tạo payment history
                await Order.findByIdAndUpdate(orderId, {
                    status: 'confirmed',
                    payment_status: 'paid',
                    zalopay_trans_id: zp_trans_id
                });

                await PaymentHistory.create({
                    order_id: orderId,
                    amount: amount,
                    payment_method: 'ZALOPAY',
                    transaction_id: zp_trans_id,
                    status: 'completed'
                });
            }

        } catch (error) {
            console.error("Error handling ZaloPay callback:", error);
            // Vẫn trả về success để ZaloPay không gọi lại
            res.json({ return_code: 1, return_message: "success" });
        }
    }
};


