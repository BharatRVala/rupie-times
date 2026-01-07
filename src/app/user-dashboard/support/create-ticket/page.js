"use client";

import { useState } from "react";
import { supportData } from "../../../data/supportData";
import { HiChevronDown } from "react-icons/hi";
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const mapCategoryToBackend = (displayCategory) => {
    const map = {
        "General Inquiry": "general",
        "Technical Support": "technical",
        "Billing": "billing",
        "Feature Request": "feature_request",
        "Subscription": "subscription",
        "Bug Report": "bug_report",
        "Other": "other"
    };
    return map[displayCategory] || "general"; // Default fallback
};

export default function CreateTicketPage() {
    const { createTicketForm, pageHeader } = supportData;
    const router = useRouter();

    // Form State
    const [formData, setFormData] = useState({
        category: createTicketForm.fields.category.options[0],
        priority: createTicketForm.fields.priority.options[1], // Default Medium
        subject: "",
        message: ""
    });
    const [submitting, setSubmitting] = useState(false);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async () => {
        if (!formData.subject.trim() || !formData.message.trim()) {
            alert("Please fill in all required fields.");
            return;
        }

        setSubmitting(true);
        try {
            const payload = {
                ...formData,
                category: mapCategoryToBackend(formData.category),
                priority: formData.priority.toLowerCase()
            };

            const response = await fetch('/api/user/support/create', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                // Redirect to support list on success
                router.push('/user-dashboard/support');
            } else {
                const data = await response.json();
                alert(data.error || "Failed to create ticket");
            }
        } catch (error) {
            console.error("Error creating ticket:", error);
            alert("An error occurred while creating the ticket.");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="w-full space-y-6">

            {/* Page Header Section (Reused from support page for consistency) */}
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-[#1E4032]">{pageHeader.title}</h1>
                <p className="text-gray-500 mt-1 text-sm">
                    {pageHeader.subtitle}
                </p>
            </div>

            {/* Form Container */}
            <div className="border border-gray-200 rounded-xl p-8 backdrop-blur supports-[backdrop-filter]:bg-white/10 bg-white/10 shadow-sm">
                <h2 className="text-lg font-bold text-[#1E4032] mb-6">{createTicketForm.title}</h2>

                <div className="space-y-6">
                    {/* Row 1: Category & Priority */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Category */}
                        <div className="space-y-2">
                            <label className="text-sm text-gray-600">{createTicketForm.fields.category.label}</label>
                            <div className="relative">
                                <select
                                    name="category"
                                    value={formData.category}
                                    onChange={handleChange}
                                    className="w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-600 appearance-none bg-white focus:outline-none focus:border-[#1E4032]"
                                >
                                    {createTicketForm.fields.category.options.map((opt, idx) => (
                                        <option key={idx} value={opt}>{opt}</option>
                                    ))}
                                </select>
                                <HiChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                            </div>
                        </div>

                        {/* Priority */}
                        <div className="space-y-2">
                            <label className="text-sm text-gray-600">{createTicketForm.fields.priority.label}</label>
                            <div className="relative">
                                <select
                                    name="priority"
                                    value={formData.priority}
                                    onChange={handleChange}
                                    className="w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-600 appearance-none bg-white focus:outline-none focus:border-[#1E4032]"
                                >
                                    {createTicketForm.fields.priority.options.map((opt, idx) => (
                                        <option key={idx} value={opt}>{opt}</option>
                                    ))}
                                </select>
                                <HiChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                            </div>
                        </div>
                    </div>

                    {/* Subject */}
                    <div className="space-y-2">
                        <label className="text-sm text-gray-600">{createTicketForm.fields.subject.label}</label>
                        <input
                            type="text"
                            name="subject"
                            value={formData.subject}
                            onChange={handleChange}
                            placeholder={createTicketForm.fields.subject.placeholder}
                            className="w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-600 focus:outline-none focus:border-[#1E4032]"
                        />
                    </div>

                    {/* Message */}
                    <div className="space-y-2">
                        <label className="text-sm text-gray-600">{createTicketForm.fields.message.label}</label>
                        <textarea
                            name="message"
                            value={formData.message}
                            onChange={handleChange}
                            placeholder={createTicketForm.fields.message.placeholder}
                            rows={6}
                            className="w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-600 focus:outline-none focus:border-[#1E4032] resize-none"
                        />
                    </div>

                    {/* Buttons */}
                    <div className="flex justify-end items-center gap-4 pt-4">
                        <Link href="/user-dashboard/support">
                            <button className="px-8 py-2.5 rounded-lg border border-[#C0934B] text-[#C0934B] text-sm font-medium hover:bg-[#fff9e6] transition-colors">
                                {createTicketForm.buttons.cancel}
                            </button>
                        </Link>
                        <button
                            onClick={handleSubmit}
                            disabled={submitting}
                            className={`px-8 py-2.5 rounded-lg bg-[#C0934B] text-white text-sm font-medium hover:bg-[#a37c3f] transition-colors ${submitting ? 'opacity-70 cursor-not-allowed' : ''}`}
                        >
                            {submitting ? 'Creating...' : createTicketForm.buttons.submit}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
