"use client";

import React, { useEffect, useState } from "react";

export default function IpoMarquee() {
    const [ipoData, setIpoData] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchIpos = async () => {
            try {
                setLoading(true);
                const response = await fetch('/api/ipos?limit=10');
                const data = await response.json();

                if (data.success && Array.isArray(data.data)) {
                    const mappedData = data.data.map(item => {
                        // specific date format: "Oct 31, 2025"
                        const formatDate = (dateString) => {
                            if (!dateString) return "";
                            return new Date(dateString).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric'
                            });
                        };

                        // Price formatting: Ensure ₹ symbol and "per share" suffix
                        let price = item.issuePrice;
                        if (price && !price.startsWith('₹') && !price.toLowerCase().includes('rs')) {
                            price = `₹${price}`;
                        }
                        if (price && !price.toLowerCase().includes('per share')) {
                            price = `${price} per share`;
                        }

                        return {
                            company: item.company,
                            open: formatDate(item.openingDate),
                            close: formatDate(item.closingDate),
                            price: price
                        };
                    });
                    setIpoData(mappedData);
                }
            } catch (err) {
                console.error("Failed to fetch IPOs for marquee:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchIpos();
    }, []);

    if (loading || ipoData.length === 0) {
        return null;
    }

    return (
        <div className="w-full py-4">
            {/* Title */}
            <div className=" mx-auto max-w-7xl">
                <div className="flex justify-between items-center mb-10 px-6">
                    <h2 className="text-3xl font-bold">IPO Watch</h2>
                    <a
                        href="#ipo-calendar"
                        onClick={(e) => {
                            e.preventDefault();
                            document.querySelector('#ipo-calendar')?.scrollIntoView({ behavior: 'smooth' });
                        }}
                        className="text-primary hover:text-green-800 font-semibold cursor-pointer underline underline-offset-4"
                    >
                        View IPO Calendar
                    </a>
                </div>
            </div>

            {/* Scrolling Marquee Section */}
            <div className="overflow-hidden backdrop-blur supports-[backdrop-filter]:bg-[#E6E6E6]/10 bg-[#E6E6E6]/10 py-6 px-6 marquee-container">
                <div className="whitespace-nowrap flex animate-marquee marquee-content">
                    {[...ipoData, ...ipoData].map((item, index) => (
                        <div
                            key={index}
                            className="flex items-center gap-6 px-10 text-sm"
                        >
                            <span><strong>Company Name :</strong> {item.company}</span>
                            <span><strong>Opening Date :</strong> {item.open}</span>
                            <span><strong>Closing Date :</strong> {item.close}</span>
                            <span><strong>Issue Price :</strong> {item.price}</span>

                            {/* Separator */}
                            <span className="text-gray-400 font-normal text-lg px-4">
                                ||
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Animation Styles */}
            <style jsx>{`
        .animate-marquee {
          display: inline-flex;
          animation: marquee 35s linear infinite;
        }

        /* Pause animation on hover */
        .marquee-container:hover .animate-marquee {
          animation-play-state: paused;
        }

        @keyframes marquee {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }
      `}</style>
        </div>
    );
}
