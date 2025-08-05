const { GoogleGenerativeAI } = require('@google/generative-ai');
const Shoes = require('../models/shoes.model');
const ShoesVariant = require('../models/shoes_variant.model');
const ChatLog = require('../models/chat_log.model');
const mongoose = require('mongoose');
require('dotenv').config();

const openRouterAPI = require('../config/openrouter');
const model = 'mistralai/mixtral-8x7b-instruct';

exports.suggestProducts = async (req, res) => {
    try {
        const { message, user_id } = req.body;

        // 1. Lấy sản phẩm hợp lệ
        const shoes = await Shoes.find({ status: { $ne: 'hidden' } })
            .populate('brand_id')
            .populate('category_id');

        const shoesWithVariants = await Promise.all(
            shoes.map(async (shoe) => {
                const variants = await ShoesVariant.find({
                    shoes_id: shoe._id,
                    status: 'available',
                    quantity_in_stock: { $gt: 0 },
                })
                    .populate('size_id')
                    .populate('color_id');

                if (variants.length === 0) return null;

                const prices = variants.map(v => v.price);
                const minPrice = Math.min(...prices);
                const maxPrice = Math.max(...prices);

                return {
                    id: shoe._id.toString(), // Ép kiểu rõ ràng
                    name: shoe.name,
                    description: shoe.description,
                    brand: shoe.brand_id?.name,
                    category: shoe.category_id?.name,
                    image: shoe.media?.[0]?.url || '',
                    priceRange: `${minPrice.toLocaleString('vi-VN')} - ${maxPrice.toLocaleString('vi-VN')} VND`,
                    variants: variants.map(v => ({
                        color: v.color_id?.name,
                        size: v.size_id?.size_value,
                        price: `${v.price.toLocaleString('vi-VN')} VND`,
                        stock: v.quantity_in_stock
                    }))
                };
            })
        );

        const validProducts = shoesWithVariants.filter(p => p !== null);

        // 2. Tạo prompt
        const productInfo = validProducts.map((shoe, i) => `
#${i + 1}:
ID: ${shoe.id}
Tên: ${shoe.name}
Thương hiệu: ${shoe.brand}
Danh mục: ${shoe.category}
Mô tả: ${shoe.description}
Giá: ${shoe.priceRange}
Biến thể: ${shoe.variants.map(v => `${v.color} - Size ${v.size} (${v.price})`).join(', ')}
        `).join('\n\n');

        const prompt = `
Bạn là một trợ lý bán giày chuyên nghiệp. Dưới đây là danh sách sản phẩm:

${productInfo}

Khách hàng hỏi: "${message}"

👉 Gợi ý 3 sản phẩm phù hợp và lý do. Cuối cùng, trả về JSON dạng:
{"selected_product_ids": ["id1", "id2", "id3"]}
        `;

        // 3. Gọi AI
        const response = await openRouterAPI.post('/chat/completions', {
            model,
            messages: [
                { role: 'system', content: 'Bạn là trợ lý bán hàng chuyên nghiệp.' },
                { role: 'user', content: prompt }
            ]
        });

        const fullText = response.data.choices[0].message.content;

        // 4. Parse JSON ID
        const match = fullText.match(/\{[\s\S]*"selected_product_ids"[\s\S]*?\}/);
        let selectedIds = [];

        if (match) {
            try {
                const parsed = JSON.parse(match[0].replace(/\\n/g, ''));
                selectedIds = parsed.selected_product_ids || [];
            } catch (e) {
                console.error('❌ JSON parse error from AI output:', e.message);
            }
        }

        const selectedIdsStr = selectedIds.map(id => id.toString());

        // 5. Tìm sản phẩm theo ID
        const selectedProducts = validProducts.filter(p =>
            selectedIdsStr.includes(p.id.toString())
        );

        console.log('🧠 AI selected IDs:', selectedIdsStr);
        console.log('✅ Matched products:', selectedProducts.length);

        // 6. Lưu lịch sử
        const chatLog = new ChatLog({
            user_id,
            message,
            ai_response: fullText,
            selected_products: selectedProducts.map(p => ({
                product_id: p.id,
                name: p.name,
                image: p.image,
                price_range: p.priceRange
            }))
        });
        await chatLog.save();

        res.json({
            status: 200,
            message: 'Gợi ý sản phẩm thành công',
            data: {
                chat_id: chatLog._id,
                suggestions: fullText,
                products: selectedProducts
            }
        });

    } catch (error) {
        console.error('🔥 AI Suggestion Error:', error);

        if (error.status === 503 || error.message?.includes('503')) {
            return res.status(503).json({
                status: 503,
                message: 'Dịch vụ AI quá tải. Vui lòng thử lại sau.',
            });
        }

        res.status(500).json({
            status: 500,
            message: 'Lỗi máy chủ AI',
            error: error.message
        });
    }
};
