"use client";

import { useCart } from "../context/CartContext";
import { FaShoppingCart } from "react-icons/fa";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function FloatingCartButton() {
  const { cartItems } = useCart();
  const pathname = usePathname();

  // Hide button if cart is empty OR we are on the cart page OR checkout page
  if (cartItems.length === 0 || pathname === '/cart' || pathname === '/checkout') return null;

  return (
    <Link
      href="/cart"
      className="fixed bottom-6 right-6 bg-[#C0934B] text-white p-4 rounded-full shadow-lg hover:bg-[#a37c3f] transition-all z-50 flex items-center justify-center group"
    >
      <div className="relative">
        <FaShoppingCart className="w-6 h-6" />
        <span className="absolute -top-3 -right-3 bg-red-500 text-white text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full">
          {cartItems.length}
        </span>
      </div>
    </Link>
  );
}
