// const OpenAI = require('openai');
// const Shoes = require('../models/shoes.model');
// const ShoesVariant = require('../models/shoes_variant.model'); // Thêm dòng này
// require('dotenv').config();

// const openai = new OpenAI({
//   apiKey: process.env.OPENAI_API_KEY
// });

// exports.suggestProducts = async (req, res) => {
//   try {
//     const { message } = req.body;

//     // 1. Lấy danh sách sản phẩm từ database với variants
//     const shoes = await Shoes.find({ status: { $ne: 'hidden' } }) // Chỉ lấy sản phẩm không ẩn
//       .populate('brand_id')
//       .populate('category_id');

//     const shoesWithVariants = await Promise.all(shoes.map(async (shoe) => {
//       const variants = await ShoesVariant.find({ 
//         shoes_id: shoe._id,
//         status: 'available',  // Chỉ lấy variant còn hàng
//         quantity_in_stock: { $gt: 0 } // Số lượng còn > 0
//       })
//         .populate('size_id')
//         .populate('color_id');

//       // Nếu không có variants hợp lệ, bỏ qua sản phẩm này
//       if (variants.length === 0) return null;

//       // Tính giá min/max từ các variants có sẵn
//       const prices = variants.map(v => v.price);
//       const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
//       const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;

//       return {
//         id: shoe._id,
//         name: shoe.name,
//         description: shoe.description,
//         brand: shoe.brand_id?.name,
//         category: shoe.category_id?.name,
//         image: shoe.media?.[0]?.url || '',
//         priceRange: `${minPrice.toLocaleString('vi-VN')} - ${maxPrice.toLocaleString('vi-VN')} VND`,
//         variants: variants.map(v => ({
//           color: v.color_id?.name,
//           size: v.size_id?.size_value,
//           price: v.price.toLocaleString('vi-VN') + ' VND',
//           stock: v.quantity_in_stock
//         }))
//       };
//     }));

//     // Lọc bỏ các sản phẩm null (không có variants hợp lệ)
//     const validProducts = shoesWithVariants.filter(product => product !== null);

//     // 2. Tạo prompt chi tiết cho AI
//     const productInfo = validProducts.map(shoe => `
//       Sản phẩm: ${shoe.name}
//       Thương hiệu: ${shoe.brand}
//       Danh mục: ${shoe.category}
//       Mô tả: ${shoe.description}
//       Giá: ${shoe.priceRange}
//       Biến thể có sẵn: ${shoe.variants.map(v => 
//         `${v.color} - Size ${v.size} (${v.price}, còn ${v.stock} sản phẩm)`
//       ).join(', ')}
//     `).join('\n\n');

//     const prompt = `
//     Bạn là một trợ lý bán hàng chuyên nghiệp tại cửa hàng giày. Dưới đây là danh sách sản phẩm còn hàng của chúng tôi:

//     ${productInfo}

//     Khách hàng hỏi: "${message}"

//     Hãy gợi ý 3 sản phẩm phù hợp nhất và giải thích lý do chọn chúng. 
//     Trả lời một cách chuyên nghiệp, ngắn gọn và thuyết phục.
//     Nhấn mạnh vào các ưu điểm phù hợp với nhu cầu của khách hàng.
//     Đề cập đến giá cả, thương hiệu và các biến thể còn hàng.
//     Nếu không có sản phẩm phù hợp, hãy thông báo cho khách hàng một cách lịch sự.
//     `;

//     // 3. Gọi API ChatGPT
//     const completion = await openai.chat.completions.create({
//       model: "gpt-3.5-turbo",
//       messages: [
//         { 
//           role: "system", 
//           content: "Bạn là một trợ lý bán hàng chuyên nghiệp, giàu kinh nghiệm về giày dép. Hãy giao tiếp một cách thân thiện, chuyên nghiệp và đưa ra những gợi ý phù hợp nhất cho khách hàng."
//         },
//         { 
//           role: "user", 
//           content: prompt 
//         }
//       ],
//       temperature: 0.7,
//       max_tokens: 800
//     });

//     // 4. Trả về kết quả
//     res.json({
//       success: true, 
//       suggestions: completion.choices[0].message.content
//     });

//   } catch (error) {
//     console.error("AI Suggestion Error:", error);
//     res.status(500).json({
//       success: false,
//       message: "Lỗi khi gợi ý sản phẩm",
//       error: error.message 
//     });
//   }
// };


const { GoogleGenerativeAI } = require('@google/generative-ai');
const Shoes = require('../models/shoes.model');
const ShoesVariant = require('../models/shoes_variant.model');
require('dotenv').config();
const ChatLog = require('../models/chat_log.model');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

