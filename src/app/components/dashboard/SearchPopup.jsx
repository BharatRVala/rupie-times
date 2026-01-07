import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import Link from 'next/link';

export default function SearchPopup({ isOpen, onClose }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState({ articles: [], products: [] });
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Use portal target if mounted
  const portalTarget = mounted ? document.body : null;

  // Prevent background scrolling when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Focus input when popup opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        if (inputRef.current) inputRef.current.focus();
      }, 100);
    } else {
      // Clear search when closed
      setSearchQuery("");
      setResults({ articles: [], products: [] });
    }
  }, [isOpen]);

  // Handle escape key to close
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  // Search fetching logic with debounce and AbortController
  useEffect(() => {
    if (!searchQuery.trim()) {
      setResults({ articles: [], products: [] });
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    const signal = controller.signal;

    const handler = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/user/search?q=${encodeURIComponent(searchQuery.trim())}`, { signal });
        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            setResults({
              articles: data.articles || [],
              products: data.products || []
            });
          }
        }
      } catch (error) {
        if (error.name !== 'AbortError') {
          console.error('Dashboard search error:', error);
        }
      } finally {
        setLoading(false);
      }
    }, 1000); // 2 second debounce as requested

    return () => {
      clearTimeout(handler);
      controller.abort();
    };
  }, [searchQuery]);

  if (!mounted || !portalTarget) return null;

  return createPortal(
    <AnimatePresence mode="wait">
      {isOpen && (
        <motion.div
          key="search-modal-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] flex items-start justify-center pt-24 sm:pt-32 px-4 shadow-2xl"
        >
          {/* Backdrop Blur - Matching main header search */}
          <div
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300"
          />

          {/* Modal Content - Glassmorphism */}
          <motion.div
            key="search-modal-content"
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="relative w-full max-w-3xl backdrop-blur-md supports-[backdrop-filter]:bg-white/10 bg-white/10 border border-white/20 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
          >
            {/* Search Input Area */}
            <div className="flex items-center p-4 border-b border-white/10">
              <div className="text-gray-300 ml-2">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                  className="w-5 h-5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
                  />
                </svg>
              </div>

              <input
                ref={inputRef}
                type="text"
                placeholder="Find subscribed products or articles..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 bg-transparent border-none outline-none text-white px-4 py-2 text-lg placeholder-gray-400 font-medium"
              />

              {loading && (
                <div className="w-5 h-5 border-2 border-[#C0934B] border-t-transparent rounded-full animate-spin mr-2"></div>
              )}

              <button
                onClick={onClose}
                className="bg-white/10 hover:bg-white/20 text-white rounded-full p-2 transition-colors"
              >
                <span className="sr-only">Close</span>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Results Area */}
            <div className="flex-1 overflow-y-auto overscroll-y-contain p-6 custom-scrollbar">
              {!searchQuery && (
                <div className="text-center text-gray-400 py-12">
                  Type to start searching...
                </div>
              )}

              {searchQuery && !loading && results.articles.length === 0 && results.products.length === 0 && (
                <div className="text-center text-gray-400 py-12">
                  No matching subscribed content found for "{searchQuery}"
                </div>
              )}

              {/* Products Section */}
              {results.products.length > 0 && (
                <div className="mb-8">
                  <h3 className="text-xs font-bold text-[#C0934B] uppercase tracking-wider mb-2">Subscribed Products</h3>
                  <div className="h-px bg-white/10 w-full mb-4" />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {results.products.map(product => {
                      const productHref = product.latestArticleId
                        ? `/user-dashboard/subscription/${product.id}/articles/${product.latestArticleId}`
                        : `/user-dashboard/subscription/${product.id}/articles`;

                      return (
                        <Link
                          key={`product-${product.id}`}
                          href={productHref}
                          onClick={onClose}
                          className="block group"
                        >
                          <div className="flex gap-4 p-3 rounded-xl hover:bg-white/5 transition-colors">
                            <div className="relative w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-gray-700">
                              <Image src={product.image} alt="" fill className="object-cover" />
                            </div>
                            <div className="min-w-0">
                              <h4 className="text-white font-bold group-hover:text-[#C0934B] transition-colors line-clamp-1">
                                {product.title}
                              </h4>
                              <span className="text-xs font-bold bg-[#1E4032] text-white px-2 py-0.5 rounded mt-1 inline-block">
                                {product.category}
                              </span>
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Articles Section */}
              {results.articles.length > 0 && (
                <div>
                  <h3 className="text-xs font-bold text-[#C0934B] uppercase tracking-wider mb-2">Articles</h3>
                  <div className="h-px bg-white/10 w-full mb-4" />
                  <div className="space-y-4">
                    {results.articles.map(article => {
                      const href = article.type === 'free'
                        ? `/user-dashboard/articles/${article.id}`
                        : `/user-dashboard/subscription/${article.productId}/articles/${article.id}`;

                      return (
                        <Link
                          key={`article-${article.type}-${article.id}`}
                          href={href}
                          onClick={onClose}
                          className="block group"
                        >
                          <div className="flex gap-4 p-3 rounded-xl hover:bg-white/5 transition-colors">
                            <div className="relative w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-gray-700">
                              <Image src={article.image} alt="" fill className="object-cover" />
                            </div>
                            <div className="min-w-0">
                              <h4 className="text-white font-bold group-hover:text-[#C0934B] transition-colors line-clamp-1">
                                {article.title}
                              </h4>
                              <p className="text-gray-400 text-sm line-clamp-2 mt-1">
                                {article.description}
                              </p>
                              <div className="flex items-center gap-2 mt-2">
                                <span className="text-xs font-bold bg-[#1E4032] text-white px-2 py-0.5 rounded">
                                  {article.category}
                                </span>
                                {article.type === 'free' && (
                                  <span className="text-xs font-bold bg-[#C0934B] text-white px-2 py-0.5 rounded">
                                    Free
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 5px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.2);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.3);
        }
      `}</style>
    </AnimatePresence>,
    portalTarget
  );
}
