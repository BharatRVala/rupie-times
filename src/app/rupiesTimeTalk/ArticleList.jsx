'use client';

import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import AdBanner from "../components/AdBanner";
import OuterArticleCard from "../components/OuterArticleCard";
import Pagination from "../components/Pagination";
import GlobalLoader from "../components/GlobalLoader";
import sharpIcon from "../assets/sharp.svg";
import { FaFilter, FaChevronDown, FaCheck, FaTimes } from 'react-icons/fa';

const ITEMS_PER_PAGE = 5;

const ArticleList = ({
    filterContext,
    onReadArticle,
    initialArticles = [],
    initialTotal = 0,
    pageTitle,
    hideAd,
    showActions = true,
    apiEndpoint = '/api/user/articles',
    baseLinkPath = '/rupiesTimeTalk',
    productId // Optional: for subscription context
}) => {
    const [currentPage, setCurrentPage] = useState(1);
    const [selectedCategories, setSelectedCategories] = useState([]);
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [sortOrder, setSortOrder] = useState('newest');
    const filterRef = useRef(null);

    // Dynamic Data State
    const [articles, setArticles] = useState(initialArticles);
    const [totalArticles, setTotalArticles] = useState(initialTotal);
    const [loading, setLoading] = useState(false);

    // Track if it's the initial render to avoid double fetching
    const isFirstRender = useRef(true);

    // Extract unique categories from loaded articles or define defaults
    // Since we are paginating, we might miss some categories if we only look at loaded ones.
    // Ideally, categories should come from a separate API call or be provided initially.
    // For now, we'll stick to dynamic extraction + defaults.
    const categories = useMemo(() => {
        const unique = [...new Set(articles.map(item => item.category).filter(Boolean))];
        if (!unique.includes("News")) unique.push("News");
        if (!unique.includes("Product Category")) unique.push("Product Category");
        return unique.sort();
    }, [articles]);

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

    // Fetch Articles Function
    const fetchArticles = useCallback(async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams({
                page: currentPage.toString(),
                limit: ITEMS_PER_PAGE.toString(),
                sortOrder: sortOrder === 'newest' ? 'desc' : 'asc'
            });

            if (selectedCategories.length > 0) {
                params.append('category', selectedCategories.join(','));
            }

            const separator = apiEndpoint.includes('?') ? '&' : '?';
            const response = await fetch(`${apiEndpoint}${separator}${params.toString()}`);
            const data = await response.json();

            if (data.success) {
                // Map API data to component structure
                const mappedArticles = data.articles.map(article => ({
                    id: article._id,
                    productId, // Pass through from props if present
                    title: article.mainHeading,
                    date: new Date(article.createdAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                    }),
                    rawDate: new Date(article.createdAt).toISOString(),
                    description: article.description,
                    category: article.category,
                    author: article.author,
                    sectionCount: article.sectionsCount || 0,
                    link: `${baseLinkPath}/${article._id}`,
                    iconSrc: sharpIcon,
                    featuredImage: article.featuredImage,
                    isImportant: article.isImportant,
                    isFavorite: article.isFavorite || false,
                    priority: article.priority
                }));

                setArticles(mappedArticles);
                setTotalArticles(data.pagination?.total || 0);
            }
        } catch (error) {
            console.error("Error fetching articles:", error);
        } finally {
            setLoading(false);
        }
    }, [currentPage, selectedCategories, sortOrder, apiEndpoint, baseLinkPath]);


    // Effect to trigger fetch on page/filter change
    useEffect(() => {
        // Skip first fetch if initialArticles are provided and we are on page 1 with no filters
        // This prevents double fetching on initial load
        if (isFirstRender.current && initialArticles.length > 0 && currentPage === 1 && selectedCategories.length === 0 && sortOrder === 'newest') {
            isFirstRender.current = false;
            return;
        }

        // If filters change, we reset to page 1 (handled by another effect), BUT
        // we need to ensure fetch happens.

        fetchArticles();
        isFirstRender.current = false;

    }, [fetchArticles]);


    // Reset pagination when filter/sort changes
    useEffect(() => {
        if (!isFirstRender.current) {
            setCurrentPage(1);
        }
    }, [selectedCategories, sortOrder]);


    const totalPages = Math.ceil(totalArticles / ITEMS_PER_PAGE);

    const handlePageChange = (page) => {
        if (page >= 1 && page <= totalPages) {
            setCurrentPage(page);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    const toggleCategory = (category) => {
        setSelectedCategories(prev =>
            prev.includes(category)
                ? prev.filter(c => c !== category)
                : [...prev, category]
        );
    };

    const clearFilters = () => {
        setSelectedCategories([]);
        setSortOrder('newest');
        setIsFilterOpen(false);
    };

    if (loading) {
        return <GlobalLoader fullScreen={false} className="absolute inset-0 bg-white" />;
    }

    return (
        <div className="mx-auto max-w-7xl px-4 sm:px-5 md:px-6 lg:px-8 py-6 min-h-screen">
            {!filterContext && !hideAd && (
                <AdBanner imageSrc="https://picsum.photos/1600/300" altText="Top Advertisement" className="mb-8" />
            )}

            <div className="flex flex-col md:flex-row justify-between items-end md:items-center mb-8 gap-4 relative">
                <h2 className="text-3xl font-bold text-[#1E4032] self-start md:self-auto">{pageTitle || "Rupie Speak: The voice of the Market."}</h2>

                {/* Filter Component - Hide if in subscription context */}
                {!filterContext && (
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
                        {isFilterOpen && (
                            <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100 origin-top-right">
                                <div className="p-3 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                                    <span className="text-sm font-bold text-gray-600">Filters</span>
                                    {(selectedCategories.length > 0 || sortOrder !== 'newest') && (
                                        <button
                                            onClick={clearFilters}
                                            className="text-xs text-red-500 font-semibold hover:underline flex items-center gap-1"
                                        >
                                            <FaTimes className="w-3 h-3" /> Reset
                                        </button>
                                    )}
                                </div>

                                <div className="p-2 max-h-[400px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-200">
                                    {/* Sort Section */}
                                    <div className="px-2 py-1">
                                        <h4 className="text-xs font-bold text-[#C0934B] uppercase tracking-wider mb-2">Sort By</h4>
                                        <div className="flex flex-col gap-1">
                                            {['newest', 'oldest'].map(order => (
                                                <label key={order} className="flex items-center gap-2 p-2 rounded-md hover:bg-gray-50 cursor-pointer">
                                                    <input
                                                        type="radio"
                                                        name="sortOrder"
                                                        checked={sortOrder === order}
                                                        onChange={() => setSortOrder(order)}
                                                        className="accent-[#1E4032]"
                                                    />
                                                    <span className="text-sm capitalize text-gray-700">{order} First</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="h-px bg-gray-100 my-2"></div>

                                    {/* Categories Section */}
                                    <div className="px-2 py-1">
                                        <h4 className="text-xs font-bold text-[#C0934B] uppercase tracking-wider mb-2">Categories</h4>
                                        <div className="flex flex-col gap-1">
                                            {categories.map(category => (
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
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {articles.length > 0 ? (
                <>
                    <div className="flex flex-col gap-6">
                        {articles.map((article) => (
                            <OuterArticleCard
                                key={article.id}
                                id={article.id}
                                productId={article.productId}
                                iconSrc={sharpIcon}
                                title={article.title}
                                date={article.date}
                                description={article.description}
                                category={article.category}
                                author={article.author}
                                sectionCount={article.sectionCount}
                                link={article.link}
                                onReadArticle={onReadArticle}
                                showActions={showActions}
                                priority={article.priority}
                            />
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
            ) : (
                <div className="text-center py-20 bg-gray-50 rounded-2xl border border-dashed border-gray-300">
                    <p className="text-gray-500 text-lg">No articles found matching your criteria.</p>

                </div>
            )}
        </div>
    );
};

export default ArticleList;
