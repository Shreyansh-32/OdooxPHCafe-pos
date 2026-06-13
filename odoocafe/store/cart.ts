import { create } from "zustand";

export type CartItem = {
  productId: string;
  name: string;
  price: number;
  taxRate: number;
  quantity: number;
  notes?: string;
};

type CartState = {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "quantity">) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  setNotes: (productId: string, notes: string) => void;
  clearCart: () => void;
  subtotal: () => number;
  taxTotal: () => number;
  grandTotal: () => number;
  totalItems: () => number;
};

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  addItem: (item) =>
    set((state) => {
      const existing = state.items.find((current) => current.productId === item.productId);
      if (existing) {
        return {
          items: state.items.map((current) =>
            current.productId === item.productId
              ? { ...current, quantity: current.quantity + 1 }
              : current
          ),
        };
      }
      return { items: [...state.items, { ...item, quantity: 1 }] };
    }),
  removeItem: (productId) =>
    set((state) => ({
      items: state.items.filter((item) => item.productId !== productId),
    })),
  updateQuantity: (productId, quantity) =>
    set((state) => ({
      items:
        quantity <= 0
          ? state.items.filter((item) => item.productId !== productId)
          : state.items.map((item) =>
              item.productId === productId ? { ...item, quantity } : item
            ),
    })),
  setNotes: (productId, notes) =>
    set((state) => ({
      items: state.items.map((item) =>
        item.productId === productId ? { ...item, notes } : item
      ),
    })),
  clearCart: () => set({ items: [] }),
  subtotal: () => get().items.reduce((sum, item) => sum + item.price * item.quantity, 0),
  taxTotal: () =>
    get().items.reduce((sum, item) => sum + item.price * item.quantity * item.taxRate, 0),
  grandTotal: () => get().subtotal() + get().taxTotal(),
  totalItems: () => get().items.reduce((sum, item) => sum + item.quantity, 0),
}));
