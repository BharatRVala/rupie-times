"use client";

import Image from "next/image";

const TYPE_ICONS = {
  expired: "exp.svg",
  success: "done.svg",
  chat: "chat.svg",
  info: "chat.svg",
  warning: "warning.svg",
  // Subscription specific mappings
  subscription_active: "done.svg",
  subscription_expiring_soon: "warning.svg",
  subscription_expired: "exp.svg",
  subscription_renewed: "done.svg",
  general: "bell.svg",
  ticket_reply: "chat.svg"
};

import { motion } from "framer-motion";

export default function NotificationItem({ notification, variant = "full", showNewBadge = true, onDelete }) {
  // Map fields from API/DB format to component format
  const type = notification.type || notification.notificationType;
  const description = notification.description || notification.message;
  const isBroadcast = notification.isBroadcast || notification.triggeredBy === 'admin';
  const title = notification.title;

  let iconFile = TYPE_ICONS[type];

  // Force chat.svg for ALL admin broadcast notifications as requested
  if (isBroadcast) {
    iconFile = "chat.svg";
  }

  // Fallback for legacy notifications based on title keywords if type mapping fails
  if (!iconFile) {
    const lowerTitle = (title || "").toLowerCase();
    if (lowerTitle.includes("activated") || lowerTitle.includes("success")) iconFile = "done.svg";
    else if (lowerTitle.includes("expired")) iconFile = "exp.svg";
    else if (lowerTitle.includes("soon") || lowerTitle.includes("warning")) iconFile = "warning.svg";
    else iconFile = "bell.svg";
  }

  // Determine context for time formatting
  const rawTime = notification.time || notification.createdAt || notification.updatedAt;
  const date = new Date(rawTime);
  const isDateValid = !isNaN(date.getTime());

  const displayTime = isDateValid ? formatTimeDisplay(date) : (typeof rawTime === 'string' ? rawTime : '');

  const handleDelete = (e) => {
    e.stopPropagation();
    if (onDelete) {
      onDelete(notification._id || notification.id);
    }
  };

  const animationProps = {
    layout: true,
    initial: { opacity: 0, x: -20 },
    animate: { opacity: 1, x: 0 },
    exit: { x: "100%", opacity: 0, transition: { duration: 0.3 } }
  };

  // Compact variant (Dashboard Widget)
  if (variant === "compact") {
    return (
      <motion.div
        {...animationProps}
        className="relative group flex items-start gap-3 p-3 backdrop-blur supports-[backdrop-filter]:bg-white/10 bg-white/10 border border-gray-100 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer"
      >
        {/* Close Button */}
        <button
          onClick={handleDelete}
          className="absolute -top-2 -right-2 p-1 bg-white border border-gray-200 rounded-full shadow-sm text-gray-400 hover:text-red-500 hover:border-red-200 opacity-0 group-hover:opacity-100 transition-all z-10"
          title="Delete notification"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>

        <div className="shrink-0 mt-0.5">
          <Image
            src={`/assets/userDashboard/${iconFile}`}
            alt={type || "Notification"}
            width={20}
            height={20}
          />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start gap-2 mb-1">
            <div className="flex flex-col min-w-0 pr-2">
              <h4 className="font-bold text-[#1E4032] text-sm leading-tight truncate">
                {title?.replace(/⏰|❌|✅/g, '').trim()}
              </h4>
              {showNewBadge && !notification.isRead && (
                <span className="inline-block px-1.5 py-0.5 mt-1 bg-red-100 text-red-600 text-[10px] font-bold rounded w-fit">
                  NEW
                </span>
              )}
            </div>
            <span className="text-[10px] text-gray-400 whitespace-nowrap shrink-0">
              {displayTime}
            </span>
          </div>
          <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed group-hover:text-gray-700">
            {description}
          </p>
        </div>
      </motion.div>
    );
  }

  // Full variant (Notification Page)
  return (
    <motion.div
      {...animationProps}
      className="relative group backdrop-blur supports-[backdrop-filter]:bg-white/10 bg-white/10 border border-gray-200 rounded-xl p-6 flex items-start gap-4 transition-all hover:shadow-md cursor-pointer"
    >
      {/* Close Button */}
      <button
        onClick={handleDelete}
        className="absolute -top-3 -right-3 p-1.5 bg-white border border-gray-200 rounded-full shadow-sm text-gray-400 hover:text-red-500 hover:border-red-200 opacity-0 group-hover:opacity-100 transition-all z-10"
        title="Delete notification"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>

      {/* Icon */}
      <div className="shrink-0 mt-1">
        <Image
          src={`/assets/userDashboard/${iconFile}`}
          alt={type || "Notification"}
          width={24}
          height={24}
        />
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col md:flex-row justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h4 className="font-bold text-[#1E4032] text-sm md:text-base">
              {title?.replace(/⏰|❌|✅/g, '').trim()}
            </h4>
            {!notification.isRead && (
              <span className="px-2 py-0.5 bg-red-100 text-red-600 text-[10px] font-bold rounded-full animate-pulse">
                NEW
              </span>
            )}
          </div>
          <p className="text-gray-500 text-xs md:text-sm leading-relaxed max-w-2xl">
            {description}
          </p>
        </div>
        <div className="shrink-0">
          <span className="text-xs text-gray-400 font-medium whitespace-nowrap">
            {displayTime}
          </span>
        </div>
      </div>
    </motion.div>
  );
}

function formatTimeDisplay(date) {
  if (!date || isNaN(date.getTime())) return "";

  const now = new Date();
  const isToday = date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  if (isToday) {
    const diffInSeconds = Math.floor((now - date) / 1000);

    // Future dates or less than 1 minute
    if (diffInSeconds < 60) return 'Just now';

    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;

    const diffInHours = Math.floor(diffInMinutes / 60);
    return `${diffInHours}h ago`;
  } else {
    // For yesterday and older, show actual date and time
    // Example: "Dec 18, 2:30 PM"
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      hour12: true
    });
  }
}
