const crypto = require('crypto');
require('dotenv').config();

const momoConfig = {
    partnerCode: process.env.MOMO_PARTNER_CODE,
    accessKey: process.env.MOMO_ACCESS_KEY,
    secretKey: process.env.MOMO_SECRET_KEY,
    redirectUrl: process.env.FRONTEND_URL + '/payment/result', // Sửa URL redirect
    ipnUrl: process.env.API_URL + '/api/momo/callback', // Sửa URL callback
    // apiEndpoint: 'https://test-payment.momo.vn/v2/gateway/api/create'
    apiEndpoint: process.env.ENDPOINT_URL
};

module.exports = {
    createPayment: async (req, res) => {
        try {
            // Validate request body
            if (!req.body.amount || !req.body.orderId || !req.body.orderInfo || !req.body.paymentMethod) {
                return res.status(400).json({
                    status: 400,
                    message: "Missing required fields",
                    requiredFields: {
                        amount: "number",
                        orderId: "string",
                        orderInfo: "string",
                        paymentMethod: "string (momo_wallet/atm/credit)" // Add payment method validation
                    }
                });
            }

            const { amount, orderId, orderInfo, paymentMethod } = req.body;

            // Validate amount
            if (isNaN(amount) || amount <= 0) {
                return res.status(400).json({
                    status: 400,
                    message: "Invalid amount"
                });
            }

            // Validate payment method
            const validPaymentMethods = ['momo_wallet', 'atm', 'credit'];
            if (!validPaymentMethods.includes(paymentMethod)) {
                return res.status(400).json({
                    status: 400,
                    message: "Invalid payment method",
                    validMethods: validPaymentMethods
                });
            }

            // Map payment method to MoMo requestType
            const requestType = {
                momo_wallet: "captureWallet",
                atm: "payWithATM",
                credit: "captureWallet" // MoMo uses same type for credit cards
            }[paymentMethod];

            // Tạo requestId ngẫu nhiên
            const requestId = `${momoConfig.partnerCode}-${Date.now()}`;

            // Chuẩn bị dữ liệu cho MoMo với payment method
            const rawSignature = "accessKey=" + momoConfig.accessKey +
                "&amount=" + amount +
                "&extraData=" +
                "&ipnUrl=" + momoConfig.ipnUrl +
                "&orderId=" + orderId +
                "&orderInfo=" + orderInfo +
                "&partnerCode=" + momoConfig.partnerCode +
                "&redirectUrl=" + momoConfig.redirectUrl +
                "&requestId=" + requestId +
                "&requestType=" + requestType;

            console.log("Raw signature:", rawSignature);

            // Tạo chữ ký
            const signature = crypto.createHmac('sha256', momoConfig.secretKey)
                .update(rawSignature)
                .digest('hex');

            // Tạo payload gửi đến MoMo
            const requestBody = {
                partnerCode: momoConfig.partnerCode,
                partnerName: "SnakeUp Store",
                storeId: "SnakeUpStore",
                requestId: requestId,
                amount: amount,
                orderId: orderId,
                orderInfo: orderInfo,
                redirectUrl: momoConfig.redirectUrl,
                ipnUrl: momoConfig.ipnUrl,
                lang: "vi",
                requestType: requestType,
                autoCapture: true,
                extraData: "",
                orderGroupId: "",
                signature: signature
            };

            // Add payment method specific fields
            if (paymentMethod === 'credit') {
                requestBody.paymentCode = "VISA";
            }

            console.log("Request body:", JSON.stringify(requestBody, null, 2));

            // Gửi request đến MoMo
            const response = await fetch(momoConfig.apiEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody)
            });

            const responseData = await response.json();
            console.log("MoMo response:", responseData);

            if (responseData.resultCode === 0) {
                res.json({
                    status: 200,
                    message: "Tạo đơn thanh toán thành công",
                    data: {
                        payUrl: responseData.payUrl,
                        orderId: orderId,
                        requestId: requestId,
                        amount: amount,
                        paymentMethod: paymentMethod
                    }
                });
            } else {
                throw new Error(responseData.message || "MoMo payment creation failed");
            }

        } catch (error) {
            console.error("Error creating MoMo payment:", error);
            res.status(500).json({
                status: 500,
                message: "Lỗi khi tạo thanh toán",
                error: error.message
            });
        }
    },

    handleCallback: async (req, res) => {
        try {
            console.log("Received callback data:", req.body);

            const {
                partnerCode,
                orderId,
                requestId,
                amount,
                orderInfo,
                orderType,
                transId,
                resultCode,
                message,
                payType,
                responseTime,
                extraData,
                signature
            } = req.body;

            if (resultCode === 0) {
                res.status(200).json({
                    status: 200,
                    message: "Thanh toán thành công",
                    data: {
                        orderId,
                        transId,
                        amount
                    }
                });
            } else {
                res.status(400).json({
                    status: 400,
                    message: "Thanh toán thất bại",
                    error: message
                });
            }

        } catch (error) {
            console.error("Error handling MoMo callback:", error);
            res.status(500).json({
                status: 500,
                message: "Lỗi xử lý callback",
                error: error.message
            });
        }
    }
};