'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { FaArrowRight } from 'react-icons/fa';
import GlobalLoader from './GlobalLoader';

const YouMayLike = () => {
  const [articles, setArticles] = useState([]);
  // defined static categories
  const categories = [
    "Business & Entrepreneur Playbook",
    "Economy & Policy Lens",
    "Smart Money Habits"
  ];
  const [activeCategory, setActiveCategory] = useState(categories[0]);
  const [loading, setLoading] = useState(true);

  // Image Base Path for News
  const imageBasePath = '/api/user/news/image/';

  useEffect(() => {
    const fetchArticles = async () => {
      try {
        setLoading(true);
        // Fetch articles based on the active category (newsType)
        // Use encodeURIComponent to handle '&' and spaces correctly
        const response = await fetch(`/api/user/news?limit=5&newsType=${encodeURIComponent(activeCategory)}`);
        const data = await response.json();

        if (data.success && Array.isArray(data.articles)) {
          setArticles(data.articles);
        } else {
          setArticles([]);
        }
      } catch (err) {
        console.error("Failed to fetch articles:", err);
        setArticles([]);
      } finally {
        setLoading(false);
      }
    };

    fetchArticles();
  }, [activeCategory]);


  // Featured Article (First in list)
  const featuredArticle = articles.length > 0 ? articles[0] : null;

  // List Articles (Next 4)
  const listArticles = articles.length > 1 ? articles.slice(1, 5) : [];

  const getImageUrl = (item) => {
    if (!item) return '/placeholder.png';
    const img = item.featuredImage || item.thumbnail || item.image;

    if (!img) {
      return (item.sections?.find(s => s.type === 'text_image')?.content?.image) || '/placeholder.png';
    }
    if (typeof img === 'string') {
      if (img.startsWith('http')) return img;
      return `${imageBasePath}${img}`;
    }
    if (img.filename) {
      return `${imageBasePath}${img.filename}`;
    }
    return '/placeholder.png';
  };

  return (
    <section className="mx-auto max-w-7xl px-4 sm:px-5 md:px-6 lg:px-8 py-12 font-sans">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-3xl font-bold text-black">You may also like</h2>
        <Link href="/news" className="flex items-center text-sm font-medium text-gray-600 hover:text-black transition-colors cursor-pointer group">
          View more <FaArrowRight className="ml-2 w-3 h-3 group-hover:text-black transition-colors" />
        </Link>
      </div>

      {/* Filter Buttons */}
      <div className="flex flex-wrap gap-4 mb-12">
        {categories.map((category) => (
          <button
            key={category}
            onClick={() => setActiveCategory(category)}
            className={`
              px-8 py-2 rounded-full border transition-all duration-300 text-sm font-medium cursor-pointer
              ${activeCategory === category
                ? 'bg-[#00301F] text-white border-[#00301F]'
                : 'bg-white text-gray-600 border-gray-300 hover:border-[#00301F] hover:text-[#00301F]'}
            `}
          >
            {category}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="w-full h-80 flex items-center justify-center bg-gray-50 rounded-xl relative">
          <GlobalLoader fullScreen={false} />
        </div>
      ) : articles.length === 0 ? (
        <div className="text-gray-500 text-center py-10">No articles found in this category.</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">

          {/* Left Column: List */}
          <div className="flex flex-col gap-8">
            {listArticles.map((item, index) => (
              <Link
                key={item._id}
                href={`/news/${item._id}`}
                style={{ cursor: 'pointer' }}
                className={`flex flex-col backdrop-blur supports-[backdrop-filter]:bg-white/10 bg-white/10 p-6 rounded-xl  group cursor-pointer ${index !== listArticles.length - 1 ? 'border-b border-dotted border-gray-300 pb-8' : ''}`}
              >
                <span className="text-black font-bold text-base mb-2 group-hover:text-[#00301F] transition-colors">
                  {item.category || item.newsType || "News"}
                </span>
                <p className="text-gray-600 text-sm leading-relaxed line-clamp-3">
                  {item.description || item.mainHeading}
                </p>
              </Link>
            ))}
            {listArticles.length === 0 && (
              <div className="text-gray-400 italic p-4">No more articles in this category.</div>
            )}
          </div>

          {/* Right Column: Featured */}
          <div className="h-full">
            {featuredArticle && (
              <Link href={`/news/${featuredArticle._id}`} style={{ cursor: 'pointer' }} className="flex flex-col h-full border border-gray-200 rounded-xl overflow-hidden group cursor-pointer hover:shadow-lg transition-shadow duration-300">
                <div className="relative w-full h-[400px] bg-gray-200 overflow-hidden">
                  <Image
                    src={getImageUrl(featuredArticle)}
                    alt={featuredArticle.mainHeading}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                </div>
                <div className="p-8 flex flex-col justify-center flex-grow backdrop-blur supports-[backdrop-filter]:bg-white/10 bg-white/10">
                  <h3 className="text-2xl font-bold text-black mb-4 leading-tight group-hover:text-[#00301F] transition-colors">
                    {featuredArticle.mainHeading}
                  </h3>
                  <p className="text-gray-600 text-base leading-relaxed line-clamp-3">
                    {featuredArticle.description}
                  </p>
                </div>
              </Link>
            )}
          </div>

        </div>
      )}
    </section>
  );
};

export default YouMayLike;
