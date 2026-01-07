"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";

// Simple Back Arrow SVG
const BackArrowIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M19 12H5" stroke="#1E4032" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M12 19L5 12L12 5" stroke="#1E4032" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

export default function CreateNotificationPage() {
    const router = useRouter();
    const [submitting, setSubmitting] = useState(false);
    const [products, setProducts] = useState([]);

    const [formData, setFormData] = useState({
        heading: "",
        description: "",
        audience: "all", // Default to General/All
        notificationType: "general", // Default icon type
        productId: ""
    });

    useEffect(() => {
        // Fetch products for the dropdown
        const fetchProducts = async () => {
            try {
                const res = await fetch('/api/admin/products?limit=100'); // Fetch enough products
                const data = await res.json();
                if (data.success) {
                    setProducts(data.products);
                }
            } catch (error) {
                console.error("Error fetching products:", error);
                toast.error("Failed to load products");
            }
        };

        fetchProducts();
    }, []);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.heading || !formData.description) {
            toast.error("Please fill in all fields");
            return;
        }

        if (formData.audience === 'product_wise' && !formData.productId) {
            toast.error("Please select a product");
            return;
        }

        setSubmitting(true);

        try {
            const payload = {
                title: formData.heading,
                message: formData.description,
                targetAudience: formData.audience,
                notificationType: formData.notificationType || 'general'
            };

            // ✅ Include productId ONLY for product_wise audience
            if (formData.audience === 'product_wise' && formData.productId) {
                payload.productId = formData.productId;
            }

            const res = await fetch('/api/admin/notifications', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await res.json();

            if (data.success) {
                toast.success("Notification sent successfully!");
                router.push("/admin-dashboard/notifications");
            } else {
                toast.error(data.error || "Failed to send notification");
            }
        } catch (error) {
            console.error("Sending error:", error);
            toast.error("An error occurred");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="w-full">
            {/* Back Button */}
            <Link
                href="/admin-dashboard/notifications"
                className="inline-flex items-center gap-2 text-[#1E4032] font-medium mb-8 hover:opacity-80 transition-opacity"
            >
                <BackArrowIcon />
                Back to Notifications
            </Link>

            <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900">Add Notification</h1>
                <p className="text-gray-600 mt-1">You can send the notification.</p>
            </div>

            <div className="flex flex-col lg:flex-row gap-8">
                {/* Main Form Card */}
                <div className="flex-1 bg-white border border-gray-200 rounded-lg p-6 md:p-8">
                    <h2 className="text-xl font-bold text-gray-900 mb-6">New notification</h2>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Heading */}
                        <div className="space-y-2">
                            <label htmlFor="heading" className="block text-gray-500 text-sm">
                                Notification Heading
                            </label>
                            <input
                                type="text"
                                id="heading"
                                name="heading"
                                value={formData.heading}
                                onChange={handleChange}
                                placeholder="Enter heading"
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C19A5B] focus:border-transparent text-gray-900 placeholder-gray-400"
                            />
                        </div>

                        {/* Description */}
                        <div className="space-y-2">
                            <label htmlFor="description" className="block text-gray-500 text-sm">
                                Notification Description
                            </label>
                            <textarea
                                id="description"
                                name="description"
                                value={formData.description}
                                onChange={handleChange}
                                placeholder="Enter description"
                                rows={4}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C19A5B] focus:border-transparent text-gray-900 placeholder-gray-400 resize-none h-32"
                            />
                        </div>

                        {/* Audience and Product Selection Row */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label htmlFor="audience" className="block text-gray-500 text-sm mb-2">
                                    Target Audience
                                </label>
                                <div className="relative">
                                    <select
                                        id="audience"
                                        name="audience"
                                        value={formData.audience}
                                        onChange={handleChange}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C19A5B] focus:border-transparent text-gray-900 appearance-none bg-white font-medium cursor-pointer"
                                    >
                                        <option value="all">General (All Users)</option>
                                        <option value="active">Active (Currently Active & Expiring Soon)</option>
                                        <option value="expiresoon">Expiring Soon (Only Expiring Soon)</option>
                                        <option value="expired">Expired (Only Expired & Churned)</option>
                                        <option value="product_wise">Product Wise</option>
                                    </select>
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                                        <svg width="12" height="8" viewBox="0 0 12 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M1 1.5L6 6.5L11 1.5" stroke="#666666" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                    </div>
                                </div>
                            </div>

                            {/* Product Selection Dropdown - Show ONLY for product_wise */}
                            {formData.audience === 'product_wise' && (
                                <div className="space-y-2">
                                    <label htmlFor="productId" className="block text-gray-500 text-sm mb-2">
                                        Select Product
                                    </label>
                                    <div className="relative">
                                        <select
                                            id="productId"
                                            name="productId"
                                            value={formData.productId}
                                            onChange={handleChange}
                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C19A5B] focus:border-transparent text-gray-900 appearance-none bg-white font-medium cursor-pointer"
                                        >
                                            <option value="">Select a product</option>
                                            {products.map(product => (
                                                <option key={product._id} value={product._id}>
                                                    {product.heading || product.name}
                                                </option>
                                            ))}
                                        </select>
                                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                                            <svg width="12" height="8" viewBox="0 0 12 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                <path d="M1 1.5L6 6.5L11 1.5" stroke="#666666" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                            </svg>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={submitting}
                            className={`w-full bg-[#C19A5B] text-white font-medium py-3 rounded-lg hover:bg-[#a8864f] transition-colors mt-4 ${submitting ? 'opacity-70 cursor-not-allowed' : ''}`}
                        >
                            {submitting ? "Sending..." : "Send Notification"}
                        </button>
                    </form >
                </div >
            </div >
        </div >
    );
}
