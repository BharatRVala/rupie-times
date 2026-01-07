"use client";

import React, { useState, useEffect } from 'react';
import NewsDetailView from '../../components/NewsDetailView';
import GlobalLoader from '../../components/GlobalLoader';
import { notFound, useRouter, useParams } from 'next/navigation';

export default function NewsDetailPage() {
    const params = useParams();
    const router = useRouter();
    const [newsItem, setNewsItem] = useState(null);
    const [allNews, setAllNews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Fetch sidebar news only once
    useEffect(() => {
        const fetchSidebarNews = async () => {
            try {
                const listResponse = await fetch('/api/user/news?limit=10');
                const listData = await listResponse.json();

                if (listData.success) {
                    const articles = listData.articles || listData.data || [];
                    setAllNews(articles);
                }
            } catch (err) {
                console.error("Error fetching sidebar news:", err);
            }
        };
        fetchSidebarNews();
    }, []);

    // Fetch specific news item on ID change
    useEffect(() => {
        const fetchNewsItem = async () => {
            if (!params?.id) return;

            try {
                setLoading(true);
                setError(null); // Clear previous errors when fetching new item
                // Scroll to top when changing articles
                window.scrollTo(0, 0);

                const newsResponse = await fetch(`/api/user/news/${params.id}`);
                const newsData = await newsResponse.json();

                if (!newsData.success || !newsData.article) {
                    setError('News not found');
                    setNewsItem(null); // Ensure newsItem is null if not found
                    return;
                }

                setNewsItem(newsData.article);
            } catch (err) {
                console.error("Error fetching news details:", err);
                setError('Failed to load news');
                setNewsItem(null); // Ensure newsItem is null on error
            } finally {
                setLoading(false);
            }
        };

        fetchNewsItem();
    }, [params?.id]);


    if (error) {
        // You might want to use notFound() here, but that sometimes needs server components.
        // For client side, we can just show a message or redirect.
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
                <h2 className="text-2xl font-bold text-gray-800 mb-4">News Not Found</h2>
                <button
                    onClick={() => router.push('/news')}
                    className="px-6 py-2 bg-[#00301F] text-white rounded-full hover:bg-opacity-90 transition-all"
                >
                    Go Back to News
                </button>
            </div>
        );
    }

    const handleSelectNews = (item) => {
        router.push(`/news/${item._id || item.id}`);
    };

    if (loading) {
        return <GlobalLoader />;
    }

    return (
        <div>
            <NewsDetailView
                newsItem={newsItem}
                onBack={() => router.push('/news')}
                allNews={allNews}
                loading={loading}
                onSelectNews={handleSelectNews}
            />
        </div>
    );
}
