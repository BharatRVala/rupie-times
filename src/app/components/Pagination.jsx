'use client';

import React from 'react';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';

const Pagination = ({ currentPage, totalPages, onPageChange }) => {
  const getPageNumbers = () => {
    const pages = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 4) {
        for (let i = 1; i <= 5; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 3) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 4; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        pages.push(1);
        pages.push('...');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages);
      }
    }
    return pages;
  };

  return (
    <div className="flex justify-center items-center mt-12 gap-8 font-medium text-gray-500">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className={`flex items-center gap-2 hover:text-[#1E4032] transition-colors ${currentPage === 1 ? 'opacity-50 cursor-not-allowed' : ''
          }`}
      >
        <FaChevronLeft className="w-3 h-3" />
        <span className="text-lg">Previous</span>
      </button>

      <div className="flex items-center gap-4">
        {getPageNumbers().map((page, index) => (
          <React.Fragment key={index}>
            {page === '...' ? (
              <span className="text-gray-400 text-lg">...</span>
            ) : (
              <button
                onClick={() => onPageChange(page)}
                className={`w-8 h-8 flex items-center justify-center rounded-lg text-lg transition-all ${currentPage === page
                    ? 'text-black font-bold'
                    : 'text-gray-400 hover:text-[#1E4032]'
                  }`}
              >
                {page}
              </button>
            )}
          </React.Fragment>
        ))}
      </div>

      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className={`flex items-center gap-2 hover:text-[#1E4032] transition-colors ${currentPage === totalPages ? 'opacity-50 cursor-not-allowed' : ''
          }`}
      >
        <span className="text-lg">Next</span>
        <FaChevronRight className="w-3 h-3" />
      </button>
    </div>
  );
};

export default Pagination;
