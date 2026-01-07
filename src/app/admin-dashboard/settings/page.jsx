"use client";

import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { Plus, Trash2, Save, Loader2 } from "lucide-react";
import GlobalLoader from "@/app/components/GlobalLoader";

import { useSettings } from "@/app/context/SettingsContext";

export default function SettingsPage() {
    const { updateSettings } = useSettings();
    const [activeTab, setActiveTab] = useState("general");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [settings, setSettings] = useState({
        general: { logo: "", headerLogo: "", footerLogo: "", favicon: "" },
        header: { menuItems: [] },
        footer: {
            disclaimer: "",
            section1: { title: "", links: [] },
            section2: { title: "", links: [] },
            contactInfo: { address: "", phone: "", email: "" },
            socialLinks: []
        }
    });

    // Fetch settings on mount
    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const res = await fetch("/api/admin/settings");
            const data = await res.json();
            if (data.success) {
                // Merge with default structure to ensure no keys are missing
                setSettings(prev => ({
                    ...prev,
                    ...data.data,
                    general: {
                        ...prev.general,
                        ...(data.data.general || {})
                    }
                }));
                // Also update global context to be sure (optional, mostly for consistency)
                updateSettings(data.data);
            } else {
                toast.error(data.message || "Failed to fetch settings");
            }
        } catch (error) {
            console.error("Error fetching settings:", error);
            toast.error("An error occurred while fetching settings");
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const res = await fetch("/api/admin/settings", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(settings),
            });
            const data = await res.json();
            if (data.success) {
                toast.success("Settings updated successfully");
                setSettings(data.data);
                updateSettings(data.data); // Update global context immediately
            } else {
                toast.error(data.message || "Failed to update settings");
            }
        } catch (error) {
            console.error("Error updating settings:", error);
            toast.error("An error occurred while updating settings");
        } finally {
            setSaving(false);
        }
    };

    const handleGeneralChange = (field, value) => {
        setSettings(prev => ({
            ...prev,
            general: { ...prev.general, [field]: value }
        }));
    };

    // --- Header Handlers ---
    const addHeaderMenuItem = () => {
        setSettings(prev => ({
            ...prev,
            header: {
                ...prev.header,
                menuItems: [...prev.header.menuItems, { label: "", link: "", isActive: true }]
            }
        }));
    };

    const updateHeaderMenuItem = (index, field, value) => {
        const newItems = [...settings.header.menuItems];
        newItems[index][field] = value;
        setSettings(prev => ({
            ...prev,
            header: { ...prev.header, menuItems: newItems }
        }));
    };

    const removeHeaderMenuItem = (index) => {
        const newItems = settings.header.menuItems.filter((_, i) => i !== index);
        setSettings(prev => ({
            ...prev,
            header: { ...prev.header, menuItems: newItems }
        }));
    };

    // --- Footer Handlers ---
    const handleFooterChange = (section, field, value) => {
        setSettings(prev => {
            const newFooter = { ...prev.footer };
            if (section) {
                newFooter[section] = { ...newFooter[section], [field]: value };
            } else {
                newFooter[field] = value;
            }
            return { ...prev, footer: newFooter };
        });
    };

    const handleContactInfoChange = (field, value) => {
        setSettings(prev => ({
            ...prev,
            footer: {
                ...prev.footer,
                contactInfo: { ...prev.footer.contactInfo, [field]: value }
            }
        }));
    };

    // Generic handler for footer link sections (section1, section2)
    const addFooterLink = (sectionKey) => {
        setSettings(prev => ({
            ...prev,
            footer: {
                ...prev.footer,
                [sectionKey]: {
                    ...prev.footer[sectionKey],
                    links: [...prev.footer[sectionKey].links, { label: "", link: "" }]
                }
            }
        }));
    };

    const updateFooterLink = (sectionKey, index, field, value) => {
        const newLinks = [...settings.footer[sectionKey].links];
        newLinks[index][field] = value;
        setSettings(prev => ({
            ...prev,
            footer: {
                ...prev.footer,
                [sectionKey]: { ...prev.footer[sectionKey], links: newLinks }
            }
        }));
    };

    const removeFooterLink = (sectionKey, index) => {
        const newLinks = settings.footer[sectionKey].links.filter((_, i) => i !== index);
        setSettings(prev => ({
            ...prev,
            footer: {
                ...prev.footer,
                [sectionKey]: { ...prev.footer[sectionKey], links: newLinks }
            }
        }));
    };


    const handleImageUpload = (e, field) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 2 * 1024 * 1024) { // 2MB limit check
                toast.error("File size too large. Please upload an image under 2MB.");
                return;
            }

            const reader = new FileReader();
            reader.onloadend = () => {
                handleGeneralChange(field, reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const renderGeneralTab = () => (
        <div className="space-y-6 mt-6">
            <h2 className="text-xl font-bold text-gray-900">General Settings</h2>
            <div className="grid gap-6">
                {/* Header Logo Upload */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Header Logo</label>
                    <div className="flex items-start gap-4">
                        <div className="flex-1">
                            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                    <svg className="w-8 h-8 mb-4 text-gray-500" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 16">
                                        <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2" />
                                    </svg>
                                    <p className="text-sm text-gray-500"><span className="font-semibold">Click to upload</span> or drag and drop</p>
                                    <p className="text-xs text-gray-500">SVG, PNG, JPG, GIF (MAX. 2MB)</p>
                                </div>
                                <input
                                    type="file"
                                    className="hidden"
                                    accept="image/*"
                                    onChange={(e) => handleImageUpload(e, 'headerLogo')}
                                />
                            </label>
                            <input
                                type="text"
                                value={settings.general?.headerLogo || ""}
                                onChange={(e) => handleGeneralChange("headerLogo", e.target.value)}
                                className="mt-2 w-full px-4 py-2 text-xs border border-gray-300 rounded-lg focus:ring-[#C19A5B] focus:border-[#C19A5B]"
                                placeholder="Or enter header logo image URL directly"
                            />
                        </div>
                        {/* Preview */}
                        <div className="w-32 h-32 border rounded-lg bg-gray-50 flex items-center justify-center overflow-hidden relative">
                            {settings.general?.headerLogo ? (
                                <img src={settings.general.headerLogo} alt="Header Logo Preview" className="max-w-full max-h-full object-contain" />
                            ) : (
                                <span className="text-gray-400 text-xs text-center p-2">No Header Logo</span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Footer Logo Upload */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Footer Logo</label>
                    <div className="flex items-start gap-4">
                        <div className="flex-1">
                            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                    <svg className="w-8 h-8 mb-4 text-gray-500" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 16">
                                        <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2" />
                                    </svg>
                                    <p className="text-sm text-gray-500"><span className="font-semibold">Click to upload</span> or drag and drop</p>
                                    <p className="text-xs text-gray-500">SVG, PNG, JPG, GIF (MAX. 2MB)</p>
                                </div>
                                <input
                                    type="file"
                                    className="hidden"
                                    accept="image/*"
                                    onChange={(e) => handleImageUpload(e, 'footerLogo')}
                                />
                            </label>
                            <input
                                type="text"
                                value={settings.general?.footerLogo || ""}
                                onChange={(e) => handleGeneralChange("footerLogo", e.target.value)}
                                className="mt-2 w-full px-4 py-2 text-xs border border-gray-300 rounded-lg focus:ring-[#C19A5B] focus:border-[#C19A5B]"
                                placeholder="Or enter footer logo image URL directly"
                            />
                        </div>
                        {/* Preview */}
                        <div className="w-32 h-32 border rounded-lg bg-gray-50 flex items-center justify-center overflow-hidden relative">
                            {settings.general?.footerLogo ? (
                                <img src={settings.general.footerLogo} alt="Footer Logo Preview" className="max-w-full max-h-full object-contain" />
                            ) : (
                                <span className="text-gray-400 text-xs text-center p-2">No Footer Logo</span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Favicon Upload */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Favicon</label>
                    <div className="flex items-start gap-4">
                        <div className="flex-1">
                            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                    <svg className="w-8 h-8 mb-4 text-gray-500" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 16">
                                        <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2" />
                                    </svg>
                                    <p className="text-sm text-gray-500"><span className="font-semibold">Click to upload</span> or drag and drop</p>
                                    <p className="text-xs text-gray-500">SVG, PNG, JPG, GIF (MAX. 2MB)</p>
                                </div>
                                <input
                                    type="file"
                                    className="hidden"
                                    accept="image/*"
                                    onChange={(e) => handleImageUpload(e, 'favicon')}
                                />
                            </label>
                            <input
                                type="text"
                                value={settings.general?.favicon || ""}
                                onChange={(e) => handleGeneralChange("favicon", e.target.value)}
                                className="mt-2 w-full px-4 py-2 text-xs border border-gray-300 rounded-lg focus:ring-[#C19A5B] focus:border-[#C19A5B]"
                                placeholder="Or enter favicon image URL directly"
                            />
                        </div>
                        {/* Preview */}
                        <div className="w-16 h-16 border rounded-lg bg-gray-50 flex items-center justify-center overflow-hidden relative">
                            {settings.general?.favicon ? (
                                <img src={settings.general.favicon} alt="Favicon Preview" className="max-w-full max-h-full object-contain" />
                            ) : (
                                <span className="text-gray-400 text-xs text-center p-2">No Icon</span>
                            )}
                        </div>
                    </div>
                </div>
            </div>
            <div className="flex justify-end mt-8">
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-2 px-6 py-2 bg-[#C19A5B] text-white rounded-md hover:bg-[#a8864f] transition-colors disabled:opacity-50"
                >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Save Changes
                </button>
            </div>
        </div>
    );

    const renderHeaderTab = () => (
        <div className="space-y-6 mt-6">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-gray-900">Header Menu</h2>
                <button
                    onClick={addHeaderMenuItem}
                    className="flex items-center gap-2 px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
                >
                    <Plus className="w-4 h-4" /> Add Item
                </button>
            </div>

            <div className="space-y-4">
                {settings.header?.menuItems?.map((item, idx) => (
                    <div key={idx} className="flex gap-4 items-center bg-gray-50 p-4 rounded-lg border border-gray-200">
                        <div className="flex-1">
                            <label className="block text-xs text-gray-500 mb-1">Label</label>
                            <input
                                type="text"
                                value={item.label}
                                onChange={(e) => updateHeaderMenuItem(idx, "label", e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded focus:border-[#C19A5B] outline-none"
                            />
                        </div>
                        <div className="flex-1">
                            <label className="block text-xs text-gray-500 mb-1">Link</label>
                            <input
                                type="text"
                                value={item.link}
                                onChange={(e) => updateHeaderMenuItem(idx, "link", e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded focus:border-[#C19A5B] outline-none"
                            />
                        </div>
                        <button
                            onClick={() => removeHeaderMenuItem(idx)}
                            className="p-2 text-red-500 hover:bg-red-50 rounded mt-5"
                        >
                            <Trash2 className="w-5 h-5" />
                        </button>
                    </div>
                ))}
            </div>

            <div className="flex justify-end mt-8">
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-2 px-6 py-2 bg-[#C19A5B] text-white rounded-md hover:bg-[#a8864f] transition-colors disabled:opacity-50"
                >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Save Changes
                </button>
            </div>
        </div>
    );

    const renderFooterTab = () => (
        <div className="space-y-8 mt-6">

            {/* Footer Navigation Menu Section */}
            <div>
                <h2 className="text-xl font-bold text-gray-900">Footer Information</h2>
                <p className="text-sm text-gray-500 mb-6">You can change name of navigation menu of Footer</p>

                <div className="space-y-4">
                    {/* Combine links from section1 & section2 for display, or just iterate them blocks */}
                    {/* Section 1 Links */}
                    <div className="mb-6">
                        <div className="flex justify-between items-center mb-2">
                            <h3 className="font-semibold text-gray-700">Section 1 Items</h3>
                            <button
                                onClick={() => addFooterLink("section1")}
                                className="flex items-center gap-2 px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                            >
                                <Plus className="w-3 h-3" /> Add
                            </button>
                        </div>
                        <div className="space-y-3">
                            {settings.footer?.section1?.links?.map((link, idx) => (
                                <div key={`s1-${idx}`} className="flex gap-4 items-start">
                                    <div className="flex-1">
                                        <input
                                            type="text"
                                            value={link.label}
                                            onChange={(e) => updateFooterLink("section1", idx, "label", e.target.value)}
                                            className="w-full px-4 py-2 border border-gray-300 rounded focus:ring-[#C19A5B] focus:border-[#C19A5B] text-sm"
                                            placeholder="Label"
                                        />
                                    </div>
                                    <div className="flex-1">
                                        <input
                                            type="text"
                                            value={link.link}
                                            onChange={(e) => updateFooterLink("section1", idx, "link", e.target.value)}
                                            className="w-full px-4 py-2 border border-gray-300 rounded focus:ring-[#C19A5B] focus:border-[#C19A5B] text-sm"
                                            placeholder="URL"
                                        />
                                    </div>
                                    <button
                                        onClick={() => removeFooterLink("section1", idx)}
                                        className="p-2 text-red-500 hover:bg-red-50 rounded"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                    {/* Section 2 Links */}
                    <div className="mb-6">
                        <div className="flex justify-between items-center mb-2">
                            <h3 className="font-semibold text-gray-700">Section 2 Items</h3>
                            <button
                                onClick={() => addFooterLink("section2")}
                                className="flex items-center gap-2 px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                            >
                                <Plus className="w-3 h-3" /> Add
                            </button>
                        </div>
                        <div className="space-y-3">
                            {settings.footer?.section2?.links?.map((link, idx) => (
                                <div key={`s2-${idx}`} className="flex gap-4 items-start">
                                    <div className="flex-1">
                                        <input
                                            type="text"
                                            value={link.label}
                                            onChange={(e) => updateFooterLink("section2", idx, "label", e.target.value)}
                                            className="w-full px-4 py-2 border border-gray-300 rounded focus:ring-[#C19A5B] focus:border-[#C19A5B] text-sm"
                                            placeholder="Label"
                                        />
                                    </div>
                                    <div className="flex-1">
                                        <input
                                            type="text"
                                            value={link.link}
                                            onChange={(e) => updateFooterLink("section2", idx, "link", e.target.value)}
                                            className="w-full px-4 py-2 border border-gray-300 rounded focus:ring-[#C19A5B] focus:border-[#C19A5B] text-sm"
                                            placeholder="URL"
                                        />
                                    </div>
                                    <button
                                        onClick={() => removeFooterLink("section2", idx)}
                                        className="p-2 text-red-500 hover:bg-red-50 rounded"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Disclaimer as a special item? User image showed it in list. 
                        In my DB it's a string. I can make it look like an input.
                    */}
                    {settings.footer?.disclaimer !== undefined && (
                        <div className="w-full">
                            <input
                                type="text"
                                value={settings.footer.disclaimer} // Assuming disclaimer is short enough for input, or use textarea styled as input
                                onChange={(e) => handleFooterChange(null, "disclaimer", e.target.value)}
                                className="w-full px-4 py-3 border border-gray-500 rounded-md focus:ring-[#C19A5B] focus:border-[#C19A5B] text-gray-700"
                                placeholder="Disclaimer"
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* Contact Info */}
            <div className="pt-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Contact Information</h2>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm text-gray-500 mb-1">Address</label>
                        <input
                            type="text"
                            value={settings.footer?.contactInfo?.address || ""}
                            onChange={(e) => handleContactInfoChange("address", e.target.value)}
                            className="w-full px-4 py-3 border border-gray-500 rounded-md focus:ring-[#C19A5B] focus:border-[#C19A5B] text-gray-700"
                        />
                    </div>
                    <div>
                        <label className="block text-sm text-gray-500 mb-1">Contact Number</label>
                        <input
                            type="text"
                            value={settings.footer?.contactInfo?.phone || ""}
                            onChange={(e) => handleContactInfoChange("phone", e.target.value)}
                            className="w-full px-4 py-3 border border-gray-500 rounded-md focus:ring-[#C19A5B] focus:border-[#C19A5B] text-gray-700"
                        />
                    </div>
                    <div>
                        <label className="block text-sm text-gray-500 mb-1">Email Address</label>
                        <input
                            type="text"
                            value={settings.footer?.contactInfo?.email || ""}
                            onChange={(e) => handleContactInfoChange("email", e.target.value)}
                            className="w-full px-4 py-3 border border-gray-500 rounded-md focus:ring-[#C19A5B] focus:border-[#C19A5B] text-gray-700"
                        />
                    </div>
                </div>
            </div>

            <div className="flex justify-end mt-8 pb-8">
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-2 px-6 py-2 bg-[#C19A5B] text-white rounded-md hover:bg-[#a8864f] transition-colors disabled:opacity-50"
                >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Save Changes
                </button>
            </div>
        </div>
    );

    if (loading) return <GlobalLoader />;

    return (
        <div className="w-full max-w-5xl mx-auto px-4 sm:px-0">
            {/* Page Title */}
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900">Site Settings</h1>
                <p className="text-gray-500 mt-1">Manage global website configurations.</p>
            </div>

            {/* Tabs */}
            <div className="bg-white rounded-lg border border-gray-200 p-8 min-h-[600px]">
                <div className="border-b border-gray-200 mb-6">
                    <div className="flex gap-8">
                        {[
                            { id: "general", label: "General" },
                            { id: "header", label: "Header" },
                            { id: "footer", label: "Footer" },
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`pb-4 px-2 text-base font-medium transition-colors relative ${activeTab === tab.id
                                    ? "text-[#C19A5B]"
                                    : "text-gray-500 hover:text-gray-700"
                                    }`}
                            >
                                {tab.label}
                                {activeTab === tab.id && (
                                    <div className="absolute bottom-0 left-0 w-full h-0.5 bg-[#C19A5B]" />
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Tab Content */}
                <div>
                    {activeTab === "general" && renderGeneralTab()}
                    {activeTab === "header" && renderHeaderTab()}
                    {activeTab === "footer" && renderFooterTab()}
                </div>
            </div>
        </div>
    );
}
