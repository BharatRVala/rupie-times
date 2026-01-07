"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { FaArrowLeft, FaRegStar, FaStar, FaBars, FaTimes, FaFacebookF, FaInstagram, FaYoutube, FaPrint } from 'react-icons/fa';
import sharpIcon from "../../../assets/sharp.svg";
import { ARTICLES_DATA } from "../../../rupiesTimeTalk/data";
import { useAuth } from '../../../../hook/useAuth';
import WarningPopUp from '../../../components/WarningPopUp';
import MarkAsReadButton from '../../../components/MarkAsReadButton';
import { useFavorites } from '../../../context/FavoritesContext';
import confetti from 'canvas-confetti';

const DashboardArticleView = ({ article }) => {
  const handlePrint = () => {
    window.print();
  };
  const { isLoggedIn } = useAuth();
  const { isFavorite, toggleFavorite } = useFavorites();
  const [showWarning, setShowWarning] = useState(false);
  const [warningContent, setWarningContent] = useState({});
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Read Progress State
  const [readSections, setReadSections] = useState([]);
  const [progress, setProgress] = useState(0);

  const isStarred = isFavorite(article.id);
  const totalSections = article.sections.length;

  // Filter out the current article from the sidebar list
  const sidebarArticles = ARTICLES_DATA.filter(a => a.id !== article.id);

  useEffect(() => {
    // Load read progress from localStorage
    if (isLoggedIn) {
      const savedProgress = localStorage.getItem(`read_progress_${article.id}`);
      if (savedProgress) {
        setReadSections(JSON.parse(savedProgress));
      }
    } else {
      setReadSections([]);
    }
  }, [isLoggedIn, article.id]);

  useEffect(() => {
    // Calculate progress
    const newProgress = totalSections > 0 ? (readSections.length / totalSections) * 100 : 0;
    setProgress(newProgress);

    // Celebration
    if (newProgress === 100 && totalSections > 0) {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
    }
  }, [readSections, totalSections]);

  const handleStarClick = () => {
    if (!isLoggedIn) {
      setWarningContent({
        title: "Sign In to Continue",
        message: "You need to be logged in to archive this article.",
        actionText: "Sign in",
        articleData: {
          id: article.id,
          title: article.title,
          description: article.description,
          category: article.category,
          date: article.date || "",
          author: article.publisher,
          thumbnail: article.thumbnail,
          ...article
        }
      });
      setShowWarning(true);
      return;
    }

    toggleFavorite({
      id: article.id,
      title: article.title,
      description: article.description,
      category: article.category,
      date: article.date || "",
      author: article.publisher,
      thumbnail: article.thumbnail,
      ...article
    });
  };

  const toggleSectionRead = (index) => {
    if (!isLoggedIn) {
      setWarningContent({
        title: "Sign In to Save Progress",
        message: "You need to be logged in to mark this as read.",
        actionText: "Sign in",
        articleData: null
      });
      setShowWarning(true);
      return;
    }

    setReadSections(prev => {
      let newReadSections;
      if (prev.includes(index)) {
        newReadSections = prev.filter(i => i !== index);
      } else {
        newReadSections = [...prev, index];
      }

      // Save to localStorage
      localStorage.setItem(`read_progress_${article.id}`, JSON.stringify(newReadSections));
      return newReadSections;
    });
  };

  return (
    <div className="font-sans text-black min-h-screen px-4 py-6">
      <WarningPopUp
        isOpen={showWarning}
        onClose={() => setShowWarning(false)}
        title={warningContent.title}
        message={warningContent.message}
        actionText={warningContent.actionText}
        articleData={warningContent.articleData}
      />

      <div className="py-4">

        {/* Header: Back Button & Progress */}
        <div className="mb-6 flex flex-col gap-4">
          <Link href="/user-dashboard/articles" className="inline-flex items-center text-[#00301F] hover:underline font-medium w-fit">
            <FaArrowLeft className="mr-2" /> Back To Articles
          </Link>

          {/* Progress Bar */}
          <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-200 overflow-hidden">
            <div
              className="bg-[#C0934B] h-2.5 rounded-full transition-all duration-700 ease-in-out"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <div className="text-right text-xs text-gray-500 font-bold">
            {Math.round(progress)}% Completed
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-8 relative">

          {/* Main Content (60%) */}
          <div id="article-print-content" className="w-full lg:w-[65%]">

            {/* Main Thumbnail */}
            <div className="relative w-full h-[300px] md:h-[400px] rounded-xl overflow-hidden mb-8">
              <Image
                src={article.thumbnail}
                alt={article.title}
                fill
                className="object-cover"
              />
            </div>

            {/* Title & Star */}
            <div className="flex justify-between items-start mb-4">
              <h1 className="text-3xl md:text-3xl font-bold text-black leading-tight">
                {article.title}
              </h1>
              <button
                onClick={handleStarClick}
                className="p-2 focus:outline-none transition-transform active:scale-95"
              >
                {isStarred ? (
                  <FaStar className="w-6 h-6 text-[#C0934B]" />
                ) : (
                  <FaRegStar className="w-6 h-6 text-[#C0934B]" />
                )}
              </button>
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
                <span>Published By <span className="text-black font-bold">{article.publisher}</span></span>
              </div>
            </div>

            {/* Dynamic Sections */}
            <div className="space-y-8">
              {article.sections.map((section, index) => {
                const sectionStyle = "border-[0.5px] border-gray-300 rounded-[20px] p-6 mb-8";
                const isRead = readSections.includes(index);

                if (section.type === 'text_image') {
                  return (
                    <div key={index} className={sectionStyle}>
                      <h3 className="text-xl font-bold mb-4 flex justify-between items-center">
                        <span></span>
                        {/* Star Removed */}
                      </h3>
                      <div className="flex items-start gap-4 mb-4">
                        <div className="shrink-0 mt-1">
                          <Image src={sharpIcon} alt="icon" width={24} height={24} />
                        </div>
                        <p className="text-gray-700 leading-relaxed">{section.content.text}</p>
                      </div>
                      {section.content.image && (
                        <div className="relative w-full h-[300px] rounded-xl overflow-hidden mt-6">
                          <Image src={section.content.image} alt="Section Image" fill className="object-cover" />
                        </div>
                      )}
                      <div className="h-2"></div>
                      <div className="flex justify-end mt-0">
                        <MarkAsReadButton isRead={isRead} onClick={() => toggleSectionRead(index)} />
                      </div>
                    </div>
                  );
                }

                if (section.type === 'custom_list') {
                  return (
                    <div key={index} className={sectionStyle}>
                      <h3 className="text-xl font-bold mb-4 flex justify-between items-center">
                        <span></span>
                        {/* Star Removed */}
                      </h3>
                      <ul className="space-y-4">
                        {section.content.items.map((item, i) => (
                          <li key={i} className="flex items-start gap-3">
                            <div className="shrink-0 mt-1">
                              <Image src={sharpIcon} alt="bullet" width={20} height={20} />
                            </div>
                            <span className="text-gray-700">{item}</span>
                          </li>
                        ))}
                      </ul>
                      <div className="h-2"></div>
                      <div className="flex justify-end mt-0">
                        <MarkAsReadButton isRead={isRead} onClick={() => toggleSectionRead(index)} />
                      </div>
                    </div>
                  );
                }

                if (section.type === 'table') {
                  return (
                    <div key={index} className={sectionStyle}>
                      <h3 className="text-xl font-bold mb-4 flex justify-between items-center">
                        {section.title}
                        {/* Star Removed */}
                      </h3>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                          <thead className="bg-[#F9F5EB] text-gray-700 font-bold">
                            <tr>
                              {section.content.headers.map((header, i) => (
                                <th key={i} className="px-4 py-3 whitespace-nowrap">{header}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {section.content.rows.map((row, i) => (
                              <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                                {row.map((cell, j) => (
                                  <td key={j} className="px-4 py-3 whitespace-nowrap text-gray-600">{cell}</td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <div className="h-2"></div>
                      <div className="flex justify-end mt-0">
                        <MarkAsReadButton isRead={isRead} onClick={() => toggleSectionRead(index)} />
                      </div>
                    </div>
                  );
                }

                return null;
              })}
            </div>

            {/* Article Footer */}
            <div className="rounded-[15px] overflow-hidden mt-12 font-sans">
              <div className="bg-[#C0934B] py-6 flex justify-center gap-8 text-white">
                <FaFacebookF className="w-6 h-6 cursor-pointer hover:text-black transition-colors" />
                <FaInstagram className="w-6 h-6 cursor-pointer hover:text-black transition-colors" />
                <FaYoutube className="w-6 h-6 cursor-pointer hover:text-black transition-colors" />
              </div>

              <div className="bg-[#E6E6E6CF] p-8 text-center text-black">
                {article.footer && (
                  <>
                    <p className="mb-4 text-sm font-medium">
                      Written By {article.footer.authors.map((author, index) => (
                        <React.Fragment key={index}>
                          <span className="underline cursor-pointer hover:text-[#C0934B]">{author.name}</span>
                          {index < article.footer.authors.length - 2 ? ", " : index === article.footer.authors.length - 2 ? ", And " : ""}
                        </React.Fragment>
                      ))}
                    </p>
                    <p className="mb-8 text-sm font-medium">
                      {article.footer.signup.text} <span className="underline cursor-pointer hover:text-[#C0934B]">{article.footer.signup.linkText}</span>.
                    </p>
                    <div className="border-t border-gray-300 pt-4 text-xs font-bold text-gray-800">
                      {article.footer.copyright}
                    </div>
                  </>
                )}
              </div>
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

                    /* 6. FIX MAIN IMAGES */
                    #article-print-content .relative {
                        position: relative !important;
                        display: block !important;
                        overflow: hidden !important;
                        width: 100% !important;
                    }
                    #article-print-content .h-\[300px\] { height: 300px !important; }
                    #article-print-content .md\:h-\[400px\] { height: 300px !important; }

                    #article-print-content .relative img:not(.w-5):not(.w-4) {
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

          {/* Sidebar (35%) */}
          <div className={`
            fixed inset-x-0 bottom-0 top-16 sm:top-18 z-40 bg-[#F5F5F7] lg:bg-transparent lg:static lg:h-auto 
            transform transition-all duration-300 ease-in-out
            ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}
            w-full lg:w-[35%]
          `}>
            <div className="h-full overflow-y-auto p-6 lg:p-0">
              <div className="flex justify-between items-center mb-6 lg:hidden">
                <h2 className="text-2xl font-bold">All Articles</h2>
                <button onClick={() => setIsSidebarOpen(false)} className="p-2">
                  <FaTimes className="w-6 h-6" />
                </button>
              </div>

              <h2 className="text-xl font-bold mb-6 hidden lg:block">All Articles</h2>

              <div className="space-y-4">
                {sidebarArticles.map((item) => (
                  <div key={item.id} className="border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow bg-white">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                        <div className="shrink-0">
                          <Image src={sharpIcon} alt="icon" width={16} height={16} />
                        </div>
                        <h3 className="font-bold text-sm line-clamp-1">{item.title}</h3>
                      </div>
                      <span className="text-[10px] text-gray-500 whitespace-nowrap">{item.date}</span>
                    </div>
                    <p className="text-xs text-gray-600 mb-3 line-clamp-2">{item.description}</p>
                    <div className="flex justify-between items-center mt-2">
                      <span className="bg-[#ffec9f80] text-[#C0934B] text-[10px] px-2 py-1 rounded-md font-bold">
                        {item.category}
                      </span>
                      {/* Link override to keep user in dashboard */}
                      <Link href={`/user-dashboard/articles/${item.id}`} className="text-xs font-bold text-[#00301F] flex items-center hover:underline">
                        Read More <FaArrowLeft className="ml-1 rotate-180 w-3 h-3" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Mobile Sidebar Toggle */}
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="fixed right-6 bottom-6 z-[60] bg-[#00301F] text-white p-4 rounded-full shadow-lg lg:hidden transition-all duration-300 hover:scale-105 active:scale-95"
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

export default DashboardArticleView;
