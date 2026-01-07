"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import GlobalLoader from "../../components/GlobalLoader";
import OuterArticleCard from "@/app/components/OuterArticleCard";
import sharpIcon from "@/app/assets/sharp.svg";
import { useFavorites } from '@/app/context/FavoritesContext';

export default function FavoritesPage() {
    const [favorites, setFavorites] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [subscriptions, setSubscriptions] = useState([]);

    const router = useRouter();
    const { refreshFavorites } = useFavorites();

    useEffect(() => {
        fetchFavorites();
        fetchSubscriptions();
    }, []);

    const fetchFavorites = async () => {
        try {
            setLoading(true);
            setError('');

            const response = await fetch('/api/user/favorites', {
                credentials: 'include'
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    const articles = data.favorites.articles || [];
                    const freeArticles = data.favorites.freeArticles || [];

                    // Normalize and merge
                    const normalizedArticles = articles
                        .filter(fav => fav.productId && fav.articleId) // Basic check
                        .map(fav => ({
                            id: fav._id, // OuterArticleCard expects 'id'
                            dbId: fav._id,
                            type: 'article',
                            productId: fav.productId,
                            articleId: fav.articleId,
                            title: fav.articleHeading, // OuterArticleCard expects 'title'
                            description: fav.articleDescription,
                            author: fav.author || 'Rupie Times',
                            category: fav.category || 'Premium',
                            date: fav.createdAt || fav.addedAt,
                            sectionCount: fav.totalSections || 0, // OuterArticleCard expects 'sectionCount'
                            addedAt: fav.addedAt
                        }));

                    const normalizedFreeArticles = freeArticles
                        .filter(fav => fav.articleId)
                        .map(fav => ({
                            id: fav._id,
                            dbId: fav._id,
                            type: 'freeArticle',
                            articleId: fav.articleId._id,
                            title: fav.articleId.mainHeading,
                            description: fav.articleId.description,
                            author: fav.articleId.author || 'Editor',
                            category: fav.articleId.category || 'General',
                            date: fav.articleId.createdAt, // Free articles have createdAt
                            sectionCount: fav.articleId.sections ? fav.articleId.sections.length : 0,
                            addedAt: fav.addedAt
                        }));

                    // Combine and sort by date (newest first)
                    const allFavorites = [...normalizedArticles, ...normalizedFreeArticles].sort((a, b) =>
                        new Date(b.date) - new Date(a.date)
                    );

                    setFavorites(allFavorites);
                } else {
                    setError(data.error || 'Failed to load favorites');
                }
            } else if (response.status === 401) {
                router.push('/auth/login');
            } else {
                setError('Failed to load favorites');
            }
        } catch (error) {
            console.error('Error fetching favorites:', error);
            setError('Network error: Unable to load favorites');
        } finally {
            setLoading(false);
        }
    };

    const fetchSubscriptions = async () => {
        try {
            const response = await fetch('/api/user/subscriptions?status=active', {
                credentials: 'include'
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    setSubscriptions(data.subscriptions || []);
                }
            }
        } catch (error) {
            console.error('Error fetching subscriptions:', error);
        }
    };

    const checkSubscriptionAccess = (productId) => {
        return subscriptions.some(sub =>
            sub.product?._id === productId &&
            (sub.status === 'active' || sub.status === 'expiresoon') &&
            sub.isActive
        );
    };

    const handleReadArticle = (itemId) => {
        // Find item
        const item = favorites.find(f => f.id === itemId);
        if (!item) return;

        if (item.type === 'article') {
            // Direct redirect to product article page - let that page handle access control
            router.push(`/user-dashboard/subscription/${item.productId}/articles/${item.articleId}`);
        } else {
            // Free article
            router.push(`/user-dashboard/articles/${item.articleId}`);
        }
    };

    const removeFromFavorites = async (item) => {
        try {
            let url = `/api/user/favorites?type=${item.type}`;
            if (item.type === 'article') {
                url += `&productId=${item.productId}&articleId=${item.articleId}`;
            } else {
                url += `&freeArticleId=${item.articleId}`;
            }

            const response = await fetch(url, {
                method: 'DELETE',
                credentials: 'include'
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    setFavorites(prev => prev.filter(f => f.id !== item.id));
                    refreshFavorites(); // Sync global state
                }
            }
        } catch (error) {
            console.error('Error removing favorite:', error);
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return '';
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    if (loading) {
        return <GlobalLoader fullScreen={false} className="min-h-[60vh]" />;
    }

    return (
        <div className="w-full p-4 md:p-8 font-sans text-black">
            <h1 className="text-3xl font-bold text-[#1E4032] mb-8">Archive</h1>

            {error && (
                <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-6">
                    {error}
                </div>
            )}

            {favorites.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-100">
                    <p className="text-gray-500 text-lg">No favorite articles yet.</p>
                </div>
            ) : (
                <div className="flex flex-col gap-6">
                    {favorites.map((item) => (
                        <OuterArticleCard
                            key={item.id}
                            id={item.id}
                            title={item.title}
                            date={formatDate(item.date)}
                            description={item.description}
                            category={item.category}
                            author={item.author}
                            sectionCount={item.sectionCount}
                            iconSrc={sharpIcon}

                            // Controlled Props for Archive behavior
                            isStarred={true}
                            onFavoriteClick={() => removeFromFavorites(item)}
                            onReadArticle={handleReadArticle}
                            showActions={true}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
