// src/app/user-dashboard/template.js
'use client';

import { useEffect, useState } from 'react';
import GlobalLoader from '../components/GlobalLoader';

export default function Template({ children }) {
    const [showLoader, setShowLoader] = useState(true);

    useEffect(() => {
        // Force loader to show for at least 0.6 second
        const timer = setTimeout(() => {
            setShowLoader(false);
        }, 600);

        return () => clearTimeout(timer);
    }, []);

    return (
        <div className="relative w-full h-full min-h-[80vh]">
            {showLoader && (
                <GlobalLoader fullScreen={false} className="absolute inset-0 z-50 bg-white" />
            )}
            {children}
        </div>
    );
}
