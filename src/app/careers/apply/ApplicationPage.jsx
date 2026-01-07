"use client";

import { useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import Image from "next/image";
import content from "../content.json";
import rupeeSvg from "../../assets/rupee.svg";
import { FaUpload } from "react-icons/fa";

export default function ApplicationPage() {
  const searchParams = useSearchParams();
  const position = searchParams.get("position") || "";

  // State for dynamic job data
  const [selectedJob, setSelectedJob] = useState(null);

  useEffect(() => {
    const fetchJobDetails = async () => {
      try {
        const response = await fetch('/api/user/careers');
        const data = await response.json();
        if (data.success && position) {
          // Find job by position name (or ideally ID, but URL uses position name per user request)
          const job = data.data.find(j => j.jobPosition === position);
          setSelectedJob(job);
        }
      } catch (error) {
        console.error("Error fetching job details:", error);
      }
    };

    if (position) {
      fetchJobDetails();
    }
  }, [position]);

  const [formData, setFormData] = useState({
    fullName: "",
    contactNumber: "",
    email: "",
    position: position,
    message: "",
    resume: null,
    resumeName: ""
  });

  const [status, setStatus] = useState("idle"); // idle, loading, success, error

  // Update formData when position changes
  useEffect(() => {
    if (position) {
      setFormData(prev => ({ ...prev, position }));
    }
  }, [position]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 4 * 1024 * 1024) { // 4MB limit
        alert("File size should be less than 4MB");
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({
          ...prev,
          resume: reader.result,
          resumeName: file.name
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus("loading");

    try {
      const response = await fetch('/api/careers/apply', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        setStatus("success");
        // Reset form except position
        setFormData(prev => ({
          fullName: "",
          email: "",
          contactNumber: "",
          position: prev.position, // Keep position selected
          message: "",
          resume: null,
          resumeName: ""
        }));
      } else {
        setStatus("error");
        console.error(data.error);
        alert(data.error || "Submission failed");
      }
    } catch (error) {
      console.error("Submission error:", error);
      setStatus("error");
    }
  };

  return (
    <div className="relative min-h-[calc(100vh-80px)] overflow-hidden bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-20 relative z-10 flex justify-center items-center min-h-[600px]">
        {/* Watermark Image - Positioned Absolutely on Left */}
        <div className="absolute top-1/2 -translate-y-1/2 left-0 w-[323px] pointer-events-none z-0 hidden lg:block">
          <Image
            src={rupeeSvg}
            alt="Rupie Watermark"
            width={323}
            height={389}
            className="w-full h-auto"
          />
        </div>

        {/* Center: Content & Form */}
        <div className="relative z-10 max-w-4xl w-full">
          <h2 className="text-5xl lg:text-[60px] font-bold text-black mb-6 leading-tight text-center lg:text-left">
            {content.applicationForm.title}
          </h2>
          <p className="text-gray-600 mb-12 text-[19px] text-center lg:text-left max-w-2xl">
            {content.applicationForm.subtitle}
          </p>

          {/* Job Details Card */}
          {selectedJob && (
            <div className="bg-white border border-gray-200 rounded-xl p-8 mb-12 shadow-sm">
              <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4 mb-6">
                <div>
                  <h3 className="text-3xl font-bold text-black mb-2">{selectedJob.jobPosition}</h3>
                  <p className="text-gray-600">Location : {selectedJob.location}</p>
                </div>
                <div className="md:text-right">
                  <p className="text-gray-600">Experience : {selectedJob.experience}</p>
                </div>
              </div>

              {selectedJob.responsibilities && (
                <div>
                  <h4 className="font-bold text-black mb-4">Responsibilities :</h4>
                  <ul className="list-disc list-outside ml-5 space-y-2 text-gray-600">
                    {/* Responsibilities can be string or array (from parsing or API) */}
                    {typeof selectedJob.responsibilities === 'string' ? (
                      selectedJob.responsibilities.split('\n').filter(r => r.trim()).map((resp, index) => (
                        <li key={index} className="pl-1">{resp}</li>
                      ))
                    ) : (
                      Array.isArray(selectedJob.responsibilities) && selectedJob.responsibilities.map((resp, index) => (
                        <li key={index} className="pl-1">{resp}</li>
                      ))
                    )}
                  </ul>
                </div>
              )}
            </div>
          )}

          {status === "success" ? (
            <div className="bg-green-50 border border-green-200 text-green-700 px-6 py-8 rounded-lg text-center max-w-lg w-full mx-auto lg:mx-0">
              <h3 className="text-2xl font-bold mb-2">Application Received!</h3>
              <p>Thank you for applying. We have sent a confirmation to us and will review your application shortly.</p>
              <button
                onClick={() => setStatus("idle")}
                className="mt-6 text-[#C0934B] font-bold hover:underline"
              >
                Submit another application
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6 max-w-lg w-full">
              {content.applicationForm.fields.map((field) => (
                <div key={field.name}>
                  {field.type === "textarea" ? (
                    <textarea
                      name={field.name}
                      placeholder={field.placeholder}
                      value={formData[field.name] || ""}
                      onChange={handleChange}
                      required={!field.optional}
                      rows={4}
                      className="w-full px-6 py-4 border border-gray-300 rounded-[10px] text-gray-700 placeholder-gray-500 focus:outline-none focus:border-[#C0934B] resize-none"
                    />
                  ) : field.type === "file" ? (
                    <div className="relative">
                      <input
                        type="file"
                        id="resume-upload"
                        className="hidden"
                        accept=".pdf,.doc,.docx"
                        onChange={handleFileChange}
                      />
                      <label
                        htmlFor="resume-upload"
                        className="w-full px-6 py-4 border border-gray-300 rounded-[10px] text-gray-500 flex justify-between items-center cursor-pointer hover:border-[#C0934B] transition-colors"
                      >
                        <span className="truncate pr-4">
                          {formData.resumeName || field.placeholder}
                        </span>
                        <FaUpload className={`${formData.resumeName ? 'text-[#C0934B]' : 'text-gray-400'}`} />
                      </label>
                    </div>
                  ) : (
                    <input
                      type={field.type}
                      name={field.name}
                      placeholder={field.placeholder}
                      value={formData[field.name] || ""}
                      onChange={handleChange}
                      required={!field.optional}
                      readOnly={field.readOnly}
                      className={`w-full px-6 py-4 border border-gray-300 rounded-[10px] text-gray-700 placeholder-gray-500 focus:outline-none focus:border-[#C0934B] ${field.readOnly ? 'bg-gray-50' : ''}`}
                    />
                  )}
                </div>
              ))}

              {status === "error" && (
                <div className="text-red-500 text-sm">
                  Failed to submit application. Please try again.
                </div>
              )}

              <button
                type="submit"
                disabled={status === "loading"}
                className={`bg-[#C0934B] text-white px-10 py-3 rounded-full font-bold text-lg hover:bg-[#a37c3f] transition-colors mt-4 w-full sm:w-auto ${status === "loading" ? "opacity-70 cursor-not-allowed" : ""}`}
              >
                {status === "loading" ? "Submitting..." : content.applicationForm.submitButton}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
