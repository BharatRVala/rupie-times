"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import GlobalLoader from "./GlobalLoader";

export default function HomeHero() {
  const [ads, setAds] = useState({
    top: null,
    left: null,
    right: null,
    center: null,
    bottom: []
  });
  const [loading, setLoading] = useState(true);
  const sliderRef = useRef(null);

  const scrollLeft = () => {
    if (sliderRef.current) {
      sliderRef.current.scrollBy({ left: -300, behavior: "smooth" });
    }
  };

  const scrollRight = () => {
    if (sliderRef.current) {
      sliderRef.current.scrollBy({ left: 300, behavior: "smooth" });
    }
  };

  // Track ad click
  const trackClick = async (adId) => {
    try {
      await fetch(`/api/advertisements/click/${adId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });
    } catch (err) {
      console.error('Failed to track click:', err);
    }
  };

  // Fetch advertisements
  useEffect(() => {
    const fetchAds = async () => {
      try {
        setLoading(true);
        const positions = ['top', 'left', 'right', 'center', 'bottom'];
        const adPromises = positions.map(position =>
          fetch(`/api/advertisements?position=${position}&limit=${position === 'bottom' ? 4 : 1}`)
            .then(res => res.json())
            .then(data => data.success ? data.data : [])
            .catch(() => [])
        );

        const results = await Promise.all(adPromises);

        setAds({
          top: results[0][0] || null,
          left: results[1][0] || null,
          right: results[2][0] || null,
          center: results[3][0] || null,
          bottom: results[4] || []
        });

      } catch (err) {
        console.error('Fetch ads error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAds();
  }, []);

  const getImageUrl = (ad) => {
    if (!ad) return "";
    return ad.imageUrl || `/api/advertisements/image/${ad.imageFilename}`;
  };

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-5 md:px-6 lg:px-8 py-6">

      {loading && (
        <div className="relative w-full h-[600px]">
          <GlobalLoader />
        </div>
      )}

      {!loading && (
        <>
          {/* ---------- Top Advertisement Banner ---------- */}
          <div className="w-full mb-6">
            <div className="relative w-full h-[300px]">
              {ads.top ? (
                <a href={ads.top.link || '#'} target="_blank" onClick={() => trackClick(ads.top._id)} className="block w-full h-full relative">
                  <Image
                    src={getImageUrl(ads.top)}
                    alt={ads.top.name || "Top Advertisement"}
                    fill
                    className="object-fill rounded-lg"
                    priority
                  />
                </a>
              ) : null}
            </div>
          </div>

          {/* ---------- Main Section Grid ---------- */}
          {/* Mobile: 2 columns (Hero takes 2, Ads take 1 each). Desktop: 12 columns. */}
          {/* Order Logic: 
          Mobile: Hero (Order 1), Vertical Ads (Order 2 - side by side).
          Desktop: Left Ad (Order 1), Hero (Order 2), Right Ad (Order 3).
      */}
          <div className="grid grid-cols-2 lg:grid-cols-12 gap-6">

            {/* LEFT SIDE VERTICAL AD */}
            {/* Mobile: Order 2, Col Span 1. Desktop: Order 1, Col Span 2. */}
            <div className="col-span-1 order-2 lg:col-span-2 lg:order-1 block h-[800px]">
              {ads.left ? (
                <a href={ads.left.link || '#'} target="_blank" onClick={() => trackClick(ads.left._id)} className="block w-full h-full relative">
                  <Image
                    src={getImageUrl(ads.left)}
                    alt={ads.left.name || "Left Advertisement"}
                    fill
                    className="object-fill rounded-lg"
                  />
                </a>
              ) : null}
            </div>

            {/* ---------- CENTER HERO IMAGE WITH FLOATING TEXT ---------- */}
            {/* Mobile: Order 1, Col Span 2 (Full Width). Desktop: Order 2, Col Span 8. */}
            <div className="col-span-2 order-1 lg:col-span-8 lg:order-2">
              <div className="relative w-full rounded-xl overflow-hidden">

                {/* Hero Image (auto height, no limitation) */}
                {ads.center ? (
                  <a href={ads.center.link || '#'} target="_blank" onClick={() => trackClick(ads.center._id)} className="block w-full relative">
                    <Image
                      src={getImageUrl(ads.center)}
                      alt={ads.center.name || "Main News Highlight"}
                      width={1200}
                      height={600}
                      className="w-full h-auto object-contain rounded-xl"
                      priority
                    />

                    {/* FLOATING ARTICLE TEXT */}
                    {(ads.center.title || ads.center.description) && (
                      <div className="absolute left-0 right-0 bottom-4 md:bottom-6 p-4 md:p-6 bg-black/50 backdrop-blur-sm text-white mx-4 rounded-lg">
                        {ads.center.title && (
                          <h2 className="text-lg md:text-xl font-semibold leading-snug">
                            {ads.center.title}
                          </h2>
                        )}

                        {ads.center.description && (
                          <p className="text-sm md:text-base mt-2 opacity-90">
                            {ads.center.description}
                          </p>
                        )}
                      </div>
                    )}
                  </a>
                ) : null}
              </div>
            </div>

            {/* RIGHT SIDE VERTICAL AD */}
            {/* Mobile: Order 3 (visually 2nd row with Left Ad), Col Span 1. Desktop: Order 3, Col Span 2. */}
            <div className="col-span-1 order-3 lg:col-span-2 lg:order-3 block h-[800px]">
              {ads.right ? (
                <a href={ads.right.link || '#'} target="_blank" onClick={() => trackClick(ads.right._id)} className="block w-full h-full relative">
                  <Image
                    src={getImageUrl(ads.right)}
                    alt={ads.right.name || "Right Advertisement"}
                    fill
                    className="object-fill rounded-lg"
                  />
                </a>
              ) : null}
            </div>

          </div>

          {/* ---------- Bottom Article Cards (Slider on Mobile/Tablet) ---------- */}
          <div className="mt-8 relative group">

            {/* Slider Container */}
            <div
              ref={sliderRef}
              className="flex lg:grid lg:grid-cols-4 gap-4 overflow-x-auto snap-x scrollbar-hide pb-4 lg:pb-0"
            >
              {ads.bottom.map((ad, i) => (
                <div
                  key={ad._id || i}
                  className="min-w-[85%] sm:min-w-[45%] lg:min-w-0 snap-center flex-shrink-0 backdrop-blur supports-[backdrop-filter]:bg-[#E6E6E6]/10 bg-[#E6E6E6]/10 rounded-lg p-3 shadow-sm hover:shadow-md transition"
                >
                  <a href={ad.link || '#'} target="_blank" onClick={() => trackClick(ad._id)} className="block h-full">
                    <div className="relative w-full h-32 mb-3">
                      <Image
                        src={getImageUrl(ad)}
                        alt={ad.name || "News Card"}
                        fill
                        className="object-cover rounded-md"
                      />
                    </div>

                    <h4 className="text-sm font-semibold truncate">
                      {ad.title || ad.name}
                    </h4>
                  </a>
                </div>
              ))}
            </div>

            {/* Navigation Buttons (Hidden on Desktop) */}
            {!loading && ads.bottom.length > 0 && (
              <div className="flex justify-center gap-4 mt-4 lg:hidden">
                <button
                  onClick={scrollLeft}
                  className="p-2 rounded-full bg-gray-200/50 hover:bg-gray-300/50 transition"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={scrollRight}
                  className="p-2 rounded-full bg-gray-200/50 hover:bg-gray-300/50 transition"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            )}

          </div>
        </>
      )}

    </div>
  );
}
