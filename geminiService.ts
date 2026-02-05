
import { GoogleGenAI, Type } from "@google/genai";
import { GroupType, ImportItem } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const RESPONSE_SCHEMA = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      orderId: { type: Type.STRING, description: "Số đơn hàng" },
      customerName: { type: Type.STRING, description: "Tên khách hàng" },
      itemCode: { type: Type.STRING, description: "Mã hàng" },
      itemName: { type: Type.STRING, description: "Tên hàng" },
      quantity: { type: Type.NUMBER, description: "Số lượng" },
      unit: { type: Type.STRING, description: "Đơn vị tính" },
      unitPrice: { type: Type.NUMBER, description: "Đơn giá" },
      amount: { type: Type.NUMBER, description: "Thành tiền trước KM" },
      discountRate: { type: Type.NUMBER, description: "Tỷ lệ CK (%)" },
      discountAmount: { type: Type.NUMBER, description: "Tiền chiết khấu" },
      afterDiscountAmount: { type: Type.NUMBER, description: "Thành tiền sau KM thực tế" },
      totalPayment: { type: Type.NUMBER, description: "Tổng tiền thanh toán đơn" },
      hasWarning: { type: Type.BOOLEAN, description: "True nếu tên hàng chứa 'ontop', 'Vipshop', 'trả thưởng' hoặc logic giá bất thường" },
      warningMessage: { type: Type.STRING, description: "Mô tả loại dữ liệu lạ (Ví dụ: Hàng Vipshop, Chương trình On-top, Trả thưởng khuyến mại)" }
    },
    required: ["orderId", "customerName", "itemCode", "itemName", "quantity", "unit", "unitPrice", "amount", "discountRate", "discountAmount", "afterDiscountAmount", "totalPayment"],
  }
};

export const processImportData = async (
  fileBase64: string,
  mimeType: string,
  group: GroupType
): Promise<ImportItem[]> => {
  const systemInstructions = `
    Bạn là "MISA AMIS IMPORT PRO" (V9.0 FINAL) - Hệ thống ETL AI siêu cấp.
    
    NHIỆM VỤ CỐT LÕI:
    1. Trích xuất chính xác 100% dữ liệu từ ảnh/pdf.
    2. NHẬN DIỆN DỮ LIỆU LẠ: Kiểm tra Tên Hàng/Diễn giải. Nếu chứa các từ khóa: "ontop", "Vipshop", "trả thưởng", "khuyến mại đặc biệt", phải set hasWarning = true và ghi rõ warningMessage.
    
    QUY TẮC PHÂN TÍCH THEO NHÓM - ${group}:
    - KIDO: Làm sạch mã [58xxxx]. Phân loại ĐVT Thùng/Lẻ dựa trên quy cách.
    - UNICHARM: Tự động sửa lỗi OCR dính số bằng phép tính (Thành tiền / Số lượng).
    - COLGATE: Giữ nguyên Mã Hàng Tặng (Đơn giá 0).
    - KIOTVIET_NPP: Xóa bỏ hậu tố -TH, -th khỏi mã hàng.
    
    XỬ LÝ SỐ LIỆU:
    - Nếu có dòng "trả thưởng", kiểm tra xem giá có phải 0 không.
    - Nếu là hàng "Vipshop", đánh dấu để kế toán kiểm tra lại giá đặc thù.
    
    Trả về JSON theo schema quy định.
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: [
      {
        parts: [
          { inlineData: { data: fileBase64, mimeType: mimeType } },
          { text: `Tiến hành ETL Final V9 cho nhóm ${group}. Chú ý các dòng dữ liệu lạ.` }
        ]
      }
    ],
    config: {
      systemInstruction: systemInstructions,
      responseMimeType: "application/json",
      responseSchema: RESPONSE_SCHEMA,
      temperature: 0.1 // Giảm sáng tạo để tăng độ chính xác số liệu
    }
  });

  const text = response.text;
  if (!text) throw new Error("AI không phản hồi.");
  
  try {
    return JSON.parse(text);
  } catch (e) {
    throw new Error("Lỗi cấu trúc dữ liệu JSON từ AI.");
  }
};
