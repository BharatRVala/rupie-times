"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { FaArrowLeft, FaRegStar, FaStar, FaBars, FaTimes, FaFacebookF, FaInstagram, FaYoutube, FaColumns, FaCheck, FaPrint, FaInbox } from 'react-icons/fa';
import GlobalLoader from '@/app/components/GlobalLoader';
import MarkAsReadButton from '@/app/components/MarkAsReadButton';
import WarningPopUp from '@/app/components/WarningPopUp';
import sharpIcon from "@/app/assets/sharp.svg";
import confetti from 'canvas-confetti';

import { useFavorites } from '@/app/context/FavoritesContext';

export default function SingleArticlePage({ params }) {
    const handlePrint = () => {
        window.print();
    };

    // Unpack params
    const { id: paramProductId, articleId: paramArticleId } = React.use(params);

    const router = useRouter();
    const { isFavorite, toggleFavorite } = useFavorites();

    // Data State
    const [article, setArticle] = useState(null);
    const [product, setProduct] = useState(null);
    const [loading, setLoading] = useState(true); // Main loading state
    const [error, setError] = useState(null);

    // UI State (matching ArticleView)
    // const [isStarred, setIsStarred] = useState(false); // Removed local state
    const isStarred = isFavorite(paramArticleId); // Use context

    const [sections, setSections] = useState([]);

    // Sidebar State
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isDesktopSidebarOpen, setIsDesktopSidebarOpen] = useState(true);
    const [sidebarArticles, setSidebarArticles] = useState([]);
    const [loadingSidebar, setLoadingSidebar] = useState(true);

    // Warning Popup State
    const [showWarning, setShowWarning] = useState(false);
    const [warningContent, setWarningContent] = useState({});

    // Reading Progress State
    const [readingProgress, setReadingProgress] = useState(null);
    const [markingRead, setMarkingRead] = useState({});
    const [progressPercentage, setProgressPercentage] = useState(0);

    // Image Errors
    const [imageErrors, setImageErrors] = useState({});

    // Filter State
    const [filterStartDate, setFilterStartDate] = useState('');
    const [filterEndDate, setFilterEndDate] = useState('');

    const basePath = `/user-dashboard/subscription`;

    // --- Data Fetching ---

    // Initial Data Fetch
    useEffect(() => {
        const fetchData = async () => {
            try {
                if (paramProductId && paramArticleId) {
                    await fetchArticle(paramProductId, paramArticleId);
                }
            } catch (error) {
                console.error("Error resolving params:", error);
                setError("Failed to load page parameters");
                setLoading(false);
            }
        };
        fetchData();
    }, [paramProductId, paramArticleId]);

    // Sidebar Articles Fetch
    useEffect(() => {
        const fetchSidebarArticles = async () => {
            if (!paramProductId || !paramArticleId) return;
            try {
                setLoadingSidebar(true);
                const res = await fetch(`/api/user/products/${paramProductId}/articles`);
                const data = await res.json();
                if (data.success && data.articles) {
                    const filtered = data.articles
                        .filter(a => a._id !== paramArticleId);
                    setSidebarArticles(filtered);
                }
            } catch (error) {
                console.error('Error fetching sidebar articles:', error);
            } finally {
                setLoadingSidebar(false);
            }
        };

        // Only fetch sidebar if we have the main article loaded or at least the IDs
        if (article || (paramProductId && paramArticleId)) {
            fetchSidebarArticles();
        }
    }, [article, paramProductId, paramArticleId]);


    // Article Fetch Function
    const fetchArticle = async (productId, articleId) => {
        try {
            setLoading(true);
            const response = await fetch(`/api/user/products/${productId}/articles/${articleId}`, { credentials: 'include', cache: 'no-store' });
            const data = await response.json();

            if (response.ok && data.success) {
                const sortedArticle = {
                    ...data.article,
                    sections: data.article.sections || []
                };

                setArticle(sortedArticle);
                setSections(sortedArticle.sections || []);
                setProduct(data.product);
                setReadingProgress(data.readingProgress);

                // No need to check favorite status manually anymore, context handles it
            } else {
                setError(data.error || 'Failed to load article');
                // If unauthorized, redirect might be handled by middleware or here
                if (response.status === 401) {
                    // router.push('/auth/login'); // Optional: redirect if needed
                }
            }
        } catch (error) {
            setError('Network error');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    // Removed checkArticleFavoriteStatus

    // --- Effects for UI Logic ---

    // Calculate Progress Percentage
    useEffect(() => {
        if (readingProgress && sections.length > 0) {
            // Helper to check if section is pure footer
            const isPureFooterSection = (section) => {
                if (!section.contentBlocks || section.contentBlocks.length === 0) return false;
                return section.contentBlocks.every(b => b.blockType === 'footer' || b.type === 'footer');
            };

            // Filter out pure footer sections from total count logic on frontend
            const validSections = sections.filter(s => !isPureFooterSection(s));
            const totalValidSections = validSections.length;

            if (totalValidSections === 0) {
                setProgressPercentage(0);
                return;
            }

            // Filter only valid READ sections that exist in validSections
            const validReadSections = readingProgress.readSections?.filter(rs =>
                validSections.some(s => s._id === rs.sectionId)
            ) || [];

            const percentage = (validReadSections.length / totalValidSections) * 100;
            const rounded = Math.min(100, Math.max(0, percentage));
            setProgressPercentage(rounded);

            // Celebration if 100%
            if (rounded === 100 && !readingProgress.celebrated) {
                confetti({
                    particleCount: 100,
                    spread: 70,
                    origin: { y: 0.6 }
                });
            }
        } else {
            setProgressPercentage(0);
        }
    }, [readingProgress, sections]);


    // --- Handlers ---

    const handleFavoriteToggle = async () => {
        // Use Context Toggle
        toggleFavorite({
            id: paramArticleId,
            productId: paramProductId,
            title: article.mainHeading,
            description: article.description,
            category: article.category,
            author: article.author,
            sectionCount: article.sections ? article.sections.length : 0,
        });
    };

    const markSectionAsRead = async (sectionId, timeSpent = 30) => {
        const isCurrentlyRead = isSectionRead(sectionId);

        // Optimistic UI Update
        const previousProgress = { ...readingProgress };
        const newReadSections = isCurrentlyRead
            ? (readingProgress.readSections || []).filter(s => (s.sectionId || s._id) !== sectionId)
            : [...(readingProgress.readSections || []), { sectionId, readAt: new Date() }];

        setReadingProgress(prev => ({
            ...prev,
            readSections: newReadSections
        }));

        // ✅ Trigger immediate event for header cup update (Optimistic)
        if (typeof window !== 'undefined') {
            // Small timeout to allow state to settle if needed, or just immediate
            setTimeout(() => window.dispatchEvent(new Event('progressUpdated')), 0);
        }

        setMarkingRead(prev => ({ ...prev, [sectionId]: true }));
        try {
            const response = await fetch(`/api/user/products/${paramProductId}/articles/${article._id}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sectionId,
                    timeSpent,
                    unread: isCurrentlyRead
                }),
                credentials: 'include'
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    setReadingProgress(data.readingProgress);
                    // ✅ Dispatch again after server update to ensure header gets fresh data
                    if (typeof window !== 'undefined') window.dispatchEvent(new Event('progressUpdated'));
                } else {
                    setReadingProgress(previousProgress);
                    // Revert event if failed (optional, but good practice to notify again to re-fetch true state)
                    if (typeof window !== 'undefined') window.dispatchEvent(new Event('progressUpdated'));
                }
            } else {
                setReadingProgress(previousProgress);
                if (typeof window !== 'undefined') window.dispatchEvent(new Event('progressUpdated'));
            }
        } catch (e) {
            console.error(e);
            setReadingProgress(previousProgress);
        }
        finally { setMarkingRead(prev => ({ ...prev, [sectionId]: false })); }
    };

    const isSectionRead = (sectionId) => {
        return (readingProgress?.readSections || []).some(
            section => (section.sectionId || section._id) === sectionId
        ) || false;
    };

    // --- Render Helpers ---

    const handleImageError = (imageId) => {
        setImageErrors(prev => ({ ...prev, [imageId]: true }));
    };

    const getImageUrl = (imageData) => {
        if (!imageData) {
            return null;
        }
        if (typeof imageData === 'string') {
            if (imageData.startsWith('http') || imageData.startsWith('data:')) return imageData;
            // Use specific admin image route for consistency
            return `/api/admin/products/image/${imageData}`;
        }
        if (imageData.filename) {
            return `/api/admin/products/image/${imageData.filename}`;
        }
        return null;
    };

    const getSafeImageUrl = (imageData, imageId) => {
        if (imageErrors[imageId]) {
            return null;
        }

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

        const getParsedContent = (content, type) => {
            if (typeof content !== 'string') return content;
            const complexTypes = ['link', 'image', 'list', 'table', 'footer'];
            if (!complexTypes.includes(type)) return content;
            try {
                const parsed = JSON.parse(content);
                return (typeof parsed === 'object' && parsed !== null) ? parsed : content;
            } catch (e) { return content; }
        };

        const parsedContent = getParsedContent(block.content, block.blockType || block.type); // Handle mixed 'type' keys

        // Handle Link Block
        if (block.type === 'link' || block.blockType === 'link') {
            let url = '';
            let text = '';
            let target = '_self';

            // 1. Try linkConfig (New Schema)
            if (block.linkConfig) {
                url = block.linkConfig.url;
                text = block.linkConfig.text || block.content || url;
                target = block.linkConfig.target;
            }
            // 2. Try JSON content (Old Schema) OR parsed content
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

        const bType = block.blockType || block.type;

        switch (bType) {
            case 'heading':
                return <h4 className="text-xl font-bold text-gray-900 mt-4 mb-2 break-words max-w-full">{parseStyledText(block.content)}</h4>;
            case 'paragraph':
                return <div className="text-gray-700 leading-relaxed mb-4 text-base break-words max-w-full">{parseStyledText(block.content)}</div>;
            case 'editor':
            case 'rich_text':
                return (
                    <div className="mb-4 text-base w-full max-w-full break-words overflow-x-auto rich-text-content" style={{ color: 'inherit' }} dangerouslySetInnerHTML={{ __html: typeof block.content === 'string' ? block.content : '' }} />
                );
            case 'image':
                const imageId = `image-${blockId}`;

                // DATA RECOVERY STRATEGY:
                // 1. New Format: block.image has metadata, block.content has caption string
                // 2. Old Format: block.content is JSON object with file/url and caption

                let rawSrc = null;
                let caption = '';

                if (block.image) {
                    // New Format Logic
                    rawSrc = getSafeImageUrl(block.image, imageId);
                    caption = (typeof block.content === 'string') ? block.content : (parsedContent.caption || '');
                } else {
                    // Fallback to Old Format Logic
                    rawSrc = getSafeImageUrl(parsedContent, imageId);
                    caption = (typeof parsedContent === 'object') ? parsedContent.caption : '';
                }

                if (!rawSrc) return null;

                return (
                    <div className="my-6 group relative w-full aspect-video rounded-xl overflow-hidden shadow-md">
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
                    // Handle custom image URL resolution
                    let customImageUrl = null;
                    if (listConfig.customImage) {
                        if (typeof listConfig.customImage === 'string') customImageUrl = listConfig.customImage;
                        else if (listConfig.customImage.filename) customImageUrl = `/api/admin/products/image/${listConfig.customImage.filename}`;
                    }

                    return (
                        <ul className="space-y-3 my-4 text-gray-700 max-w-full">
                            {listItems.map((item, i) => (
                                <li key={i} className="flex items-start gap-3 max-w-full">
                                    <span className="flex-shrink-0 mt-1">
                                        {customImageUrl ? (
                                            <img src={customImageUrl} alt="bullet" className="w-5 h-5 object-contain" />
                                        ) : (
                                            <span className="inline-block text-[#C0934B] font-bold">{listConfig.customSymbol || '•'}</span>
                                        )}
                                    </span>
                                    <span className="text-gray-700 text-base break-words max-w-full">{parseStyledText(item)}</span>
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
                        className="pl-6 space-y-2 my-4 list-outside text-gray-700 max-w-full"
                        style={{ listStyleType: listStyleMap[listConfig.type] || listConfig.type || 'disc' }}
                    >
                        {listItems.map((item, i) => (
                            <li key={i} className="text-gray-700 text-base break-words max-w-full">
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
                    <div className="overflow-x-auto my-6 rounded-lg shadow-sm border border-gray-200 max-w-full">
                        <table className="min-w-full divide-y divide-gray-200">
                            <tbody className="divide-y divide-gray-200">
                                {tableContent.map((row, rowIndex) => (
                                    <tr key={rowIndex} className={rowIndex === 0 ? 'bg-[#D2B48C]' : rowIndex % 2 === 0 ? 'bg-[#FDF5E6]' : 'bg-white'}>
                                        {row.map((cell, colIndex) => (
                                            <td key={colIndex} className={`px-6 py-4 text-sm break-words ${rowIndex === 0 ? 'text-black font-bold tracking-wide' : 'text-gray-700'}`}>{parseStyledText(cell)}</td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                );
            case 'quote':
                return <blockquote className="border-l-4 border-[#C0934B] pl-4 italic text-gray-600 my-4 break-words max-w-full">{parseStyledText(block.content)}</blockquote>;
            case 'footer':
                const footerData = (typeof parsedContent === 'object') ? parsedContent : {};

                return (
                    <div className="rounded-[15px] border-[0.5px] border-gray-300 overflow-hidden my-4 font-sans bg-white shadow-sm">
                        <div className="bg-[#C0934B] py-4 flex justify-center gap-6 text-white text-lg">
                            <a href={footerData.facebook || '#'} target="_blank" rel="noopener noreferrer" className="hover:scale-110 transition-transform">
                                <FaFacebookF />
                            </a>
                            <a href={footerData.instagram || '#'} target="_blank" rel="noopener noreferrer" className="hover:scale-110 transition-transform">
                                <FaInstagram />
                            </a>
                            <a href={footerData.youtube || '#'} target="_blank" rel="noopener noreferrer" className="hover:scale-110 transition-transform">
                                <FaYoutube />
                            </a>
                        </div>

                        <div className="p-6 text-center text-black">
                            <p className="mb-2 text-sm text-gray-900 font-medium">
                                Written By <Link href="/" className="underline font-bold text-[#C0934B] hover:text-[#00301F] transition-colors">
                                    {(footerData.author === 'bharat Admin' || !footerData.author) ? 'Rupie Time' : footerData.author}
                                </Link>
                            </p>

                            <p className="mb-4 text-xs text-gray-900 font-medium">
                                Subscribe for more updates <Link href="/products" className="underline font-bold text-[#C0934B] hover:text-[#00301F] transition-colors">Join Now.</Link>
                            </p>

                            <div className="border-t border-gray-100 w-full pt-4 text-[10px] font-bold text-[#00301F]">
                                {footerData.copyright || `© ${new Date().getFullYear()} Rupie Times. All rights reserved.`}
                            </div>
                        </div>
                    </div>
                );
            default:
                return <div className="text-gray-800 mb-4">{parseStyledText(block.content)}</div>;
        }
    };


    if (loading) return <GlobalLoader fullScreen={false} className="absolute inset-0 bg-white" />;
    if (error) return <div className="p-8 text-center text-red-500">{error}</div>;
    if (!article) return null;

    return (
        <div className="min-h-screen font-sans">
            <WarningPopUp
                isOpen={showWarning}
                onClose={() => setShowWarning(false)}
                title={warningContent.title}
                message={warningContent.message}
                actionText={warningContent.actionText}
                articleData={warningContent.articleData}
            />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

                {/* Header: Back Button & Progress */}
                <div className="mb-8 flex flex-col gap-4">
                    <Link
                        href="/user-dashboard/subscription"
                        className="inline-flex items-center text-[#00301F] hover:underline font-medium w-fit"
                    >
                        <FaArrowLeft className="mr-2" /> Back To subscription
                    </Link>

                    {/* Progress Bar */}
                    <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-200 overflow-hidden">
                        <div
                            className="bg-[#C0934B] h-2.5 rounded-full transition-all duration-700 ease-in-out"
                            style={{ width: `${progressPercentage}%` }}
                        ></div>
                    </div>
                    <div className="text-right text-xs text-gray-500 font-bold">
                        {Math.round(progressPercentage)}% Completed
                    </div>
                </div>

                {/* Toggle Sidebar Button (Desktop) */}
                <div className="hidden lg:flex justify-end mb-4">
                    <button
                        onClick={() => setIsDesktopSidebarOpen(!isDesktopSidebarOpen)}
                        className="flex items-center gap-2 text-sm font-semibold text-[#00301F] hover:bg-gray-100 px-3 py-1.5 rounded-lg transition-colors"
                        title={isDesktopSidebarOpen ? "Collapse Sidebar" : "Expand Sidebar"}
                    >
                        <FaColumns className="w-4 h-4" />
                        {isDesktopSidebarOpen ? "Hide Sidebar" : "Show Sidebar"}
                    </button>
                </div>

                <div className="flex flex-col lg:flex-row gap-8 lg:gap-12 relative transition-all duration-300 ease-in-out">

                    {/* Main Content */}
                    <div id="article-print-content" className={`w-full transition-all duration-300 ease-in-out ${isDesktopSidebarOpen ? 'lg:w-[60%]' : 'lg:w-full'}`}>

                        {/* Main Thumbnail */}
                        {(() => {
                            const mainImgSrc = getSafeImageUrl(article.image, 'featured');
                            return mainImgSrc && (
                                <div className="relative w-full aspect-video rounded-xl overflow-hidden mb-8">
                                    <Image
                                        src={mainImgSrc}
                                        alt={article.mainHeading}
                                        fill
                                        className="object-cover"
                                        onError={() => handleImageError('featured')}
                                    />
                                </div>
                            );
                        })()}

                        {/* Title */}
                        <div className="mb-4">
                            <h1 className="text-3xl md:text-4xl font-bold text-black leading-tight">
                                {article.mainHeading}
                            </h1>
                        </div>

                        {/* Description */}
                        <p className="text-gray-600 mb-6 leading-relaxed">
                            {article.description}
                        </p>

                        {/* Meta Info & Star */}
                        <div className="flex justify-between items-center text-sm text-gray-500 mb-8 border-b border-gray-200 pb-4">
                            <div className="flex gap-4">
                                <span>Category : <span className="text-black font-medium">{article.category}</span></span>
                            </div>
                            <div className="flex gap-4 items-center">
                                {/* Only show 'Published by Author' if available */}
                                {article.author && (
                                    <span>Published By <span className="text-black font-bold">{article.author}</span></span>
                                )}
                                <button
                                    onClick={handleFavoriteToggle}
                                    className="p-2 focus:outline-none transition-transform active:scale-95 ml-2"
                                >
                                    {isStarred ? (
                                        <FaStar className="w-6 h-6 text-[#C0934B]" />
                                    ) : (
                                        <FaRegStar className="w-6 h-6 text-[#C0934B]" />
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Dynamic Sections */}
                        {/* Dynamic Sections */}
                        <div className="space-y-8">
                            {[...sections]
                                .map((s, i) => ({ ...s, originalIndex: i }))
                                .sort((a, b) => {
                                    const aHasFooter = a.contentBlocks?.some(block => block.blockType === 'footer' || block.type === 'footer');
                                    const bHasFooter = b.contentBlocks?.some(block => block.blockType === 'footer' || block.type === 'footer');
                                    if (aHasFooter && !bHasFooter) return 1;
                                    if (!aHasFooter && bHasFooter) return -1;
                                    if (!aHasFooter && !bHasFooter) return b.originalIndex - a.originalIndex;
                                    return a.originalIndex - b.originalIndex;
                                })
                                .map((section) => {
                                    const index = section.originalIndex;
                                    const sectionStyle = "border-[0.5px] border-gray-300 rounded-[20px] p-6 mb-8 relative backdrop-blur supports-[backdrop-filter]:bg-white/10 bg-white/10";
                                    const isRead = isSectionRead(section._id);

                                    // Check if section has non-footer content
                                    const hasNonFooterContent = section.contentBlocks?.some(block => block.blockType !== 'footer' && block.type !== 'footer');
                                    const hasHeading = section.heading && section.heading !== 'Untitled Section';

                                    // If section only has footer(s) and no heading, we might skip rendering the empty shell
                                    // But let's just filter content for now.

                                    const nonFooterBlocks = section.contentBlocks?.filter(block => block.blockType !== 'footer' && block.type !== 'footer') || [];

                                    if (nonFooterBlocks.length === 0 && !hasHeading) return null;

                                    return (
                                        <div key={section._id || index} className={sectionStyle} id={`section-${section._id}`}>
                                            {hasHeading && (
                                                <h3 className="text-xl font-bold mb-4 flex justify-between items-center text-black">
                                                    {section.heading}
                                                </h3>
                                            )}

                                            <div className="space-y-6">
                                                {nonFooterBlocks
                                                    .sort((a, b) => a.order - b.order)
                                                    .map((block, index) => (
                                                        <div key={block._id || index}>
                                                            {renderBlock(block, index)}
                                                        </div>
                                                    ))}
                                            </div>

                                            <div className="h-2"></div>
                                            <div className="flex justify-end mt-4 pt-4 border-t border-gray-200/50">
                                                <MarkAsReadButton
                                                    isRead={isRead}
                                                    onClick={() => markSectionAsRead(section._id, 30)}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                        </div>

                        {/* Global Footer (Rendered at the bottom) */}
                        {(() => {
                            let hasFooter = false;
                            const footerElements = sections.flatMap(s => s.contentBlocks || [])
                                .filter(b => b.blockType === 'footer' || b.type === 'footer')
                                .map((footerBlock, idx) => {
                                    hasFooter = true;
                                    return (
                                        <div key={`global-footer-${idx}`} className="mt-8">
                                            {renderBlock(footerBlock, idx)}
                                        </div>
                                    );
                                });

                            if (hasFooter) {
                                return footerElements;
                            }

                            // Render Default Footer if no footer found
                            const defaultFooterBlock = {
                                type: 'footer',
                                content: JSON.stringify({
                                    author: 'Rupie Time',
                                    facebook: '#',
                                    instagram: '#',
                                    youtube: '#',
                                    subscribeUrl: '/products'
                                })
                            };
                            return <div className="mt-8">{renderBlock(defaultFooterBlock, 'default-footer')}</div>;
                        })()}


                        {/* Print Button */}
                        <div className="mt-8 mb-8 flex justify-end print:hidden">
                            <button
                                onClick={handlePrint}
                                className="flex items-center gap-2 bg-[#C0934B] text-white px-6 py-3 rounded-lg hover:bg-[#a87f3d] transition-colors font-bold"
                            >
                                <FaPrint className="w-5 h-5" />
                                Print Article
                            </button>
                        </div>
                    </div>







                    <style jsx global>{`
                        @media print {
                            @page {
                                margin-top: 20px;
                                margin-bottom: 20px;
                                margin-left: 20px;
                                margin-right: 20px;
                                size: auto;
                            }

                            /* 1. Reset Global Constraints */
                            html, body {
                                height: auto !important;
                                min-height: 0 !important;
                                margin: 0 !important;
                                padding: 0 !important;
                                overflow: visible !important;
                                width: 100% !important;
                                background: white !important;
                                -webkit-print-color-adjust: exact !important;
                                print-color-adjust: exact !important;
                            }

                            /* 2. Hide Everything by default */
                            body * {
                                display: none !important;
                            }

                            /* 3. Unhide Layout Path */
                            html:has(#article-print-content), 
                            body:has(#article-print-content),
                            #__next:has(#article-print-content),
                            div:has(#article-print-content),
                            main:has(#article-print-content) {
                                display: block !important;
                                height: auto !important;
                                min-height: 0 !important;
                                margin: 0 !important;
                                padding: 0 !important;
                                border: none !important;
                                position: static !important;
                                overflow: visible !important;
                            }

                            /* 4. Show content */
                            #article-print-content, 
                            #article-print-content * {
                                display: block !important;
                                visibility: visible !important;
                                opacity: 1 !important;
                            }

                            /* RESTORE DISPLAY TYPES */
                            #article-print-content .flex {
                                display: flex !important;
                            }
                            #article-print-content span {
                                display: inline-block !important; 
                            }
                            #article-print-content li {
                                display: flex !important;
                                align-items: flex-start !important; 
                            }
                            
                            /* CRITICAL: RESTORE TABLE DISPLAY TYPES */
                            /* The global 'display: block' kills tables. Restore them here. */
                            #article-print-content table { display: table !important; }
                            #article-print-content thead { display: table-header-group !important; }
                            #article-print-content tbody { display: table-row-group !important; }
                            #article-print-content tr { display: table-row !important; }
                            #article-print-content td, #article-print-content th { display: table-cell !important; }

                            /* 5. Positioning */
                            #article-print-content {
                                position: relative !important;
                                width: 100% !important;
                                padding-top: 0 !important; 
                                z-index: 2147483647;
                            }

                            /* FORCE TOP SPACER */
                            #article-print-content::before {
                                content: "" !important;
                                display: block !important;
                                height: 50px !important; 
                                width: 100% !important;
                            }

                            /* 6. FIX MAIN IMAGES - Target only specific image wrappers */
                            #article-print-content .relative.h-\[300px\],
                            #article-print-content .relative.md\:h-\[400px\] {
                                position: relative !important;
                                display: block !important;
                                overflow: hidden !important;
                                width: 100% !important;
                            }
                            
                            /* Correct Height Overrides */
                            #article-print-content .relative.h-\[300px\] { height: 300px !important; }
                            #article-print-content .relative.md\:h-\[400px\] { height: 400px !important; }

                            /* Target images ONLY inside these wrappers */
                            #article-print-content .relative.h-\[300px\] img,
                            #article-print-content .relative.md\:h-\[400px\] img {
                                position: absolute !important;
                                top: 0 !important;
                                left: 0 !important;
                                width: 100% !important;
                                height: 100% !important;
                                object-fit: cover !important;
                                max-width: none !important;
                            }
                            
                            /* 7. FIX LIST ICONS */
                            #article-print-content ul img,
                            #article-print-content li img,
                            #article-print-content .w-5 {
                                width: 20px !important;     
                                height: 20px !important;
                                min-width: 20px !important; 
                                max-width: 20px !important;
                                object-fit: contain !important;
                                position: static !important;
                                margin-top: 4px !important;
                                display: inline-block !important;
                                border: none !important;
                                box-shadow: none !important;
                            }

                            /* 8. FIX TABLES */
                            #article-print-content .overflow-x-auto {
                                overflow: visible !important;
                                display: block !important;
                            }
                            #article-print-content table {
                                width: 100% !important;
                                border-collapse: collapse !important;
                                table-layout: auto !important; 
                                font-size: 12px !important; 
                            }
                            #article-print-content td, #article-print-content th {
                                border: 1px solid #000 !important;
                                padding: 6px !important;
                                word-break: normal !important; 
                                white-space: normal !important; 
                                vertical-align: top !important;
                            }
                            #article-print-content tr.bg-\[\#D2B48C\] { background-color: #D2B48C !important; -webkit-print-color-adjust: exact; }
                            #article-print-content tr.bg-\[\#FDF5E6\] { background-color: #FDF5E6 !important; -webkit-print-color-adjust: exact; }

                            /* 9. Layout Cleanups */
                            h1, h2, h3, h4, p, tr {
                                page-break-inside: avoid;
                            }
                            
                            .print\\:hidden {
                                display: none !important;
                            }
                            
                            #article-print-content > div:first-child {
                                margin-top: 0 !important;
                            }
                        }
                    `}</style>

                    {/* Sidebar */}
                    <div className={`
                        fixed inset-x-0 bottom-0 top-16 sm:top-18 z-40 bg-[#F5F5F7] lg:bg-transparent lg:static lg:h-auto
                        transform transition-all duration-300 ease-in-out
                        ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}
                        ${isDesktopSidebarOpen ? 'lg:w-[40%] lg:opacity-100 lg:visible' : 'lg:w-0 lg:opacity-0 lg:invisible lg:overflow-hidden'}
                    `}>
                        <div className="h-full overflow-y-auto p-6 lg:p-0 lg:pl-8">
                            <div className="flex justify-between items-center mb-6 lg:hidden">
                                <h2 className="text-2xl font-bold">All Articles</h2>
                            </div>

                            <h2 className="text-2xl font-bold mb-6 hidden lg:block">All Articles</h2>

                            {/* --- Date Filter Section --- */}
                            <div className="mb-6 p-4 bg-white/50 rounded-xl border border-gray-200 shadow-sm backdrop-blur sticky top-0 z-10">
                                <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2"><FaInbox className="text-[#C0934B]" /> Filter By Article Issue Date</h3>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-xs text-gray-500 font-semibold mb-1 block">Start Date</label>
                                        <input
                                            type="date"
                                            value={filterStartDate}
                                            onChange={(e) => setFilterStartDate(e.target.value)}
                                            className="w-full text-xs p-2 rounded-lg border border-gray-300 focus:outline-none focus:border-[#C0934B] bg-white/70"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs text-gray-500 font-semibold mb-1 block">End Date</label>
                                        <input
                                            type="date"
                                            value={filterEndDate}
                                            onChange={(e) => setFilterEndDate(e.target.value)}
                                            className="w-full text-xs p-2 rounded-lg border border-gray-300 focus:outline-none focus:border-[#C0934B] bg-white/70"
                                        />
                                    </div>
                                </div>
                                {(filterStartDate || filterEndDate) && (
                                    <button
                                        onClick={() => { setFilterStartDate(''); setFilterEndDate(''); }}
                                        className="w-full mt-3 text-xs bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold py-2 rounded-lg transition-colors"
                                    >
                                        Clear Filter
                                    </button>
                                )}
                            </div>

                            {loadingSidebar ? (
                                <div className="space-y-4">
                                    {[1, 2, 3].map(i => (
                                        <div key={i} className="border border-gray-200 rounded-xl p-4 bg-white/10 animate-pulse h-32"></div>
                                    ))}
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {(() => {
                                        // 1. FILTER Logic
                                        let filteredArticles = sidebarArticles;
                                        if (filterStartDate || filterEndDate) {
                                            const start = filterStartDate ? new Date(filterStartDate) : null;
                                            const end = filterEndDate ? new Date(filterEndDate) : null;
                                            if (end) end.setHours(23, 59, 59, 999); // End of day

                                            filteredArticles = sidebarArticles.filter(a => {
                                                const d = new Date(a.createdAt);
                                                if (start && d < start) return false;
                                                if (end && d > end) return false;
                                                return true;
                                            });
                                        }

                                        if (filteredArticles.length === 0) {
                                            return (
                                                <div className="flex flex-col items-center justify-center py-10 px-4 text-center border border-dashed border-gray-300 rounded-xl bg-gray-50/50">
                                                    <div className="bg-white p-3 rounded-full mb-3 shadow-sm">
                                                        <FaInbox className="w-6 h-6 text-gray-400" />
                                                    </div>
                                                    <p className="text-sm font-bold text-gray-600">No matching articles</p>
                                                    <p className="text-xs text-gray-500 mt-1 max-w-[200px]">Try adjusting your date filters.</p>
                                                </div>
                                            );
                                        }

                                        // 2. GROUPING Logic
                                        const grouped = filteredArticles.reduce((acc, article) => {
                                            const formatDate = (d) => {
                                                if (!d) return null;
                                                const date = new Date(d);
                                                return date.toLocaleDateString('en-GB'); // DD/MM/YYYY
                                            };

                                            const start = formatDate(article.issueDate);
                                            const end = formatDate(article.issueEndDate);

                                            // Handle invalid dates or missing issue dates (Group them under "Other")
                                            // Ensure we don't catch "Invalid Date" strings
                                            const key = (start && end && start !== 'Invalid Date' && end !== 'Invalid Date')
                                                ? `Issue Date From ${start} To ${end}`
                                                : 'Other Articles';

                                            if (!acc[key]) acc[key] = [];
                                            acc[key].push(article);
                                            return acc;
                                        }, {});

                                        return Object.entries(grouped).map(([header, articles]) => (
                                            <div key={header} className="mb-6">
                                                <h3 className="font-bold text-xs text-[#1e4032] mb-3 pl-1">{header}</h3>
                                                <div className="space-y-4">
                                                    {articles.map((item) => (
                                                        <div key={item._id} className="border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow backdrop-blur supports-[backdrop-filter]:bg-white/10 bg-white/10">
                                                            <div className="flex justify-between items-start mb-2">
                                                                <div className="flex items-center gap-2">
                                                                    <Image src={sharpIcon} alt="icon" width={16} height={16} />
                                                                    <h3 className="font-bold text-sm line-clamp-1">{item.mainHeading}</h3>
                                                                </div>
                                                                <span className="text-xs text-gray-500 whitespace-nowrap">
                                                                    {new Date(item.createdAt).toLocaleDateString()}
                                                                </span>
                                                            </div>
                                                            <p className="text-xs text-gray-600 mb-3 line-clamp-2">{item.description}</p>
                                                            <div className="flex justify-between items-center mt-2">
                                                                <span className="bg-[#ffec9f80] text-[#C0934B] text-[10px] px-2 py-1 rounded-md font-bold">
                                                                    {item.category}
                                                                </span>
                                                                <Link
                                                                    href={`${basePath}/${paramProductId}/articles/${item._id}`}
                                                                    className="text-xs font-bold text-[#00301F] flex items-center hover:underline"
                                                                >
                                                                    Read More <FaArrowLeft className="ml-1 rotate-180 w-3 h-3" />
                                                                </Link>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ));
                                    })()}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Mobile Sidebar Toggle */}
                    <button
                        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                        className="fixed bottom-6 right-6 z-[60] bg-[#00301F] text-white p-4 rounded-full shadow-lg lg:hidden transition-transform duration-300 hover:scale-105 active:scale-95"
                    >
                        {isSidebarOpen ? (
                            <FaTimes className="w-6 h-6" />
                        ) : (
                            <FaBars className="w-6 h-6" />
                        )}
                    </button>

                </div>
            </div>
        </div>
    );
}
