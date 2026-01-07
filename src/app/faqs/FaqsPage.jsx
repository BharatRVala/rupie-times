"use client";

import { useState } from 'react';
import { faqsData } from '../data/faqsData';
import { FaPlus, FaMinus } from 'react-icons/fa';

export default function FaqsPage() {
  const [openIndex, setOpenIndex] = useState(0);

  const toggleAccordion = (index) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-16 lg:py-24">
      <h1 className="text-4xl lg:text-5xl font-bold text-black text-center mb-16">
        {faqsData.title}
      </h1>

      <div className="space-y-4">
        {faqsData.items.map((item, index) => (
          <div
            key={index}
            className={`border border-gray-100 rounded-2xl overflow-hidden transition-all duration-300 ${openIndex === index ? 'bg-gray-50' : 'bg-white'
              }`}
          >
            <button
              onClick={() => toggleAccordion(index)}
              className="w-full flex items-center justify-between p-6 text-left focus:outline-none"
            >
              <span className="text-lg font-medium text-gray-900 pr-8">
                {item.question}
              </span>
              <span className="flex-shrink-0 text-gray-400">
                {openIndex === index ? (
                  <FaMinus className="w-4 h-4" />
                ) : (
                  <FaPlus className="w-4 h-4" />
                )}
              </span>
            </button>

            <div
              className={`grid transition-all duration-300 ease-in-out ${openIndex === index ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                }`}
            >
              <div className="overflow-hidden">
                <div className="px-6 pb-6 text-gray-600 leading-relaxed whitespace-pre-line">
                  {item.answer}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
