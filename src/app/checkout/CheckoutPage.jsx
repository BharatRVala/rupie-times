"use client";

import { useState } from "react";
import Image from "next/image";
import { FaTrash } from "react-icons/fa"; // Added import
import { useCart } from "../context/CartContext";

export default function CheckoutPage() {
  const { cartItems, removeFromCart } = useCart(); // Added removeFromCart
  const [paymentMethod, setPaymentMethod] = useState("card"); // 'card' or 'upi'

  // Calculate totals
  const subtotal = cartItems.reduce((sum, item) => sum + item.price, 0);
  const discount = 0;
  const gst = subtotal * 0.18;
  const total = subtotal - discount + gst;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-4xl font-bold text-black mb-12">Checkout</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* Left Column: Payment Details (2/3 width) */}
        <div className="lg:col-span-2 backdrop-blur supports-[backdrop-filter]:bg-white/10 bg-white/10 p-8 rounded-[20px] border border-gray-200 h-fit">
          {/* Payment Method Toggle */}
          <div className="flex bg-[#C0934B] rounded-full p-1 mb-8">
            <button
              onClick={() => setPaymentMethod("card")}
              className={`flex-1 py-3 rounded-full font-bold transition-all ${paymentMethod === "card"
                ? "bg-white text-black shadow-sm"
                : "text-white hover:bg-[#a37c3f]"
                }`}
            >
              Pay by Card
            </button>
            <button
              onClick={() => setPaymentMethod("upi")}
              className={`flex-1 py-3 rounded-full font-bold transition-all ${paymentMethod === "upi"
                ? "bg-white text-black shadow-sm"
                : "text-white hover:bg-[#a37c3f]"
                }`}
            >
              Pay With Upi
            </button>
          </div>

          {/* Payment Forms */}
          <div className="space-y-6">
            {paymentMethod === "card" ? (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email address</label>
                  <input
                    type="email"
                    placeholder="Enter your email address"
                    className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-[#C0934B] focus:border-[#C0934B]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cardholder name</label>
                  <input
                    type="text"
                    placeholder="Enter your cardholder name"
                    className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-[#C0934B] focus:border-[#C0934B]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Card Number</label>
                  <input
                    type="text"
                    placeholder="Enter your card number"
                    className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-[#C0934B] focus:border-[#C0934B]"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Expiration Date</label>
                    <input
                      type="text"
                      placeholder="mm/yyyy"
                      className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-[#C0934B] focus:border-[#C0934B]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Security Code</label>
                    <input
                      type="text"
                      placeholder="cvc"
                      className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-[#C0934B] focus:border-[#C0934B]"
                    />
                  </div>
                </div>
              </>
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">UPI ID</label>
                <input
                  type="text"
                  placeholder="Enter your UPI ID (e.g., name@upi)"
                  className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-[#C0934B] focus:border-[#C0934B]"
                />
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Order Summary (1/3 width) */}
        <div className=" backdrop-blur supports-[backdrop-filter]:bg-white/10 bg-white/10 p-8 rounded-[20px] border border-gray-200 h-fit">
          <h2 className="text-xl font-bold text-black mb-6">Order Summary</h2>

          {/* Item List */}
          <div className="space-y-6 mb-8">
            {cartItems.map((item, index) => (
              <div key={`${item.id}-${index}`} className="flex gap-4">
                <div className="relative w-16 h-12 bg-gray-200 rounded-md overflow-hidden flex-shrink-0">
                  <Image
                    src={item.image}
                    alt={item.title}
                    fill
                    className="object-cover"
                  />
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <h3 className="font-bold text-black text-sm">{item.title}</h3>
                    <span className="font-bold text-black text-sm">₹ {item.price}</span>
                  </div>
                  <div className="flex justify-between items-center mt-1">
                    <p className="text-xs text-gray-600">{item.duration}</p>
                    <button
                      onClick={() => removeFromCart(index)}
                      className="text-gray-400 hover:text-[#C0934B] transition-colors"
                      title="Remove item"
                    >
                      <FaTrash className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Promo Code */}
          <div className="flex flex-col sm:flex-row gap-2 mb-8">
            <input
              type="text"
              placeholder="Enter your promo code"
              className="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-[#C0934B] focus:border-[#C0934B]"
            />
            <button className="bg-[#C0934B] text-white px-6 py-2 rounded-full font-bold hover:bg-[#a37c3f] transition-colors whitespace-nowrap">
              Apply
            </button>
          </div>

          {/* Totals */}
          <div className="space-y-4 mb-8 border-t border-gray-100 pt-6">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal</span>
              <span>₹ {subtotal}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Discount</span>
              <span>- ₹ {discount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>GST (18%)</span>
              <span>₹ {gst.toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-bold text-black text-lg pt-4 border-t border-gray-100">
              <span>Total</span>
              <span>₹ {total}</span>
            </div>
          </div>

          <button className="w-full bg-[#C0934B] text-white py-3 rounded-[5px] font-bold hover:bg-[#a37c3f] transition-colors">
            Continue to checkout
          </button>
        </div>
      </div>
    </div>
  );
}
