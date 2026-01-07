'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import animationData from '../../../public/assets/animation-original.json';

// Dynamically import Lottie to avoid SSR issues
const Lottie = dynamic(() => import('lottie-react'), { ssr: false });

const GlobalLoader = ({ fullScreen = true, className = '' }) => {
    return (
        <div 
            className={`
                z-50 bg-white/80 backdrop-blur-sm flex items-center justify-center
                ${fullScreen ? 'fixed inset-0 h-screen w-screen' : `w-full h-full flex items-center justify-center ${className}`}
            `}
        >
            <div className="w-20 h-20 md:w-20 md:h-20">
                <Lottie 
                    animationData={animationData} 
                    loop={true} 
                    autoplay={true} 
                />
            </div>
        </div>
    );
};

export default GlobalLoader;
