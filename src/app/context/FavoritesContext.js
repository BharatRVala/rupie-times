"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useAuth } from "../../hook/useAuth";

const FavoritesContext = createContext();

export const FavoritesProvider = ({ children }) => {
    const [favorites, setFavorites] = useState([]);
    const [isLoaded, setIsLoaded] = useState(false);
    const { isLoggedIn } = useAuth();

    // Load from API on mount or when auth changes
    useEffect(() => {
        if (isLoggedIn) {
            fetchFavorites();
        } else {
            setFavorites([]);
            setIsLoaded(true);
        }
    }, [isLoggedIn]);

    const fetchFavorites = async () => {
        try {
            const response = await fetch('/api/user/favorites', {
                credentials: 'include'
            }); // Use relative path, assuming proxy or same origin
            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    // Normalize favorites into a flat structure for easy lookup
                    // We need to store enough info to check existence
                    const normalized = [];

                    if (data.favorites.articles) {
                        data.favorites.articles.forEach(fav => {
                            // Assuming fav is the processed object from GET API
                            // which has { productId, articleId, ... }
                            normalized.push({
                                id: fav.articleId, // Use articleId as primary key for isFavorite check
                                productId: fav.productId,
                                type: 'article',
                                ...fav
                            });
                        });
                    }

                    if (data.favorites.freeArticles) {
                        data.favorites.freeArticles.forEach(fav => {
                            // GET API returns populated freeArticles
                            // fav.articleId is the populated object (FreeArticle)
                            // or if my GET API logic was preserved, it returns the raw object?
                            // Let's check GET API logic.
                            // GET API: processedFreeArticles = (user.favorites?.freeArticles || [])
                            // Wait, user.favorites.freeArticles IS populated with articleId.
                            // So fav.articleId is the OBJECT.
                            // We need fav.articleId._id
                            // Robustly handle populated (object) or unpopulated (string) articleId
                            const rawId = fav.articleId;
                            const idStr = (rawId && rawId._id) ? rawId._id.toString() : (rawId ? rawId.toString() : null);

                            if (idStr) {
                                normalized.push({
                                    id: idStr,
                                    type: 'freeArticle',
                                    ...fav
                                });
                            }
                        });
                    }

                    setFavorites(normalized);
                }
            }
        } catch (error) {
            console.error("Failed to fetch favorites", error);
        } finally {
            setIsLoaded(true);
        }
    };

    const toggleFavorite = async (article) => {
        // Optimistic update
        const exists = favorites.find((item) => item.id === article.id);

        if (exists) {
            // REMOVE
            setFavorites(prev => prev.filter(item => item.id !== article.id));

            try {
                // Use the properties from the EXISTING item in state, which should be correct
                const type = exists.type || (exists.productId ? 'article' : 'freeArticle');
                let url = `/api/user/favorites?type=${type}`;

                if (type === 'article') {
                    url += `&productId=${exists.productId}&articleId=${exists.id}`;
                } else {
                    // For free articles, articleId is the main ID
                    url += `&freeArticleId=${exists.id}`;
                }

                await fetch(url, { method: 'DELETE', credentials: 'include' });
            } catch (error) {
                console.error("Error removing favorite", error);
                // Revert if failed (optional, but good UX)
                setFavorites(prev => [...prev, exists]);
            }

        } else {
            // ADD
            // Determine type
            const type = article.type || (article.productId ? 'article' : 'freeArticle');

            const newItem = {
                ...article,
                type,
                // Ensure we have properties consistent with loaded favorites
                articleId: article.id,
                addedAt: new Date().toISOString()
            };

            setFavorites(prev => [...prev, newItem]);

            try {
                await fetch('/api/user/favorites', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        type,
                        productId: article.productId,
                        articleId: article.id, // For premium
                        freeArticleId: article.id, // For free
                    }),
                    credentials: 'include'
                });
            } catch (error) {
                console.error("Error adding favorite", error);
                setFavorites(prev => prev.filter(item => item.id !== article.id));
            }
        }
    };

    const isFavorite = (id) => {
        return favorites.some((item) => String(item.id) === String(id));
    };

    return (
        <FavoritesContext.Provider value={{ favorites, toggleFavorite, isFavorite, refreshFavorites: fetchFavorites }}>
            {children}
        </FavoritesContext.Provider>
    );
};

export const useFavorites = () => {
    const context = useContext(FavoritesContext);
    if (!context) {
        throw new Error("useFavorites must be used within a FavoritesProvider");
    }
    return context;
};
