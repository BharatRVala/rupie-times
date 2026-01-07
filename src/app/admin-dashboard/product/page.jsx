"use client";

import { useState, useMemo, useEffect } from "react";
import { FiChevronDown } from "react-icons/fi";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";
import GlobalPromoModal from "../../components/admin/GlobalPromoModal";
import PromoCodeModal from "./PromoCodeModal";
import CreateArticlePopup from "../../components/admin/CreateArticlePopup";
import GlobalLoader from "../../components/GlobalLoader";
import { Search } from "lucide-react";

export default function AdminProductsPage() {
    const router = useRouter();
    // Client-side States
    const [allProducts, setAllProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [categories, setCategories] = useState(["All Categories"]);

    // Filter & Pagination Interface States
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("All Categories");
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [currentPage, setCurrentPage] = useState(1);

    // Modal State
    const [globalModalOpen, setGlobalModalOpen] = useState(false);
    const [personalPromoInfo, setPersonalPromoInfo] = useState({ isOpen: false, productId: null });
    const [articlePopupInfo, setArticlePopupInfo] = useState({ isOpen: false, product: null });
    const [popupDurations, setPopupDurations] = useState([]); // Store durations for the popup
    const [stats, setStats] = useState([
        { id: 1, label: "Total Products", value: 0, subLabel: "All Products" },
        { id: 2, label: "Active", value: 0, subLabel: "Currently Available" },
        { id: 3, label: "Total Articles", value: 0, subLabel: "Across all Products" },
        { id: 4, label: "Pricing Variants", value: 0, subLabel: "All duration products" }
    ]);

    // Fetch All Products
    const fetchProducts = async () => {
        try {
            setLoading(true);
            // Fetch all products (limit=1000) for client-side functionality
            const response = await fetch('/api/admin/products?limit=1000');
            const data = await response.json();

            if (data.success) {
                const mappedProducts = data.products.map(p => ({
                    id: p._id,
                    name: p.name,
                    description: p.description,
                    category: p.category,
                    price: p.price,
                    duration: p.duration,
                    articleCount: p.articleCount,
                    status: p.isActive ? 'Active' : 'Deactive',
                    isActive: p.isActive,
                    image: p.image || '/assets/admin/dummy-product.png',
                    originalData: p
                }));

                setAllProducts(mappedProducts);

                // Update Categories
                if (data.categories) {
                    setCategories(data.categories);
                }

                // Update Stats
                if (data.stats) {
                    setStats(prev => [
                        { ...prev[0], value: data.stats.totalProducts },
                        { ...prev[1], value: data.stats.activeProducts },
                        { ...prev[2], value: data.stats.totalArticles },
                        { ...prev[3], value: data.stats.totalVariants }
                    ]);
                }
            }
        } catch (error) {
            console.error("Error fetching products:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProducts();
    }, []);

    // Filter Logic
    const filteredProducts = useMemo(() => {
        if (!allProducts) return [];

        return allProducts.filter(product => {
            // 1. Category Filter
            if (selectedCategory !== "All Categories") {
                if (product.category !== selectedCategory) return false;
            }

            // 2. Search Filter
            if (!searchQuery) return true;
            const lowerQuery = searchQuery.toLowerCase();
            return (
                (product.name || "").toLowerCase().includes(lowerQuery) ||
                (product.description || "").toLowerCase().includes(lowerQuery)
            );
        });
    }, [allProducts, selectedCategory, searchQuery]);

    // Pagination Logic
    useEffect(() => {
        setCurrentPage(1); // Reset to page 1 on filter change
    }, [selectedCategory, searchQuery, itemsPerPage]);

    const visibleProducts = useMemo(() => {
        if (itemsPerPage === 'All') return filteredProducts;
        const start = (currentPage - 1) * itemsPerPage;
        return filteredProducts.slice(start, start + itemsPerPage);
    }, [filteredProducts, itemsPerPage, currentPage]);

    const totalPages = itemsPerPage === 'All' ? 1 : Math.ceil(filteredProducts.length / itemsPerPage);

    const handlePageChange = (newPage) => {
        if (newPage >= 1 && newPage <= totalPages) {
            setCurrentPage(newPage);
        }
    };

    // Actions
    const openGlobalPromo = () => setGlobalModalOpen(true);
    const openPersonalPromo = (product) => setPersonalPromoInfo({ isOpen: true, productId: product.id });
    const closeModals = () => {
        setGlobalModalOpen(false);
        setPersonalPromoInfo({ isOpen: false, productId: null });
    };
    const openCreateArticlePopup = async (product) => {
        setArticlePopupInfo({ isOpen: true, product });
        setPopupDurations([]); // Reset first

        try {
            const response = await fetch(`/api/admin/products?globalDurations=true`);
            const data = await response.json();
            if (data.success && data.durations) {
                // Map the aggregated durations directly
                const durations = data.durations.map(d => {
                    const formatDate = (dateStr) => {
                        const date = new Date(dateStr);
                        return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
                    };
                    return {
                        issueDate: d.issueDate,
                        issueEndDate: d.issueEndDate,
                        label: `${formatDate(d.issueDate)} - ${formatDate(d.issueEndDate)}`
                    };
                });

                setPopupDurations(durations);
            }
        } catch (error) {
            console.error("Failed to fetch global article durations:", error);
        }
    };
    const closeCreateArticlePopup = () => setArticlePopupInfo({ isOpen: false, product: null });

    const handleCreateArticle = async (articleData) => {
        if (!articlePopupInfo.product) return;
        try {
            let imageData = null;
            if (articleData.image instanceof File) {
                const uploadFormData = new FormData();
                uploadFormData.append('file', articleData.image);
                const uploadRes = await fetch('/api/admin/products/upload-article-image', { method: 'POST', body: uploadFormData });
                const uploadResult = await uploadRes.json();
                if (!uploadResult.success) throw new Error(uploadResult.error || "Image upload failed");
                imageData = {
                    filename: uploadResult.filename,
                    contentType: uploadResult.contentType,
                    size: uploadResult.size,
                    gridfsId: uploadResult.gridfsId
                };
            }
            const payload = {
                mainHeading: articleData.heading,
                description: articleData.description,
                category: articleData.category,
                image: imageData,
                isActive: true,
                issueDate: articleData.issueDate,
                issueEndDate: articleData.issueEndDate,
                isFreeTrial: articleData.isFreeTrial
            };
            const productId = articlePopupInfo.product.id;
            const res = await fetch(`/api/admin/products/${productId}/articles`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            if (data.success) {
                if (data.article?._id) {
                    closeCreateArticlePopup();
                    router.push(`/admin-dashboard/product/${productId}/sections/${data.article._id}`);
                } else {
                    alert("Article created successfully!");
                    closeCreateArticlePopup();
                    fetchProducts();
                }
            } else {
                alert("Failed to create article: " + (data.error || "Unknown error"));
            }
        } catch (error) {
            console.error("Error creating article:", error);
            alert("Error creating article: " + error.message);
        }
    };

    const handleToggleStatus = async (id, currentStatus) => {
        // Optimistic update
        const newStatus = !currentStatus;
        setAllProducts(prev => prev.map(p => p.id === id ? { ...p, isActive: newStatus, status: newStatus ? 'Active' : 'Deactive' } : p));

        try {
            const response = await fetch('/api/admin/products/update', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ productId: id, isActive: newStatus })
            });
            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || "Failed to update status");
            }
        } catch (error) {
            console.error("Error toggling status:", error);
            alert(`Error: ${error.message}`);
            fetchProducts(); // Revert on error
        }
    };

    const handleDeleteProduct = async (id) => {
        if (!confirm('Are you sure you want to delete this product?')) return;
        setAllProducts(prev => prev.filter(p => p.id !== id)); // Optimistic remove
        try {
            const res = await fetch(`/api/admin/products/delete?productId=${id}`, { method: 'DELETE' });
            const data = await res.json();
            if (!data.success) {
                alert(`Failed to delete product: ${data.error}`);
                fetchProducts();
            }
        } catch (error) {
            console.error("Error deleting product:", error);
            alert(`Error deleting product: ${error.message}`);
            fetchProducts();
        }
    };

    if (loading) {
        return (
            <div className="h-[calc(100vh-200px)] w-full relative">
                <GlobalLoader fullScreen={false} />
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6 w-full">
            {globalModalOpen && <GlobalPromoModal isOpen={globalModalOpen} onClose={closeModals} />}
            {personalPromoInfo.isOpen && <PromoCodeModal productId={personalPromoInfo.productId} onClose={closeModals} onUpdate={() => fetchProducts()} />}
            <CreateArticlePopup
                isOpen={articlePopupInfo.isOpen}
                onClose={closeCreateArticlePopup}
                productName={articlePopupInfo.product?.name}
                onSubmit={handleCreateArticle}
                existingDurations={popupDurations}
            />

            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-[#1E1E1E]">Product Management</h1>
                    <p className="text-gray-500 mt-1">Manage your catalog, promos, and articles</p>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={openGlobalPromo} className="flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 border border-[#C0934B] text-[#C0934B] bg-white hover:bg-[#FFF8DC]">
                        <Image src="/assets/plus.svg" alt="Plus" width={14} height={14} />
                        Global Promo
                    </button>
                    <Link href="/admin-dashboard/product/add">
                        <button className="flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 bg-[#C0934B] text-white hover:bg-[#A87F3D]">
                            <Image src="/assets/plus.svg" alt="Plus" width={14} height={14} />
                            Add Product
                        </button>
                    </Link>
                </div>
            </div>

            {/* Stats Cards Section */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {stats.map((stat) => (
                    <div key={stat.id} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-start gap-4">
                        <div className="w-10 h-10 rounded-lg bg-[#EAE0D5] flex items-center justify-center text-[#8B6B3D] shrink-0">
                            <span className="font-semibold text-lg">{stat.value}</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-sm font-bold text-[#1E1E1E]">{stat.label}</span>
                            <span className="text-xs text-gray-500 mt-0.5">{stat.subLabel}</span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Main Content White Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">

                {/* Controls Bar: Items Per Page, Search, Category Filter */}
                <div className="flex flex-col md:flex-row justify-end items-center p-4 border-b border-gray-100 gap-4">
                    <div className="flex items-center gap-3 w-full md:w-auto">

                        {/* Rows Per Page */}
                        <div className="relative">
                            <select
                                value={itemsPerPage}
                                onChange={(e) => setItemsPerPage(e.target.value === 'All' ? 'All' : Number(e.target.value))}
                                className="appearance-none px-4 py-2 pr-8 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C0934B]/50 focus:border-[#C0934B] bg-white cursor-pointer text-sm"
                            >
                                <option value={10}>10</option>
                                <option value={30}>30</option>
                                <option value={50}>50</option>
                                <option value={100}>100</option>
                                <option value="All">All</option>
                            </select>
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                </svg>
                            </div>
                        </div>

                        {/* Search Box */}
                        <div className="relative w-full sm:w-64">
                            <input
                                type="text"
                                placeholder="Search products..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C0934B]/50 focus:border-[#C0934B] transition-colors text-sm"
                            />
                            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                        </div>

                        {/* Category Dropdown */}
                        <div className="relative w-full sm:w-48">
                            <select
                                value={selectedCategory}
                                onChange={(e) => setSelectedCategory(e.target.value)}
                                className="w-full pl-4 pr-10 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C0934B]/50 focus:border-[#C0934B] appearance-none bg-white cursor-pointer text-sm text-ellipsis overflow-hidden"
                            >
                                {categories.map(cat => (
                                    <option key={cat} value={cat}>
                                        {cat}
                                    </option>
                                ))}
                            </select>
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                </svg>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Products Table */}
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[1000px] text-left border-collapse">
                        <thead>
                            <tr className="bg-[#C9A25D] text-white">
                                <th className="px-6 py-4 font-medium text-sm whitespace-nowrap">Product Name</th>
                                <th className="px-6 py-4 font-medium text-sm whitespace-nowrap">Category</th>
                                <th className="px-6 py-4 font-medium text-sm whitespace-nowrap">Price</th>
                                <th className="px-6 py-4 font-medium text-sm whitespace-nowrap">Duration</th>
                                <th className="px-6 py-4 font-medium text-sm whitespace-nowrap">Articles</th>
                                <th className="px-6 py-4 font-medium text-sm whitespace-nowrap">Status</th>
                                <th className="px-6 py-4 font-medium text-sm whitespace-nowrap">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {visibleProducts.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="px-6 py-8 text-center text-gray-500">
                                        {searchQuery ? "No matching products found." : "No products found."}
                                    </td>
                                </tr>
                            ) : (
                                visibleProducts.map((product) => (
                                    <tr key={product.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded bg-gray-200 shrink-0 overflow-hidden relative">
                                                    <Image
                                                        src={product.image}
                                                        alt={product.name || "Product Image"}
                                                        fill
                                                        className="object-cover"
                                                    />
                                                </div>
                                                <div>
                                                    <h3 className="text-sm font-semibold text-[#1E1E1E]">{product.name}</h3>
                                                    <p className="text-xs text-gray-500 max-w-[200px] truncate">{product.description}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="px-3 py-1 bg-[#FFF8DC] text-[#C0934B] text-xs font-medium rounded-full border border-[#FFF8DC]">
                                                {product.category}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-[#1E1E1E] font-medium">
                                            {product.price}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-[#1E1E1E]">
                                            {product.duration}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="px-3 py-1 bg-[#FFF8DC] text-[#C0934B] text-xs font-medium rounded-full border border-[#FFF8DC]">
                                                {product.articleCount} articles
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-3 py-1 text-xs font-medium rounded-full ${product.status === 'Active'
                                                ? 'bg-green-100 text-green-700'
                                                : 'bg-red-100 text-red-600'
                                                }`}>
                                                {product.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <button onClick={() => openCreateArticlePopup(product)} className="w-8 h-8 flex items-center justify-center rounded bg-[#C19A5B] text-white hover:bg-[#A87F3D] transition-colors" title="Add Article">
                                                    <Image src="/assets/plus.svg" alt="Add" width={14} height={14} />
                                                </button>
                                                <Link href={`/admin-dashboard/product/add?id=${product.id}`}>
                                                    <button className="w-8 h-8 flex items-center justify-center rounded bg-[#C19A5B] text-white hover:bg-[#A87F3D] transition-colors" title="Edit">
                                                        <Image src="/assets/edit.svg" alt="Edit" width={12} height={12} />
                                                    </button>
                                                </Link>
                                                <button onClick={() => openPersonalPromo(product)} className="w-8 h-8 flex items-center justify-center rounded bg-[#C19A5B] text-white hover:bg-[#A87F3D] transition-colors" title="Promo Code">
                                                    <Image src="/assets/promo.svg" alt="Promo" width={14} height={14} />
                                                </button>
                                                <Link href={`/admin-dashboard/product/${product.id}`}>
                                                    <button className="w-8 h-8 flex items-center justify-center rounded bg-[#C19A5B] text-white hover:bg-[#A87F3D] transition-colors" title="View">
                                                        <Image src="/assets/eye.svg" alt="View" width={14} height={14} />
                                                    </button>
                                                </Link>
                                                <button onClick={() => handleDeleteProduct(product.id)} className="w-8 h-8 flex items-center justify-center rounded bg-[#C19A5B] text-white hover:bg-[#A87F3D] transition-colors" title="Delete">
                                                    <Image src="/assets/delete.svg" alt="Delete" width={12} height={12} />
                                                </button>
                                                <button onClick={() => handleToggleStatus(product.id, product.isActive)} className={`w-10 h-5 rounded-full relative transition-colors duration-200 ${product.isActive ? 'bg-[#22C55E]' : 'bg-gray-300'}`}>
                                                    <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform duration-200 ${product.isActive ? 'left-[22px]' : 'left-0.5'}`} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Footer */}
                {!loading && totalPages > 1 && (
                    <div className="flex justify-center p-6 border-t border-gray-100">
                        <div className="flex gap-2">
                            <button
                                onClick={() => handlePageChange(currentPage - 1)}
                                disabled={currentPage === 1}
                                className="px-3 py-1 border rounded disabled:opacity-50 hover:bg-gray-50 text-sm"
                            >
                                Prev
                            </button>
                            <span className="px-3 py-1 text-gray-600 text-sm flex items-center">
                                Page {currentPage} of {totalPages}
                            </span>
                            <button
                                onClick={() => handlePageChange(currentPage + 1)}
                                disabled={currentPage === totalPages}
                                className="px-3 py-1 border rounded disabled:opacity-50 hover:bg-gray-50 text-sm"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
