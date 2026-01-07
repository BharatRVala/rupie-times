"use client";

import { useState } from "react";
import Image from "next/image";
import content from "./content.json";
import rupeeSvg from "../assets/rupee.svg";
import { sendEmail } from "../actions/email";

export default function ContactPage() {
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    number: "",
    subject: "",
    message: ""
  });
  const [status, setStatus] = useState("idle"); // idle, loading, success, error
  const [message, setMessage] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus("loading");
    setMessage("");


    // Create a FormData object from the state to pass to the Server Action
    const formDataObj = new FormData();
    formDataObj.append("fullName", formData.fullName);
    formDataObj.append("email", formData.email);
    formDataObj.append("number", formData.number);
    formDataObj.append("subject", formData.subject);
    formDataObj.append("message", formData.message);

    try {
      // Call the Server Action
      const result = await sendEmail(formDataObj); // Imported from actions/email

      if (result.success) {
        setStatus("success");
        setMessage("Thank you! Your message has been sent successfully.");
        setFormData({ fullName: "", email: "", number: "", subject: "", message: "" });
      } else {
        setStatus("error");
        setMessage(result.error || "Failed to send message.");
      }
    } catch (error) {
      console.error("Submission error:", error);
      setStatus("error");
      setMessage("An unexpected error occurred. Please try again.");
    }
  };

  return (
    <div className="relative min-h-[calc(100vh-80px)] overflow-hidden backdrop-blur supports-[backdrop-filter]:bg-white/10 bg-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-20 relative z-10 flex justify-center items-center min-h-[600px]">
        {/* Watermark Image - Positioned Absolutely on Left */}
        <div className="absolute top-1/2 -translate-y-1/2 left-0 w-[323px] pointer-events-none z-0 opacity-50 lg:opacity-100">
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
          <h2 className="text-6xl lg:text-[89px] font-bold text-black mb-6 leading-tight text-left whitespace-pre-line">
            {content.title}
          </h2>
          <p className="text-gray-600 max-w-2xl w-full mb-12 text-[19px] text-left">
            {content.subtitle}
          </p>

          <form onSubmit={handleSubmit} className="space-y-6 max-w-lg w-full">
            {content.form.fields.map((field) => (
              <div key={field.name}>
                {field.type === "textarea" ? (
                  <textarea
                    name={field.name}
                    value={formData[field.name]}
                    onChange={handleChange}
                    placeholder={field.placeholder}
                    required={field.name !== 'number'} // Assuming number is optional
                    rows={4}
                    className="w-full px-6 py-4 border border-gray-300 rounded-[10px] text-gray-700 placeholder-gray-500 focus:outline-none focus:border-[#C0934B] resize-none"
                    disabled={status === "loading"}
                  />
                ) : (
                  <input
                    type={field.type}
                    name={field.name}
                    value={formData[field.name]}
                    onChange={handleChange}
                    placeholder={field.placeholder}
                    required={field.name !== 'number'}
                    className="w-full px-6 py-4 border border-gray-300 rounded-[10px] text-gray-700 placeholder-gray-500 focus:outline-none focus:border-[#C0934B]"
                    disabled={status === "loading"}
                  />
                )}
              </div>
            ))}

            {message && (
              <div className={`p-4 rounded-lg ${status === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={status === "loading"}
              className="bg-[#C0934B] text-white px-10 py-3 rounded-full font-bold text-lg hover:bg-[#a37c3f] transition-colors mt-4 disabled:opacity-50"
            >
              {status === "loading" ? "Sending..." : content.form.submitButton}
            </button>
          </form>
        </div>
      </div>

      {/* Contact Info Grid */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-20 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-12 gap-y-16">
          {content.contactInfo.map((item, index) => (
            <div key={index}>
              <h3 className="text-gray-500 text-lg mb-3">{item.title}</h3>
              <div className="space-y-1">
                {item.details.map((line, idx) => (
                  <p
                    key={idx}
                    className={`text-[16px] leading-relaxed ${item.isBold ? 'font-bold text-black' : 'text-gray-600'}`}
                  >
                    {line}
                  </p>
                ))}
                {item.email && (
                  <p className="font-bold text-black text-[16px] mt-1">{item.email}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
