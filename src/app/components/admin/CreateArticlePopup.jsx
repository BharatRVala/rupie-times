"use client";

import { useState, useRef, useEffect } from 'react';
import { IoCloudUploadOutline, IoTrashOutline } from "react-icons/io5";

export default function CreateArticlePopup({ isOpen, onClose, productName = "", initialData = null, onSubmit, existingDurations = [] }) {
    const [formData, setFormData] = useState({
        heading: '',
        description: '',
        category: '',
        image: null,
        issueDate: '',
        issueEndDate: '',
        isFreeTrial: false
    });
    const [selectedDuration, setSelectedDuration] = useState(""); // State for dropdown
    const [showCustomDate, setShowCustomDate] = useState(false);  // State to show manual inputs
    const fileInputRef = useRef(null);
    const [loading, setLoading] = useState(false);

    // Initialize/Reset form data when popup opens or initialData changes
    useEffect(() => {
        if (!isOpen) return;

        let newFormData = {
            heading: '',
            description: '',
            category: '',
            image: null,
            issueDate: '',
            issueEndDate: '',
            isFreeTrial: false
        };

        if (initialData) {
            newFormData = {
                heading: initialData.title || '',
                description: initialData.subtitle || '',
                category: initialData.category || '',
                image: initialData.coverImage || null,
                issueDate: initialData.issueDate ? new Date(initialData.issueDate).toISOString().split('T')[0] : '',
                issueEndDate: initialData.issueEndDate ? new Date(initialData.issueEndDate).toISOString().split('T')[0] : '',
                isFreeTrial: initialData.isFreeTrial || false
            };
        }

        setFormData(newFormData);

        // Determine correct dropdown state based on the NEW data
        if (newFormData.issueDate && newFormData.issueEndDate) {
            const formattedStart = newFormData.issueDate;
            const formattedEnd = newFormData.issueEndDate;

            const match = existingDurations.find(d => {
                // Ensure safe date parsing for comparison
                if (!d.issueDate || !d.issueEndDate) return false;
                const dStart = new Date(d.issueDate).toISOString().split('T')[0];
                const dEnd = new Date(d.issueEndDate).toISOString().split('T')[0];
                return dStart === formattedStart && dEnd === formattedEnd;
            });

            if (match) {
                setSelectedDuration(match.label);
                setShowCustomDate(false);
            } else {
                setSelectedDuration("custom");
                setShowCustomDate(true);
            }
        } else {
            setSelectedDuration("");
            setShowCustomDate(false);
        }

    }, [isOpen, initialData]); // Run only when opening or data changes. existingDurations omitted to prevent loop, precise match needed.

    if (!isOpen) return null;

    const handleDurationChange = (e) => {
        const value = e.target.value;
        setSelectedDuration(value);

        if (value === "custom") {
            setShowCustomDate(true);
            // Optionally clear dates or keep previous
            setFormData(prev => ({
                ...prev,
                issueDate: '',
                issueEndDate: ''
            }));
        } else if (value === "") {
            setShowCustomDate(false);
            setFormData(prev => ({
                ...prev,
                issueDate: '',
                issueEndDate: ''
            }));
        } else {
            // Selected an existing duration
            setShowCustomDate(false);
            const selected = existingDurations.find(d => d.label === value);
            if (selected) {
                setFormData(prev => ({
                    ...prev,
                    issueDate: new Date(selected.issueDate).toISOString().split('T')[0],
                    issueEndDate: new Date(selected.issueEndDate).toISOString().split('T')[0]
                }));
            }
        }
    };

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setFormData(prev => ({
                ...prev,
                image: file
            }));
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        const file = e.dataTransfer.files[0];
        if (file) {
            setFormData(prev => ({
                ...prev,
                image: file
            }));
        }
    };

    const handleDragOver = (e) => {
        e.preventDefault();
    };

    const handleSubmit = async () => {
        console.log("Submitting formData:", formData); // DEBUG
        setLoading(true);
        try {
            if (onSubmit) {
                await onSubmit(formData);
            }
            // Ensure we don't close if there's an error handled by parent, 
            // but standard pattern here is close on success or let parent handle close.
            // The user's code had `onClose()` here.
            // I'll leave it to the parent to close on success usually, but let's follow user's snippet logic slightly modified to wait.
        } catch (error) {
            console.error("Error submitting article:", error);
            // alert("Failed to submit article"); // Parent handles alert usually
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            {/* Modal Card - Flex column container */}
            <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] shadow-xl overflow-hidden relative flex flex-col">

                {/* Header - Fixed Top */}
                <div className="z-20 bg-white p-6 border-b border-gray-100">
                    <h2 className="text-2xl font-bold text-[#1E4032]">{initialData ? 'Edit Article' : 'Create New Article'}</h2>
                    <p className="text-gray-500 text-sm mt-1">{initialData ? 'Update Article Details' : `Add New Article ${productName ? `to ${productName}` : ''}`}</p>
                </div>

                {/* Form Content - Scrollable area */}
                <div className="p-6 flex flex-col gap-6 flex-1 overflow-y-auto overscroll-y-contain" data-lenis-prevent>
                    {/* Main Heading */}
                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-semibold text-[#1E4032]">Main Heading</label>
                        <input
                            type="text"
                            name="heading"
                            value={formData.heading}
                            onChange={handleInputChange}
                            placeholder="Enter Main heading ...."
                            className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C0934B] focus:border-transparent text-gray-700 placeholder-gray-400"
                        />
                    </div>

                    {/* Description */}
                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-semibold text-[#1E4032]">Description</label>
                        <textarea
                            name="description"
                            value={formData.description}
                            onChange={handleInputChange}
                            placeholder="Enter description ...."
                            rows={4}
                            className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C0934B] focus:border-transparent text-gray-700 placeholder-gray-400 resize-none"
                        />
                    </div>

                    {/* Article cover Image */}
                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-semibold text-[#1E4032]">Article cover Image</label>
                        <div
                            onDrop={handleDrop}
                            onDragOver={handleDragOver}
                            onClick={() => fileInputRef.current?.click()}
                            className="border-2 border-dashed border-gray-200 rounded-lg p-8 flex flex-col items-center justify-center gap-3 cursor-pointer hover:border-[#C0934B] hover:bg-gray-50 transition-colors"
                        >
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileChange}
                                accept="image/*"
                                className="hidden"
                            />
                            {formData.image ? (
                                <div className="text-center">
                                    <p className="text-[#C0934B] font-medium truncate max-w-[200px] mx-auto">
                                        {formData.image instanceof File ? formData.image.name : "Current Image Present"}
                                    </p>
                                    <p className="text-xs text-gray-400 mt-1">Click to change</p>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setFormData(prev => ({ ...prev, image: null }));
                                            if (fileInputRef.current) fileInputRef.current.value = "";
                                        }}
                                        className="mt-2 text-red-500 hover:text-red-700 text-xs font-semibold px-3 py-1 bg-red-50 hover:bg-red-100 rounded-full transition-colors flex items-center justify-center gap-1 mx-auto"
                                        title="Remove Image"
                                    >
                                        <IoTrashOutline /> Remove Image
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center">
                                        <IoCloudUploadOutline className="text-3xl text-gray-400" />
                                    </div>
                                    <p className="text-gray-500 text-sm">Click to upload or drag and drop</p>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Category */}
                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-semibold text-[#1E4032]">Category</label>
                        <input
                            type="text"
                            name="category"
                            value={formData.category}
                            onChange={handleInputChange}
                            placeholder="Enter your Category ...."
                            className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C0934B] focus:border-transparent text-gray-700 placeholder-gray-400"
                        />
                    </div>

                    {/* Issue Date Duration */}
                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-semibold text-[#1E4032]">Issue Date Duration</label>

                        {/* Dropdown Selection */}
                        <select
                            value={selectedDuration}
                            onChange={handleDurationChange}
                            className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C0934B] focus:border-transparent text-gray-700 bg-white"
                        >
                            <option value="">Select Issue Date Duration</option>
                            {existingDurations.map((duration, index) => (
                                <option key={index} value={duration.label}>
                                    {duration.label}
                                </option>
                            ))}
                            <option value="custom">+ Add New Date</option>
                        </select>

                        {/* Custom Date Inputs - Only show if "custom" is selected */}
                        {showCustomDate && (
                            <div className="border border-gray-200 rounded-lg p-3 mt-2 animate-fadeIn">
                                <div className="flex items-center gap-4">
                                    <div className="flex-1">
                                        <label className="text-xs text-gray-500 mb-1 block">From</label>
                                        <input
                                            type="date"
                                            name="issueDate"
                                            value={formData.issueDate}
                                            onChange={handleInputChange}
                                            className="w-full px-3 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-[#C0934B] focus:border-transparent text-gray-700 text-sm"
                                        />
                                    </div>
                                    <div className="flex-1">
                                        <label className="text-xs text-gray-500 mb-1 block">To</label>
                                        <input
                                            type="date"
                                            name="issueEndDate"
                                            value={formData.issueEndDate}
                                            onChange={handleInputChange}
                                            className="w-full px-3 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-[#C0934B] focus:border-transparent text-gray-700 text-sm"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Enable Free Trial Access */}
                    <div className="flex items-start gap-3 mt-1">
                        <input
                            type="checkbox"
                            id="isFreeTrial"
                            name="isFreeTrial"
                            checked={formData.isFreeTrial}
                            onChange={handleInputChange}
                            className="mt-1 w-5 h-5 rounded border-gray-300 text-[#C0934B] focus:ring-[#C0934B] cursor-pointer"
                        />
                        <div className="flex flex-col">
                            <label htmlFor="isFreeTrial" className="text-sm font-semibold text-[#1E4032] cursor-pointer select-none">
                                Enable Free Trial Access
                            </label>
                            <p className="text-xs text-gray-500 mt-0.5">
                                Check this to allow users to read this issue/product as part of the free trial.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Footer Actions - Fixed Bottom */}
                <div className="z-20 bg-white p-6 border-t border-gray-100 flex items-center gap-4 mt-auto">
                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="px-6 py-2.5 bg-[#C0934B] text-white rounded-lg font-medium hover:bg-[#A87F3D] transition-colors disabled:opacity-50"
                    >
                        {loading ? 'Saving...' : (initialData ? 'Update Article' : 'Create Article')}
                    </button>
                    <button
                        onClick={onClose}
                        className="px-6 py-2.5 border border-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
}
