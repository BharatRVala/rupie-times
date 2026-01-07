'use client';

import React from 'react';
import ArticleList from '../../../../rupiesTimeTalk/ArticleList';
import Link from 'next/link';
import { FaArrowLeft } from 'react-icons/fa';

export default function SubscriptionArticlesPage({ params }) {
    const { id } = React.use(params);

    return (
        <div className="max-w-7xl mx-auto">
            <div className="mb-6">
                <Link
                    href="/user-dashboard/subscription"
                    className="flex items-center text-gray-500 hover:text-[#1E4032] transition-colors w-fit font-medium"
                >
                    <FaArrowLeft className="mr-2" /> Back to My Subscriptions
                </Link>
            </div>

            <ArticleList
                apiEndpoint={`/api/user/products/${id}/articles`}
                baseLinkPath={`/user-dashboard/subscription/${id}/articles`}
                pageTitle="Subscription Articles"
                filterContext="subscription" // Hides public filters
                hideAd={true}
                productId={id}
            />
        </div>
    );
}
