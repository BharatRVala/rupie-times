'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { FaArrowRight } from 'react-icons/fa';
import { motion } from 'framer-motion';

// Content Data
const CONTENT_DATA = {
  sectionLabel: "How It Works",
  title: "Our Simple Process",
  description: "We’ve designed a simple and secure flow to help you access premium stock market insights without confusion. From login to reading articles, everything happens smoothly in just a few steps.",
  cta: {
    text: "Get Started",
    link: "/auth",
  },
  mainImage: "/assets/howitworks.webp",
  steps: [
    {
      id: 1,
      number: "01",
      stepLabel: "STEP -01",
      title: "Create Account or Log In",
      description: "Start by creating your account or logging in. To access premium articles, login is required before subscribing.",
    },
    {
      id: 2,
      number: "02",
      stepLabel: "STEP -02",
      title: "Subscribe to Premium Articles",
      description: "Choose the article or plan that fits your strategy. Proceed to checkout and complete your payment securely.",
    },
    {
      id: 3,
      number: "03",
      stepLabel: "STEP -03",
      title: "Access Your Dashboard & Read",
      description: "After payment, you’re redirected to your personal dashboard. View your active subscriptions and start reading premium insights instantly.",
    },
  ],
};

const HowItWorks = () => {
  return (
    <section className="mx-auto max-w-7xl px-4 sm:px-5 md:px-6 lg:px-8 py-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

        {/* Column 1: Info & CTA (Left) - Span 4 cols */}
        <div className="lg:col-span-4 flex flex-col items-start backdrop-blur supports-[backdrop-filter]:bg-white/10 bg-white/10 p-6 rounded-lg">
          <div className="bg-[#00301F] text-white text-xs font-bold px-4 py-2 rounded-[20px] mb-6 uppercase tracking-wider">
            {CONTENT_DATA.sectionLabel}
          </div>

          <h2 className="text-4xl font-bold text-black mb-6 leading-tight">
            {CONTENT_DATA.title}
          </h2>

          <p className="text-gray-600 mb-8 leading-relaxed">
            {CONTENT_DATA.description}
          </p>

          <Link href={CONTENT_DATA.cta.link} className="inline-flex items-center bg-[#C0934B] text-white font-medium px-6 py-3 rounded-lg hover:bg-[#a37a3b] transition-colors mb-12">
            {CONTENT_DATA.cta.text} <FaArrowRight className="ml-2 w-4 h-4" />
          </Link>

          {/* Main Image */}
          <div className="w-full h-64 rounded-xl overflow-hidden relative bg-gray-200">
            <Image
              src={CONTENT_DATA.mainImage}
              alt="Process"
              fill
              className="object-cover"
              unoptimized
            />
          </div>
        </div>

        {/* Column 2: Timeline (Center) - Span 2 cols */}
        <div className="lg:col-span-2 hidden lg:flex flex-col items-center pt-4 relative">
          {/* Animated Vertical Line */}
          <div className="absolute top-8 bottom-20 left-1/2 w-0.5 h-[66%] -translate-x-1/2 z-0 bg-gray-200 overflow-hidden">
            <motion.div
              initial={{ height: 0 }}
              whileInView={{ height: '100%' }}
              viewport={{ once: true }}
              transition={{ duration: 1.5, ease: "easeInOut" }}
              className="w-full bg-[#00301F]"
            />
          </div>

          {/* Steps Circles */}
          {CONTENT_DATA.steps.map((step, index) => (
            <div
              key={step.id}
              className={`w-12 h-12 rounded-full bg-[#E5E7EB] flex items-center justify-center z-10 text-[#00301F] font-bold text-sm border-4 border-white shadow-sm ${index !== CONTENT_DATA.steps.length - 1 ? 'mb-[180px]' : ''}`}
            >
              {step.number}
            </div>
          ))}
        </div>

        {/* Column 3: Step Cards (Right) - Span 6 cols */}
        <div className="lg:col-span-6 flex flex-col gap-8 pt-2">
          {CONTENT_DATA.steps.map((step, index) => (
            <motion.div
              key={step.id}
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.3, duration: 0.5 }}
              className="backdrop-blur supports-[backdrop-filter]:bg-[#D6E0DD]/10 bg-[#D6E0DD]/10 p-8 rounded-lg h-[180px] flex flex-col justify-center hover:shadow-md transition-shadow duration-300"
            >
              <span className="text-[#00301F] font-medium mb-2 uppercase tracking-wide text-sm">
                {step.stepLabel}
              </span>
              <h3 className="text-2xl font-bold text-[#00301F] mb-3">
                {step.title}
              </h3>
              <p className="text-[#00301F] text-base max-w-md">
                {step.description}
              </p>
            </motion.div>
          ))}
        </div>

      </div>
    </section>
  );
};

export default HowItWorks;
