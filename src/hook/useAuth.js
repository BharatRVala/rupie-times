"use client";

import { useAuthContext } from '../app/context/AuthContext';

export const useAuth = () => {
    const { isLoggedIn, loading, checkAuthStatus } = useAuthContext();
    return { isLoggedIn, loading, checkAuthStatus };
};
