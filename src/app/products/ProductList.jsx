"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { FaFilter, FaChevronDown, FaCheck, FaTimes, FaChevronLeft, FaChevronRight } from "react-icons/fa";
import { AnimatePresence, motion } from "framer-motion";
import ProductCard from "../components/ProductCard";
import GlobalLoader from "../components/GlobalLoader";

const ITEMS_PER_PAGE = 8;

// Pagination Component
const Pagination = ({ currentPage, totalPages, onPageChange }) => {
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);

  return (
    <div className="flex items-center justify-center gap-4 mt-12 font-sans text-sm text-gray-600">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className={`flex items-center gap-1 hover:text-black transition-colors ${currentPage === 1 ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <FaChevronLeft className="w-3 h-3" />
        Previous
      </button>

      <div className="flex items-center gap-2">
        {pages.map((page) => (
          <button
            key={page}
            onClick={() => onPageChange(page)}
            className={`w-8 h-8 flex items-center justify-center rounded-full transition-colors
              ${currentPage === page ? 'text-black font-bold' : 'hover:text-black'}
            `}
          >
            {page}
          </button>
        ))}
      </div>

      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className={`flex items-center gap-1 hover:text-black transition-colors ${currentPage === totalPages ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        Next
        <FaChevronRight className="w-3 h-3" />
      </button>
    </div>
  );
};

export default function ProductList() {
  const [currentPage, setCurrentPage] = useState(1);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [totalProducts, setTotalProducts] = useState(0);
  const [categories, setCategories] = useState([]);

  // Filter states
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const filterRef = useRef(null);

  // Close filter when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (filterRef.current && !filterRef.current.contains(event.target)) {
        setIsFilterOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch products and categories
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);

      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: ITEMS_PER_PAGE.toString()
      });

      if (selectedCategories.length > 0) {
        params.append('category', selectedCategories.join(','));
      }

      // Enforce minimum 500ms loading delay for better UX
      const response = await fetch(`/api/user/products?${params.toString()}`, { cache: 'no-store' });

      if (!response.ok) {
        throw new Error('Failed to fetch products');
      }

      const data = await response.json();

      if (data.success) {
        setProducts(data.products || []);
        setTotalProducts(data.pagination?.total || 0);
        setCategories(data.categories || []);
      } else {
        throw new Error(data.error || 'Failed to load products');
      }
    } catch (err) {
      console.error('Error fetching products:', err);
      setError(err.message);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [currentPage, selectedCategories]);

  // Fetch on mount and when filters change
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const totalPages = Math.ceil(totalProducts / ITEMS_PER_PAGE);

  const handlePageChange = (page) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const toggleCategory = (category) => {
    setSelectedCategories(prev =>
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setSelectedCategories([]);
    setIsFilterOpen(false);
    setCurrentPage(1);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {loading && <GlobalLoader />}

      {/* Header & Filter */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-12 gap-4">
        <h1 className="text-3xl md:text-4xl font-bold text-black text-center md:text-left w-full md:w-auto">
          Technicals Products
        </h1>

        {/* Filter Component */}
        <div className="relative" ref={filterRef}>
          <button
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all duration-200 ${isFilterOpen || selectedCategories.length > 0
              ? 'bg-[#1E4032] text-white border-[#1E4032]'
              : 'bg-white text-gray-700 border-gray-300 hover:border-[#1E4032] hover:text-[#1E4032]'
              }`}
          >
            <FaFilter className="w-4 h-4" />
            <span className="font-semibold">Filter</span>
            {selectedCategories.length > 0 && (
              <span className="bg-[#C0934B] text-black text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                {selectedCategories.length}
              </span>
            )}
            <FaChevronDown className={`w-3 h-3 transition-transform duration-200 ${isFilterOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* Dropdown Menu */}
          <AnimatePresence>
            {isFilterOpen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -10 }}
                transition={{ duration: 0.1 }}
                className="absolute right-0 top-full mt-2 w-72 bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden origin-top-right"
              >
                <div className="p-3 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                  <span className="text-sm font-bold text-gray-600">Filters</span>
                  {selectedCategories.length > 0 && (
                    <button
                      onClick={clearFilters}
                      className="text-xs text-red-500 font-semibold hover:underline flex items-center gap-1"
                    >
                      <FaTimes className="w-3 h-3" /> Reset
                    </button>
                  )}
                </div>

                <div className="p-2 max-h-[400px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-200">
                  {/* Categories Section */}
                  <div className="px-2 py-1">
                    <h4 className="text-xs font-bold text-[#C0934B] uppercase tracking-wider mb-2">Categories</h4>
                    <div className="flex flex-col gap-1">
                      {categories.length > 0 ? (
                        categories.map(category => (
                          <label
                            key={category}
                            className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors ${selectedCategories.includes(category)
                              ? 'bg-[#1E4032]/5'
                              : 'hover:bg-gray-50'
                              }`}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${selectedCategories.includes(category)
                                ? 'bg-[#1E4032] border-[#1E4032]'
                                : 'border-gray-300 bg-white'
                                }`}>
                                {selectedCategories.includes(category) && <FaCheck className="w-2.5 h-2.5 text-white" />}
                              </div>
                              <span className={`text-sm ${selectedCategories.includes(category) ? 'font-semibold text-[#1E4032]' : 'text-gray-600'}`}>
                                {category}
                              </span>
                            </div>
                            <input
                              type="checkbox"
                              className="hidden"
                              checked={selectedCategories.includes(category)}
                              onChange={() => toggleCategory(category)}
                            />
                          </label>
                        ))
                      ) : (
                        <div className="text-sm text-gray-500 px-2">No categories available</div>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {error ? (
        <div className="text-center py-20">
          <h2 className="text-2xl font-bold text-red-600 mb-2">Error</h2>
          <p className="text-gray-600">{error}</p>
        </div>
      ) : products.length === 0 && !loading ? (
        <div className="text-center py-20 bg-gray-50 rounded-2xl border border-dashed border-gray-300">
          <p className="text-gray-500 text-lg">No products found matching your criteria.</p>
          <button
            onClick={clearFilters}
            className="mt-4 text-[#1E4032] font-semibold hover:underline"
          >
            Clear filters to see all products
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5 lg:gap-8">
            {products.map((product) => (
              <ProductCard key={product._id} product={product} />
            ))}
          </div>

          {totalPages > 1 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={handlePageChange}
            />

          )}
        </>
      )}
      <div className="w-full text-center mt-12 mb-4">
        <p className="text-[10px] text-gray-400 opacity-70 font-light">
          This publication provides editorial and educational market research. It does not constitute investment advice
        </p>
      </div>
    </div>
  );
}
