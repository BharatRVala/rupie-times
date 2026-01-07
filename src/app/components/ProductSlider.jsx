"use client";
import React, { useState, useEffect } from "react";
import { FiChevronLeft, FiChevronRight } from "react-icons/fi";
import Link from "next/link";
import ProductCard from "./ProductCard";
import GlobalLoader from "./GlobalLoader";

export default function ProductSlider() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [cardsPerView, setCardsPerView] = useState(4);

  // Fetch products from API
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        // Fetch 6 products as requested
        const response = await fetch('/api/user/products?limit=6');
        const data = await response.json();

        if (data.success && Array.isArray(data.products)) {
          setProducts(data.products);
        } else if (data.success && Array.isArray(data.data)) {
          setProducts(data.data);
        }
      } catch (err) {
        console.error("Failed to fetch products:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  // Responsive cards per view
  useEffect(() => {
    const updateCardsPerView = () => {
      if (window.innerWidth < 768) {
        setCardsPerView(1); // Mobile: 1 card
      } else if (window.innerWidth < 1024) {
        setCardsPerView(3); // Tablet: 3 cards
      } else {
        setCardsPerView(4); // Desktop: 4 cards
      }
    };

    updateCardsPerView();
    window.addEventListener("resize", updateCardsPerView);
    return () => window.removeEventListener("resize", updateCardsPerView);
  }, []);

  // Calculate total slides based on cards per view
  const totalSlides = products.length > 0 ? Math.ceil(products.length / cardsPerView) : 0;

  // Reset to first slide when cards per view changes
  useEffect(() => {
    setCurrentSlide(0);
  }, [cardsPerView]);

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1 >= totalSlides ? 0 : prev + 1));
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 < 0 ? totalSlides - 1 : prev - 1));
  };

  // Generate slides dynamically based on cardsPerView
  const slides = [];
  if (products.length > 0) {
    for (let i = 0; i < totalSlides; i++) {
      const startIdx = i * cardsPerView;
      const endIdx = startIdx + cardsPerView;
      slides.push(products.slice(startIdx, endIdx));
    }
  }

  if (loading) {
    return <GlobalLoader />;
  }

  if (!loading && products.length === 0) {
    return null;
  }

  return (
    <div className="w-full overflow-hidden">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        {/* HEADER */}
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-3xl font-bold">Products</h2>

          <Link
            href="/products"
            className="backdrop-blur supports-[backdrop-filter]:bg-[#D9D9D9]/10 bg-[#D9D9D9]/10 px-4 py-2 rounded-full text-sm hover:bg-[#D9D9D9]/20 transition-colors"
          >
            View all →
          </Link>
        </div>

        {/* SLIDER - Responsive Grid Layout */}
        <div className="relative">
          <div className="overflow-hidden">
            <div
              className="transition-transform duration-500 ease-in-out"
              style={{
                transform: `translateX(-${currentSlide * 100}%)`,
              }}
            >
              <div className="flex">
                {slides.map((slideProducts, slideIndex) => (
                  <div key={slideIndex} className="min-w-full">
                    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-5 lg:gap-8">
                      {slideProducts.map((product) => (
                        <ProductCard key={product._id} product={product} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* PAGINATION + ARROWS */}
        {totalSlides > 1 && (
          <div className="flex justify-between items-center mt-8">
            {/* Pagination Dots */}
            <div className="flex gap-3 mx-auto">
              {Array.from({ length: totalSlides }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentSlide(i)}
                  className={`h-1 rounded-full transition-all ${i === currentSlide ? "bg-gray-600 w-10" : "bg-gray-300 w-6"
                    }`}
                  aria-label={`Go to slide ${i + 1}`}
                ></button>
              ))}
            </div>

            {/* Navigation Arrows */}
            <div className="flex items-center gap-3">
              <button
                onClick={prevSlide}
                className="backdrop-blur supports-[backdrop-filter]:bg-[#D9D9D9]/10 bg-[#D9D9D9]/10 w-10 h-10 rounded-full flex items-center justify-center hover:bg-[#D9D9D9]/20 transition-colors"
                aria-label="Previous slide"
              >
                <FiChevronLeft size={20} />
              </button>

              <button
                onClick={nextSlide}
                className="backdrop-blur supports-[backdrop-filter]:bg-[#D9D9D9]/10 bg-[#D9D9D9]/10 w-10 h-10 rounded-full flex items-center justify-center hover:bg-[#D9D9D9]/20 transition-colors"
                aria-label="Next slide"
              >
                <FiChevronRight size={20} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
