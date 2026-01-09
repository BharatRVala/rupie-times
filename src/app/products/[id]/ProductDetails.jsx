"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FaArrowLeft, FaChevronDown } from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";
import { useCart } from "../../context/CartContext";
import ProductCard from "../../components/ProductCard";

export default function ProductDetails({ product, relatedProducts = [], isDashboard = false }) {
  const router = useRouter();

  // Initialize with the first variant or null
  const initialVariant = product.variants && product.variants.length > 0 ? product.variants[0] : null;
  const [selectedVariant, setSelectedVariant] = useState(initialVariant);

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [startPos, setStartPos] = useState(null);

  const imageRef = useRef(null);
  const { addToCart, cartItems, removeFromCart } = useCart();
  const [isAddedToCart, setIsAddedToCart] = useState(false);
  const [cartItemIndex, setCartItemIndex] = useState(-1);

  // Check if product is in cart
  useEffect(() => {
    if (product && cartItems) {
      const itemIndex = cartItems.findIndex(item => item.productId === product._id || item.id === product._id);

      if (itemIndex > -1) {
        setIsAddedToCart(true);
        setCartItemIndex(itemIndex);

        // Use variant from cart if available to sync UI
        const cartItem = cartItems[itemIndex];
        if (cartItem.variantId && product.variants) {
          const foundVariant = product.variants.find(v => v._id === cartItem.variantId);
          if (foundVariant) setSelectedVariant(foundVariant);
        }
      } else {
        setIsAddedToCart(false);
        setCartItemIndex(-1);
      }
    }
  }, [product, cartItems]);

  // Helper to get image URL
  const getImageUrl = (filename) => {
    if (product.image) return product.image;
    if (!filename) return '/placeholder-image.png';
    if (filename.startsWith('http')) return filename;
    return `/api/user/products/image/${filename}`;
  };

  const currentPrice = selectedVariant ? selectedVariant.price : (product.basePrice || product.price || 0);
  const currentDuration = selectedVariant ? selectedVariant.duration : "Standard";

  const handleAddToCart = () => {
    if (isAddedToCart || product.isSubscribed) return;

    if (imageRef.current) {
      const rect = imageRef.current.getBoundingClientRect();
      setStartPos({
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
      });
      setIsAnimating(true);

      setTimeout(() => {

        addToCart({
          ...product,
          productId: product._id || product.id,
          duration: currentDuration,
          price: currentPrice,
          variantId: selectedVariant?._id,
          quantity: 1
        });
        setIsAnimating(false);
        setStartPos(null);
      }, 1000);
    }
  };

  const handleRemoveFromCart = () => {
    if (cartItemIndex > -1) {
      removeFromCart(cartItemIndex);
      setIsAddedToCart(false);
      setCartItemIndex(-1);
    }
  };

  const handleBuyNow = () => {
    if (isAddedToCart || product.isSubscribed) return;


    addToCart({
      ...product,
      productId: product._id || product.id,
      duration: currentDuration,
      price: currentPrice,
      variantId: selectedVariant?._id,
      quantity: 1
    });
    router.push('/cart');
  };

  const handleExtend = () => {
    console.log("Extending subscription");

    addToCart({
      ...product,
      productId: product._id || product.id,
      duration: currentDuration,
      price: currentPrice,
      variantId: selectedVariant?._id,
      type: 'extension',
      quantity: 1
    });
    router.push('/cart');
  };

  const isProductDisabled = isAddedToCart || isAnimating || product.isSubscribed;

  return (
    <div className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12 relative ${isDashboard ? 'pt-0' : ''}`}>
      {/* Animation Element */}
      <AnimatePresence>
        {isAnimating && startPos && (
          <motion.div
            initial={{
              position: "fixed",
              top: startPos.top,
              left: startPos.left,
              width: startPos.width,
              height: startPos.height,
              zIndex: 100,
              opacity: 1
            }}
            animate={{
              top: "90vh", // Approx bottom right
              left: "90vw",
              width: "40px",
              height: "40px",
              opacity: 0.5,
              borderRadius: "50%"
            }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: "easeInOut" }}
            className="overflow-hidden shadow-2xl pointer-events-none bg-white"
          >
            <Image
              src={getImageUrl(product.filename)}
              alt="Flying Product"
              fill
              className="object-cover"
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Back Button - Hide in Dashboard */}
      {!isDashboard && (
        <Link
          href="/products"
          className="inline-flex items-center text-gray-600 hover:text-black mb-8 transition-colors"
        >
          <FaArrowLeft className="mr-2 w-4 h-4" />
          Back to Products
        </Link>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 mb-20">
        {/* Left: Image */}
        <div
          ref={imageRef}
          className="relative h-[400px] lg:h-[500px] bg-gray-200 rounded-[20px] overflow-hidden w-full"
        >
          <Image
            src={getImageUrl(product.filename)}
            alt={product.heading || product.title}
            fill
            className="object-cover"
          />
        </div>

        {/* Right: Details */}
        <div className=" backdrop-blur supports-[backdrop-filter]:bg-white/10 bg-white/10 p-4 rounded-lg">
          <h1 className="text-3xl lg:text-4xl font-bold text-black mb-4 leading-tight ">
            {product.heading || product.title}
          </h1>

          {/* Subscribed Badge */}
          {product.isSubscribed && (
            <span className="inline-block bg-[#E6F8EB] text-[#1E4032] border border-[#C5E8D0] text-xs font-bold px-3 py-1 rounded-full mb-4">
              Already Subscribed
            </span>
          )}

          <p className="text-2xl font-bold text-black mb-6">
            ₹ {currentPrice?.toLocaleString()}
          </p>

          <div className="mb-2">
            <span className="font-bold text-black">Publication Type : </span>
            <span className="text-gray-700">{product.publicationType || product.shortDescription}</span>
          </div>

          <div className="mb-2">
            <span className="font-bold text-black">Frequency : </span>
            <span className="text-gray-700">{product.frequency}</span>
          </div>

          <div className="mb-6">
            <span className="font-bold text-black">Category : </span>
            <span className="text-gray-700">{product.category}</span>
          </div>

          <p className="text-gray-600 leading-relaxed mb-8 whitespace-pre-line">
            {product.fullDescription || product.description}
          </p>

          {/* Duration Dropdown - Hide if already subscribed */}
          {!product.isSubscribed && product.variants && product.variants.length > 0 && (
            <div className="relative mb-4">
              <button
                onClick={() => !isProductDisabled && setIsDropdownOpen(!isDropdownOpen)}
                disabled={isProductDisabled}
                className={`flex items-center justify-between w-48 px-4 py-2 ${isProductDisabled ? 'bg-[#1E4032] opacity-50 cursor-not-allowed' : 'bg-[#1E4032]'} text-white rounded-md text-sm font-medium focus:outline-none`}
              >
                <span>{currentDuration}</span>
                <FaChevronDown className={`w-3 h-3 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {isDropdownOpen && !isProductDisabled && (
                <div className="absolute top-full left-0 mt-1 w-48 bg-[#1E4032] rounded-md shadow-lg z-10 overflow-hidden">
                  {product.variants.map((variant) => (
                    <button
                      key={variant._id}
                      onClick={() => {
                        setSelectedVariant(variant);
                        setIsDropdownOpen(false);
                      }}
                      className="block w-full text-left px-4 py-2 text-sm text-white hover:bg-[#142b22] transition-colors"
                    >
                      {variant.duration}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {selectedVariant && (
            <div className="mb-8 font-bold text-black">
              Access Period : <span className="font-normal">{currentDuration}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-4">
            {product.isSubscribed ? (
              <button
                onClick={() => router.push('/user-dashboard/subscription')}
                className="flex-1 bg-[#C0934B] text-white py-3 rounded-[5px] font-bold hover:bg-[#a37c3f] transition-colors"
              >
                Start Reading
              </button>
            ) : isAddedToCart ? (
              <button
                onClick={handleRemoveFromCart}
                disabled={isAnimating}
                className="flex-1 bg-[#9c4221] text-white py-3 rounded-[5px] font-bold hover:bg-[#7a341a] transition-colors disabled:opacity-70"
              >
                Remove
              </button>
            ) : (
              <button
                onClick={handleAddToCart}
                disabled={isAnimating}
                className="flex-1 bg-[#C0934B] text-white py-3 rounded-[5px] font-bold hover:bg-[#a37c3f] transition-colors disabled:opacity-70"
              >
                {isAnimating ? "Adding..." : "Add to library"}
              </button>
            )}

            {!product.isSubscribed && (
              <button
                onClick={handleBuyNow}
                disabled={isAnimating || isAddedToCart}
                className={`flex-1 ${isAnimating || isAddedToCart
                  ? 'bg-[#C0934B] opacity-50 cursor-not-allowed'
                  : 'bg-[#C0934B] hover:bg-[#a37c3f]'} text-white py-3 rounded-[5px] font-bold transition-colors`}
              >
                {isAddedToCart ? 'Already in Cart' : 'Get Access'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Related Products - Hide in Dashboard */}
      {!isDashboard && relatedProducts.length > 0 && (
        <div>
          <h2 className="text-3xl font-bold text-black mb-8">You may like</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
            {relatedProducts.map((p) => (
              <ProductCard key={p.id || p._id} product={p} />
            ))}
          </div>
        </div>
      )}
      <div className="w-full text-center mt-12 mb-4">
        <p className="text-[10px] text-gray-400 opacity-70 font-light">
          This publication provides editorial and educational market research. It does not constitute investment advice
        </p>
      </div>
    </div>
  );
}
