"use client";

import { useState } from "react";
import { IoClose } from "react-icons/io5";

export default function AddJobPopup({ isOpen, onClose, onSubmit }) {
    const [formData, setFormData] = useState({
        jobPosition: "",
        location: "",
        experience: "",
        responsibilities: ""
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit(formData);
        setFormData({
            jobPosition: "",
            location: "",
            experience: "",
            responsibilities: ""
        });
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl w-full max-w-lg shadow-xl overflow-hidden">
                {/* Header */}
                <div className="px-6 py-4 flex items-center justify-between">
                    <h2 className="text-2xl font-bold text-gray-900">Add Job Position</h2>
                    <button
                        onClick={onClose}
                        className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                    >
                        <IoClose size={24} className="text-gray-500" />
                    </button>
                </div>

                <div className="h-px bg-gray-100 w-full" />

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-5">

                    {/* Job Position */}
                    <div className="flex flex-col gap-2">
                        <label htmlFor="position" className="text-sm font-medium text-gray-700">
                            Job Position
                        </label>
                        <input
                            type="text"
                            id="jobPosition"
                            name="jobPosition"
                            placeholder="Enter Job Position"
                            value={formData.jobPosition}
                            onChange={handleChange}
                            required
                            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:border-[#C0934B] focus:ring-1 focus:ring-[#C0934B] transition-colors placeholder:text-gray-400"
                        />
                    </div>

                    {/* Location */}
                    <div className="flex flex-col gap-2">
                        <label htmlFor="location" className="text-sm font-medium text-gray-700">
                            Location
                        </label>
                        <input
                            type="text"
                            id="location"
                            name="location"
                            placeholder="Enter job location"
                            value={formData.location}
                            onChange={handleChange}
                            required
                            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:border-[#C0934B] focus:ring-1 focus:ring-[#C0934B] transition-colors placeholder:text-gray-400"
                        />
                    </div>

                    {/* Experience */}
                    <div className="flex flex-col gap-2">
                        <label htmlFor="experience" className="text-sm font-medium text-gray-700">
                            Experience
                        </label>
                        <input
                            type="text"
                            id="experience"
                            name="experience"
                            placeholder="Select Experience"
                            value={formData.experience}
                            onChange={handleChange}
                            required
                            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:border-[#C0934B] focus:ring-1 focus:ring-[#C0934B] transition-colors placeholder:text-gray-400"
                        />
                        {/* Note: User specifically asked for Input for experience to allow free text like "1 year exp" or "fresher" */}
                    </div>

                    {/* Responsibilities */}
                    <div className="flex flex-col gap-2">
                        <label htmlFor="responsibilities" className="text-sm font-medium text-gray-700">
                            Responsibilities
                        </label>
                        <textarea
                            id="responsibilities"
                            name="responsibilities"
                            placeholder="Enter Responsibilities"
                            value={formData.responsibilities}
                            onChange={handleChange}
                            required
                            rows={4}
                            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:border-[#C0934B] focus:ring-1 focus:ring-[#C0934B] transition-colors placeholder:text-gray-400 resize-none"
                        />
                    </div>

                    {/* Submit Button */}
                    <button
                        type="submit"
                        className="mt-2 w-full bg-[#C0934B] hover:bg-[#a57e3f] text-white font-medium py-3 rounded-lg transition-colors shadow-sm"
                    >
                        Submit
                    </button>
                </form>
            </div>
        </div>
    );
}
