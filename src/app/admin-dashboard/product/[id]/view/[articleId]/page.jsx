"use client";

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { FaArrowLeft, FaColumns, FaBars, FaTimes, FaFacebookF, FaInstagram, FaYoutube, FaEdit, FaTrash, FaRegEdit, FaRegTrashAlt } from 'react-icons/fa';
import { FiPlus } from 'react-icons/fi';
import GlobalLoader from '@/app/components/GlobalLoader';
import sharpIcon from "@/app/assets/sharp.svg";

// Exact replica of ArticleViewPage but adapted for Product Articles
export default function ProductArticleViewPage() {
    // Unpack params
    const params = useParams();
    const productId = params.id;
    const articleId = params.articleId;
    const router = useRouter();

    // Configuration
    const basePath = `/admin-dashboard/product/${productId}`;

    // Data State
    const [article, setArticle] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [sections, setSections] = useState([]);

    // Sidebar State
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isDesktopSidebarOpen, setIsDesktopSidebarOpen] = useState(true);
    const [sidebarArticles, setSidebarArticles] = useState([]);
    const [loadingSidebar, setLoadingSidebar] = useState(true);

    // Image Errors
    const [imageErrors, setImageErrors] = useState({});

    // Fetch Article Data
    useEffect(() => {
        const fetchData = async () => {
            if (!articleId || !productId) return;

            try {
                setLoading(true);
                // Use Product Article fetch
                const response = await fetch(`/api/admin/products/${productId}/articles/${articleId}?t=${Date.now()}`, {
                    cache: 'no-store',
                    headers: {
                        'Pragma': 'no-cache',
                        'Cache-Control': 'no-cache'
                    }
                });
                const data = await response.json();

                if (response.ok && data.success) {
                    const sortedArticle = {
                        ...data.article,
                        // Sections - Use database order
                        sections: data.article.sections || []
                    };
                    setArticle(sortedArticle);
                    setSections(sortedArticle.sections || []);
                } else {
                    setError(data.error || 'Failed to load article');
                }
            } catch (error) {
                setError('Network error');
                console.error(error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [articleId, productId]);

    // Fetch Sidebar (Other Articles in this Product)
    useEffect(() => {
        const fetchSidebarArticles = async () => {
            if (!productId) return;
            try {
                setLoadingSidebar(true);
                // Fetch product details to get articles list
                // We'll use the product detail endpoint which typically returns articles
                const res = await fetch(`/api/admin/products/${productId}`);
                const data = await res.json();

                if (data.success && data.product && data.product.articles) {
                    const filtered = data.product.articles
                        .filter(a => a._id !== articleId && a.id !== articleId)
                        // Sort by latest or order if available
                        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                        .slice(0, 10);
                    setSidebarArticles(filtered);
                }
            } catch (error) {
                console.error('Error fetching sidebar articles:', error);
            } finally {
                setLoadingSidebar(false);
            }
        };
        fetchSidebarArticles();
    }, [articleId, productId]);


    // --- Rendering Logic (Exact Copy from Product View to ensure visual identity) ---

    const handleImageError = (imageId) => {
        setImageErrors(prev => ({ ...prev, [imageId]: true }));
    };

    const getImageUrl = (imageData) => {
        if (!imageData) return null; // FIXED: No random fallback
        if (typeof imageData === 'string') {
            if (imageData.startsWith('http') || imageData.startsWith('data:')) return imageData;
            return `/api/admin/products/image/${imageData}`;
        }
        if (imageData.filename) {
            return `/api/admin/products/image/${imageData.filename}`;
        }
        return null; // FIXED: No random fallback
    };

    const getSafeImageUrl = (imageData, imageId) => {
        if (imageErrors[imageId]) return null; // FIXED: No fallback on error

        // Specific handling for object structure from unified editor
        if (typeof imageData === 'object' && imageData !== null) {
            if (imageData.mode === 'url' && imageData.url) return imageData.url;
            if (imageData.mode === 'upload' && imageData.file) return imageData.file;
        }

        return getImageUrl(imageData);
    };

    // Helper function to parse styled text (Links and Bold)
    const parseStyledText = (text) => {
        if (!text) return null;
        if (typeof text !== 'string') return text;
        const lines = text.split('\n');

        return lines.map((line, lineIdx) => {
            // Simplified parsing matching Product View
            const parts = line.split(/(\*.*?\*)/g);
            return (
                <span key={lineIdx} className="block min-h-[1.5em]">
                    {parts.map((part, pIdx) => {
                        if (part.startsWith('*') && part.endsWith('*')) {
                            return <strong key={pIdx} className="font-bold">{part.slice(1, -1)}</strong>;
                        }
                        return part;
                    })}
                </span>
            );
        });
    };

    const renderBlock = (block, index) => {
        const blockId = block._id || `block-${index}`;

        // Ensure we handle block type correctly
        const type = block.blockType || block.type;
        const content = block.content;

        const getParsedContent = (c, t) => {
            if (typeof c !== 'string') return c;
            const complexTypes = ['link', 'image', 'list', 'table', 'footer'];
            if (!complexTypes.includes(t)) return c;
            try {
                const parsed = JSON.parse(c);
                return (typeof parsed === 'object' && parsed !== null) ? parsed : c;
            } catch (e) { return c; }
        };

        const parsedContent = getParsedContent(content, type);

        // Handle Link Block
        if (type === 'link' || type === 'link') {
            let url = '';
            let text = '';
            let target = '_self';

            if (block.linkConfig) {
                url = block.linkConfig.url;
                text = block.linkConfig.text || content || url;
                target = block.linkConfig.target;
            }
            else if (typeof parsedContent === 'object') {
                url = parsedContent.url;
                text = parsedContent.text || parsedContent.url;
                target = parsedContent.target === 'new' ? '_blank' : '_self';
            }

            if (url) {
                return (
                    <a href={url} target={target} rel={target === '_blank' ? 'noopener noreferrer' : undefined} className="text-[#C0934B] hover:underline font-bold my-4 block text-lg" onClick={(e) => e.stopPropagation()}>
                        {text || url}
                    </a>
                );
            }
        }

        switch (type) {
            case 'heading':
                return <h4 className="text-xl font-bold text-gray-900 mt-4 mb-2">{parseStyledText(content)}</h4>;
            case 'paragraph':
                return <div className="text-gray-700 leading-relaxed mb-4 text-base">{parseStyledText(content)}</div>;
            case 'editor':
            case 'rich_text':
                return (
                    <div className="mb-4 text-base w-full max-w-none break-words overflow-x-auto rich-text-content" style={{ color: 'inherit' }} dangerouslySetInnerHTML={{ __html: typeof content === 'string' ? content : '' }} />
                );
            case 'image':
                const imageId = `image-${blockId}`;
                let rawSrc = null;
                let caption = '';

                if (block.image) {
                    rawSrc = getSafeImageUrl(block.image, imageId);
                    caption = (typeof content === 'string') ? content : ((parsedContent && parsedContent.caption) || '');
                } else {
                    rawSrc = getSafeImageUrl(parsedContent, imageId);
                    caption = (typeof parsedContent === 'object') ? parsedContent.caption : '';
                }

                if (!rawSrc) return null;

                return (
                    <div className="my-6 group relative w-full h-[300px] rounded-xl overflow-hidden shadow-md">
                        <Image src={rawSrc} alt={caption || 'Section Image'} fill className="object-cover" onError={() => handleImageError(imageId)} />
                        {caption && <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white p-2 text-xs text-center">{caption}</div>}
                    </div>
                );
            case 'list':
                let listItems = [];
                if (typeof parsedContent === 'object') {
                    listItems = Array.isArray(parsedContent.items) ? parsedContent.items : (parsedContent.items || '').split('\n').filter(i => i.trim());
                } else {
                    listItems = (parsedContent || '').split('\n').filter(i => i.trim());
                }

                const listConfig = block.listConfig || (typeof parsedContent === 'object' ? {
                    type: parsedContent.style === 'disc' ? 'bullet' : (parsedContent.style === 'decimal' ? 'number' : parsedContent.style),
                    customSymbol: parsedContent.customSymbol,
                    customImage: parsedContent.customImage
                } : { type: 'bullet' });

                if (listConfig.type === 'custom') {
                    let customImageUrl = null;
                    if (listConfig.customImage) {
                        if (typeof listConfig.customImage === 'string') customImageUrl = listConfig.customImage;
                        else if (listConfig.customImage.filename) customImageUrl = `/api/admin/products/image/${listConfig.customImage.filename}`;
                    }

                    return (
                        <ul className="space-y-3 my-4 text-gray-700">
                            {listItems.map((item, i) => (
                                <li key={i} className="flex items-start gap-3">
                                    <span className="flex-shrink-0 mt-1">
                                        {customImageUrl ? (
                                            <img src={customImageUrl} alt="bullet" className="w-5 h-5 object-contain" />
                                        ) : (
                                            <span className="inline-block text-[#C0934B] font-bold">{listConfig.customSymbol || '•'}</span>
                                        )}
                                    </span>
                                    <span className="text-gray-700 text-base">{parseStyledText(item)}</span>
                                </li>
                            ))}
                        </ul>
                    );
                }

                const listStyleMap = {
                    'bullet': 'disc',
                    'disc': 'disc',
                    'circle': 'circle',
                    'square': 'square',
                    'number': 'decimal',
                    'decimal': 'decimal',
                    'lower-alpha': 'lower-alpha',
                    'upper-alpha': 'upper-alpha',
                    'lower-roman': 'lower-roman',
                    'upper-roman': 'upper-roman'
                };

                return (
                    <ul
                        className="pl-6 space-y-2 my-4 list-outside text-gray-700"
                        style={{ listStyleType: listStyleMap[listConfig.type] || listConfig.type || 'disc' }}
                    >
                        {listItems.map((item, i) => (
                            <li key={i} className="text-gray-700 text-base">
                                {parseStyledText(item)}
                            </li>
                        ))}
                    </ul>
                );
            case 'table':
                let tableContent = [];
                if (typeof parsedContent === 'object' && parsedContent.data) tableContent = parsedContent.data;
                else if (typeof parsedContent === 'string') {
                    try { const p = JSON.parse(parsedContent); if (p.data) tableContent = p.data; } catch (e) { }
                }
                if (!tableContent || tableContent.length === 0) return null;
                return (
                    <div className="overflow-x-auto my-6 rounded-lg shadow-sm border border-gray-200">
                        <table className="min-w-full divide-y divide-gray-200">
                            <tbody className="divide-y divide-gray-200">
                                {tableContent.map((row, rowIndex) => (
                                    <tr key={rowIndex} className={rowIndex === 0 ? 'bg-[#D2B48C]' : rowIndex % 2 === 0 ? 'bg-[#FDF5E6]' : 'bg-white'}>
                                        {row.map((cell, colIndex) => (
                                            <td key={colIndex} className={`px-6 py-4 text-sm ${rowIndex === 0 ? 'text-black font-bold tracking-wide' : 'text-gray-700'}`}>{parseStyledText(cell)}</td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                );
            case 'quote':
                return <blockquote className="border-l-4 border-[#C0934B] pl-4 italic text-gray-600 my-4">{parseStyledText(content)}</blockquote>;
            case 'footer':
                const footerData = (typeof parsedContent === 'object') ? parsedContent : {};
                return (
                    <div className="rounded-[15px] border-[0.5px] border-gray-300 overflow-hidden my-4 font-sans bg-white shadow-sm">
                        <div className="bg-[#C0934B] py-4 flex justify-center gap-6 text-white text-lg">
                            {footerData.facebook && (
                                <a href={footerData.facebook} target="_blank" rel="noopener noreferrer" className="hover:scale-110 transition-transform">
                                    <FaFacebookF />
                                </a>
                            )}
                            {footerData.instagram && (
                                <a href={footerData.instagram} target="_blank" rel="noopener noreferrer" className="hover:scale-110 transition-transform">
                                    <FaInstagram />
                                </a>
                            )}
                            {footerData.youtube && (
                                <a href={footerData.youtube} target="_blank" rel="noopener noreferrer" className="hover:scale-110 transition-transform">
                                    <FaYoutube />
                                </a>
                            )}
                            {(!footerData.facebook && !footerData.instagram && !footerData.youtube) && <span className="text-sm opacity-50">Follow Us</span>}
                        </div>
                        <div className="p-6 text-center text-black">
                            <p className="mb-2 text-sm text-gray-900 font-medium">
                                Written By <span className="underline font-bold">{footerData.author || 'Author'}</span>
                            </p>
                            {footerData.subscribeUrl && (
                                <p className="mb-4 text-xs text-gray-900 font-medium">
                                    Subscribe for more updates <a href={footerData.subscribeUrl} target="_blank" rel="noopener noreferrer" className="underline font-bold">Join Now.</a>
                                </p>
                            )}
                            <div className="border-t border-gray-100 w-full pt-4 text-[10px] font-bold text-[#00301F]">
                                {footerData.copyright || `© ${new Date().getFullYear()} Rupie Times. All rights reserved.`}
                            </div>
                        </div>
                    </div>
                );
            default:
                return <div className="text-gray-800 mb-4">{parseStyledText(content)}</div>;
        }
    };


    if (loading) return <GlobalLoader fullScreen={false} className="min-h-[60vh]" />;
    if (error) return <div className="p-8 text-center text-red-500">{error}</div>;
    if (!article) return null;

    const mainImageSrc = getSafeImageUrl(article.image || article.featuredImage, 'featured'); // Calculate once

    return (
        <div className="min-h-screen font-sans bg-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

                {/* Toggle Sidebar Button (Desktop) */}
                <div className="hidden lg:flex justify-end mb-4">
                    <button onClick={() => setIsDesktopSidebarOpen(!isDesktopSidebarOpen)} className="flex items-center gap-2 text-sm font-semibold text-[#00301F] hover:bg-gray-100 px-3 py-1.5 rounded-lg transition-colors" title={isDesktopSidebarOpen ? "Collapse Sidebar" : "Expand Sidebar"}>
                        <FaColumns className="w-4 h-4" /> {isDesktopSidebarOpen ? "Hide Sidebar" : "Show Sidebar"}
                    </button>
                    {/* Add Back Button */}
                    <button onClick={() => router.push(basePath)} className="ml-4 flex items-center gap-2 text-sm font-semibold text-[#C0934B] hover:bg-gray-100 px-3 py-1.5 rounded-lg transition-colors">
                        <FaArrowLeft className="w-3 h-3" /> Back to Product
                    </button>
                </div>

                <div className="flex flex-col lg:flex-row gap-8 lg:gap-12 relative transition-all duration-300 ease-in-out">
                    <div className={`w-full transition-all duration-300 ease-in-out ${isDesktopSidebarOpen ? 'lg:w-[60%]' : 'lg:w-full'}`}>
                        {/* Conditional Rendering for Main Image */}
                        {mainImageSrc && (
                            <div className="relative w-full h-[300px] md:h-[400px] rounded-xl overflow-hidden mb-8">
                                <Image src={mainImageSrc} alt={article.mainHeading} fill className="object-cover" onError={() => handleImageError('featured')} />
                            </div>
                        )}
                        <div className="flex justify-between items-start mb-4">
                            <h1 className="text-3xl md:text-4xl font-bold text-black leading-tight">{article.mainHeading}</h1>
                        </div>
                        <p className="text-gray-600 mb-6 leading-relaxed">{article.description}</p>
                        <div className="flex justify-between items-center text-sm text-gray-500 mb-8 border-b border-gray-200 pb-4">
                            <div className="flex gap-4"><span>Category : <span className="text-black font-medium">{article.category}</span></span></div>
                            <div className="flex gap-4"><span>Published By <span className="text-black font-bold">{article.author}</span></span></div>
                        </div>

                        <div className="space-y-8">
                            {/* Insert Section Button at Top */}
                            <div className="flex justify-center -mb-4 relative z-10">
                                <button
                                    onClick={() => router.push(`/admin-dashboard/product/${productId}/sections/${articleId}?insertAt=${sections.length}`)}
                                    className="w-8 h-8 flex items-center justify-center bg-[#C0934B] text-white rounded-[4px] shadow-md hover:bg-[#A07A3E] transition-all duration-300"
                                    title="Insert section at the top"
                                >
                                    <FiPlus className="w-4 h-4" />
                                </button>
                            </div>

                            {[...sections]
                                .map((s, i) => ({ ...s, originalIndex: i }))
                                .sort((a, b) => {
                                    const aHasFooter = a.contentBlocks?.some(block => block.blockType === 'footer' || block.type === 'footer');
                                    const bHasFooter = b.contentBlocks?.some(block => block.blockType === 'footer' || block.type === 'footer');

                                    // 1. Keep footers at the very bottom
                                    if (aHasFooter && !bHasFooter) return 1;
                                    if (!aHasFooter && bHasFooter) return -1;

                                    // 2. For non-footer sections, show latest first (reverse original order)
                                    if (!aHasFooter && !bHasFooter) {
                                        return b.originalIndex - a.originalIndex;
                                    }

                                    // 3. If both are footers, keep original order
                                    return a.originalIndex - b.originalIndex;
                                })
                                .map((section, displayedIndex) => {
                                    const originalIndex = section.originalIndex;

                                    const sectionStyle = "border-[0.5px] border-gray-300 rounded-[20px] p-6 mb-8 relative backdrop-blur supports-[backdrop-filter]:bg-white/10 bg-white/10 overflow-visible";

                                    // Check if section has non-footer content
                                    const hasHeading = section.heading && section.heading !== 'Untitled Section';

                                    // Filter content (In Admin View, we show EVERYTHING including footers so they can be edited)
                                    const visibleBlocks = section.contentBlocks || [];

                                    if (visibleBlocks.length === 0 && !hasHeading) return null;

                                    return (
                                        <div key={section._id || displayedIndex}>
                                            <div className={sectionStyle} id={`section-${section._id}`}>
                                                <div className="flex items-start mb-4">
                                                    {hasHeading && <h3 className="text-xl font-bold text-black flex-grow">{section.heading}</h3>}
                                                    <div className="flex items-center gap-2 ml-auto">
                                                        <button
                                                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                                                            title="Edit Section"
                                                            onClick={() => router.push(`/admin-dashboard/product/${productId}/sections/${articleId}/${section._id}/edit`)}
                                                        >
                                                            <FaRegEdit className="w-4 h-4 text-[#C0934B]" />
                                                        </button>
                                                        <button
                                                            className="p-2 text-red-600 hover:bg-red-50 rounded-full transition-colors"
                                                            title="Delete Section"
                                                            onClick={async () => {
                                                                if (confirm('Are you sure you want to delete this section?')) {
                                                                    // Optimistic UI Update & Loader
                                                                    const previousSections = [...sections];
                                                                    setSections(sections.filter(s => s._id !== section._id));
                                                                    setLoading(true);

                                                                    try {
                                                                        // Product specific delete
                                                                        const res = await fetch(`/api/admin/products/${productId}/articles/${articleId}/sections/${section._id}`, {
                                                                            method: 'DELETE'
                                                                        });
                                                                        const data = await res.json();

                                                                        if (!data.success) {
                                                                            // Revert if failed
                                                                            setSections(previousSections);
                                                                            alert(data.error || 'Failed to delete section');
                                                                        }
                                                                    } catch (err) {
                                                                        console.error("Delete error", err);
                                                                        setSections(previousSections); // Revert
                                                                        alert('Error deleting section');
                                                                    } finally {
                                                                        setLoading(false);
                                                                    }
                                                                }
                                                            }}
                                                        >
                                                            <FaRegTrashAlt className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </div>

                                                <div className="space-y-6">
                                                    {visibleBlocks.length ?
                                                        visibleBlocks
                                                            .map((block, i) => <div key={i}>{renderBlock(block, i)}</div>)
                                                        : <p className="text-gray-400 italic">No content in this section</p>
                                                    }
                                                </div>
                                            </div>

                                            {/* Insert Section Button - Centered */}
                                            <div className="flex justify-center mb-8 -mt-4 relative z-10">
                                                <button
                                                    onClick={() => router.push(`/admin-dashboard/product/${productId}/sections/${articleId}?insertAt=${originalIndex}`)}
                                                    className="w-8 h-8 flex items-center justify-center bg-[#C0934B] text-white rounded-[4px] shadow-md hover:bg-[#A07A3E] transition-all duration-300"
                                                    title="Insert section here"
                                                >
                                                    <FiPlus className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                        </div>


                    </div>

                    {/* Sidebar */}
                    <div className={`fixed inset-x-0 bottom-0 top-16 sm:top-18 z-40 bg-[#F5F5F7] lg:bg-transparent lg:static lg:h-auto transform transition-all duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'} ${isDesktopSidebarOpen ? 'lg:w-[40%] lg:opacity-100 lg:visible' : 'lg:w-0 lg:opacity-0 lg:invisible lg:overflow-hidden'}`}>
                        <div className="h-full overflow-y-auto p-6 lg:p-0 lg:pl-8">
                            <h2 className="text-2xl font-bold mb-6 hidden lg:block">More from this Product</h2>
                            {loadingSidebar ? (
                                <div className="relative h-64">
                                    <GlobalLoader fullScreen={false} />
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {sidebarArticles.map((item) => (
                                        <div key={item._id} className="border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow backdrop-blur supports-[backdrop-filter]:bg-white/10 bg-white/10">
                                            <div className="flex justify-between items-start mb-2">
                                                <div className="flex items-center gap-2">
                                                    <Image src={sharpIcon} alt="icon" width={16} height={16} />
                                                    <h3 className="font-bold text-sm line-clamp-1">{item.mainHeading}</h3>
                                                </div>
                                                <span className="text-xs text-gray-500 whitespace-nowrap">{new Date(item.createdAt).toLocaleDateString()}</span>
                                            </div>
                                            <p className="text-xs text-gray-600 mb-3 line-clamp-2">{item.description}</p>
                                            <div className="flex justify-between items-center mt-2">
                                                <span className="bg-[#ffec9f80] text-[#C0934B] text-[10px] px-2 py-1 rounded-md font-bold">{item.category}</span>
                                                <Link href={`/admin-dashboard/product/${productId}/view/${item._id}`} className="text-xs font-bold text-[#00301F] flex items-center hover:underline">View <FaArrowLeft className="ml-1 rotate-180 w-3 h-3" /></Link>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="fixed bottom-6 right-6 z-[60] bg-[#00301F] text-white p-4 rounded-full shadow-lg lg:hidden transition-transform duration-300 hover:scale-105 active:scale-95">{isSidebarOpen ? <FaTimes className="w-6 h-6" /> : <FaBars className="w-6 h-6" />}</button>

                </div >
            </div >
        </div >
    );
}
