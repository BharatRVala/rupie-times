"use client";

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { HiArrowRight } from "react-icons/hi";
import Link from 'next/link';
import Image from 'next/image';
import { FaFilter, FaChevronDown, FaCheck, FaTimes } from 'react-icons/fa';
import Pagination from '../components/Pagination';
import GlobalLoader from '../components/GlobalLoader';
import sharpIcon from "../assets/sharp.svg";
// only test
export default function NewsPage() {
  const [newsList, setNewsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 5;

  // Filter States
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [sortOrder, setSortOrder] = useState('newest');
  const filterRef = useRef(null);

  // Close filter when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (filterRef.current && !filterRef.current.contains(event.target)) {
        setIsFilterOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Extract unique categories
  const categories = useMemo(() => {
    const unique = [...new Set(newsList.map(item => item.category).filter(Boolean))];
    // Ensure default categories are present if we want them always available for filtering
    const defaults = ["Corporate Wire", "Inside IPOs", "Market Snapshot", "Daily Brew", "News"];
    defaults.forEach(cat => {
      if (!unique.includes(cat)) unique.push(cat);
    });
    return unique.sort();
  }, [newsList]);

  useEffect(() => {
    const fetchNews = async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams({
          page: currentPage.toString(),
          limit: limit.toString(),
          sortOrder: sortOrder === 'newest' ? 'desc' : 'asc'
        });

        if (selectedCategories.length > 0) {
          params.append('category', selectedCategories.join(','));
        }

        const res = await fetch(`/api/user/news?${params.toString()}`);
        const data = await res.json();

        if (data.success) {
          setNewsList(data.articles || data.news || []);
          if (data.pagination) {
            setTotalPages(data.pagination.pages);
          }
        }
      } catch (error) {
        console.error("Failed to fetch news", error);
      } finally {
        setLoading(false);
      }
    };

    fetchNews();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentPage, selectedCategories, sortOrder]);

  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  const toggleCategory = (category) => {
    setSelectedCategories(prev => {
      const newCats = prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category];
      setCurrentPage(1); // Reset to page 1 on filter change
      return newCats;
    });
  };

  const clearFilters = () => {
    setSelectedCategories([]);
    setSortOrder('newest');
    setIsFilterOpen(false);
    setCurrentPage(1);
  };

  return (
    <div className="min-h-screen font-sans pt-24 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Page Header with Filter */}
        <div className="flex flex-col md:flex-row justify-between items-end md:items-center mb-8 gap-4 relative">
          <div>
            <h1 className="text-4xl font-bold text-[#1E4032] mb-2">Latest News</h1>
            <p className="text-gray-600">Stay updated with the latest trends and announcements.</p>
          </div>

          {/* Filter Component */}
          <div className="relative" ref={filterRef}>
            <button
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all duration-200 ${isFilterOpen || selectedCategories.length > 0
                ? 'bg-[#1E4032] text-white border-[#1E4032]'
                : 'bg-white text-gray-700 border-gray-300 hover:border-[#1E4032] hover:text-[#1E4032]'
                }`}
            >
              <FaFilter className="w-4 h-4" />
              <span className="font-semibold">Filter</span>
              {selectedCategories.length > 0 && (
                <span className="bg-[#C0934B] text-black text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                  {selectedCategories.length}
                </span>
              )}
              <FaChevronDown className={`w-3 h-3 transition-transform duration-200 ${isFilterOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Menu */}
            {isFilterOpen && (
              <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100 origin-top-right">
                <div className="p-3 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                  <span className="text-sm font-bold text-gray-600">Filters</span>
                  {(selectedCategories.length > 0 || sortOrder !== 'newest') && (
                    <button
                      onClick={clearFilters}
                      className="text-xs text-red-500 font-semibold hover:underline flex items-center gap-1"
                    >
                      <FaTimes className="w-3 h-3" /> Reset
                    </button>
                  )}
                </div>

                <div className="p-2 max-h-[400px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-200">
                  {/* Sort Section */}
                  <div className="px-2 py-1">
                    <h4 className="text-xs font-bold text-[#C0934B] uppercase tracking-wider mb-2">Sort By</h4>
                    <div className="flex flex-col gap-1">
                      {['newest', 'oldest'].map(order => (
                        <label key={order} className="flex items-center gap-2 p-2 rounded-md hover:bg-gray-50 cursor-pointer">
                          <input
                            type="radio"
                            name="sortOrder"
                            checked={sortOrder === order}
                            onChange={() => {
                              setSortOrder(order);
                              setCurrentPage(1);
                            }}
                            className="accent-[#1E4032]"
                          />
                          <span className="text-sm capitalize text-gray-700">{order} First</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="h-px bg-gray-100 my-2"></div>

                  {/* Categories Section */}
                  <div className="px-2 py-1">
                    <h4 className="text-xs font-bold text-[#C0934B] uppercase tracking-wider mb-2">Categories</h4>
                    <div className="flex flex-col gap-1">
                      {categories.map(category => (
                        <label
                          key={category}
                          className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors ${selectedCategories.includes(category)
                            ? 'bg-[#1E4032]/5'
                            : 'hover:bg-gray-50'
                            }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${selectedCategories.includes(category)
                              ? 'bg-[#1E4032] border-[#1E4032]'
                              : 'border-gray-300 bg-white'
                              }`}>
                              {selectedCategories.includes(category) && <FaCheck className="w-2.5 h-2.5 text-white" />}
                            </div>
                            <span className={`text-sm ${selectedCategories.includes(category) ? 'font-semibold text-[#1E4032]' : 'text-gray-600'}`}>
                              {category}
                            </span>
                          </div>
                          <input
                            type="checkbox"
                            className="hidden"
                            checked={selectedCategories.includes(category)}
                            onChange={() => toggleCategory(category)}
                          />
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* News List */}
        <div className="space-y-4 min-h-[500px] relative">
          {loading && <GlobalLoader />}

          {!loading && newsList.length === 0 ? (
            <div className="text-center py-20 bg-gray-50 rounded-2xl border border-dashed border-gray-300">
              <p className="text-gray-500 text-lg">No news found matching your criteria.</p>
            </div>
          ) : (
            newsList.map((news) => (
              <div
                key={news._id}
                className="backdrop-blur supports-[backdrop-filter]:bg-white/10 bg-white/10 border border-gray-200 rounded-xl p-6 flex flex-col md:flex-row gap-6 hover:shadow-md transition-shadow"
              >
                {/* Icon */}
                <div className="shrink-0 pt-1 relative w-5 h-5">
                  <Image src={sharpIcon} alt="icon" fill className="object-contain" />
                </div>

                {/* Content */}
                <div className="flex-1 flex flex-col justify-between gap-4 md:flex-row">

                  {/* Left Side: Title, Desc, Author */}
                  <div className="flex-1 space-y-2">
                    <h3 className="text-xl font-bold text-[#1E4032]">{news.mainHeading || news.title}</h3>
                    <p className="text-gray-600 text-sm/relaxed line-clamp-2">
                      {news.description}
                    </p>
                    <p className="text-xs text-gray-400 mt-2 font-medium">
                      By {news.author || news.createdBy || "Rupie Times"}
                    </p>
                  </div>

                  {/* Right Side: Meta & Action */}
                  <div className="shrink-0 flex flex-col md:items-end justify-between gap-4">
                    <div className="flex flex-col md:items-end gap-2">
                      <span className="text-xs text-gray-500 font-medium whitespace-nowrap">
                        {formatDate(news.createdAt)}
                      </span>
                      <span className="bg-[#FFF8DC] text-[#C0934B] text-[10px] px-3 py-1 rounded-full font-bold uppercase tracking-wider self-start md:self-end">
                        {news.category || "General"}
                      </span>
                    </div>

                    <Link
                      href={`/news/${news._id}`}
                      className="flex items-center gap-2 text-[#1E4032] text-sm font-bold hover:text-[#C0934B] transition-colors self-start md:self-end mt-2 md:mt-0"
                    >
                      Read More <HiArrowRight />
                    </Link>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
          />
        )}


      </div>
    </div>
  );
}
