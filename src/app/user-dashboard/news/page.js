"use client";

import React, { useState, useEffect } from 'react';
import { IoRocketSharp } from "react-icons/io5";
import { HiArrowRight } from "react-icons/hi";
import Link from 'next/link';
import Pagination from '../../components/Pagination';
import GlobalLoader from '../../components/GlobalLoader';

export default function DashboardNewsPage() {
    const [newsList, setNewsList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const limit = 5;

    useEffect(() => {
        const fetchNews = async () => {
            try {
                setLoading(true);
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

    if (loading) {
        return <GlobalLoader fullScreen={false} className="absolute inset-0 bg-white" />;
    }

    return (
        <div className="font-sans min-h-[60vh]">
            {/* Page Header */}
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-[#1E4032]">Latest News</h2>
                <p className="text-gray-600 text-sm">Stay updated with the latest trends and announcements.</p>
            </div>

            {/* News List */}
            <div className="space-y-4">
                {newsList.length === 0 ? (
                    <p className="text-gray-500">No news found.</p>
                ) : (

                    newsList.map((news) => (
                        <div
                            key={news._id}
                            className="backdrop-blur supports-[backdrop-filter]:bg-white/10 bg-white/10 border border-gray-200 rounded-xl p-6 flex flex-col md:flex-row gap-6 hover:shadow-md transition-shadow"
                        >
                            {/* Icon */}
                            <div className="shrink-0 pt-1">
                                <IoRocketSharp className="text-[#C0934B] text-2xl" />
                            </div>

                            {/* Content */}
                            <div className="flex-1 flex flex-col justify-between gap-4 md:flex-row">

                                {/* Left Side: Title, Desc, Author */}
                                <div className="flex-1 space-y-2">
                                    <h3 className="text-lg font-bold text-[#1E4032]">{news.mainHeading || news.title}</h3>
                                    <p className="text-gray-600 text-sm line-clamp-2 leading-relaxed">
                                        {news.description}
                                    </p>
                                    <p className="text-xs text-gray-400 mt-2">
                                        By {news.createdBy || "Rupie Times"}
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
                                        href={`/user-dashboard/news/${news._id}`}
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
    );
}
