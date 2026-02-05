
export enum GroupType {
  KIDO = 'KIDO',
  UNICHARM = 'UNICHARM',
  COLGATE = 'COLGATE',
  KIOTVIET_NPP = 'KIOTVIET_NPP'
}

export interface ImportItem {
  orderId: string;
  customerName: string;
  itemCode: string;
  itemName: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  amount: number;
  discountRate: number;
  discountAmount: number;
  afterDiscountAmount: number; // Thành tiền (sau KM) của từng dòng
  totalPayment: number; // Tổng thanh toán cuối phiếu (Footer)
}

export interface BasicUnitMap {
  [itemCode: string]: {
    itemName: string;
    basicUnit: string;
    groupName?: string;
  };
}

export interface ImportResult {
  group: GroupType;
  items: ImportItem[];
  metadata: {
    processedDate: string;
    totalAmount: number;
  };
}