exports.suggestProducts = async (req, res) => {
    try {
        const { message, user_id } = req.body;

        // 1. Lấy toàn bộ sản phẩm và biến thể hợp lệ
        const shoes = await Shoes.find({ status: { $ne: 'hidden' } })
            .populate('brand_id')
            .populate('category_id');

        const shoesWithVariants = await Promise.all(
            shoes.map(async (shoe) => {
                const variants = await ShoesVariant.find({
                    shoes_id: shoe._id,
                    status: 'available',
                    quantity_in_stock: { $gt: 0 },
                },)
                    .populate('size_id')
                    .populate('color_id');

                if (variants.length === 0) return null;

                const prices = variants.map((v) => v.price);
                const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
                const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;

                return {
                    id: shoe._id,
                    name: shoe.name,
                    description: shoe.description,
                    brand: shoe.brand_id?.name,
                    category: shoe.category_id?.name,
                    image: shoe.media?.[0]?.url || '',
                    priceRange: `${minPrice.toLocaleString('vi-VN')} - ${maxPrice.toLocaleString('vi-VN')} đ`,
                    variants: variants.map((v) => ({
                        color: v.color_id?.name,
                        size: v.size_id?.size_value,
                        price: v.price.toLocaleString('vi-VN') + ' đ',
                        stock: v.quantity_in_stock,
                    })),
                };
            })
        );

        const validProducts = shoesWithVariants.filter((p) => p !== null);

        // 2. Tạo prompt cho Gemini có yêu cầu TRẢ VỀ DANH SÁCH ID hoặc tên sản phẩm
        const productInfo = validProducts
            .map((shoe, index) => `
                #${index + 1}:
                ID: ${shoe.id}
                Tên: ${shoe.name}
                Thương hiệu: ${shoe.brand}
                Danh mục: ${shoe.category}
                Mô tả: ${shoe.description}
                Giá: ${shoe.priceRange}
                Biến thể: ${shoe.variants.map(v => `${v.color} - Size ${v.size} (${v.price})`).join(', ')}
                `)
            .join('\n\n');

        const prompt = `
            Bạn là một trợ lý bán hàng chuyên nghiệp tại cửa hàng giày. Dưới đây là danh sách sản phẩm còn hàng:

            ${productInfo}

            Khách hàng hỏi: "${message}"

            👉 Hãy trả lời như sau:
            1. Viết phần mở đầu gợi ý 3 sản phẩm phù hợp và lý do.
                - Chỉ sử dụng Tên, Thương hiệu, Danh mục, Mô tả, Giá, Biến thể (viết ngắn gọn không cần chi tiết quá, phần liệt kê có thể sử dụng -).
                - KHÔNG được viết ID trong phần trả lời này.
                - Không được sử dụng ký tự Markdown (ví dụ: **, __, #, *).
                - Trả lời chỉ bằng văn bản thuần túy.
            2. Cuối cùng, trả về danh sách 3 ID sản phẩm được chọn, (phải trả về ít nhất 1 ID)
            dưới dạng JSON như sau:
            {"selected_product_ids": ["id1", "id2", "id3"]}
            `;

        // 3. Gọi Gemini
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const fullText = response.text();
        console.log('Gemini Response:', JSON.stringify(fullText, null, 2));

        // 4. Parse JSON cuối trong text (ID của 3 sản phẩm được chọn)
        const match = fullText.match(/\{[\s\S]*"selected_product_ids"[\s\S]*?\}/);
        let selectedIds = [];

        if (match) {
            const jsonPart = JSON.parse(match[0]);
            selectedIds = jsonPart.selected_product_ids || [];
        }

        // 5. Lấy lại thông tin chi tiết 3 sản phẩm được chọn
        const selectedProducts = validProducts.filter((p) =>
            selectedIds.includes(p.id.toString())
        );

        // Lưu chat log
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

        // 6. Trả về
        res.json({
            status: 200,
            message: 'Gợi ý sản phẩm thành công',
            data: {
                chat_id: chatLog._id,
                suggestions: fullText,
                products: selectedProducts
            }

        });
    }
    catch (error) {
        console.error('AI Suggestion Error:', error);

        if (error.response?.status === 429) {
            // Hết quota
            return res.status(429).json({
                status: 429,
                message: "Bạn đã vượt quá giới hạn gọi API AI hôm nay. Vui lòng thử lại sau hoặc nâng cấp gói!"
            });
        }

        // Nếu model AI quá tải (503)
        if (error.status === 503 || error.message?.includes('503')) {
            return res.status(503).json({
                status: 503,
                message: 'Dịch vụ AI đang quá tải. Vui lòng thử lại sau.',
            });
        }

        res.status(500).json({
            status: 500,
            message: 'AI error',
            error: error.message
        });
    }

};

// Lấy lịch sử chat của user
exports.getChatHistory = async (req, res) => {
    try {
        const { user_id } = req.params;
        const { page = 1, limit = 10 } = req.query;

        const chats = await ChatLog.find({
            user_id,
            is_deleted: false
        })
            .sort({ created_at: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .populate({
                path: 'selected_products.product_id',   // populate product_id
                populate: {
                    path: 'brand_id',                   // populate brand_id trong product
                    select: 'name',                // chọn field cần thiết (nếu muốn)
                }
            });

        const total = await ChatLog.countDocuments({
            user_id,
            is_deleted: false
        });

        res.json({
            success: true,
            data: {
                chats,
                pagination: {
                    total,
                    page: parseInt(page),
                    total_pages: Math.ceil(total / limit)
                }
            }
        });

    } catch (error) {
        console.error('Error getting chat history:', error);
        res.status(500).json({
            success: false,
            message: 'Error getting chat history',
            error: error.message
        });
    }
};

// Xóa một chat
exports.deleteChat = async (req, res) => {
    try {
        const { chat_id } = req.params;

        const chat = await ChatLog.findById(chat_id);
        if (!chat) {
            return res.status(404).json({
                success: false,
                message: 'Chat not found'
            });
        }

        chat.is_deleted = true;
        await chat.save();

        res.json({
            success: true,
            message: 'Chat deleted successfully'
        });

    } catch (error) {
        console.error('Error deleting chat:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting chat',
            error: error.message
        });
    }
};

// Xóa tất cả chat của user
exports.deleteAllChats = async (req, res) => {
    try {
        const { user_id } = req.params;

        await ChatLog.updateMany(
            { user_id },
            { $set: { is_deleted: true } }
        );

        res.json({
            success: true,
            message: 'All chats deleted successfully'
        });

    } catch (error) {
        console.error('Error deleting all chats:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting all chats',
            error: error.message
        });
    }
};
