'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import SubscriptionCard from './SubscriptionCard';
import Link from 'next/link';
import { FaArrowLeft } from 'react-icons/fa';

const TABS = [
    { key: "active", label: "Active" },
    { key: "expiresoon", label: "Expiring soon" },
    { key: "expired", label: "Expired" }
];

export default function SubscriptionList({ subscriptions }) {
    const [activeTab, setActiveTab] = useState("active");
    const router = useRouter();

    const filteredData = subscriptions.filter(sub => {
        switch (activeTab) {
            case 'active':
                return sub.isActive && (sub.status === 'active' || sub.status === 'expiresoon');
            case 'expired':
                return sub.isExpired || sub.status === 'expired';
            case 'expiresoon':
                return sub.status === 'expiresoon';
            default:
                return true;
        }
    });

    // Helper counts for tabs
    const getCount = (key) => {
        return subscriptions.filter(sub => {
            if (key === 'active') return sub.isActive && (sub.status === 'active' || sub.status === 'expiresoon');
            if (key === 'expired') return sub.isExpired || sub.status === 'expired';
            if (key === 'expiresoon') return sub.status === 'expiresoon';
            return false;
        }).length;
    };

    return (
        <div>
            {/* Tabs */}
            <div className="flex gap-8 border-b border-gray-200 mb-8 overflow-x-auto">
                {TABS.map((tab) => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        className={`pb-4 text-sm font-semibold relative transition-colors whitespace-nowrap ${activeTab === tab.key
                            ? "text-[#C0934B]"
                            : "text-gray-500 hover:text-gray-700"
                            }`}
                    >
                        {tab.label}
                        {/* Count Badge */}
                        <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${activeTab === tab.key ? "bg-[#F3EFE6] text-[#C0934B]" : "bg-gray-100 text-gray-500"
                            }`}>
                            {getCount(tab.key)}
                        </span>

                        {/* Active Line */}
                        {activeTab === tab.key && (
                            <div className="absolute bottom-0 left-0 w-full h-0.5 bg-[#C0934B]" />
                        )}
                    </button>
                ))}
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredData.length > 0 ? (
                    filteredData.map((sub) => (
                        <SubscriptionCard
                            key={sub.id}
                            subscription={sub}
                        />
                    ))
                ) : (
                    <div className="col-span-full py-12 text-center text-gray-500">
                        <p>No subscriptions found in {TABS.find(t => t.key === activeTab)?.label}.</p>
                        <button
                            onClick={() => router.push('/user-dashboard/products')}
                            className="mt-4 text-[#C0934B] font-semibold hover:underline"
                        >
                            Browse Products
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
