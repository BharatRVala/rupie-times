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
    bottom: []
  });
  // 'slides' contains the actual items causing data.
  const [slides, setSlides] = useState([]);
  // 'renderSlides' contains clones for seamless looping: [Item1, Item2, Item3, Item4, Item1(clone)]
  const [renderSlides, setRenderSlides] = useState([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(true);
  const [loading, setLoading] = useState(true);

  const sliderRef = useRef(null);
  const intervalRef = useRef(null);

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

  // Fetch advertisements and category news
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        const positions = ['top', 'left', 'right', 'center'];
        const adPromises = positions.map(position => {
          const limit = (position === 'center') ? 4 : 1;
          return fetch(`/api/advertisements?position=${position}&limit=${limit}`)
            .then(res => res.json())
            .then(data => data.success ? data.data : [])
            .catch(() => []);
        });

        // Fetch 4 specific categories
        const categories = ["Corporate Wire", "Inside IPOs", "Market Snapshot", "Daily Brew"];
        const categoryPromises = categories.map(cat =>
          fetch(`/api/user/news?category=${encodeURIComponent(cat)}&limit=1`)
            .then(res => res.json())
            .then(data => data.success && data.articles.length > 0 ? { ...data.articles[0], customCategoryTitle: cat } : { customCategoryTitle: cat, isPlaceholder: true })
            .catch(() => ({ customCategoryTitle: cat, isPlaceholder: true }))
        );

        const [adResults, categoryNewsResults] = await Promise.all([
          Promise.all(adPromises),
          Promise.all(categoryPromises)
        ]);

        const topAd = adResults[0][0] || null;
        const leftAd = adResults[1][0] || null;
        const rightAd = adResults[2][0] || null;
        const centerAds = adResults[3] || [];

        let importantNewsItems = [];
        try {
          const newsRes = await fetch('/api/user/news?limit=4&sortBy=isImportant');
          const newsData = await newsRes.json();
          if (newsData.success) {
            const items = Array.isArray(newsData.articles) ? newsData.articles : (Array.isArray(newsData.data) ? newsData.data : []);
            importantNewsItems = items.slice(0, 4);
          }
        } catch (err) {
          console.error("Failed to fetch important news:", err);
        }

        // Logic: If Center Ads exist (even 1), usage ONLY Ads.
        // Otherwise, use Important News.
        let selectedSlides = [];
        if (centerAds.length > 0) {
          selectedSlides = centerAds.slice(0, 4).map(ad => ({ ...ad, type: 'ad' }));
        } else {
          selectedSlides = importantNewsItems.map(news => ({ ...news, type: 'news' }));
        }

        setAds({
          top: topAd,
          left: leftAd,
          right: rightAd,
          bottom: categoryNewsResults // Now holds category news items
        });

        setSlides(selectedSlides);

        // Prepare Render Slides (with Clone) if more than 1 item
        if (selectedSlides.length > 1) {
          setRenderSlides([...selectedSlides, selectedSlides[0]]);
        } else {
          setRenderSlides(selectedSlides);
        }

      } catch (err) {
        console.error('Fetch data error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Handle Rotation Logic
  const nextSlide = () => {
    if (renderSlides.length <= 1) return;
    setIsTransitioning(true);
    setCurrentSlide(prev => prev + 1);
  };

  const prevSlide = () => {
    if (renderSlides.length <= 1) return;
    setIsTransitioning(true);
    setCurrentSlide(prev => {
      if (prev === 0) return renderSlides.length - 2; // Jump to last real slide
      return prev - 1;
    });
  };

  // Jump Handle for Infinite Scroll
  useEffect(() => {
    if (renderSlides.length <= 1) return;

    // If we moved to the clone (last index), reset to index 0 smoothly
    if (currentSlide === renderSlides.length - 1) {
      const timeout = setTimeout(() => {
        setIsTransitioning(false);
        setCurrentSlide(0);
      }, 500); // Match transition duration
      return () => clearTimeout(timeout);
    }
  }, [currentSlide, renderSlides.length]);

  // Auto-rotate
  useEffect(() => {
    if (renderSlides.length <= 1) return;

    intervalRef.current = setInterval(() => {
      nextSlide();
    }, 5000);

    return () => clearInterval(intervalRef.current);
  }, [renderSlides.length]); // Dependencies mostly static properly

  // Pause on hover (clearing interval)
  const pauseAutoRun = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
  };
  const resumeAutoRun = () => {
    if (renderSlides.length <= 1) return;
    pauseAutoRun(); // ensure no double interval
    intervalRef.current = setInterval(nextSlide, 5000);
  };


  const getImageUrl = (ad) => {
    if (!ad) return "";
    return ad.imageUrl || `/api/advertisements/image/${ad.imageFilename}`;
  };

  const getNewsImageUrl = (item) => {
    if (!item) return '/placeholder.png';
    const imagePath = '/api/admin/news/image/';
    const img = item.featuredImage || item.thumbnail || item.image;

    if (!img) {
      return (item.sections?.find(s => s.type === 'image')?.content?.image) || '/placeholder.png';
    }

    if (typeof img === 'string') {
      if (img.startsWith('http')) return img;
      return `${imagePath}${img}`;
    }
    if (img.filename) {
      return `${imagePath}${img.filename}`;
    }
    return '/placeholder.png';
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
              <div className="relative w-full rounded-xl overflow-hidden min-h-[400px]">
                {slides.length > 0 ? (
                  <div
                    className="relative w-full h-full group"
                    onMouseEnter={pauseAutoRun}
                    onMouseLeave={resumeAutoRun}
                  >
                    {/* SLIDER TRACK */}
                    <div className="w-full h-full overflow-hidden rounded-xl">
                      <div
                        className={`flex h-full ${isTransitioning ? 'transition-transform duration-500 ease-in-out' : ''}`}
                        style={{ transform: `translateX(-${currentSlide * 100}%)` }}
                      >
                        {renderSlides.map((item, index) => (
                          <div key={index} className="w-full h-full flex-shrink-0 relative">
                            {item.type === 'ad' ? (
                              // RENDER AD
                              <div className="relative w-full h-full">
                                <a href={item.link || '#'} target="_blank" onClick={() => trackClick(item._id)} className="block w-full h-full relative">
                                  <Image
                                    src={getImageUrl(item)}
                                    alt={item.name || "Main News Highlight"}
                                    width={1200}
                                    height={600}
                                    className="w-full h-full object-contain"
                                    priority={index === currentSlide}
                                  />
                                  {(item.title || item.description) && (
                                    <div className="absolute left-0 right-0 bottom-16 md:bottom-20 p-4 md:p-6 bg-black/50 backdrop-blur-sm text-white mx-4 rounded-lg">
                                      {item.title && (
                                        <h2 className="text-lg md:text-xl font-semibold leading-snug">
                                          {item.title}
                                        </h2>
                                      )}
                                      {item.description && (
                                        <p className="text-sm md:text-base mt-2 opacity-90">
                                          {item.description}
                                        </p>
                                      )}
                                    </div>
                                  )}
                                </a>
                              </div>
                            ) : (
                              // RENDER NEWS
                              <div className="relative w-full h-full flex flex-col">
                                <div className="relative w-full h-[400px] md:h-[500px] mb-4 overflow-hidden rounded-xl flex-shrink-0">
                                  <Image
                                    src={getNewsImageUrl(item)}
                                    alt={item.title || "News Image"}
                                    fill
                                    className="object-cover w-full h-full"
                                    priority={index === currentSlide}
                                  />
                                  <div className="absolute top-4 left-4">
                                    <span className="bg-[#12b981] text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide">
                                      {item.category?.name || "News"}
                                    </span>
                                  </div>
                                </div>
                                <div className="flex flex-col gap-3 p-2">
                                  <a href={`/news/${item._id || item.id}`}>
                                    <h1 className="text-2xl md:text-4xl font-bold text-gray-900 leading-tight hover:text-[#00301F] transition-colors">
                                      {item.mainHeading || item.title}
                                    </h1>
                                  </a>
                                  <p className="text-gray-600 text-base md:text-lg line-clamp-3">
                                    {item.description}
                                  </p>
                                  <div className="mt-2">
                                    <a href={`/news/${item._id || item.id}`} className="inline-flex items-center justify-center px-6 py-2.5 border border-transparent text-sm font-medium rounded-md text-white bg-[#00301F] hover:bg-[#002015] transition-colors shadow-sm">
                                      Read news
                                    </a>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* DOTS INDICATOR (Absolute Bottom) */}
                    {slides.length > 1 && (
                      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex space-x-2 z-20 p-2 rounded-full bg-black/20 backdrop-blur-sm">
                        {slides.map((_, idx) => (
                          <button
                            key={idx}
                            onClick={() => {
                              setIsTransitioning(true);
                              setCurrentSlide(idx);
                            }}
                            className={`w-2 h-2 rounded-full transition-all ${((currentSlide % slides.length) === idx) ? 'bg-white w-4' : 'bg-white/50'}`}
                          />
                        ))}
                      </div>
                    )}

                    {/* PREV/NEXT ARROWS section - Fixed Position Overlay */}
                    {slides.length > 1 && (
                      <>
                        <button
                          onClick={prevSlide}
                          className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/40 hover:bg-black/60 text-white backdrop-blur-md transition-all z-20 cursor-pointer shadow-lg active:scale-95"
                        >
                          <ChevronLeft className="w-6 h-6" />
                        </button>
                        <button
                          onClick={nextSlide}
                          className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/40 hover:bg-black/60 text-white backdrop-blur-md transition-all z-20 cursor-pointer shadow-lg active:scale-95"
                        >
                          <ChevronRight className="w-6 h-6" />
                        </button>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="h-64 flex items-center justify-center bg-gray-100 rounded-xl text-gray-400">
                    No featured content
                  </div>
                )}
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

          {/* ---------- Bottom Category News Grid ---------- */}
          <div className="mt-8 relative group">

            {/* Grid Container */}
            <div
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
            >
              {ads.bottom.map((item, i) => (
                <div
                  key={item._id || i}
                  className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300 border border-gray-100 flex flex-col"
                >
                  <div className="p-4 border-b border-gray-50 bg-gray-50/50">
                    <h3 className="font-bold text-[#1E4032] text-lg truncate">
                      {item.customCategoryTitle}
                    </h3>
                  </div>

                  {!item.isPlaceholder ? (
                    <a href={`/news/${item._id}?cat=${encodeURIComponent(item.customCategoryTitle || item.category)}`} className="block relative w-full aspect-[4/3] group">
                      <div className="relative w-full h-full overflow-hidden">
                        <Image
                          src={getNewsImageUrl(item)}
                          alt={item.mainHeading || "News Image"}
                          fill
                          className="object-cover transition-transform duration-500"
                        />
                      </div>
                      {/* Optional overlay title on hover or always */}
                      <div className="p-3">
                        <h4 className="text-sm font-medium text-gray-800 line-clamp-2 leading-snug group-hover:text-[#C0934B] transition-colors">
                          {item.mainHeading}
                        </h4>
                      </div>
                    </a>
                  ) : (
                    <div className="w-full aspect-[4/3] flex items-center justify-center bg-gray-100 text-gray-400 text-sm">
                      No articles found
                    </div>
                  )}
                </div>
              ))}
            </div>

          </div>
        </>
      )}

    </div>
  );
}
