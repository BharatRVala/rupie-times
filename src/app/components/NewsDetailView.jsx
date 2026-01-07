'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { FaArrowLeft, FaTimes, FaBars, FaFacebookF, FaInstagram, FaYoutube, FaColumns, FaInbox } from 'react-icons/fa';
import GlobalLoader from './GlobalLoader';
import sharpIcon from "../assets/sharp.svg";

// Helper for image URLs
const getImageUrl = (item) => {
  if (!item) return '/placeholder.png';
  const imageBasePath = '/api/admin/news/image/';
  // Handle new structure where image might be in different fields
  const img = item.featuredImage || item.thumbnail || item.image || item; // item if directly passed as filename/object

  if (!img) {
    return (item.sections?.find(s => s.type === 'text_image')?.content?.image) || '/placeholder.png';
  }

  if (typeof img === 'object' && img.filename) {
    return `${imageBasePath}${img.filename}`;
  }

  if (typeof img === 'string') {
    if (img.startsWith('http')) return img;
    return `${imageBasePath}${img}`;
  }

  return '/placeholder.png';
};

const NewsDetailView = ({ newsItem, onBack, allNews, loading, onSelectNews }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDesktopSidebarOpen, setIsDesktopSidebarOpen] = useState(true);
  const [imageErrors, setImageErrors] = useState({});

  // Sidebar Filtering (Everything except current)
  const sidebarNews = allNews ? allNews.filter(n => n._id !== newsItem?._id).slice(0, 10) : [];

  const handleImageError = (imageId) => {
    setImageErrors(prev => ({ ...prev, [imageId]: true }));
  };

  const getSafeImageUrl = (imageData, imageId) => {
    if (imageErrors[imageId]) {
      return `https://picsum.photos/800/400?random=${Math.random()}`;
    }
    return getImageUrl(imageData);
  };

  // Helper function to parse styled text (Bold with *text*)
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

  // Render content blocks (Aligned with ArticleView)
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

    const parsedContent = getParsedContent(block.content, block.blockType || block.type);

    // Link Block
    if (block.type === 'link' || block.blockType === 'link') {
      let url = '';
      let text = '';
      let target = '_self';

      if (block.linkConfig) {
        url = block.linkConfig.url;
        text = block.linkConfig.text || block.content || url;
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

    const bType = block.blockType || block.type;

    switch (bType) {
      case 'heading':
        return <h4 className="text-xl font-bold text-gray-900 mt-4 mb-2">{parseStyledText(block.content)}</h4>;
      case 'paragraph':
        return <div className="text-gray-700 leading-relaxed mb-4 text-base">{parseStyledText(block.content)}</div>;
      case 'rich_text':
      case 'editor':
        return (
          <div
            className="mb-6 rich-text-content"
            dangerouslySetInnerHTML={{ __html: typeof block.content === 'string' ? block.content : '' }}
          />
        );
      case 'image':
        const imageId = `image-${blockId}`;
        let rawSrc = null;
        let caption = '';

        if (block.image) {
          rawSrc = getSafeImageUrl(block.image, imageId);
          caption = (typeof block.content === 'string') ? block.content : (parsedContent.caption || '');
        } else {
          rawSrc = getSafeImageUrl(parsedContent.image || parsedContent, imageId);
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
            if (typeof listConfig.customImage === 'string') customImageUrl = listConfig.customImage.startsWith('http') ? listConfig.customImage : `/api/admin/news/image/${listConfig.customImage}`;
            else if (listConfig.customImage.filename) customImageUrl = `/api/admin/news/image/${listConfig.customImage.filename}`;
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
          'bullet': 'disc', 'disc': 'disc', 'circle': 'circle', 'square': 'square',
          'number': 'decimal', 'decimal': 'decimal', 'lower-alpha': 'lower-alpha',
          'upper-alpha': 'upper-alpha', 'lower-roman': 'lower-roman', 'upper-roman': 'upper-roman'
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
          try {
            const p = JSON.parse(parsedContent);
            if (p.data) tableContent = p.data;
          } catch (e) {
            const rows = parsedContent.split('\n').filter(r => r.trim());
            if (rows.length >= 2) {
              const headers = rows[0].split('|').filter(cell => cell.trim());
              const body = rows.slice(2).map(r => r.split('|').slice(1, headers.length + 1).map(c => c.trim()));
              tableContent = [headers, ...body];
            }
          }
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
        const fData = (typeof parsedContent === 'object') ? parsedContent : {};
        return (
          <div className="rounded-[15px] border-[0.5px] border-gray-300 overflow-hidden my-4 font-sans bg-white shadow-sm">
            <div className="bg-[#C0934B] py-4 flex justify-center gap-6 text-white text-lg">
              {fData.facebook && <a href={fData.facebook} target="_blank" rel="noopener noreferrer" className="hover:scale-110 transition-transform"><FaFacebookF /></a>}
              {fData.instagram && <a href={fData.instagram} target="_blank" rel="noopener noreferrer" className="hover:scale-110 transition-transform"><FaInstagram /></a>}
              {fData.youtube && <a href={fData.youtube} target="_blank" rel="noopener noreferrer" className="hover:scale-110 transition-transform"><FaYoutube /></a>}
              {(!fData.facebook && !fData.instagram && !fData.youtube) && <span className="text-sm opacity-50">Follow Us</span>}
            </div>
            <div className="p-6 text-center text-black">
              <p className="mb-2 text-sm text-gray-900 font-medium">Written By <span className="underline font-bold">{fData.author || newsItem.author || newsItem.createdBy || 'Author'}</span></p>
              {fData.subscribeUrl && <p className="mb-4 text-xs text-gray-900 font-medium">Subscribe for more updates <a href={fData.subscribeUrl} target="_blank" rel="noopener noreferrer" className="underline font-bold">Join Now.</a></p>}
              <div className="border-t border-gray-100 w-full pt-4 text-[10px] font-bold text-[#00301F]">
                {fData.copyright || `© ${new Date().getFullYear()} Rupie Times. All rights reserved.`}
              </div>
            </div>
          </div>
        );
      default:
        return <div className="text-gray-800 mb-4">{parseStyledText(block.content)}</div>;
    }
  };


  if (loading) {
    return <GlobalLoader fullScreen={false} className="absolute inset-0 bg-white" />;
  }

  return (
    <div className="min-h-screen font-sans bg-gray-50/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Header: Back Button */}
        <div className="mb-8 flex flex-col gap-4">
          <Link
            href="/news"
            className="inline-flex items-center text-[#00301F] hover:underline font-medium w-fit"
          >
            <FaArrowLeft className="mr-2" /> Back To News
          </Link>
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
          <div className={`w-full transition-all duration-300 ease-in-out ${isDesktopSidebarOpen ? 'lg:w-[60%]' : 'lg:w-full'}`}>
            <>
              {/* Main Thumbnail */}
              {newsItem.featuredImage && (
                <div className="relative w-full aspect-video rounded-xl overflow-hidden mb-8 shadow-sm group">
                  <Image
                    src={getSafeImageUrl(newsItem.featuredImage, 'featured')}
                    alt={newsItem.mainHeading || newsItem.title}
                    fill
                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                    onError={() => handleImageError('featured')}
                  />
                </div>
              )}

              {/* Title */}
              <div className="flex justify-between items-start mb-4">
                <h1 className="text-3xl md:text-4xl font-bold text-black leading-tight">
                  {newsItem.mainHeading || newsItem.title}
                </h1>
              </div>

              {/* Description */}
              <p className="text-gray-600 mb-6 leading-relaxed text-lg">
                {newsItem.description}
              </p>

              {/* Meta Info */}
              <div className="flex justify-between items-center text-sm text-gray-500 mb-8 border-b border-gray-200 pb-4">
                <div className="flex gap-4">
                  <span>Category : <span className="text-black font-medium">{newsItem.category || "News"}</span></span>
                </div>
                <div className="flex gap-4">
                  <span>Published By <span className="text-black font-bold">{newsItem.author || newsItem.createdBy || "Rupie Times"}</span></span>
                </div>
              </div>

              {/* Dynamic Sections */}
              <div className="space-y-8">
                {newsItem.sections && newsItem.sections
                  .map((section, index) => ({ ...section, originalIndex: index }))
                  .filter(s => !s.contentBlocks?.some(b => (b.blockType || b.type) === 'footer'))
                  .sort((a, b) => b.originalIndex - a.originalIndex) // Latest first
                  .map((section, index) => {
                    const sectionStyle = "border-[0.5px] border-gray-300 rounded-[20px] p-6 mb-8 relative backdrop-blur supports-[backdrop-filter]:bg-white/10 bg-white/10 transition-all hover:shadow-sm max-w-full overflow-hidden break-words";

                    return (
                      <div key={section._id || index} className={sectionStyle} id={`section-${section._id}`}>
                        <div className="mb-6 border-b border-gray-100 pb-2">
                          <h3 className="text-xl font-bold text-black">
                            {section.heading}
                          </h3>
                        </div>

                        <div className="space-y-6">
                          {section.contentBlocks
                            ?.filter(block => block.blockType !== 'footer')
                            .sort((a, b) => a.order - b.order)
                            .map((block, i) => (
                              <div key={block._id || i}>
                                {renderBlock(block, i)}
                              </div>
                            ))}
                        </div>
                      </div>
                    );
                  })}

                {/* News Global Footer */}
                {(() => {
                  for (const section of newsItem.sections || []) {
                    const footerBlock = section.contentBlocks?.find(b => b.blockType === 'footer');
                    if (footerBlock) return <div className="mt-12">{renderBlock(footerBlock, 'global-footer')}</div>;
                  }
                  // Fallback static footer if no footer block exists
                  return (
                    <div className="rounded-[15px] border-[0.5px] border-gray-300 overflow-hidden mt-12 font-sans shadow-sm">
                      <div className="bg-[#C0934B] py-6 flex justify-center gap-8 text-white">
                        <FaFacebookF className="w-6 h-6 cursor-pointer hover:scale-110 transition-transform" />
                        <FaInstagram className="w-6 h-6 cursor-pointer hover:scale-110 transition-transform" />
                        <FaYoutube className="w-6 h-6 cursor-pointer hover:scale-110 transition-transform" />
                      </div>
                      <div className="bg-[#FFFFFF] p-8 text-center text-black">
                        <p className="mb-4 text-sm font-medium">
                          Written By <span className="underline cursor-pointer hover:text-[#C0934B] font-bold">{newsItem.author || newsItem.createdBy || "Rupie Times Team"}</span>
                        </p>
                        <p className="mb-8 text-sm font-medium">
                          Subscribe for more updates <span className="underline cursor-pointer hover:text-[#C0934B] font-bold">Join Now</span>.
                        </p>
                        <div className="border-t border-gray-200 pt-4 text-xs font-bold text-[#00301F]">
                          © {new Date().getFullYear()} Rupie Times. All rights reserved.
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </>
          </div>

          {/* Sidebar */}
          <div className={`
             fixed inset-x-0 bottom-0 top-16 sm:top-18 z-40 bg-[#F5F5F7] lg:bg-transparent lg:static lg:h-auto 
             transform transition-all duration-300 ease-in-out
             ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}
             ${isDesktopSidebarOpen ? 'lg:w-[40%] lg:opacity-100 lg:visible' : 'lg:w-0 lg:opacity-0 lg:invisible lg:overflow-hidden'}
           `}>
            <div className="h-full overflow-y-auto p-6 lg:p-0 lg:pl-8">
              <div className="flex justify-between items-center mb-6 lg:hidden">
                <h2 className="text-2xl font-bold">More News</h2>
                <button onClick={() => setIsSidebarOpen(false)}><FaTimes className="w-6 h-6" /></button>
              </div>

              <h2 className="text-2xl font-bold mb-6 hidden lg:block">More News</h2>

              <div className="space-y-4">
                {sidebarNews.length > 0 ? (
                  sidebarNews.map((item) => (
                    <div key={item._id} className="border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow backdrop-blur supports-[backdrop-filter]:bg-white/10 bg-white/10 cursor-pointer" onClick={() => onSelectNews(item)}>
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                          <Image src={sharpIcon} alt="icon" width={16} height={16} />
                          <h3 className="font-bold text-sm line-clamp-1 group-hover:text-[#C0934B] transition-colors">{item.mainHeading}</h3>
                        </div>
                        <span className="text-xs text-gray-500 whitespace-nowrap">
                          {new Date(item.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 mb-3 line-clamp-2">{item.description}</p>
                      <div className="flex justify-between items-center mt-2">
                        <span className="bg-[#ffec9f80] text-[#C0934B] text-[10px] px-2 py-1 rounded-md font-bold">
                          {item.category || "General"}
                        </span>
                        <span className="text-xs font-bold text-[#00301F] flex items-center hover:underline">
                          Read More <FaArrowLeft className="ml-1 rotate-180 w-3 h-3" />
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center py-10 px-4 text-center border border-dashed border-gray-300 rounded-xl bg-gray-50/50">
                    <div className="bg-white p-3 rounded-full mb-3 shadow-sm">
                      <FaInbox className="w-6 h-6 text-gray-400" />
                    </div>
                    <p className="text-sm font-bold text-gray-600">No other news found</p>
                    <p className="text-xs text-gray-500 mt-1 max-w-[200px]">There are no other news items available in this section at the moment.</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Mobile Sidebar Toggle */}
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className={`fixed right-6 z-[60] bg-[#00301F] text-white p-4 rounded-full shadow-lg lg:hidden transition-all duration-300 hover:scale-105 active:scale-95 hover:bg-[#C0934B] bottom-6`}
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

export default NewsDetailView;
