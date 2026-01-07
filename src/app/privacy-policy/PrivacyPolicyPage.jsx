"use client";

import { privacyPolicyData } from "../data/privacyPolicyData";

export default function PrivacyPolicyPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-20">
      <h1 className="text-4xl lg:text-5xl font-bold text-black text-center mb-8">
        {privacyPolicyData.title}
      </h1>
      
      <p className="text-gray-600 text-center mb-12 lg:mb-16">
        Last Updated : {privacyPolicyData.lastUpdated}
      </p>

      <div className="space-y-12 backdrop-blur supports-[backdrop-filter]:bg-white/10 bg-white/10 p-4 rounded-lg">
        {privacyPolicyData.intro && (
          <p className="text-black font-semibold text-lg leading-relaxed">
            {privacyPolicyData.intro}
          </p>
        )}

        {privacyPolicyData.sections.map((section, index) => (
          <div key={index}>
            <h2 className="text-xl font-bold text-black mb-4">
              {section.title}
            </h2>
            <p className="text-black/80 leading-relaxed whitespace-pre-line text-[15px] lg:text-[16px] text-justify">
              {section.content}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
