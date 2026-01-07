"use client";

import { useState, useEffect } from "react";
import { FaTimes, FaPlus, FaPen, FaTrash } from "react-icons/fa";
import { adminProductsData } from "../../data/adminProductsData";
import GlobalLoader from "../GlobalLoader";

export default function GlobalPromoCodeModal({ onClose }) {
    const { promoCodeForm } = adminProductsData;
    const [promoCodes, setPromoCodes] = useState([]);
    const [isExpanded, setIsExpanded] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [loading, setLoading] = useState(true);

    // Initial form state
    const initialFormState = {
        id: null,
        code: "",
        type: "Percentage",
        value: "",
        validFrom: "", // API might not have this, we'll check
        validUntil: "",
        usageLimit: "",
        isActive: true // Default to active
    };

    const [formData, setFormData] = useState(initialFormState);

    useEffect(() => {
        fetchPromoCodes();
    }, []);

    const fetchPromoCodes = async () => {
        try {
            const response = await fetch('/api/admin/promocodes');
            const data = await response.json();
            if (data.success) {
                // Map API data to UI structure
                setPromoCodes(data.promoCodes.map(p => ({
                    id: p._id,
                    code: p.code,
                    discount: p.discountValue,
                    type: p.discountType.charAt(0).toUpperCase() + p.discountType.slice(1), // Capitalize
                    value: p.discountValue,
                    validUntil: p.validUntil ? new Date(p.validUntil).toLocaleDateString() : 'N/A',
                    validUntilRaw: p.validUntil, // Keep raw for editing
                    usageLimit: p.usageLimit,
                    isActive: p.isActive
                })));
            }
        } catch (error) {
            console.error("Error fetching promo codes:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleExpandForCreate = () => {
        setIsExpanded(!isExpanded);
        setEditMode(false);
        setFormData(initialFormState);
    };

    const handleEditClick = (promo) => {
        setIsExpanded(true);
        setEditMode(true);
        // Pre-fill form
        setFormData({
            id: promo.id,
            code: promo.code,
            type: promo.type,
            value: promo.value,
            validFrom: "", // Not persisted in API currently
            validUntil: promo.validUntilRaw ? new Date(promo.validUntilRaw).toISOString().split('T')[0] : "", // Format for date input
            usageLimit: promo.usageLimit || "",
            isActive: promo.isActive
        });
    };

    const handleInputChange = (field, value) => {
        setFormData({ ...formData, [field]: value });
    };

    const handleDelete = async (id) => {
        // Removed confirm for smoother UX/Testing interaction
        // if (!confirm('Are you sure you want to delete this promo code?')) return;
        try {
            const response = await fetch(`/api/admin/promocodes/${id}`, {
                method: 'DELETE',
            });
            if (response.ok) {
                fetchPromoCodes(); // Refresh list
                if (editMode && formData.id === id) {
                    setIsExpanded(false); // Close edit if deleted
                }
            } else {
                alert('Failed to delete promo code');
            }
        } catch (error) {
            console.error("Error deleting promo code:", error);
        }
    };

    const handleSubmit = async () => {
        // Validate
        if (!formData.code || !formData.value) {
            alert('Code and Value are required');
            return;
        }

        try {
            const payload = {
                code: formData.code,
                discountType: formData.type.toLowerCase(), // Backend expects lowercase
                discountValue: Number(formData.value),
                validUntil: formData.validUntil ? formData.validUntil : null, // Handle empty string
                usageLimit: formData.usageLimit ? Number(formData.usageLimit) : null,
                isActive: formData.isActive
            };

            let response;
            if (editMode && formData.id) {
                // Update
                response = await fetch(`/api/admin/promocodes/${formData.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
            } else {
                // Create
                response = await fetch('/api/admin/promocodes', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
            }

            const result = await response.json();
            if (result.success) {
                fetchPromoCodes(); // Refresh
                setIsExpanded(false); // Close form
                setFormData(initialFormState); // Reset
            } else {
                alert(result.error || 'Failed to save promo code');
            }
        } catch (error) {
            console.error("Error saving promo code:", error);
            alert('Error saving promo code');
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div data-lenis-prevent className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto overscroll-y-contain shadow-2xl relative flex flex-col">

                {/* Header */}
                <div className="flex justify-between items-center p-6 pb-2">
                    <h2 className="text-2xl font-bold text-[#1E1E1E]">Global Promo Codes</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-[#1E1E1E] transition-colors">
                        <FaTimes size={20} />
                    </button>
                </div>

                {/* Promo Code List */}
                <div className="p-6 flex flex-col gap-4">
                    {loading ? (
                        <div className="flex justify-center items-center h-40">
                            <GlobalLoader fullScreen={false} />
                        </div>
                    ) : promoCodes.length === 0 ? (
                        <div className="text-center py-4 text-gray-500 italic">No global promo codes found.</div>
                    ) : (
                        promoCodes.map((promo) => (
                            <div key={promo.id} className="relative bg-[#FFFBF4] rounded-xl overflow-hidden shadow-sm border border-[#F5E6D3] flex flex-col sm:flex-row items-center justify-between p-4 px-8 min-h-[120px]">
                                {/* Decorative Background Elements simulated with CSS */}
                                <div className="absolute top-0 right-0 opacity-10 pointer-events-none">
                                    <svg width="100" height="100" viewBox="0 0 24 24" fill="#C0934B"><path d="M18.5 3h-2.5l-9 18h2.5l9-18zm-11 5c1.38 0 2.5-1.12 2.5-2.5s-1.12-2.5-2.5-2.5-2.5 1.12-2.5 2.5 1.12 2.5 2.5 2.5zm10 10c1.38 0 2.5-1.12 2.5-2.5s-1.12-2.5-2.5-2.5-2.5 1.12-2.5 2.5 1.12 2.5 2.5 2.5z" /></svg>
                                </div>
                                <div className="absolute bottom-[-10px] left-[-10px] opacity-10 pointer-events-none">
                                    <svg width="80" height="80" viewBox="0 0 24 24" fill="#C0934B"><path d="M18.5 3h-2.5l-9 18h2.5l9-18zm-11 5c1.38 0 2.5-1.12 2.5-2.5s-1.12-2.5-2.5-2.5-2.5 1.12-2.5 2.5 1.12 2.5 2.5 2.5zm10 10c1.38 0 2.5-1.12 2.5-2.5s-1.12-2.5-2.5-2.5-2.5 1.12-2.5 2.5 1.12 2.5 2.5 2.5z" /></svg>
                                </div>

                                {/* Left Side: Discount */}
                                <div className="flex items-center gap-1 z-10">
                                    <span className="text-5xl font-bold text-[#C0934B]">{promo.discount}</span>
                                    <div className="flex flex-col leading-tight text-[#C0934B] font-bold">
                                        <span className="text-xl">{promo.type === 'Percentage' ? '%' : '₹'}</span>
                                        <span className="text-lg">OFF</span>
                                    </div>
                                </div>

                                {/* Dashed Separator */}
                                <div className="hidden sm:block w-px h-16 border-r-2 border-dashed border-[#C0934B]/40 mx-6"></div>

                                {/* Middle: Code & Details */}
                                <div className="flex flex-col flex-1 items-center sm:items-start z-10 text-center sm:text-left">
                                    <span className="bg-[#DBC195] text-[#3E3E3E] font-bold px-6 py-1.5 rounded-sm tracking-widest text-lg mb-2 shadow-sm uppercase font-mono">
                                        {promo.code}
                                    </span>
                                    <div className="text-sm font-medium text-[#1E1E1E]">
                                        Expires on : {promo.validUntil}
                                    </div>
                                    <div className="text-sm font-medium text-[#1E1E1E] mt-0.5">
                                        Status : <span className={promo.isActive ? "text-green-600" : "text-red-500"}>{promo.isActive ? "Active" : "Expired"}</span>
                                    </div>
                                </div>

                                {/* Right Side: Actions */}
                                <div className="flex gap-3 z-10 mt-4 sm:mt-0">
                                    <button
                                        onClick={() => handleEditClick(promo)}
                                        className="text-[#C0934B] hover:text-[#A87F3D] transition-colors"
                                    >
                                        <FaPen size={16} />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(promo.id)}
                                        className="text-[#C0934B] hover:text-[#A87F3D] transition-colors"
                                    >
                                        <FaTrash size={16} />
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Divider if not expanded */}
                {!isExpanded && <div className="border-t border-dashed border-[#C0934B]/30 mx-6"></div>}

                {/* Add/Create Section */}
                <div className="p-6 pt-2">
                    {!isExpanded ? (
                        <button
                            onClick={handleExpandForCreate}
                            className="w-full sm:w-auto bg-[#C0934B] text-white px-6 py-3 rounded-lg font-medium hover:bg-[#A87F3D] transition-colors flex items-center justify-center gap-2"
                        >
                            <FaPlus size={14} /> Add Promo code
                        </button>
                    ) : (
                        <div className="mt-2 animate-fadeIn">
                            <div className="border-t border-dashed border-[#C0934B]/30 mb-6"></div>
                            <h3 className="text-xl font-bold text-[#1E1E1E] mb-4">
                                {editMode ? "Edit Promo Code" : "Create Promo Code"}
                            </h3>

                            <div className="flex flex-col gap-5">
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-sm font-medium text-gray-600">Code</label>
                                    <input
                                        type="text"
                                        value={formData.code}
                                        onChange={(e) => handleInputChange('code', e.target.value.toUpperCase())}
                                        className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:border-[#C0934B] text-gray-800 uppercase font-mono"
                                        placeholder="e.g. WINTER2024"
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-sm font-medium text-gray-600">Type</label>
                                        <select
                                            value={formData.type}
                                            onChange={(e) => handleInputChange('type', e.target.value)}
                                            className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:border-[#C0934B] bg-white text-gray-800"
                                        >
                                            <option value="Percentage">Percentage</option>
                                            <option value="Flat">Flat</option>
                                        </select>
                                    </div>
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-sm font-medium text-gray-600">Value</label>
                                        <input
                                            type="number"
                                            value={formData.value}
                                            onChange={(e) => handleInputChange('value', e.target.value)}
                                            className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:border-[#C0934B] text-gray-800"
                                            placeholder="value"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-sm font-medium text-gray-600">Valid Until</label>
                                        <input
                                            type="date"
                                            value={formData.validUntil}
                                            onChange={(e) => handleInputChange('validUntil', e.target.value)}
                                            className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:border-[#C0934B] text-gray-600"
                                        />
                                    </div>
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-sm font-medium text-gray-600">Usage Limit ( Optional )</label>
                                        <input
                                            type="number"
                                            value={formData.usageLimit}
                                            onChange={(e) => handleInputChange('usageLimit', e.target.value)}
                                            className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:border-[#C0934B] text-gray-800"
                                            placeholder="Unlimited if empty"
                                        />
                                    </div>
                                </div>



                                <div className="flex items-center gap-2 mt-1">
                                    <input
                                        type="checkbox"
                                        id="isActive"
                                        checked={formData.isActive}
                                        onChange={(e) => handleInputChange('isActive', e.target.checked)}
                                        className="w-5 h-5 text-[#C0934B] border-gray-300 rounded focus:ring-[#C0934B]"
                                    />
                                    <label htmlFor="isActive" className="text-gray-700 font-medium cursor-pointer select-none">Active</label>
                                </div>

                                <div className="flex gap-4 mt-2">
                                    <button
                                        onClick={handleSubmit}
                                        className="bg-[#C0934B] text-white px-8 py-3 rounded-lg font-medium hover:bg-[#A87F3D] transition-colors"
                                    >
                                        {editMode ? "Update" : "Create"}
                                    </button>
                                    <button
                                        onClick={() => setIsExpanded(false)}
                                        className="bg-transparent text-[#C0934B] px-8 py-3 rounded-lg font-medium border border-[#C0934B] hover:bg-[#FFF8DC] transition-colors"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

