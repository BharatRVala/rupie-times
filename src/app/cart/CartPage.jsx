"use client";

import { useCart } from "../context/CartContext";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from 'next/navigation'; // Added for routing
import Script from 'next/script'; // Added for Razorpay
import { FaTrash, FaArrowRight, FaTag } from "react-icons/fa"; // Added FaTag
import { useEffect, useState, useRef, useCallback } from "react"; // Added hooks
import ProductCard from "../components/ProductCard";

export default function CartPage() {
  const { cartItems, removeFromCart, clearCart, setCart } = useCart();
  const router = useRouter();

  // --- State & Logic from previous steps (Razorpay, Promo, API) ---
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [promoCode, setPromoCode] = useState('');
  const [appliedPromo, setAppliedPromo] = useState(null);
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoError, setPromoError] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [relatedProducts, setRelatedProducts] = useState([]);

  const paymentStateRef = useRef('idle');
  const currentOrderIdRef = useRef(null);
  const razorpayInstanceRef = useRef(null);

  // Helper to get image URL
  const getImageUrl = (filename) => {
    if (!filename) return '/placeholder-image.png';
    if (filename.startsWith('http')) return filename;
    return `/api/admin/products/image/${filename}`;
  };

  // Fetch Related Products
  useEffect(() => {
    const fetchRelatedProducts = async () => {
      try {
        const response = await fetch('/api/user/products');
        const data = await response.json();
        if (data.success && Array.isArray(data.products)) {
          const mappedProducts = data.products.map(p => ({
            id: p._id,
            title: p.heading,
            description: p.description,
            image: getImageUrl(p.filename),
            // Pass minimal necessary data for ProductCard
            ...p
          }));
          setRelatedProducts(mappedProducts.sort(() => 0.5 - Math.random()).slice(0, 4));
        }
      } catch (error) {
        console.error('Failed to fetch related products:', error);
      }
    };
    fetchRelatedProducts();
  }, []);

  // Check Auth & Validate Subscriptions
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/user/auth/check');
        const data = await response.json();
        setIsLoggedIn(data.isLoggedIn);
        if (data.isLoggedIn && cartItems.length > 0) {
          // validateCartSubscriptions(); // Keeping this simple as per UI focus, but logic is available if needed.
          // For now, let's just ensure basic auth check.
          validateCartSubscriptions();
        }
      } catch (error) {
        console.error('Auth check failed:', error);
      } finally {
        setAuthLoading(false);
        setLoading(false);
      }
    };
    checkAuth();
  }, [cartItems]);

  const validateCartSubscriptions = async () => {
    try {
      const response = await fetch('/api/user/subscriptions?status=active');
      const result = await response.json();
      if (result.success && result.subscriptions) {
        const activeProductIds = new Set(result.subscriptions.filter(sub => sub.status === 'active').map(sub => sub.product._id));
        const invalidItems = [];
        const validItems = cartItems.filter(item => {
          if (activeProductIds.has(item.productId)) {
            invalidItems.push(item.heading);
            return false;
          }
          return true;
        });
        if (invalidItems.length > 0) {
          setCart(validItems);
          setError(`Removed items: ${invalidItems.join(', ')} (Already Subscribed)`);
        }
      }
    } catch (err) { console.error(err); }
  };


  // --- Calculation Logic ---
  const calculateOriginalSubtotal = () => cartItems.reduce((total, item) => total + (Number(item.price) || 0), 0);
  const calculateSubtotal = () => {
    const subtotal = calculateOriginalSubtotal();
    return appliedPromo ? subtotal - appliedPromo.discountAmount : subtotal;
  };
  const calculateTax = () => calculateSubtotal() * 0.18;
  const calculateTotal = () => calculateSubtotal() + calculateTax();
  const calculateTotalInPaise = () => Math.round(calculateTotal() * 100);

  // Promo Code Logic
  const handleApplyPromo = useCallback(async (codeOverride = null) => {
    const codeToUse = typeof codeOverride === 'string' ? codeOverride : promoCode;
    if (!codeToUse.trim()) { setPromoError('Enter promo code'); return; }
    setPromoLoading(true); setPromoError('');
    if (!codeOverride) setAppliedPromo(null);

    try {
      if (cartItems.length === 0) return;

      // We need to validate per item or globally. The API seems to handle per product.
      // Let's assume validation needs to check all items.
      const validationPromises = cartItems.map(item => fetch('/api/promo/validate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: item.productId, promoCode: codeToUse, amount: (Number(item.price) || 0) })
      }).then(res => res.json()));

      const results = await Promise.all(validationPromises);
      const validResults = results.filter(r => r.success && r.isValid);

      if (validResults.length > 0) {
        const totalDiscount = validResults.reduce((sum, r) => sum + (r.discountAmount || 0), 0);
        if (totalDiscount > 0) {
          setAppliedPromo({ code: codeToUse, discountAmount: Number(totalDiscount.toFixed(2)) });
          // Combined logic: Removed top banner success message as per user request
        } else { setPromoError('Zero discount'); setAppliedPromo(null); }
      } else { setPromoError('Invalid code'); setAppliedPromo(null); }
    } catch (e) { setPromoError('Failed to apply'); } finally { setPromoLoading(false); }
  }, [cartItems, promoCode]);

  useEffect(() => {
    if (cartItems.length === 0) {
      if (appliedPromo) {
        setAppliedPromo(null);
        setPromoCode('');
        setSuccessMessage('');
        setPromoError('');
      }
    } else if (appliedPromo) {
      handleApplyPromo(appliedPromo.code);
    }
  }, [cartItems, handleApplyPromo]); // Re-validate when cart changes

  const handleRemovePromo = () => { setAppliedPromo(null); setPromoCode(''); setSuccessMessage(''); setPromoError(''); };


  // Payment Logic
  const verifyPayment = async (paymentResponse) => {
    try {
      const verifyResponse = await fetch('/api/payments/verify', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentResponse, cartItems, promoCode: appliedPromo?.code, promoDetails: appliedPromo })
      });
      const result = await verifyResponse.json();
      if (result.success || result.createdSubscriptionIds?.length > 0) {
        clearCart(); 
        setProcessing(false); // Enable buttons if navigation takes a moment
        router.push('/user-dashboard/subscription?payment_success=true');
      } else throw new Error(result.error);
    } catch (e) { setError(e.message); setProcessing(false); }
  };

  const handlePayment = async () => {
    if (cartItems.length === 0) { setError('Cart is empty'); return; }
    setProcessing(true); setError(''); setSuccessMessage('');
    try {
      const response = await fetch('/api/payments/create-order', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cartItems, promoCode: appliedPromo?.code })
      });
      if (!response.ok) throw new Error('Order creation failed');
      const orderResult = await response.json();
      if (!orderResult.success) throw new Error(orderResult.error);

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: orderResult.amount, currency: 'INR', name: "RupieTimes", description: `Subscription for ${cartItems.length} items`,
        order_id: orderResult.orderId,
        theme: { color: "#C0934B" },
        handler: async function (response) { await verifyPayment(response); },
        modal: { ondismiss: () => { setProcessing(false); } }
      };
      const razorpay = new window.Razorpay(options);
      razorpayInstanceRef.current = razorpay;
      razorpay.open();
    } catch (e) { setError(e.message); setProcessing(false); }
  };


  // --- UI RENDER (Based on User Snippet) ---
  const subtotal = calculateOriginalSubtotal();
  const discountAmount = appliedPromo ? appliedPromo.discountAmount : 0;
  const gst = (subtotal - discountAmount) * 0.18;
  const total = (subtotal - discountAmount) + gst;

  if (loading && cartItems.length === 0) return <div className="min-h-screen bg-transparent flex items-center justify-center">Loading...</div>; // Simple loader

  return (
    <>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="afterInteractive" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-4xl font-bold text-black mb-12">Your Cart</h1>

        {/* Notifications */}
        {error && <div className="mb-4 p-4 bg-red-50 text-red-600 rounded-lg">{error}</div>}
        {successMessage && <div className="mb-4 p-4 bg-green-50 text-green-600 rounded-lg">{successMessage}</div>}


        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 mb-20">
          {/* Left Column: Cart Items (2/3 width) */}
          <div className="lg:col-span-2 backdrop-blur supports-[backdrop-filter]:bg-white/10 bg-white/10 p-8 rounded-[20px] border border-gray-200 h-fit">
            {/* Header Row */}
            <div className="hidden lg:grid grid-cols-12 text-sm font-semibold text-black border-b border-gray-100 pb-4 mb-8">
              <div className="col-span-6">Product</div>
              <div className="col-span-3 text-center">Duration</div>
              <div className="col-span-3 text-right">Total</div>
            </div>

            {/* Items */}
            {cartItems.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                Your cart is empty. <Link href="/products" className="text-[#C0934B] hover:underline">Start shopping</Link>
              </div>
            ) : (
              <div className="space-y-8">
                {cartItems.map((item, index) => (
                  <div key={`${item.id || item.productId}-${index}`} className="flex flex-col lg:grid lg:grid-cols-12 items-start lg:items-center gap-4 lg:gap-0 border-b border-gray-100 pb-8 last:border-0 last:pb-0">
                    <div className="w-full lg:col-span-6 flex gap-4">
                      <div className="relative w-24 h-24 bg-gray-200 rounded-md overflow-hidden flex-shrink-0">
                        <Image
                          src={getImageUrl(item.filename)}
                          alt={item.title || item.heading}
                          fill
                          className="object-cover"
                        />
                      </div>
                      <div>
                        <h3 className="font-bold text-black text-lg">{item.title || item.heading}</h3>
                        <p className="text-sm text-gray-600">Price : ₹ {item.price}</p>
                      </div>
                    </div>

                    <div className="w-full lg:col-span-3 lg:text-center text-gray-700 flex justify-between lg:block">
                      <span className="lg:hidden font-semibold">Duration:</span>
                      {item.duration}
                    </div>

                    <div className="w-full lg:col-span-3 flex items-center justify-between lg:justify-end gap-6">
                      <span className="lg:hidden font-semibold">Total:</span>
                      <div className="flex items-center gap-6">
                        <span className="font-bold text-black">₹ {item.price}</span>
                        <button
                          onClick={() => removeFromCart(index)}
                          className="text-[#C0934B] hover:text-[#a37c3f] transition-colors"
                          disabled={processing}
                        >
                          <FaTrash />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right Column: Summary (1/3 width) */}
          {cartItems.length > 0 && (
            <div className=" backdrop-blur supports-[backdrop-filter]:bg-white/10 bg-white/10 p-8 rounded-[20px] border border-gray-200 h-fit">
              <h2 className="text-xl font-bold text-black mb-6">Promo code</h2>

              <div className="flex flex-col sm:flex-row gap-2 mb-8">
                <input
                  type="text"
                  placeholder="Type here..."
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                  disabled={!!appliedPromo}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-[#C0934B] focus:border-[#C0934B] disabled:opacity-50 disabled:bg-gray-100 placeholder:text-gray-400 text-black"
                />
                <button
                  onClick={appliedPromo ? handleRemovePromo : () => handleApplyPromo()}
                  disabled={processing || promoLoading}
                  className="bg-[#C0934B] text-white px-6 py-2 rounded-full font-bold hover:bg-[#a37c3f] transition-colors whitespace-nowrap disabled:opacity-50"
                >
                  {promoLoading ? '...' : (appliedPromo ? 'Remove' : 'Apply')}
                </button>
              </div>
              {promoError && <p className="text-red-500 text-sm mb-4 bg-red-50 p-2 rounded">{promoError}</p>}
              {appliedPromo && <p className="text-green-600 text-sm mb-4 bg-green-50 p-2 rounded">Applied: {appliedPromo.code}</p>}


              <div className="space-y-4 mb-8 border-t border-gray-100 pt-6">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal</span>
                  <span>₹ {subtotal}</span>
                </div>
                {appliedPromo && (
                  <div className="flex justify-between text-[#C0934B]">
                    <span>Discount</span>
                    <span>- ₹ {discountAmount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-gray-600">
                  <span>GST (18%)</span>
                  <span>₹ {gst.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-black text-lg pt-4 border-t border-gray-100">
                  <span>Total</span>
                  <span>₹ {total.toFixed(2)}</span>
                </div>
              </div>

              <button
                onClick={isLoggedIn ? handlePayment : () => router.push('/auth?redirect=/cart')}
                disabled={processing || authLoading}
                className="block w-full text-center bg-[#C0934B] text-white py-3 rounded-[5px] font-bold hover:bg-[#a37c3f] transition-colors disabled:opacity-50"
              >
                {processing ? 'Processing...' : (isLoggedIn ? 'Continue to checkout' : 'Login to Checkout')}
              </button>
            </div>
          )}
        </div>

        {/* You May Like */}
        {relatedProducts.length > 0 && (
          <div>
            <h2 className="text-3xl font-bold text-black mb-8">You may like</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
              {relatedProducts.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
