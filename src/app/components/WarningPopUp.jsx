"use client";

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { FaTimes } from 'react-icons/fa';
import { usePathname } from 'next/navigation';

const WarningPopUp = ({
    isOpen,
    onClose,
    articleData,
    title = "Sign In to Continue",
    message = "You need to be logged in to archive this article.",
    actionText = "Sign in",
    onAction
}) => {
    const pathname = usePathname();

    if (!isOpen) return null;

    const handleLoginClick = () => {
        if (articleData) {
            localStorage.setItem('pending_archive_article', JSON.stringify(articleData));
        }
        if (onAction) {
            onAction();
        }
    };

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="relative w-full max-w-lg overflow-hidden rounded-2xl backdrop-blur supports-[backdrop-filter]:bg-[#00bd7a]/10 bg-[#00bd7a]/10 p-8 shadow-2xl text-left">
                {/* Background Decoration */}
                <div className="absolute right-0 top-0 h-full w-[25%] pointer-events-none">
                    <Image
                        src="/assets/WRC.svg"
                        alt=""
                        fill
                        className="object-cover object-right"
                    />
                </div>

                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute right-4 top-4 text-white/70 hover:text-white transition-colors"
                >
                    <FaTimes className="w-6 h-6" />
                </button>

                {/* Content */}
                <div className="relative z-10 pr-8">
                    <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
                        {title}
                    </h2>
                    <p className="text-white/90 text-lg mb-8 leading-relaxed">
                        {message}
                    </p>

                    <Link
                        href={`/auth?redirect=${pathname || '/'}`}
                        onClick={handleLoginClick}
                        className="inline-block bg-[#C0934B] hover:bg-[#a37c3f] text-white font-bold py-3 px-8 rounded-full transition-colors text-lg"
                    >
                        {actionText}
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default WarningPopUp;
