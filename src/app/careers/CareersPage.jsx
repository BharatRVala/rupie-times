"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import content from "./content.json";
import GlobalLoader from "@/app/components/GlobalLoader";

export default function CareersPage() {
  const [activeJobs, setActiveJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchJobs = async () => {
      try {
        const response = await fetch('/api/user/careers');
        const data = await response.json();
        if (data.success) {
          setActiveJobs(data.data);
        }
      } catch (error) {
        console.error("Error fetching careers:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchJobs();
  }, []);

  // Helper function to format date
  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      const options = { year: "numeric", month: "long", day: "numeric" };
      return date.toLocaleDateString("en-GB", options);
    } catch {
      return dateString;
    }
  };

  if (loading) {
    return <GlobalLoader fullScreen={true} />;
  }

  return (
    <div className="bg-white min-h-screen font-sans text-black">
      {/* Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-20">

        {/* Hero Section */}
        <div className="max-w-4xl mb-20">
          <span className="inline-block bg-[#C0934B] text-white px-6 py-2.5 rounded-full font-bold text-sm mb-8 tracking-wide uppercase">
            {content.hero.badge}
          </span>
          <h1 className="text-4xl lg:text-[56px] font-bold text-black mb-6 leading-[1.1] tracking-tight whitespace-pre-line">
            {content.hero.title}
          </h1>
          <p className="text-gray-600 text-lg lg:text-[19px] leading-relaxed max-w-2xl">
            {content.hero.description}
          </p>
        </div>

        {/* Who We Hire Section */}
        <div className="mb-32">
          <h2 className="text-3xl lg:text-[40px] font-bold text-black mb-12">
            {content.jobSection.title}
          </h2>

          <div className="space-y-6">
            {activeJobs.length > 0 ? (
              activeJobs.map((job) => (
                <Link
                  key={job._id}
                  href={`/careers/apply?position=${encodeURIComponent(job.jobPosition)}`}
                  className="group block border border-gray-200 rounded-lg p-6 lg:p-8 hover:border-[#C0934B] hover:shadow-sm transition-all duration-300"
                >
                  <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-6">
                    <div className="flex-1">
                      <h3 className="text-2xl font-bold text-black mb-4 group-hover:text-[#C0934B] transition-colors">
                        {job.jobPosition}
                      </h3>
                      <div className="flex flex-wrap gap-x-8 gap-y-2 text-gray-500 text-[15px]">
                        <span className="flex items-center gap-2">
                          Location: <span className="text-black">{job.location}</span>
                        </span>
                        <span className="flex items-center gap-2">
                          Experience: <span className="text-black">{job.experience}</span>
                        </span>
                        <span className="flex items-center gap-2">
                          Posted On:{" "}
                          <span className="text-black">{formatDate(job.createdAt)}</span>
                        </span>
                      </div>
                    </div>

                    <div>
                      <div className="w-10 h-10 rounded-full bg-[#C0934B] text-white flex items-center justify-center transform group-hover:bg-[#a57e3f] group-hover:scale-110 transition-all duration-300">
                        <ArrowUpRight size={20} />
                      </div>
                    </div>
                  </div>
                </Link>
              ))
            ) : (
              <div className="p-8 text-center text-gray-500 bg-gray-50 rounded-lg">
                No active job openings at the moment. Please check back later.
              </div>
            )}
          </div>
        </div>

        {/* Life at Our Newsroom Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-24 items-center">
          <div className="relative aspect-video lg:aspect-square rounded-xl overflow-hidden shadow-lg">
            <Image
              src={content.workCulture.image}
              alt="Life at our Newsroom"
              fill
              className="object-cover"
            />
          </div>

          <div>
            <h2 className="text-3xl lg:text-[40px] font-bold text-black mb-8">
              {content.workCulture.title}
            </h2>
            <p className="text-gray-600 text-lg leading-relaxed mb-8">
              {content.workCulture.description}
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
