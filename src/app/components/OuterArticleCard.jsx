'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { FaRegStar, FaStar, FaArrowRight } from 'react-icons/fa';
import sharpIcon from "../assets/sharp.svg";
import Image from 'next/image';
import { useFavorites } from '../context/FavoritesContext';
import { useAuth } from '../../hook/useAuth';
import WarningPopUp from './WarningPopUp';

const OuterArticleCard = ({
  id,
  productId, // Optional: for subscription articles
  title,
  date,
  description,
  category,
  author,
  priority, // Add priority prop
  sectionCount,
  link = "#",
  iconSrc = "http://image.com", // Default fallback
  onReadArticle, // Optional callback for inline viewing
  isStarred, // Optional controlled state
  onFavoriteClick, // Optional controlled handler
  showActions = true // New prop to toggle actions (star, etc.)
}) => {
  const { isFavorite, toggleFavorite } = useFavorites();
  const { isLoggedIn } = useAuth();
  const [showWarning, setShowWarning] = useState(false);

  // Use controlled state if provided, otherwise internal context
  const starred = isStarred !== undefined ? isStarred : (id ? isFavorite(id) : false);

  const handleToggle = () => {
    if (onFavoriteClick) {
      onFavoriteClick();
      return;
    }

    if (!id) return;

    if (!isLoggedIn) {
      setShowWarning(true);
      return;
    }

    toggleFavorite({
      id,
      productId,
      title,
      date,
      description,
      category,
      author,
      sectionCount,
      link,
      iconSrc
    });
  };

  const articleDataForPopup = {
    id,
    title,
    date,
    description,
    category,
    author,
    sectionCount,
    link,
    iconSrc
  };

  return (
    <>
      <WarningPopUp isOpen={showWarning} onClose={() => setShowWarning(false)} articleData={articleDataForPopup} />
      <div className="w-full border border-gray-300 rounded-lg p-6 backdrop-blur supports-[backdrop-filter]:bg-white/10 bg-white/10 shadow-sm hover:shadow-md transition-shadow duration-300 font-sans">

        {/* Row 1: Title & Date */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-2">
          <div className="flex items-center gap-3">
            {/* Dynamic Icon Image */}
            <div className="relative w-5 h-5 flex-shrink-0">
              <Image
                src={iconSrc}
                alt=""
                fill
                className="object-contain"
              />
            </div>
            {onReadArticle ? (
              <button onClick={() => onReadArticle(id)} className="text-left focus:outline-none hover:opacity-80 transition-opacity">
                <h3 className="text-xl font-bold text-black leading-tight cursor-pointer hover:underline">
                  {title}
                </h3>
              </button>
            ) : (
              <Link href={link} className="hover:opacity-80 transition-opacity">
                <h3 className="text-xl font-bold text-black leading-tight cursor-pointer hover:underline">
                  {title}
                </h3>
              </Link>
            )}
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className="text-gray-500 text-sm font-medium whitespace-nowrap">
              {date}
            </span>
            {priority && priority !== 'Normal' && (
              <span className={`px-2 py-0.5 rounded border text-[10px] font-medium whitespace-nowrap ${priority === 'Highly Recommended' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
                  priority === 'High' ? 'bg-red-100 text-red-800 border-red-200' :
                    'bg-blue-100 text-blue-800 border-blue-200'
                }`}>
                {priority}
              </span>
            )}
          </div>
        </div>

        {/* Row 2: Description */}
        <div className="mb-6">
          <p className="text-gray-600 text-sm leading-relaxed max-w-3xl">
            {description}
          </p>
        </div>

        {/* Row 3: Meta & Action */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 pt-2 border-t border-transparent md:border-none">
          <div className="flex items-center gap-4 w-full md:w-auto">
            {/* Star Icon */}
            {showActions && (
              <button
                onClick={handleToggle}
                className="focus:outline-none transition-transform active:scale-95"
                aria-label={starred ? "Unstar article" : "Star article"}
              >
                {starred ? (
                  <FaStar className="w-5 h-5 text-[#C0934B]" />
                ) : (
                  <FaRegStar className="w-5 h-6 text-[#C0934B]" />
                )}
              </button>
            )}

            {/* Author & Section Info */}
            <div className="flex items-center text-gray-500 text-xs gap-3">
              <span>By {author}</span>
              <span className="h-3 w-px bg-gray-400"></span>
              <span>{sectionCount} section</span>
            </div>
          </div>

          {/* Category & Read Full Article Link */}
          <div className="flex items-center justify-between w-full md:w-auto gap-4">
            <span
              className="inline-flex items-center justify-center px-4 text-xs font-bold rounded-[10px] whitespace-nowrap"
              style={{
                backgroundColor: '#ffec9f80',
                color: '#C0934B',
                height: '22px'
              }}
            >
              {category}
            </span>

            {onReadArticle ? (
              <button
                onClick={() => onReadArticle(id)}
                className="flex items-center text-sm font-bold hover:underline transition-all"
                style={{ color: '#00301F' }}
              >
                Read Full Article <FaArrowRight className="ml-2 w-3 h-3" />
              </button>
            ) : (
              <Link
                href={link}
                className="flex items-center text-sm font-bold hover:underline transition-all"
                style={{ color: '#00301F' }}
              >
                Read Full Article <FaArrowRight className="ml-2 w-3 h-3" />
              </Link>
            )}
          </div>
        </div>

      </div>
    </>
  );
};

export default OuterArticleCard;
