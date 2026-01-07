'use client';

import React from 'react';
import ArticleList from '@/app/rupiesTimeTalk/ArticleList';
import Link from 'next/link';
import { FaArrowLeft } from 'react-icons/fa';
import { useParams } from 'next/navigation';

export default function ProductViewPage() {
    const params = useParams();
    const id = params?.id;

    if (!id) return <div>Invalid ID</div>;

    return (
        <div className="max-w-7xl mx-auto p-6">
            <div className="mb-6 flex items-center justify-between">
                <Link
                    href={`/admin-dashboard/product/${id}`}
                    className="flex items-center text-gray-500 hover:text-[#1E4032] transition-colors w-fit font-medium"
                >
                    <FaArrowLeft className="mr-2" /> Back to Article List
                </Link>
                <div className="text-sm text-[#C0934B] font-bold uppercase tracking-wider bg-[#C0934B]/10 px-3 py-1 rounded-full border border-[#C0934B]/20">
                    Live Preview Mode
                </div>
            </div>

            <ArticleList
                apiEndpoint={`/api/admin/products/${id}/articles/preview`}
                baseLinkPath={`/admin-dashboard/product/${id}/sections`}
                pageTitle="Subscription Articles Preview"
                filterContext="subscription" // Reuse subscription styling/logic
                hideAd={true}
                productId={id}
                showActions={false} // Maybe hide read/bookmark actions if they depend on user context?
            />
        </div>
    );
}
