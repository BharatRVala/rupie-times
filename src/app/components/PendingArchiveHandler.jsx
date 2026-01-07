"use client";

import { useEffect } from 'react';
import { useAuth } from '../../hook/useAuth';
import { useFavorites } from '../context/FavoritesContext';

const PendingArchiveHandler = () => {
    const { isLoggedIn } = useAuth();
    const { toggleFavorite } = useFavorites();

    useEffect(() => {
        if (isLoggedIn) {
            const pendingArticle = localStorage.getItem('pending_archive_article');
            
            if (pendingArticle) {
                try {
                    const articleData = JSON.parse(pendingArticle);
                    // Add to favorites
                    toggleFavorite(articleData);
                    // Clear pending action
                    localStorage.removeItem('pending_archive_article');
                    // Optional: You could show a toast here 'Article archived!'
                    console.log('Processed pending archive:', articleData.title);
                } catch (error) {
                    console.error('Error processing pending archive:', error);
                    localStorage.removeItem('pending_archive_article');
                }
            }
        }
    }, [isLoggedIn, toggleFavorite]);

    return null; // This component checks logic only, renders nothing
};

export default PendingArchiveHandler;
