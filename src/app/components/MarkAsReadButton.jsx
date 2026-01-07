"use client";
import React from 'react';
import { FaCheck } from 'react-icons/fa';

const MarkAsReadButton = ({ isRead, onClick, className = "" }) => {
    return (
        <button
            onClick={onClick}
            className={`
                w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all duration-150
                ${isRead
                    ? "bg-[#C0934B] border-[#C0934B] text-white"
                    : "bg-transparent border-[#C0934B] text-[#C0934B] hover:bg-[#C0934B]/10"
                }
                ${className}
            `}
            title={isRead ? "Mark as Unread" : "Mark as Read"}
        >
            <FaCheck className="w-3.5 h-3.5" />
        </button>
    );
};

export default MarkAsReadButton;
