"use client";

import Link from "next/link";

export const AboutCTA = () => {
  return (
    <section className="relative py-12 lg:py-16 xl:py-24 bg-gradient-to-br from-white via-gray-50 to-gray-100/70 overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0">
        <div className="absolute top-0 left-4 sm:left-1/4 w-48 h-48 sm:w-72 sm:h-72 lg:w-96 lg:h-96 bg-[#c19755]/5 rounded-full blur-xl sm:blur-2xl lg:blur-3xl"></div>
        <div className="absolute bottom-0 right-4 sm:right-1/4 w-40 h-40 sm:w-64 sm:h-64 lg:w-80 lg:h-80 bg-[#1f3e32]/5 rounded-full blur-xl sm:blur-2xl lg:blur-3xl"></div>
      </div>

      {/* Subtle Grid Pattern */}
      <div className="absolute inset-0 opacity-[0.02] lg:opacity-[0.03]">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `radial-gradient(circle at 25% 25%, #1f3e32 1px, transparent 1px)`,
            backgroundSize: "30px 30px sm:40px 40px lg:50px 50px",
          }}
        ></div>
      </div>

      {/* Floating Elements */}
      <div className="absolute top-6 left-6 sm:top-10 sm:left-10 w-4 h-4 sm:w-6 sm:h-6 bg-[#c19755]/20 rounded-full animate-float"></div>
      <div className="absolute bottom-6 right-6 sm:bottom-10 sm:right-10 w-5 h-5 sm:w-8 sm:h-8 bg-[#1f3e32]/20 rounded-full animate-float delay-1000"></div>
      <div className="hidden sm:block absolute top-1/2 right-8 sm:right-20 w-3 h-3 sm:w-4 sm:h-4 bg-[#c19755]/15 rounded-full animate-float delay-500"></div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 sm:px-6 sm:py-3 bg-white/10 backdrop-blur-sm rounded-xl sm:rounded-2xl border border-gray-200/60 shadow-sm mb-6 sm:mb-8">
          <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-[#c19755] rounded-full animate-pulse"></div>
          <span className="text-xs sm:text-sm font-semibold text-gray-700 tracking-wide sm:tracking-wider">
            READY TO BEGIN?
          </span>
        </div>

        {/* Heading */}
        <h2 className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl 2xl:text-6xl font-bold text-gray-900 mb-4 sm:mb-6 leading-tight">
          Ready to Elevate Your{" "}
          <span className="text-[#c19755] relative inline-block">
            Trading Journey
            <div className="absolute bottom-1 sm:bottom-2 left-0 w-full h-1 sm:h-2 bg-[#c19755]/10 -z-10 rounded-full"></div>
          </span>
          ?
        </h2>

        {/* Description */}
        <p className="text-base sm:text-lg lg:text-xl text-gray-600 mb-8 sm:mb-10 lg:mb-12 max-w-3xl mx-auto leading-relaxed px-2">
          Join{" "}
          <span className="font-semibold text-[#1f3e32]">
            thousands of successful traders
          </span>{" "}
          who trust Rupie Times for professional market analysis, real-time
          insights, and comprehensive financial education.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 justify-center items-center mb-8 sm:mb-10 lg:mb-12 w-full max-w-2xl mx-auto">
          {/* Primary Button */}
          <button
            className="
              group relative 
              bg-gradient-to-r from-[#1f3e32] to-[#2a4f3f] 
              text-white px-6 py-4 sm:px-8 sm:py-4 lg:px-10 lg:py-5 
              rounded-sm sm:rounded-[5px] 
              font-semibold shadow-xl sm:shadow-2xl 
              hover:shadow-2xl sm:hover:shadow-3xl 
              transition-all duration-500 transform 
              border border-[#1f3e32]/20 overflow-hidden 
              w-full sm:w-auto
            "
          >
            {/* Shine Effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12 transform -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>

            <span className="relative flex items-center justify-center gap-2 sm:gap-3 text-sm sm:text-base">
              Start Free Trial
              <svg
                className="w-4 h-4 sm:w-5 sm:h-5 group-hover:translate-x-1 transition-transform duration-300 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 7l5 5m0 0l-5 5m5-5H6"
                />
              </svg>
            </span>
          </button>

          {/* Secondary Button */}
          <button
            className="
              group relative 
              bg-white/10 backdrop-blur-sm text-gray-900 
              px-6 py-4 sm:px-8 sm:py-4 lg:px-10 lg:py-5 
              rounded-[5px] sm:rounded-xl font-semibold 
              shadow-md hover:shadow-lg 
              transition-all duration-500 
              border border-gray-200/60 
              sm:hover:border-transparent 
              overflow-hidden w-full sm:w-auto
            "
          >
            <span className="relative flex items-center justify-center gap-2 sm:gap-3 text-sm sm:text-base z-10">
              Explore Features
              <svg
                className="w-4 h-4 sm:w-5 sm:h-5 transition-transform duration-300 group-hover:translate-x-1 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </span>

            {/* Hover Gradient Background */}
            <div
              className="
                absolute inset-0 
                bg-gradient-to-r from-[#c19755] to-[#1f3e32] 
                opacity-0 group-hover:opacity-100 
                transition-opacity duration-500 ease-in-out
              "
            ></div>

            {/* Inner Glass Layer */}
            <div
              className="
                absolute inset-[1px] 
                rounded-[5px] sm:rounded-xl 
                bg-white/10 backdrop-blur-sm 
                group-hover:bg-transparent 
                transition-all duration-500
              "
            ></div>
          </button>
        </div>
      </div>
    </section>
  );
};
