"use client";
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { FaArrowRight } from 'react-icons/fa';
import GlobalLoader from './GlobalLoader';

const LatestNews = () => {
    const [news, setNews] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchNews = async () => {
            try {
                setLoading(true);
                const response = await fetch('/api/user/news?limit=5&sortBy=isImportant');
                const data = await response.json();

                if (data.success && Array.isArray(data.articles)) {
                    setNews(data.articles);
                } else if (data.success && Array.isArray(data.data)) {
                    setNews(data.data);
                }
            } catch (err) {
                console.error("Failed to fetch news:", err);
            } finally {
                setLoading(false);
            }
        };
        // test
        fetchNews();
    }, []);

    const getImageUrl = (item) => {
        if (!item) return '/placeholder.png';
        const imagePath = '/api/admin/news/image/';

        // Check if featuredImage is present (it might be an object or string)
        const img = item.featuredImage || item.thumbnail || item.image;

        if (!img) {
            // Fallback to section image if available
            return (item.sections?.find(s => s.type === 'text_image')?.content?.image) || '/placeholder.png';
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

    if (loading) {
        return (
            <section className="mx-auto max-w-7xl px-4 sm:px-5 md:px-6 lg:px-8 py-6 relative">
                <div className="backdrop-blur supports-[backdrop-filter]:bg-white/10 bg-white/10 p-6 rounded-lg h-[600px] flex items-center justify-center">
                    <GlobalLoader fullScreen={false} />
                </div>
            </section>
        )
    }

    if (!loading && news.length === 0) {
        return null;
    }

    // Filter data logic - Use index to ensure layout works even if IDs are duplicate
    const centerNews = news[0];
    const sideNews = news.slice(1, 5); // Get next 4 items

    // Distribute side news
    const leftColumnNews = sideNews.slice(0, 2);
    const rightColumnNews = sideNews.slice(2, 4);

    return (
        <section className="mx-auto max-w-7xl px-4 sm:px-5 md:px-6 lg:px-8 py-6">
            <div className="backdrop-blur supports-[backdrop-filter]:bg-white/10 bg-white/10 p-6 rounded-lg">
                {/* Header */}
                <div className="flex justify-between items-end mb-8 border-b-2 border-transparent">
                    <h2 className="text-4xl font-bold text-black">Latest News</h2>
                    <Link href="/news" className="flex items-center text-sm font-medium text-[#00301F] hover:text-black transition-colors mb-1 cursor-pointer">
                        View more <FaArrowRight className="ml-2 w-3 h-3 group-hover:text-black transition-colors text-[#00301F]" />
                    </Link>
                </div>

                {/* Grid Layout */}
                <div className="flex flex-col lg:flex-row gap-6 h-auto lg:h-[600px]">

                    {/* Column 1 (Left) - 20% */}
                    <div className="w-full lg:w-[20%] flex flex-col justify-between h-full">
                        {/* Card 1: Text Only + Underline */}
                        {leftColumnNews[0] && (
                            <Link href={`/news/${leftColumnNews[0]._id || leftColumnNews[0].id}`} style={{ cursor: 'pointer' }} className="flex flex-col h-[45%] justify-start border-b border-gray-200 pb-4 mb-4 lg:mb-0 group cursor-pointer">
                                <h3 className="text-xl font-bold text-black mb-3 leading-tight group-hover:text-[#00301F] transition-colors line-clamp-2">
                                    {leftColumnNews[0].mainHeading || leftColumnNews[0].title}
                                </h3>
                                <p className="text-gray-500 text-sm line-clamp-3">
                                    {leftColumnNews[0].description}
                                </p>
                            </Link>
                        )}

                        {/* Card 2: Thumbnail + Headline */}
                        {leftColumnNews[1] && (
                            <Link href={`/news/${leftColumnNews[1]._id || leftColumnNews[1].id}`} style={{ cursor: 'pointer' }} className="flex flex-col h-[45%] justify-start group cursor-pointer">
                                <div className="relative w-full h-32 mb-4 bg-gray-200 overflow-hidden">
                                    <img
                                        src={getImageUrl(leftColumnNews[1])}
                                        alt={leftColumnNews[1].title || "News Image"}
                                        className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300"
                                    />
                                </div>
                                <h3 className="text-xl font-bold text-black leading-tight group-hover:text-[#00301F] transition-colors line-clamp-3">
                                    {leftColumnNews[1].mainHeading || leftColumnNews[1].title}
                                </h3>
                            </Link>
                        )}
                    </div>

                    {/* Column 2 (Center) - 60% */}
                    <div className="w-full lg:w-[60%] h-full px-0 lg:px-6 border-x-0 lg:border-x border-gray-100">
                        <Link href={`/news/${centerNews._id || centerNews.id}`} style={{ cursor: 'pointer' }} className="flex flex-col h-full group cursor-pointer">
                            <div className="relative w-full h-[65%] bg-gray-200 mb-6 overflow-hidden">
                                <img
                                    src={getImageUrl(centerNews)}
                                    alt={centerNews.title || "News Image"}
                                    className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300"
                                />
                            </div>
                            <div className="p-4 pl-0">
                                <h3 className="text-3xl font-bold text-black mb-4 leading-tight group-hover:text-[#00301F] transition-colors line-clamp-2">
                                    {centerNews.mainHeading || centerNews.title}
                                </h3>
                                <p className="text-gray-500 text-base line-clamp-3 max-w-2xl">
                                    {centerNews.description}
                                </p>
                            </div>
                        </Link>
                    </div>

                    {/* Column 3 (Right) - 20% */}
                    <div className="w-full lg:w-[20%] flex flex-col justify-between h-full">
                        {/* Card 4: Thumbnail + Headline + Underline */}
                        {rightColumnNews[0] && (
                            <Link href={`/news/${rightColumnNews[0]._id || rightColumnNews[0].id}`} style={{ cursor: 'pointer' }} className="flex flex-col h-[45%] justify-start border-b border-gray-200 pb-4 mb-4 lg:mb-0 group cursor-pointer">
                                <div className="relative w-full h-32 mb-4 bg-gray-200 overflow-hidden">
                                    <img
                                        src={getImageUrl(rightColumnNews[0])}
                                        alt={rightColumnNews[0].title || "News Image"}
                                        className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300"
                                    />
                                </div>
                                <h3 className="text-xl font-bold text-black leading-tight group-hover:text-[#00301F] transition-colors line-clamp-3">
                                    {rightColumnNews[0].mainHeading || rightColumnNews[0].title}
                                </h3>
                            </Link>
                        )}

                        {/* Card 5: Headline + Description */}
                        {rightColumnNews[1] && (
                            <Link href={`/news/${rightColumnNews[1]._id || rightColumnNews[1].id}`} style={{ cursor: 'pointer' }} className="flex flex-col h-[45%] justify-start pt-4 group cursor-pointer">
                                <h3 className="text-xl font-bold text-black mb-3 leading-tight group-hover:text-[#00301F] transition-colors line-clamp-2">
                                    {rightColumnNews[1].mainHeading || rightColumnNews[1].title}
                                </h3>
                                <p className="text-gray-500 text-sm line-clamp-3">
                                    {rightColumnNews[1].description}
                                </p>
                            </Link>
                        )}
                    </div>

                </div>
            </div>
        </section>
    );
};

export default LatestNews;
