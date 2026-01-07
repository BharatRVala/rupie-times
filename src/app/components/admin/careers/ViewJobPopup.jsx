"use client";

import { IoClose } from "react-icons/io5";

export default function ViewJobPopup({ isOpen, onClose, job }) {
    if (!isOpen || !job) return null;

    const formatDate = (dateString) => {
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString("en-GB"); // DD/MM/YYYY format approx or just match design "12 / 12 / 2025"
        } catch (e) {
            return dateString;
        }
    };

    // Design shows split view for some fields
    // Posted On date formatting: "12 / 12 / 2025" with spaces

    const dateToFormat = job.createdAt || job.postedOn; // Fallback to postedOn if createdAt missing
    const formattedDate = new Date(dateToFormat).toLocaleDateString('en-GB');

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl w-full max-w-2xl shadow-xl overflow-hidden relative">

                {/* Header */}
                <div className="px-8 py-6 pb-2 flex items-center justify-between">
                    <h2 className="text-3xl font-bold text-black">Job Details</h2>
                    <button
                        onClick={onClose}
                        className="p-1 hover:bg-gray-100 rounded-full transition-colors absolute right-6 top-6"
                    >
                        <IoClose size={24} className="text-gray-500" />
                    </button>
                </div>

                <div className="px-8 py-6 space-y-8">

                    {/* Job Position */}
                    <div>
                        <h3 className="text-gray-500 text-sm font-medium mb-1">Job Position</h3>
                        <p className="text-xl text-gray-800 font-normal">{job.jobPosition}</p>
                    </div>

                    {/* Location & Experience Row */}
                    <div className="grid grid-cols-2 gap-8">
                        <div>
                            <h3 className="text-gray-500 text-sm font-medium mb-1">Location</h3>
                            <p className="text-xl text-gray-800 font-normal">{job.location}</p>
                        </div>
                        <div>
                            <h3 className="text-gray-500 text-sm font-medium mb-1">Experience</h3>
                            <p className="text-xl text-gray-800 font-normal">{job.experience}</p>
                        </div>
                    </div>

                    {/* Posted On */}
                    <div>
                        <h3 className="text-gray-500 text-sm font-medium mb-1">Posted On</h3>
                        <p className="text-xl text-gray-800 font-normal">{formattedDate.replace(/\//g, ' / ')}</p>
                    </div>

                    {/* Responsibilities */}
                    <div>
                        <h3 className="text-gray-600 text-base font-medium mb-3">Responsibilities:</h3>
                        <ul className="list-disc pl-5 space-y-1 text-gray-700">
                            {job.responsibilities && (
                                typeof job.responsibilities === 'string'
                                    ? job.responsibilities.split('\n').filter(r => r.trim()).map((resp, index) => (
                                        <li key={index} className="text-base leading-relaxed">
                                            {resp}
                                        </li>
                                    ))
                                    : Array.isArray(job.responsibilities) && job.responsibilities.length > 0
                                        ? job.responsibilities.map((resp, index) => (
                                            <li key={index} className="text-base leading-relaxed">
                                                {resp}
                                            </li>
                                        ))
                                        : <li className="text-gray-500 italic">No specific responsibilities listed.</li>
                            )}
                            {(!job.responsibilities || (Array.isArray(job.responsibilities) && job.responsibilities.length === 0)) && (
                                <li className="text-gray-500 italic">No specific responsibilities listed.</li>
                            )}
                        </ul>
                    </div>
                </div>

                {/* Bottom padding */}
                <div className="h-6"></div>
            </div>
        </div>
    );
}
