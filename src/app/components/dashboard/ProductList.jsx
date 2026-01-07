// src/app/components/dashboard/ProductList.jsx
'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { FiSearch, FiChevronDown } from 'react-icons/fi';
import { FaArrowRight } from 'react-icons/fa';
import GlobalLoader from '../GlobalLoader';

export default function ProductList() {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('All Categories');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchProducts = async () => {
            try {
                // Fetching with a high limit to show "all" products as requested
                const res = await fetch('/api/user/products?limit=100', { cache: 'no-store' });
                if (res.ok) {
                    const data = await res.json();
                    if (data.success) {
                        setProducts(data.products.map(p => ({
                            id: p._id,
                            title: p.heading,
                            description: p.fullDescription || p.publicationType || p.shortDescription,
                            category: p.category,
                            // Helper for image URL
                            image: p.filename ? `/api/admin/products/image/${p.filename}` : null
                        })));
                    }
                }
            } catch (error) {
                console.error("Failed to fetch products:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchProducts();
    }, []);

    // Dynamic Categories from loaded products
    const categories = useMemo(() => {
        const cats = new Set(products.map(p => p.category).filter(Boolean));
        return ['All Categories', ...Array.from(cats).sort()];
    }, [products]);

    // Filter Products
    const filteredProducts = useMemo(() => {
        return products.filter(product => {
            const matchesSearch = (product.title || '').toLowerCase().includes(searchTerm.toLowerCase());
            const matchesCategory = selectedCategory === 'All Categories' || product.category === selectedCategory;
            return matchesSearch && matchesCategory;
        });
    }, [searchTerm, selectedCategory, products]);

    if (loading) {
        return <GlobalLoader fullScreen={false} className="min-h-[60vh]" />;
    }

    return (
        <div>
            {/* Header / Actions Row */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                <h2 className="text-xl font-bold text-[#1E4032]">Premium Newsletters </h2>
                <Link
                    href="/user-dashboard/subscription"
                    className="bg-[#C0934B] text-white px-6 py-2.5 rounded-lg font-semibold text-sm hover:bg-[#a37c3f] transition-colors"
                >
                    My Subscription
                </Link>
            </div>

            {/* Filters Row */}
            <div className="flex flex-col sm:flex-row gap-4 mb-8">
                {/* Search Input */}
                <div className="relative flex-1 max-w-md">
                    <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search here..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-[#397767] focus:outline-none focus:ring-1 focus:ring-[#397767] text-sm"
                    />
                </div>

                {/* Category Dropdown */}
                <div className="relative">
                    <button
                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                        className="flex items-center justify-between gap-2 px-4 py-2.5 bg-[#C0934B] text-white rounded-lg text-sm font-medium w-48 hover:bg-[#a37c3f] transition-colors"
                    >
                        {selectedCategory}
                        <FiChevronDown className={`transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {isDropdownOpen && (
                        <div className="absolute top-full left-0 mt-1 w-full backdrop-blur supports-[backdrop-filter]:bg-white/10 bg-white/10 border border-gray-200 rounded-lg shadow-lg z-10 py-1">
                            {categories.map(cat => (
                                <button
                                    key={cat}
                                    onClick={() => {
                                        setSelectedCategory(cat);
                                        setIsDropdownOpen(false);
                                    }}
                                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Products Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {filteredProducts.map((product) => (
                    <div key={product.id} className="backdrop-blur supports-[backdrop-filter]:bg-white/10 bg-white/10 rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
                        {/* Image Placeholder */}
                        <div className="h-48 bg-gray-200 relative">
                            {product.image ? (
                                <Image
                                    src={product.image}
                                    alt={product.title}
                                    fill
                                    className="object-cover"
                                />
                            ) : (
                                <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-sm">
                                    No Image
                                </div>
                            )}
                        </div>

                        <div className="p-5">
                            <h3 className="font-bold text-lg text-[#1E4032] mb-2 line-clamp-1">{product.title}</h3>
                            <p className="text-sm text-gray-500 mb-6 line-clamp-2">
                                {product.description}
                            </p>

                            <Link
                                href={`/user-dashboard/products/${product.id}`}
                                className="inline-flex items-center text-sm font-semibold text-[#397767] hover:underline gap-1"
                            >
                                Read more <FaArrowRight className="text-xs" />
                            </Link>
                        </div>
                    </div>
                ))}

                {filteredProducts.length === 0 && (
                    <div className="col-span-full py-12 text-center text-gray-500">
                        {products.length === 0 ? "No products available." : "No products found matching your criteria."}
                    </div>
                )}
            </div>
            <div className="w-full text-center mt-12 mb-4">
                <p className="text-[10px] text-gray-400 opacity-70 font-light">
                    This publication provides editorial and educational market research. It does not constitute investment advice
                </p>
            </div>
        </div>
    );
}
