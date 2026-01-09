'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { FaArrowLeft, FaRegStar, FaStar, FaBars, FaTimes, FaFacebookF, FaInstagram, FaYoutube, FaColumns, FaCheck, FaPrint, FaInbox } from 'react-icons/fa';
import sharpIcon from "../../assets/sharp.svg";
import GlobalLoader from '@/app/components/GlobalLoader';
import LoginRequiredModal from '@/app/components/LoginRequiredModal';
import WarningPopUp from '@/app/components/WarningPopUp';
import MarkAsReadButton from '@/app/components/MarkAsReadButton';
import { useAuth } from '@/hook/useAuth';
import confetti from 'canvas-confetti';
import { useFavorites } from '../../context/FavoritesContext';
import { useCart } from '../../context/CartContext';

const ArticleView = ({
  article,
  userInfo = { isLoggedIn: false },
  readingProgress: initialReadingProgress,
  basePath = '/rupiesTimeTalk',
  showActions = true,
  imageBasePath = '/api/admin/articles/image/',
  sidebarTitle = "All Articles",
  backLabel = "Back To Articles",
  sidebarApi = '/api/user/articles'
}) => {
  const handlePrint = () => {
    window.print();
  };
  const { isLoggedIn } = useAuth();
  const { cartItems } = useCart();
  const { isFavorite, toggleFavorite } = useFavorites();

  // Use context for favorites state
  const isStarred = isFavorite(article ? article._id : null);
  const [sections, setSections] = useState(article ? article.sections || [] : []);

  // Sidebar State
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDesktopSidebarOpen, setIsDesktopSidebarOpen] = useState(true);
  const [sidebarArticles, setSidebarArticles] = useState([]);
  const [loadingSidebar, setLoadingSidebar] = useState(true);

  // Warning Popup State
  const [showWarning, setShowWarning] = useState(false);
  const [warningContent, setWarningContent] = useState({});

  // Reading Progress State
  const [readingProgress, setReadingProgress] = useState(initialReadingProgress || null);
  const [markingRead, setMarkingRead] = useState({});
  const [progressPercentage, setProgressPercentage] = useState(0);
  const [hasCelebrated, setHasCelebrated] = useState(false);

  // Image Errors
  const [imageErrors, setImageErrors] = useState({});

  useEffect(() => {
    if (article) {
      setSections(article.sections || []);
    }
  }, [article]);

  useEffect(() => {
    if (initialReadingProgress) {
      setReadingProgress(initialReadingProgress);
    }
  }, [initialReadingProgress]);

  // Calculate Progress Percentage
  useEffect(() => {
    if (readingProgress && sections.length > 0) {
      const percentage = (readingProgress.readSections?.length / sections.length) * 100;
      const rounded = Math.min(100, Math.max(0, percentage));
      setProgressPercentage(rounded);

      // Celebration if 100%
      if (rounded === 100 && !hasCelebrated) {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 }
        });

        setHasCelebrated(true);
      } else if (rounded < 100 && hasCelebrated) {
        // Reset if they unmark something so it can fire again if they reach 100% again
        setHasCelebrated(false);
      }
    } else {
      setProgressPercentage(0);
    }
  }, [readingProgress, sections.length, hasCelebrated]);

  // Fetch sidebar articles
  useEffect(() => {
    if (!article) return;
    const fetchSidebarArticles = async () => {
      try {
        const res = await fetch(sidebarApi);
        const data = await res.json();

        if (data.success && data.articles) {
          // Filter out current article
          const filtered = data.articles
            .filter(a => a._id !== article._id)
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
  }, [article]);

  const handleFavoriteToggle = async () => {
    if (!isLoggedIn) {
      setWarningContent({
        title: "Sign In to Continue",
        message: "You need to be logged in to favorite this article.",
        actionText: "Sign in",
        articleData: { id: article._id, ...article } // minimal data
      });
      setShowWarning(true);
      return;
    }

    toggleFavorite({
      id: article._id,
      title: article.mainHeading,
      description: article.description,
      category: article.category,
      author: article.author,
      sectionCount: article.sections ? article.sections.length : 0,
    });
  };

  const markSectionAsRead = async (sectionId, timeSpent = 30) => {
    if (!isLoggedIn) {
      setWarningContent({
        title: "Sign In to Save Progress",
        message: "You need to be logged in to mark this section as read.",
        actionText: "Sign in",
        articleData: null
      });
      setShowWarning(true);
      return;
    }

    const wasRead = isSectionRead(sectionId);
    const previousProgress = readingProgress;

    // Optimistically update local state using functional updater to prevent race conditions
    setReadingProgress(prev => {
      const currentReadSections = prev?.readSections || [];
      const currentWasRead = currentReadSections.some(s => s.sectionId === sectionId);
      const newStatus = !currentWasRead;

      let nextReadSections;
      if (newStatus) {
        nextReadSections = [...currentReadSections, { sectionId, readAt: new Date().toISOString() }];
      } else {
        nextReadSections = currentReadSections.filter(s => s.sectionId !== sectionId);
      }

      // Trigger local immediate event for header cup inside the updater or just after
      setTimeout(() => {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('progressUpdated'));
        }
      }, 0);

      return {
        ...prev,
        readSections: nextReadSections,
      };
    });

    try {
      const response = await fetch(`/api/user/articles/${article._id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sectionId,
          timeSpent,
          markCompleted: false,
          isRead: !wasRead // Send the toggled status calculated at the START of this execution
        }),
        credentials: 'include',
        keepalive: true
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          // Sync with official server state (mostly to get accurate 'completed' status or awards)
          setReadingProgress(data.readingProgress);
          // ✅ Dispatch event to update Header Cup
          if (typeof window !== 'undefined') window.dispatchEvent(new Event('progressUpdated'));
        } else {
          // Revert if API logic failed
          setReadingProgress(previousProgress);
        }
      } else {
        setReadingProgress(previousProgress);
      }
    } catch (error) {
      console.error('Error marking section as read:', error);
      setReadingProgress(previousProgress);
    }
  };

  const isSectionRead = (sectionId) => {
    return readingProgress?.readSections?.some(
      section => section.sectionId === sectionId
    ) || false;
  };

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
      return `/api/admin/articles/image/${imageData}`;
    }
    if (imageData.filename) {
      return `/api/admin/articles/image/${imageData.filename}`;
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
        return <h4 className="text-xl font-bold text-gray-900 mt-4 mb-2">{parseStyledText(block.content)}</h4>;
      case 'paragraph':
        return <div className="text-gray-700 leading-relaxed mb-4 text-base">{parseStyledText(block.content)}</div>;
      case 'editor':
      case 'rich_text':
        return (
          <div className="mb-4 text-base w-full max-w-none break-words overflow-x-auto rich-text-content custom-scrollbar" style={{ color: 'inherit' }} dangerouslySetInnerHTML={{ __html: typeof block.content === 'string' ? block.content : '' }} />
        );
      case 'image':
        const imageId = `image-${blockId}`;
        let rawSrc = null;
        let caption = '';

        if (block.image) {
          rawSrc = getSafeImageUrl(block.image, imageId);
          caption = (typeof block.content === 'string') ? block.content : (parsedContent.caption || '');
        } else {
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
          let customImageUrl = null;
          if (listConfig.customImage) {
            if (typeof listConfig.customImage === 'string') customImageUrl = listConfig.customImage;
            else if (listConfig.customImage.filename) customImageUrl = `/api/admin/articles/image/${listConfig.customImage.filename}`;
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
        return <blockquote className="border-l-4 border-[#C0934B] pl-4 italic text-gray-600 my-4">{parseStyledText(block.content)}</blockquote>;
      case 'footer':
        // User side doesn't need admin footer actions usually, but we keep it for consistency if it's content
        // But typically footer block is global footer. We can render it.
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

  if (!article) return null;

  return (
    <div className="min-h-screen font-sans relative">
      <WarningPopUp
        isOpen={showWarning}
        onClose={() => setShowWarning(false)}
        title={warningContent.title}
        message={warningContent.message}
        actionText={warningContent.actionText}
        articleData={warningContent.articleData}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Header: Back Link & Progress for Desktop */}
        <div className="mb-6">
          <Link href={basePath} className="hidden lg:inline-flex items-center gap-2 text-sm font-semibold text-[#00301F] hover:underline mb-4">
            <FaArrowLeft className="w-3 h-3" /> {backLabel}
          </Link>

          {/* Reading Progress Bar (Visible if actions enabled) */}
          {showActions && (
            <div className="w-full">
              <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-200 overflow-hidden">
                <div
                  className="bg-[#C0934B] h-2.5 rounded-full transition-all duration-700 ease-in-out"
                  style={{ width: `${progressPercentage}%` }}
                ></div>
              </div>
              <div className="text-right text-xs text-gray-500 font-bold mt-2">
                {Math.round(progressPercentage)}% Completed
              </div>
            </div>
          )}
        </div>

        {/* Toggle Sidebar Button (Desktop) & Mobile Back */}
        <div className="flex justify-between items-center mb-4 lg:justify-end">
          <div className="lg:hidden">
            <Link href={basePath} className="flex items-center gap-2 text-sm font-semibold text-[#C0934B] hover:bg-gray-100 px-3 py-1.5 rounded-lg transition-colors">
              <FaArrowLeft className="w-3 h-3" /> Back to List
            </Link>
          </div>

          <div className="hidden lg:flex">
            <button onClick={() => setIsDesktopSidebarOpen(!isDesktopSidebarOpen)} className="flex items-center gap-2 text-sm font-semibold text-[#00301F] hover:bg-gray-100 px-3 py-1.5 rounded-lg transition-colors" title={isDesktopSidebarOpen ? "Collapse Sidebar" : "Expand Sidebar"}>
              <FaColumns className="w-4 h-4" /> {isDesktopSidebarOpen ? "Hide Sidebar" : "Show Sidebar"}
            </button>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-8 lg:gap-12 relative transition-all duration-300 ease-in-out">
          <div id="article-print-content" className={`w-full transition-all duration-300 ease-in-out ${isDesktopSidebarOpen ? 'lg:w-[60%]' : 'lg:w-full'}`}>

            {/* Main Thumbnail */}
            {/* Main Thumbnail */}
            {(() => {
              const mainImgSrc = getSafeImageUrl(article.featuredImage || article.image, 'featured');
              return mainImgSrc && (
                <div className="relative w-full aspect-video rounded-xl overflow-hidden mb-8">
                  <Image src={mainImgSrc} alt={article.mainHeading} fill className="object-cover" onError={() => handleImageError('featured')} />
                </div>
              );
            })()}

            {/* Title & Star */}
            <div className="flex justify-between items-start mb-4">
              <h1 className="text-3xl md:text-4xl font-bold text-black leading-tight">
                {article.mainHeading}
              </h1>
              {showActions && (
                <button
                  onClick={handleFavoriteToggle}
                  className="p-2 focus:outline-none transition-transform active:scale-95"
                >
                  {isStarred ? (
                    <FaStar className="w-6 h-6 text-[#C0934B]" />
                  ) : (
                    <FaRegStar className="w-6 h-6 text-[#C0934B]" />
                  )}
                </button>
              )}
            </div>

            {/* Description */}
            <p className="text-gray-600 mb-6 leading-relaxed">
              {article.description}
            </p>

            {/* Meta Info */}
            <div className="flex justify-between items-center text-sm text-gray-500 mb-8 border-b border-gray-200 pb-4">
              <div className="flex gap-4">
                <span>Category : <span className="text-black font-medium">{article.category}</span></span>
              </div>
              <div className="flex gap-4">
                <span>Published By <span className="text-black font-bold">{article.author}</span></span>
              </div>
            </div>

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
                  const sectionStyle = "border-[0.5px] border-gray-300 rounded-[20px] p-6 mb-8 relative backdrop-blur supports-[backdrop-filter]:bg-white/10 bg-white/10 max-w-full overflow-hidden break-words";
                  const isRead = isSectionRead(section._id);

                  // Logic from Subscription View: Filter out footers
                  const nonFooterBlocks = section.contentBlocks?.filter(block => block.blockType !== 'footer' && block.type !== 'footer') || [];
                  const hasHeading = section.heading && section.heading !== 'Untitled Section'; // Basic check, usually heading is present?

                  // If section becomes empty after filtering footers, hide it
                  if (nonFooterBlocks.length === 0) return null;

                  return (
                    <div key={section._id || index} className={sectionStyle} id={`section-${section._id}`}>
                      <div className="flex justify-between items-start mb-4">
                        <h3 className="text-xl font-bold text-black">{section.heading}</h3>
                        {/* No Admin Actions here */}
                      </div>

                      <div className="space-y-6">
                        {nonFooterBlocks
                          .sort((a, b) => a.order - b.order)
                          .map((block, i) => <div key={i}>{renderBlock(block, i)}</div>)
                        }
                      </div>

                      <div className="h-2"></div>
                      {showActions && (
                        <div className="flex justify-end mt-4 pt-4 border-t border-gray-200/50">
                          <MarkAsReadButton
                            isRead={isRead}
                            onClick={() => markSectionAsRead(section._id, 30)}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}

              {/* Global Footer (Rendered at the very bottom) - Extract from sections */}
              {(() => {
                let hasFooter = false;
                // Find ALL footers across all sections
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

                // Render Default Footer if absolutely no footer found
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

            </div>

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

          </div>

          {/* Sidebar */}
          <div className={`
             fixed inset-x-0 bottom-0 top-16 sm:top-18 z-40 bg-[#F5F5F7] lg:bg-transparent lg:static lg:h-auto 
             transform transition-all duration-300 ease-in-out
             ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}
             ${isDesktopSidebarOpen ? 'lg:w-[40%] lg:opacity-100 lg:visible' : 'lg:w-0 lg:opacity-0 lg:invisible lg:overflow-hidden'}
           `}>
            <div className="h-full overflow-y-auto p-6 lg:p-0 lg:pl-8">
              <h2 className="text-2xl font-bold mb-6 hidden lg:block">{sidebarTitle}</h2>
              {loadingSidebar ? (
                <div className="relative h-64">
                  <GlobalLoader fullScreen={false} />
                </div>
              ) : (
                <div className="space-y-4">
                  {sidebarArticles.length > 0 ? (
                    sidebarArticles.map((item) => (
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
                          <Link href={`${basePath}/${item._id}`} className="text-xs font-bold text-[#00301F] flex items-center hover:underline">Read More <FaArrowLeft className="ml-1 rotate-180 w-3 h-3" /></Link>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="flex flex-col items-center justify-center py-10 px-4 text-center border border-dashed border-gray-300 rounded-xl bg-gray-50/50">
                      <div className="bg-white p-3 rounded-full mb-3 shadow-sm">
                        <FaInbox className="w-6 h-6 text-gray-400" />
                      </div>
                      <p className="text-sm font-bold text-gray-600">No other articles found</p>
                      <p className="text-xs text-gray-500 mt-1 max-w-[200px]">There are no other articles available in this section at the moment.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className={`fixed right-6 z-[60] bg-[#00301F] text-white p-4 rounded-full shadow-lg lg:hidden transition-all duration-300 hover:scale-105 active:scale-95 ${cartItems && cartItems.length > 0 ? 'bottom-24' : 'bottom-6'}`}
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
};

export default ArticleView;
