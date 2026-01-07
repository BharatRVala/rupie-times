"use client";

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { FaSearch, FaTimes } from 'react-icons/fa';
// Using server-side search APIs (articles & products) — results are fetched dynamically.

const SearchModal = ({ isOpen, onClose }) => {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState({ articles: [], products: [] });
    const inputRef = useRef(null);

    // Focus input when opened
    useEffect(() => {
        if (isOpen && inputRef.current) {
            setTimeout(() => inputRef.current.focus(), 100);
        }
    }, [isOpen]);

    // Search Logic (use server APIs for real products & articles)
    useEffect(() => {
        if (!query.trim()) {
            setResults({ articles: [], products: [] });
            return;
        }

        const controller = new AbortController();
        const signal = controller.signal;

        const handler = setTimeout(async () => {
            try {
                const q = encodeURIComponent(query.trim());
                const [articlesRes, productsRes] = await Promise.all([
                    fetch(`/api/user/articles?search=${q}&limit=5`, { signal }),
                    fetch(`/api/user/products?search=${q}&limit=5`, { signal })
                ]);

                const articlesJson = await articlesRes.json();
                const productsJson = await productsRes.json();

                const articles = (articlesJson?.articles || []).map(a => {
                    // Normalize featuredImage: handle string, or object with filename, otherwise fallback
                    let thumb = '/placeholder-image.png';
                    if (a?.featuredImage) {
                        if (typeof a.featuredImage === 'string' && a.featuredImage.trim()) {
                            thumb = a.featuredImage;
                        } else if (a.featuredImage.filename && a.featuredImage.filename.trim()) {
                            thumb = `/api/admin/articles/image/${a.featuredImage.filename}`;
                        }
                    }
                    return {
                        id: a._id,
                        title: a.mainHeading || a.title || '',
                        description: a.description || '',
                        thumbnail: thumb,
                        category: a.category || ''
                    };
                });

                const products = (productsJson?.products || []).map(p => {
                    // Ensure img filename exists before constructing URL
                    const imgName = p?.img && typeof p.img === 'string' && p.img.trim() ? p.img.trim() : null;
                    const imageUrl = imgName ? `/api/user/products/image/${imgName}` : '/placeholder-image.png';
                    return {
                        id: p._id,
                        title: p.heading || '',
                        category: p.category || '',
                        image: imageUrl
                    };
                });

                setResults({ articles, products });

            } catch (err) {
                if (err.name !== 'AbortError') {
                    console.error('Search error', err);
                    setResults({ articles: [], products: [] });
                }
            }
        }, 300); // debounce

        return () => {
            clearTimeout(handler);
            controller.abort();
        };

    }, [query]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-start justify-center pt-24 px-4 bg-black/60 backdrop-blur-sm transition-opacity duration-300">
            <div className="w-full max-w-3xl backdrop-blur-md supports-[backdrop-filter]:bg-white/10 bg-white/10 border border-white/20 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">

                {/* Search Header */}
                <div className="flex items-center p-4 border-b border-white/10">
                    <FaSearch className="w-5 h-5 text-gray-300 ml-2" />
                    <input
                        ref={inputRef}
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search for articles, products..."
                        className="flex-1 bg-transparent border-none outline-none text-white px-4 py-2 text-lg placeholder-gray-400"
                    />
                    {query && (
                        <button
                            onClick={() => setQuery("")}
                            className="text-gray-400 hover:text-white mr-4 transition-colors"
                        >
                            <FaTimes className="w-4 h-4" />
                        </button>
                    )}
                    <button
                        onClick={onClose}
                        className="bg-white/10 hover:bg-white/20 text-white rounded-full p-2 transition-colors"
                    >
                        <FaTimes className="w-5 h-5" />
                    </button>
                </div>

                {/* Results Area */}
                <div className="overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-gray-500 scrollbar-track-transparent">

                    {/* Empty State */}
                    {!query && (
                        <div className="text-center text-gray-400 py-12">
                            Type to start searching...
                        </div>
                    )}

                    {/* No Results */}
                    {query && results.articles.length === 0 && results.products.length === 0 && (
                        <div className="text-center text-gray-400 py-12">
                            No results found for "{query}"
                        </div>
                    )}

                    {/* Articles Section */}
                    {results.articles.length > 0 && (
                        <div className="mb-8">
                            <h3 className="text-xs font-bold text-[#C0934B] uppercase tracking-wider mb-2">Articles</h3>
                            <div className="h-px bg-white/10 w-full mb-4"></div>
                            <div className="space-y-4">
                                {results.articles.map(article => (
                                    <Link
                                        key={article.id}
                                        href={`/rupiesTimeTalk/${article.id}`}
                                        onClick={onClose}
                                        className="block group"
                                    >
                                        <div className="flex gap-4 p-3 rounded-xl hover:bg-white/5 transition-colors">
                                            <div className="relative w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-gray-700">
                                                <Image src={article.thumbnail} alt="" fill className="object-cover" />
                                            </div>
                                            <div>
                                                <h4 className="text-white font-bold group-hover:text-[#C0934B] transition-colors line-clamp-1">
                                                    {article.title}
                                                </h4>
                                                <p className="text-gray-400 text-sm line-clamp-2 mt-1">
                                                    {article.description}
                                                </p>
                                                {article.category && (
                                                    <span className="text-xs font-bold bg-[#1E4032] text-white px-2 py-0.5 rounded mt-2 inline-block">
                                                        {article.category}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Products Section */}
                    {results.products.length > 0 && (
                        <div>
                            <h3 className="text-xs font-bold text-[#C0934B] uppercase tracking-wider mb-2">Products</h3>
                            <div className="h-px bg-white/10 w-full mb-4"></div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {results.products.map(product => (
                                    <Link
                                        key={product.id}
                                        href={`/products/${product.id}`}
                                        onClick={onClose}
                                        className="block group"
                                    >
                                        <div className="flex gap-4 p-3 rounded-xl hover:bg-white/5 transition-colors">
                                            <div className="relative w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-gray-700">
                                                <Image src={product.image} alt="" fill className="object-cover" />
                                            </div>
                                            <div>
                                                <h4 className="text-white font-bold group-hover:text-[#C0934B] transition-colors line-clamp-1">
                                                    {product.title}
                                                </h4>
                                                <span className="text-xs font-bold bg-[#1E4032] text-white px-2 py-0.5 rounded mt-1 inline-block">
                                                    {product.category}
                                                </span>
                                            </div>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
};

export default SearchModal;
