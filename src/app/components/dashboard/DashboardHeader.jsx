"use client";

import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter, usePathname } from 'next/navigation';
import SearchPopup from './SearchPopup';

export default function DashboardHeader({ data, onToggleSidebar }) {
  const [showConfetti, setShowConfetti] = useState(false);
  const [tooltipVisible, setTooltipVisible] = useState(false);

  // Search popup state
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Dynamic State
  const [unreadCount, setUnreadCount] = useState(0);
  const [progressData, setProgressData] = useState(null);
  const [userName, setUserName] = useState(null);

  const router = useRouter();
  const pathname = usePathname();

  // ... existing hooks for fetching data ...

  // Use dynamic progress if available, otherwise fall back to data.learningProgress (static)
  const learningProgress = progressData || data.learningProgress;

  useEffect(() => {
    fetchUnreadCount();
    fetchLearningProgress();
    fetchUserProfile();

    const interval = setInterval(() => {
      fetchUnreadCount();
      fetchLearningProgress();
    }, 30000);

    const handleNotificationUpdate = () => {
      fetchUnreadCount();
    };

    const handleProgressUpdate = () => {
      fetchLearningProgress();
    };

    const handleUserUpdate = () => {
      fetchUserProfile();
    };

    window.addEventListener('notificationUpdated', handleNotificationUpdate);
    window.addEventListener('progressUpdated', handleProgressUpdate);
    window.addEventListener('userUpdated', handleUserUpdate);

    return () => {
      clearInterval(interval);
      window.removeEventListener('notificationUpdated', handleNotificationUpdate);
      window.removeEventListener('progressUpdated', handleProgressUpdate);
      window.removeEventListener('userUpdated', handleUserUpdate);
    };
  }, [pathname]);

  const fetchUnreadCount = async () => {
    try {
      const response = await fetch('/api/user/notifications?limit=1', { cache: 'no-store' });
      if (response.ok) {
        const resData = await response.json();
        if (resData.success) {
          setUnreadCount(parseInt(resData.unreadCount || 0, 10));
        }
      }
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  };

  const fetchLearningProgress = async () => {
    try {
      const response = await fetch(`/api/user/stats/progress?t=${Date.now()}`);
      if (response.ok) {
        const resData = await response.json();
        if (resData.success) {
          setProgressData(resData.progress || null);
        }
      }
    } catch (error) {
      console.error('Error fetching learning progress:', error);
    }
  };

  const fetchUserProfile = async () => {
    try {
      const response = await fetch('/api/user/auth/profile');
      if (response.ok) {
        const resData = await response.json();
        if (resData.success) {
          setUserName(resData.user?.name || null);
        }
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };


  useEffect(() => {
    // Trigger confetti if progress is made or component mounts
    if (learningProgress?.percentage > 0) {
      setShowConfetti(true);
      // Stop confetti after a few seconds
      const timer = setTimeout(() => setShowConfetti(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [learningProgress?.percentage]);

  const radius = 18; // Radius of the circle
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - ((learningProgress?.percentage || 0) / 100) * circumference;

  const handleNotificationClick = () => {
    router.push('/user-dashboard/notifications');
  };

  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 w-full max-w-full relative z-30">
      <SearchPopup isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />

      <h1 className="text-2xl font-bold text-[#1E4032] flex items-center gap-2">
        {pathname === '/user-dashboard' ? (
          "Research Desk"
        ) : (
          userName ? (
            <>
              {userName}'s Research Desk
              <Image
                src="/assets/userDashboard/hello.webp"
                alt="Hello"
                width={24}
                height={24}
                className="inline-block"
              />
            </>
          ) : (
            data.welcomeMessage
          )
        )}
      </h1>
      <div className="flex items-center gap-3">
        {/* Mobile Menu Toggle Button */}
        <button
          onClick={onToggleSidebar}
          className="lg:hidden w-10 h-10 flex items-center justify-center rounded-full bg-[#1E4032] hover:opacity-90 transition-opacity shadow-sm"
          aria-label="Toggle Dashboard Menu"
        >
          <Image
            src="/assets/userDashboard/dashboard.svg"
            alt="Menu"
            width={20}
            height={20}
            className="brightness-0 invert"
          />
        </button>

        {/* Win Cup Progress Section */}
        {learningProgress && (
          <div
            className="relative cursor-pointer"
            onMouseEnter={() => setTooltipVisible(true)}
            onMouseLeave={() => setTooltipVisible(false)}
          >
            {/* Confetti container */}
            <AnimatePresence>
              {showConfetti && (
                <div className="absolute inset-0 pointer-events-none z-0">
                  {[...Array(12)].map((_, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 1, scale: 0, x: 0, y: 0 }}
                      animate={{
                        opacity: 0,
                        scale: 1.5,
                        x: (Math.random() - 0.5) * 60,
                        y: (Math.random() - 0.5) * 60,
                      }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.8, delay: i * 0.05, ease: "easeOut" }}
                      className="absolute left-1/2 top-1/2 w-1.5 h-1.5 rounded-full"
                      style={{
                        backgroundColor: ['#FFD700', '#FF6347', '#32CD32', '#00BFFF', '#FF69B4'][i % 5]
                      }}
                    />
                  ))}
                </div>
              )}
            </AnimatePresence>

            {/* Circular Progress & Cup */}
            <div className="relative w-12 h-12 flex items-center justify-center z-10">
              {/* Background Circle */}
              <svg className="w-full h-full transform -rotate-90">
                <circle
                  cx="24"
                  cy="24"
                  r={radius}
                  stroke="#E5E7EB"
                  strokeWidth="2"
                  fill="transparent"
                />
                {/* Progress Circle */}
                <motion.circle
                  cx="24"
                  cy="24"
                  r={radius}
                  stroke="#C0934B"
                  strokeWidth="2"
                  fill="transparent"
                  strokeDasharray={circumference}
                  initial={{ strokeDashoffset: circumference }}
                  animate={{ strokeDashoffset }}
                  transition={{ duration: 1.5, ease: "easeInOut" }}
                  strokeLinecap="round"
                />
              </svg>

              {/* Cup Icon */}
              <div className="absolute inset-0 flex items-center justify-center">
                <Image
                  src="/assets/userDashboard/win.svg"
                  alt="Achievement"
                  width={20}
                  height={20}
                  className=""
                />
              </div>
            </div>

            {/* Hover Tooltip */}
            <AnimatePresence>
              {tooltipVisible && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute top-14 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs py-1.5 px-3 rounded-lg whitespace-nowrap z-50 pointer-events-none"
                >
                  <div className="font-semibold">{learningProgress.percentage}% Completed</div>
                  <div className="text-gray-300 text-[10px]">{learningProgress.completedArticles}/{learningProgress.totalArticles} Articles</div>
                  {/* Arrow */}
                  <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-900 rotate-45"></div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Dynamic Buttons Loop */}
        <div className="flex gap-3">
          {/* Integrated Search Button */}
          <div className="relative w-10 h-10 flex items-center justify-center">
            <button
              className="w-full h-full flex items-center justify-center rounded-full bg-[#C0934B] hover:opacity-90 transition-opacity shadow-sm"
              aria-label="Search"
              onClick={() => setIsSearchOpen(true)}
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-white">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
            </button>
          </div>

          {data.buttons.map((btn, index) => {
            // Determine if this is notification button based on icon or alt
            const isNotification = btn.alt?.toLowerCase().includes('notification') || btn.icon.includes('bell');

            const ButtonContent = (
              <div className="relative w-10 h-10 flex items-center justify-center">
                <button
                  className="w-full h-full flex items-center justify-center rounded-full bg-[#C0934B] hover:opacity-90 transition-opacity shadow-sm"
                  aria-label={btn.alt}
                  onClick={isNotification ? handleNotificationClick : undefined}
                >
                  <Image
                    src={`/assets/userDashboard/${btn.icon}`}
                    alt={btn.alt}
                    width={20}
                    height={20}
                    className="brightness-0 invert"
                  />
                </button>

                {/* Notification Badge */}
                {isNotification && unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center z-20 pointer-events-none">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-4 w-4 bg-red-600 text-[10px] font-bold text-white items-center justify-center border-2 border-white">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  </span>
                )}
              </div>
            );

            // Use Link for paths (unless it's notification which we simplified with onClick, or if Link is preferred)
            return btn.path ? (
              <Link key={index} href={btn.path}>
                {ButtonContent}
              </Link>
            ) : (
              <div key={index}>{ButtonContent}</div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
