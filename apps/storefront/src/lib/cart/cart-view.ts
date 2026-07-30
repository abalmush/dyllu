export type CartViewItem = {
  id: string;
  variantId: string;
  productHandle: string;
  title: string;
  variantTitle?: string;
  thumbnail?: string;
  quantity: number;
  total: number;
};

export type CartView = {
  id: string;
  currencyCode: string;
  itemTotal: number;
  subtotal: number;
  totalQuantity: number;
  items: CartViewItem[];
};
