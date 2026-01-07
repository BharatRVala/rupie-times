"use client";

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { FaArrowLeft, FaColumns, FaBars, FaTimes, FaFacebookF, FaInstagram, FaYoutube, FaRegEdit, FaRegTrashAlt } from 'react-icons/fa';
import { FiPlus } from 'react-icons/fi';
import GlobalLoader from '@/app/components/GlobalLoader';
import sharpIcon from "@/app/assets/sharp.svg";

export default function NewsViewPage() {
    // Unpack params
    const params = useParams();
    const newsId = params.id;
    const router = useRouter();

    // Configuration
    const basePath = `/admin-dashboard/news`;

    // Data State
    const [news, setNews] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [sections, setSections] = useState([]);

    // Sidebar State
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isDesktopSidebarOpen, setIsDesktopSidebarOpen] = useState(true);
    const [sidebarNews, setSidebarNews] = useState([]);
    const [loadingSidebar, setLoadingSidebar] = useState(true);

    // Image Errors
    const [imageErrors, setImageErrors] = useState({});

    // Fetch News Data
    useEffect(() => {
        const fetchData = async () => {
            if (!newsId) return;

            try {
                setLoading(true);
                const response = await fetch(`/api/admin/news/${newsId}`);
                const data = await response.json();

                if (response.ok && data.success) {
                    const sortedNews = {
                        ...data.article,
                        sections: data.article.sections || []
                    };
                    setNews(sortedNews);
                    setSections(sortedNews.sections || []);
                } else {
                    setError(data.error || 'Failed to load news');
                }
            } catch (error) {
                setError('Network error');
                console.error(error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [newsId]);

    // Fetch Sidebar (Recent News)
    useEffect(() => {
        const fetchSidebarNews = async () => {
            try {
                setLoadingSidebar(true);
                const res = await fetch(`/api/admin/news?limit=10`);
                const data = await res.json();
                if (data.success && data.articles) {
                    const filtered = data.articles
                        .filter(a => a._id !== newsId && a.id !== newsId)
                        .slice(0, 10);
                    setSidebarNews(filtered);
                }
            } catch (error) {
                console.error('Error fetching sidebar news:', error);
            } finally {
                setLoadingSidebar(false);
            }
        };
        fetchSidebarNews();
    }, [newsId]);


    // --- Rendering Logic ---

    const handleImageError = (imageId) => {
        setImageErrors(prev => ({ ...prev, [imageId]: true }));
    };

    const getImageUrl = (imageData) => {
        if (!imageData) {
            return `https://picsum.photos/800/400?random=${Math.random()}`;
        }
        if (typeof imageData === 'string') {
            if (imageData.startsWith('http') || imageData.startsWith('data:')) return imageData;
            return `/api/admin/news/image/${imageData}`;
        }
        if (imageData.filename) {
            return `/api/admin/news/image/${imageData.filename}`;
        }
        return `https://picsum.photos/800/400?random=${Math.random()}`;
    };

    const getSafeImageUrl = (imageData, imageId) => {
        if (imageErrors[imageId]) {
            return `https://picsum.photos/800/400?random=${Math.random()}`;
        }
        if (typeof imageData === 'object' && imageData !== null) {
            if (imageData.mode === 'url' && imageData.url) return imageData.url;
            // News doesn't really use this structure as much but keeping for safety
            // usually news images are Objects with filename
        }
        return getImageUrl(imageData);
    };

    const parseStyledText = (text) => {
        if (!text) return null;
        if (typeof text !== 'string') return text;
        const lines = text.split('\n');

        return lines.map((line, lineIdx) => {
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

    const parseTable = (content) => {
        if (!content) return [];
        if (typeof content === 'object' && content.data) return content.data;

        if (typeof content === 'string') {
            try {
                const parsed = JSON.parse(content);
                if (parsed.data) return parsed.data;
            } catch (e) {
                // Not JSON, carry on
            }

            const rows = content.trim().split('\n').filter(r => r.trim());
            if (rows.length >= 2) {
                const headers = rows[0].split('|').filter(cell => cell.trim());
                const dataStartIndex = rows[1].includes('---') ? 2 : 1;
                const body = rows.slice(dataStartIndex).map(r => r.split('|').filter(c => c.trim()));
                if (headers.length > 0) return [headers, ...body];
            }
        }
        return [];
    };

    const renderBlock = (block, index) => {
        const blockId = block._id || `block-${index}`;
        const bType = block.blockType || block.type;

        // Simplified parsing for Admin View
        const content = typeof block.content === 'string' && ['link', 'image', 'list', 'table', 'footer'].includes(bType)
            ? (() => { try { return JSON.parse(block.content); } catch (e) { return block.content; } })()
            : block.content;

        switch (bType) {
            case 'heading':
                return <h4 className="text-xl font-bold text-gray-900 mt-4 mb-2 leading-tight">{parseStyledText(block.content)}</h4>;
            case 'paragraph':
                return <div className="text-gray-700 leading-relaxed mb-4 text-base space-y-2">{parseStyledText(block.content)}</div>;
            case 'rich_text':
            case 'editor':
                return (
                    <div
                        className="mb-6 rich-text-content"
                        dangerouslySetInnerHTML={{ __html: block.content }}
                    />
                );
            case 'quote':
                return (
                    <blockquote className="border-l-4 border-[#C0934B] pl-4 italic text-gray-700 text-lg py-2 my-6 bg-gray-50 rounded-r-lg">
                        {parseStyledText(block.content)}
                    </blockquote>
                );
            case 'image':
                const img = typeof content === 'object' ? content : { url: content };
                const url = img.mode === 'upload' ? img.file : (img.url || getSafeImageUrl(block.image || content, `img-${blockId}`));
                if (!url) return null;
                return (
                    <figure className="my-8 space-y-3">
                        <div className="relative w-full h-[400px] rounded-2xl overflow-hidden shadow-lg border border-gray-100">
                            <img src={url} alt={img.caption || 'News Image'} className="w-full h-full object-cover" />
                        </div>
                        {img.caption && (
                            <figcaption className="text-center text-sm text-gray-500 italic font-medium px-10">
                                {img.caption}
                            </figcaption>
                        )}
                    </figure>
                );
            case 'table':
                const tableData = parseTable(block.content);
                if (tableData.length === 0) return null;
                return (
                    <div className="overflow-x-auto my-8 bg-white rounded-xl border border-gray-200 shadow-sm">
                        <table className="w-full text-sm text-left border-collapse">
                            <tbody>
                                {tableData.map((row, ri) => (
                                    <tr key={ri} className={ri === 0 ? "bg-[#D2B48C] font-bold text-gray-900" : "border-b border-gray-100 hover:bg-gray-50 transition-colors"}>
                                        {row.map((cell, ci) => (
                                            <td key={ci} className="px-6 py-4 border-r border-gray-100 last:border-r-0">
                                                {parseStyledText(cell)}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                );
            case 'list':
                const listData = typeof content === 'object' ? content : { items: content, style: 'bullet' };
                const items = (listData.items || '').split('\n').filter(i => i.trim());
                const style = listData.style || 'bullet';
                const listStyleMap = { 'bullet': 'disc', 'disc': 'disc', 'circle': 'circle', 'square': 'square', 'number': 'decimal', 'decimal': 'decimal' };

                if (style === 'custom') {
                    const customImage = listData.customImage ? (typeof listData.customImage === 'string' && !listData.customImage.startsWith('data:') ? `/api/admin/news/image/${listData.customImage}` : listData.customImage) : null;
                    return (
                        <ul className="space-y-4 my-6">
                            {items.map((it, i) => (
                                <li key={i} className="flex items-start gap-4 text-gray-700">
                                    <span className="flex-shrink-0 mt-1.5">
                                        {customImage ? <img src={customImage} className="w-4 h-4 object-contain" /> : <span className="text-[#C0934B] font-black text-xs">{listData.customSymbol || '•'}</span>}
                                    </span>
                                    <span className="leading-relaxed text-base">{parseStyledText(it)}</span>
                                </li>
                            ))}
                        </ul>
                    );
                }
                return (
                    <ul className="pl-6 space-y-3 my-6 text-gray-700 list-outside text-base" style={{ listStyleType: listStyleMap[style] || style || 'disc' }}>
                        {items.map((it, i) => <li key={i} className="leading-relaxed">{parseStyledText(it)}</li>)}
                    </ul>
                );
            case 'link':
                const link = typeof content === 'object' ? content : { url: block.content, text: 'Review Link', target: 'same' };
                return (
                    <a
                        href={link.url}
                        target={link.target === 'new' ? '_blank' : '_self'}
                        className="inline-flex items-center gap-2 text-[#C0934B] font-bold hover:underline py-2 my-4 text-lg group"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {link.text || 'Review Link'}
                        <span className="text-sm group-hover:translate-x-1 transition-transform">↗</span>
                    </a>
                );
            case 'footer':
                const foot = typeof content === 'object' ? content : { author: 'Admin' };
                return (
                    <div className="rounded-[15px] border-[0.5px] border-gray-300 overflow-hidden my-4 font-sans bg-white shadow-sm mt-12">
                        <div className="bg-[#C0934B] py-4 flex justify-center gap-6 text-white text-lg">
                            {foot.facebook && <a href={foot.facebook} target="_blank" rel="noopener noreferrer"><FaFacebookF className="hover:scale-110 transition-transform cursor-pointer" /></a>}
                            {foot.instagram && <a href={foot.instagram} target="_blank" rel="noopener noreferrer"><FaInstagram className="hover:scale-110 transition-transform cursor-pointer" /></a>}
                            {foot.youtube && <a href={foot.youtube} target="_blank" rel="noopener noreferrer"><FaYoutube className="hover:scale-110 transition-transform cursor-pointer" /></a>}
                            {(!foot.facebook && !foot.instagram && !foot.youtube) && (
                                <div className="flex gap-6 opacity-50">
                                    <FaFacebookF /> <FaInstagram /> <FaYoutube />
                                </div>
                            )}
                        </div>

                        <div className="p-6 text-center text-black">
                            <p className="mb-2 text-sm text-gray-900 font-medium">
                                Written By <span className="underline font-bold">{foot.author || 'Author Name'}</span>
                            </p>

                            {foot.subscribeUrl && (
                                <p className="mb-4 text-xs text-gray-900 font-medium">
                                    Subscribe for more updates <a href={foot.subscribeUrl} target="_blank" rel="noopener noreferrer" className="underline font-bold">Join Now.</a>
                                </p>
                            )}

                            <div className="border-t border-gray-100 w-full pt-4 text-[10px] font-bold text-[#00301F]">
                                {foot.copyright || `© ${new Date().getFullYear()} Rupie Times. All rights reserved.`}
                            </div>
                        </div>
                    </div>
                );
            default:
                return <div className="text-gray-800 mb-4">{parseStyledText(block.content)}</div>;
        }
    };


    if (loading) return <GlobalLoader fullScreen={false} className="min-h-[60vh]" />;
    if (error) return <div className="p-8 text-center text-red-500">{error}</div>;
    if (!news) return null;

    return (
        <div className="min-h-screen font-sans bg-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

                {/* Header Actions */}
                <div className="hidden lg:flex justify-end mb-4">
                    <button onClick={() => setIsDesktopSidebarOpen(!isDesktopSidebarOpen)} className="flex items-center gap-2 text-sm font-semibold text-[#00301F] hover:bg-gray-100 px-3 py-1.5 rounded-lg transition-colors" title={isDesktopSidebarOpen ? "Collapse Sidebar" : "Expand Sidebar"}>
                        <FaColumns className="w-4 h-4" /> {isDesktopSidebarOpen ? "Hide Sidebar" : "Show Sidebar"}
                    </button>
                    <button onClick={() => router.push(basePath)} className="ml-4 flex items-center gap-2 text-sm font-semibold text-[#C0934B] hover:bg-gray-100 px-3 py-1.5 rounded-lg transition-colors">
                        <FaArrowLeft className="w-3 h-3" /> Back to List
                    </button>
                </div>

                <div className="flex flex-col lg:flex-row gap-8 lg:gap-12 relative transition-all duration-300 ease-in-out">
                    <div className={`w-full transition-all duration-300 ease-in-out ${isDesktopSidebarOpen ? 'lg:w-[60%]' : 'lg:w-full'}`}>
                        {news.featuredImage && (
                            <div className="relative w-full h-[300px] md:h-[400px] rounded-xl overflow-hidden mb-8">
                                <Image src={getSafeImageUrl(news.featuredImage, 'featured')} alt={news.mainHeading} fill className="object-cover" onError={() => handleImageError('featured')} />
                            </div>
                        )}
                        <div className="mb-4">
                            <h1 className="text-3xl md:text-4xl font-bold text-black leading-tight">{news.mainHeading}</h1>
                        </div>
                        <p className="text-gray-600 mb-6 leading-relaxed">{news.description}</p>
                        <div className="flex justify-between items-center text-sm text-gray-500 mb-8 border-b border-gray-200 pb-4">
                            <div className="flex gap-4"><span>Category : <span className="text-black font-medium">{news.category}</span></span></div>
                            <div className="flex gap-4"><span>Published By <span className="text-black font-bold">{news.author || news.createdBy}</span></span></div>
                        </div>

                        <div className="flex justify-center mb-8 relative z-10 px-2 border-b border-gray-200 pb-8">
                            <button
                                onClick={() => router.push(`/admin-dashboard/news/sections/${newsId}`)}
                                className="flex items-center gap-2 px-6 py-3 bg-[#C0934B] text-white rounded-lg shadow-md hover:bg-[#A07A3E] transition-all duration-300 font-bold text-lg"
                            >
                                <FiPlus className="w-5 h-5" /> Add Section
                            </button>
                        </div>

                        <div className="space-y-8">
                            {/* Add to Top Button (Appends to end of array, visually top) */}
                            {sections.length > 0 && (
                                <div className="flex justify-center mb-4 -mt-4 relative z-10 px-2">
                                    <button
                                        onClick={() => router.push(`/admin-dashboard/news/sections/${newsId}?position=${sections.length}`)}
                                        className="w-8 h-8 flex items-center justify-center bg-[#C0934B] text-white rounded-[4px] shadow-md hover:bg-[#A07A3E] transition-all duration-300"
                                        title="Add section to the top"
                                    >
                                        <FiPlus className="w-4 h-4" />
                                    </button>
                                </div>
                            )}

                            {sections
                                .map((section, index) => ({ ...section, originalIndex: index }))
                                .sort((a, b) => {
                                    const aHasFooter = a.contentBlocks?.some(block => (block.blockType || block.type) === 'footer');
                                    const bHasFooter = b.contentBlocks?.some(block => (block.blockType || block.type) === 'footer');

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
                                .map((section, index) => {
                                    const sectionStyle = "border-[0.5px] border-gray-300 rounded-[20px] p-6 mb-8 relative backdrop-blur supports-[backdrop-filter]:bg-white/10 bg-white/10 max-w-full overflow-hidden break-words hover:shadow-md transition-shadow";
                                    const trueIndex = section.originalIndex;
                                    return (
                                        <div key={section._id || index}>
                                            <div className={sectionStyle} id={`section-${section._id}`}>
                                                <div className="flex justify-between items-start mb-4">
                                                    <h3 className="text-xl font-bold text-black">{section.heading}</h3>
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                                                            title="Edit Section"
                                                            onClick={() => router.push(`/admin-dashboard/news/sections/${newsId}/${section._id}/edit`)}
                                                        >
                                                            <FaRegEdit className="w-4 h-4 text-[#C0934B]" />
                                                        </button>
                                                        <button
                                                            className="p-2 text-red-600 hover:bg-red-50 rounded-full transition-colors"
                                                            title="Delete Section"
                                                            onClick={async () => {
                                                                if (confirm('Are you sure you want to delete this section?')) {
                                                                    try {
                                                                        const res = await fetch(`/api/admin/news/${newsId}/sections/${section._id}`, {
                                                                            method: 'DELETE'
                                                                        });
                                                                        const data = await res.json();
                                                                        if (data.success) {
                                                                            setSections(sections.filter(s => s._id !== section._id));
                                                                        } else {
                                                                            alert(data.error || 'Failed to delete section');
                                                                        }
                                                                    } catch (err) {
                                                                        console.error("Delete error", err);
                                                                        alert('Error deleting section');
                                                                    }
                                                                }
                                                            }}
                                                        >
                                                            <FaRegTrashAlt className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </div>
                                                <div className="space-y-6">
                                                    {section.contentBlocks?.length ?
                                                        section.contentBlocks
                                                            .sort((a, b) => a.order - b.order)
                                                            .map((block, i) => <div key={i}>{renderBlock(block, i)}</div>)
                                                        :
                                                        <p className="text-gray-500 italic">No content blocks</p>
                                                    }
                                                </div>
                                            </div>

                                            {/* Insert Section Button (Visually Below) */}
                                            <div className="flex justify-center mb-8 -mt-4 relative z-10 px-2">
                                                <button
                                                    onClick={() => router.push(`/admin-dashboard/news/sections/${newsId}?position=${trueIndex}`)}
                                                    className="w-8 h-8 flex items-center justify-center bg-[#C0934B] text-white rounded-[4px] shadow-md hover:bg-[#A07A3E] transition-all duration-300"
                                                    title={trueIndex === 0 ? "Add section to the bottom" : `Insert section at position ${trueIndex}`}
                                                >
                                                    <FiPlus className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}

                            {/* Sections are now rendered via map above including footer */}
                        </div>

                    </div>

                    {/* Sidebar */}
                    <div className={`fixed inset-x-0 bottom-0 top-16 sm:top-18 z-40 bg-[#F5F5F7] lg:bg-transparent lg:static lg:h-auto transform transition-all duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'} ${isDesktopSidebarOpen ? 'lg:w-[40%] lg:opacity-100 lg:visible' : 'lg:w-0 lg:opacity-0 lg:invisible lg:overflow-hidden'}`}>
                        <div className="h-full overflow-y-auto p-6 lg:p-0 lg:pl-8">
                            <h2 className="text-2xl font-bold mb-6 hidden lg:block">Latest News</h2>
                            {loadingSidebar ? (
                                <div className="relative h-64">
                                    <GlobalLoader fullScreen={false} />
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {sidebarNews.map((item) => (
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
                                                <Link href={`/admin-dashboard/news/${item._id}`} className="text-xs font-bold text-[#00301F] flex items-center hover:underline">Preview <FaArrowLeft className="ml-1 rotate-180 w-3 h-3" /></Link>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                    <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="fixed bottom-6 right-6 z-[60] bg-[#00301F] text-white p-4 rounded-full shadow-lg lg:hidden transition-transform duration-300 hover:scale-105 active:scale-95">{isSidebarOpen ? <FaTimes className="w-6 h-6" /> : <FaBars className="w-6 h-6" />}</button>

                </div>
            </div>
        </div>
    );
}
