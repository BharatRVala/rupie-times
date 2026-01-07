"use client";

import React, { useState, useEffect } from 'react';
import { IoRocketSharp } from "react-icons/io5";
import { HiArrowRight } from "react-icons/hi";
import Link from 'next/link';
import Image from 'next/image';
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";
import Pagination from '../components/Pagination';
import GlobalLoader from '../components/GlobalLoader';
import sharpIcon from "../assets/sharp.svg";

export default function NewsPage() {
  const [newsList, setNewsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 5; // As requested: "letest5 news fix"

  useEffect(() => {
    const fetchNews = async () => {
      try {
        setLoading(true);
        // Add timestamp to prevent caching issues if needed, though usually not required with standard fetch unless cached
        const res = await fetch(`/api/user/news?page=${currentPage}&limit=${limit}`);
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
    // Scroll to top on page change
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentPage]);

  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  return (
    <div className="min-h-screen font-sans pt-24 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-[#1E4032] mb-2">Latest News</h1>
          <p className="text-gray-600">Stay updated with the latest trends and announcements.</p>
        </div>

        {/* News List */}
        <div className="space-y-4 min-h-[500px] relative">
          {loading && <GlobalLoader />}

          {!loading && newsList.length === 0 ? (
            <p className="text-gray-500">No news found.</p>
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
