import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface CartItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  notes?: string;
  imageUrl?: string | null;
  taxRate: number;
}

interface CartState {
  items: CartItem[];
  tableId: string | null;
  orderId: string | null; // Set after order is created

  // Actions
  addItem: (item: Omit<CartItem, "quantity">) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  updateNotes: (productId: string, notes: string) => void;
  clearCart: () => void;
  setTableId: (tableId: string) => void;
  setOrderId: (orderId: string | null) => void;

  // Computed
  totalItems: () => number;
  subtotal: () => number;
  taxTotal: () => number;
  grandTotal: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      tableId: null,
      orderId: null,

      addItem: (item) => {
        set((state) => {
          const existing = state.items.find(
            (i) => i.productId === item.productId
          );
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.productId === item.productId
                  ? { ...i, quantity: i.quantity + 1 }
                  : i
              ),
            };
          }
          return {
            items: [...state.items, { ...item, quantity: 1 }],
          };
        });
      },

      removeItem: (productId) => {
        set((state) => ({
          items: state.items.filter((i) => i.productId !== productId),
        }));
      },

      updateQuantity: (productId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(productId);
          return;
        }
        set((state) => ({
          items: state.items.map((i) =>
            i.productId === productId ? { ...i, quantity } : i
          ),
        }));
      },

      updateNotes: (productId, notes) => {
        set((state) => ({
          items: state.items.map((i) =>
            i.productId === productId ? { ...i, notes } : i
          ),
        }));
      },

      clearCart: () => {
        set({ items: [], orderId: null });
      },

      setTableId: (tableId) => set({ tableId }),
      setOrderId: (orderId) => set({ orderId }),

      totalItems: () => {
        return get().items.reduce((sum, i) => sum + i.quantity, 0);
      },

      subtotal: () => {
        return get().items.reduce(
          (sum, i) => sum + i.price * i.quantity,
          0
        );
      },

      taxTotal: () => {
        return get().items.reduce(
          (sum, i) => sum + i.price * i.quantity * (i.taxRate / 100),
          0
        );
      },

      grandTotal: () => {
        const state = get();
        return state.subtotal() + state.taxTotal();
      },
    }),
    {
      name: "cafepos-cart",
      partialize: (state) => ({
        items: state.items,
        tableId: state.tableId,
        orderId: state.orderId,
      }),
    }
  )
);
