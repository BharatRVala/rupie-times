'use client';

import Link from 'next/link';
import dynamic from 'next/dynamic';
import bullAnimation from '../../public/assets/Bull.json';

// Dynamically import Lottie to avoid SSR issues
const Lottie = dynamic(() => import('lottie-react'), { ssr: false });

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen text-center px-4">
      <div className="w-full max-w-md mb-8">
        <Lottie 
          animationData={bullAnimation} 
          loop={true} 
          className="w-full h-auto"
        />
      </div>
      
      <h1 className="text-4xl md:text-5xl font-bold text-gray-800 dark:text-white mb-4">
        404 Page Not Found
      </h1>
      
      <p className="text-lg text-gray-600 dark:text-gray-300 mb-8 max-w-xl mx-auto">
        Oops! The page you are looking for seems to have wandered off.
      </p>
      
      <Link 
        href="/"
        className="inline-flex items-center justify-center px-8 py-3 text-base font-medium text-white bg-primary border border-transparent rounded-lg shadow-lg hover:bg-primary/80 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-all duration-300 transform hover:scale-105"
      >
        Back to Home
      </Link>
    </div>
  );
}
