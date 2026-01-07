'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import GlobalLoader from './components/GlobalLoader';

export default function Template({ children }) {
    const [showLoader, setShowLoader] = useState(true);
    const pathname = usePathname();
    const isDashboard = pathname?.startsWith('/user-dashboard');

    useEffect(() => {
        // Force loader to show for at least 0.6 second
        const timer = setTimeout(() => {
            setShowLoader(false);
        }, 300);

        return () => clearTimeout(timer);
    }, []);

    if (isDashboard) {
        return children;
    }

    return (
        <div className="relative w-full h-full min-h-screen">
            {showLoader && <GlobalLoader />}
            {children}
        </div>
    );
}
