"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { FaPlus } from "react-icons/fa";
import { adminProductsData } from "../../../data/adminProductsData";
import GlobalLoader from "../../../components/GlobalLoader";

export default function AddProductContent() {
    const { addProductForm } = adminProductsData;
    const searchParams = useSearchParams();
    const router = useRouter();
    const id = searchParams.get('id');

    const [isEditMode, setIsEditMode] = useState(false);
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(false);

    // Form inputs
    const [imageFile, setImageFile] = useState(null); // Actual file for upload
    const [imagePreview, setImagePreview] = useState(null); // URL for preview
    const [title, setTitle] = useState("");
    const [category, setCategory] = useState("");
    const [publicationType, setPublicationType] = useState("");
    const [frequency, setFrequency] = useState("");
    const [fullDescription, setFullDescription] = useState("");

    // Initial variant state
    const [variants, setVariants] = useState([{ id: Date.now(), durationValue: "3", durationUnit: "Month", price: "2000" }]);

    // Category Management
    const [availableCategories, setAvailableCategories] = useState(addProductForm.categories);
    const [isCustomCategory, setIsCustomCategory] = useState(false);

    // Fetch existing categories from API on mount
    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const response = await fetch('/api/admin/products');
                const data = await response.json();
                if (data.success && Array.isArray(data.categories)) {
                    // Merge API categories with default ones and remove duplicates
                    const uniqueCats = Array.from(new Set([...addProductForm.categories, ...data.categories])).filter(Boolean);
                    setAvailableCategories(uniqueCats);
                }
            } catch (error) {
                console.error("Failed to fetch available categories:", error);
            }
        };

        fetchCategories();
    }, [addProductForm.categories]);

    useEffect(() => {
        if (id) {
            setIsEditMode(true);
            fetchProductDetails(id);
        }
    }, [id]);

    const fetchProductDetails = async (productId) => {
        setFetching(true);
        try {
            const res = await fetch(`/api/admin/products/${productId}`);
            const data = await res.json();

            if (data.success && data.product) {
                const p = data.product;
                setTitle(p.heading || p.title || ""); // Try heading first, fallback to title
                setCategory(p.category || "");
                setPublicationType(p.publicationType || p.shortDescription || p.subtitle || "");
                setFrequency(p.frequency || "");
                setFullDescription(p.fullDescription || p.description || "");
                // Construct image URL from filename if coverImage is not directly provided
                const imageUrl = p.coverImage || (p.filename ? `/api/admin/products/image/${p.filename}` : null);
                setImagePreview(imageUrl);

                // Parse duration/price if stored as single string or reconstruct variants if array
                // Assuming simplified single variant for now based on previous UI, or parsing existing fields
                // If backend supports multiple variants, we'd map them here. 
                // Fallback to parsing the single fields if variants not explicit
                // Correctly load variants
                if (Array.isArray(p.variants) && p.variants.length > 0) {
                    setVariants(p.variants.map(v => {
                        // Map backend lowercase unit to Frontend Title Case if needed
                        // Assuming Frontend uses "Days", "Months" etc.
                        // Simple Capitalization helper
                        const capitalize = s => s && s.charAt(0).toUpperCase() + s.slice(1);

                        // Handle "months" -> "Months" mapping explicitly if needed matches adminProductsData
                        // We can try to match loosely or Capitalize
                        // Common units: days, months, years
                        let unit = capitalize(v.durationUnit);
                        if (unit.endsWith('s')) unit = unit.slice(0, -1); // "Months" -> "Month" to match singular options if that's what UI uses
                        // Wait, adminProductsData usually has "Days" or "Month"?
                        // Let's assume singular capitalized based on previous context "Month"

                        return {
                            id: v._id || Date.now() + Math.random(), // Ensure unique ID
                            durationValue: v.durationValue,
                            durationUnit: unit, // e.g. "Month"
                            price: v.price
                        };
                    }));
                } else if (p.duration && p.price) {
                    // Legacy fallback
                    const [val, unit] = p.duration.split(" ");
                    setVariants([{
                        id: 1,
                        durationValue: val || "",
                        durationUnit: unit || "Days",
                        price: p.price
                    }]);
                } else {
                    setVariants([]);
                }
            }
        } catch (error) {
            console.error("Error fetching product:", error);
            alert("Failed to fetch product details");
        } finally {
            setFetching(false);
        }
    };

    // Calculate duration display
    const calculateDurationDisplay = (value, unit) => {
        if (!value || !unit) return "";
        return `${value} ${unit}`;
    };

    const handleAddVariant = () => {
        setVariants([...variants, { id: Date.now(), durationValue: "", durationUnit: "Days", price: "" }]);
    };

    const handleRemoveVariant = (id) => {
        setVariants(variants.filter(v => v.id !== id));
    };

    const handleVariantChange = (id, field, value) => {
        setVariants(variants.map(v =>
            v.id === id ? { ...v, [field]: value } : v
        ));
    };

    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            setImageFile(file);
            setImagePreview(URL.createObjectURL(file));
        }
    };

    const handleSubmit = async () => {
        // Basic Validation
        if (!title || !category || !publicationType || !frequency || variants.length === 0) {
            alert("Please fill in all required fields are at least one variant.");
            return;
        }

        // Validate individual variants
        for (let i = 0; i < variants.length; i++) {
            const v = variants[i];
            if (!v.durationValue || !v.price) {
                alert(`Please fill in a duration and price for variant #${i + 1}`);
                return;
            }
        }

        setLoading(true);
        try {
            const formData = new FormData();
            formData.append('heading', title);
            formData.append('publicationType', publicationType);
            formData.append('frequency', frequency);
            formData.append('fullDescription', fullDescription);
            formData.append('category', category);

            // Handle Image
            if (imageFile) {
                formData.append('image', imageFile);
            }

            // Handle Variants - Loop through all variants
            variants.forEach((variant, index) => {
                const durationStr = `${variant.durationValue} ${variant.durationUnit}`;

                // Map frontend units (Days, Months, Years) to backend enum (days, months, years)
                let unit = variant.durationUnit.toLowerCase();
                if (!unit.endsWith('s')) unit += 's'; // simple pluralization: day->days, month->months 
                // Special check to avoid double 's' if any edge case, but standard units match.
                // Explicit mapping for safety:
                const unitMap = {
                    'day': 'days', 'days': 'days',
                    'month': 'months', 'months': 'months',
                    'year': 'years', 'years': 'years',
                    'week': 'weeks', 'weeks': 'weeks',
                    'hour': 'hours', 'hours': 'hours',
                    'minute': 'minutes', 'minutes': 'minutes'
                };
                const mappedUnit = unitMap[unit.replace(/s$/, '')] || unitMap[unit] || unit;

                formData.append(`variants[${index}][duration]`, durationStr);
                formData.append(`variants[${index}][durationValue]`, variant.durationValue);
                formData.append(`variants[${index}][durationUnit]`, mappedUnit);
                formData.append(`variants[${index}][price]`, variant.price);
                formData.append(`variants[${index}][description]`, ""); // Optional description
            });

            // Fallback for flat keys if legacy systems need it (optional, but keeping cleaner)
            // formData.append('price', variants[0].price);

            let url = '/api/admin/products'; // Create
            let method = 'POST';

            if (isEditMode && id) {
                url = '/api/admin/products/update'; // Or PUT /api/admin/products/${id}
                method = 'PUT';
                formData.append('productId', id);
            }

            const response = await fetch(url, {
                method: method,
                body: formData
            });

            const result = await response.json();
            if (result.success) {
                alert(isEditMode ? "Product updated successfully!" : "Product created successfully!");
                router.push('/admin-dashboard/product');
            } else {
                alert("Operation failed: " + (result.error || "Unknown error"));
            }
        } catch (error) {
            console.error("Error submitting product:", error);
            alert("An error occurred. Please check console for details.");
        } finally {
            setLoading(false);
        }
    };

    if (fetching) {
        return <GlobalLoader fullScreen={false} className="min-h-[80vh]" />;
    }

    return (
        <div className="flex flex-col gap-8 w-full max-w-5xl mx-auto">
            <h1 className="text-3xl font-bold text-[#1E1E1E]">
                {isEditMode ? "Edit Product" : "Add Product"}
            </h1>

            <div className="flex flex-col lg:flex-row gap-8">
                {/* Image Upload Section */}
                <div className="flex flex-col gap-4 w-full lg:w-1/3">
                    <div className="w-full aspect-square bg-[#D9D9D9] rounded-xl overflow-hidden relative">
                        {imagePreview ? (
                            <Image
                                src={imagePreview}
                                alt="Product Preview"
                                fill
                                className="object-cover"
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400">
                                No Image
                            </div>
                        )}
                    </div>
                    <label className="w-full py-3 border border-[#C0934B] text-[#C0934B] font-medium text-center rounded-lg cursor-pointer bg-white hover:bg-[#FFF8DC] transition-colors">
                        {imagePreview ? "Change image" : "Add image"}
                        <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                    </label>
                </div>

                {/* Main Form Fields */}
                <div className="flex flex-col gap-6 w-full lg:w-2/3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="flex flex-col gap-2">
                            <label className="text-sm font-semibold text-[#1E1E1E]">Product title</label>
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                className="w-full p-3 bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-[#C0934B]"
                                placeholder="Enter product title"
                            />
                        </div>
                        <div className="flex flex-col gap-2">
                            <label className="text-sm font-semibold text-[#1E1E1E]">Category</label>
                            {!isCustomCategory ? (
                                <select
                                    value={category}
                                    onChange={(e) => {
                                        if (e.target.value === 'custom_option_create_new') {
                                            setIsCustomCategory(true);
                                            setCategory(''); // Clear for typing
                                        } else {
                                            setCategory(e.target.value);
                                        }
                                    }}
                                    className="w-full p-3 bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-[#C0934B]"
                                >
                                    <option value="">Select Category</option>
                                    {availableCategories.map((cat, idx) => (
                                        <option key={idx} value={cat}>{cat}</option>
                                    ))}
                                    <option value="custom_option_create_new" className="font-bold text-[#C0934B]">+ Create New Category</option>
                                </select>
                            ) : (
                                <div className="flex flex-col gap-2">
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={category}
                                            onChange={(e) => setCategory(e.target.value)}
                                            placeholder="Type new category..."
                                            className="w-full p-3 bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-[#C0934B] animate-fade-in"
                                            autoFocus
                                        />
                                        <button
                                            onClick={() => setIsCustomCategory(false)}
                                            className="min-w-fit px-3 py-2 text-sm text-[#C0934B] border border-[#C0934B] rounded-lg hover:bg-[#FFF8DC]"
                                            type="button"
                                        >
                                            Select Existing
                                        </button>
                                    </div>
                                    <p className="text-xs text-gray-500">This category will be saved for future use.</p>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-semibold text-[#1E1E1E]">Publication Type</label>
                        <input
                            type="text"
                            value={publicationType}
                            onChange={(e) => setPublicationType(e.target.value)}
                            className="w-full p-3 bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-[#C0934B]"
                            placeholder="Enter publication type"
                        />
                    </div>

                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-semibold text-[#1E1E1E]">Frequency</label>
                        <input
                            type="text"
                            value={frequency}
                            onChange={(e) => setFrequency(e.target.value)}
                            className="w-full p-3 bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-[#C0934B]"
                            placeholder="Enter frequency (e.g. Weekly, Monthly)"
                        />
                    </div>

                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-semibold text-[#1E1E1E]">Full Description</label>
                        <textarea
                            rows={4}
                            value={fullDescription}
                            onChange={(e) => setFullDescription(e.target.value)}
                            className="w-full p-3 bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-[#C0934B]"
                            placeholder="Enter full description"
                        />
                    </div>
                </div>
            </div>

            <hr className="border-gray-200" />

            {/* Pricing Variants Section */}
            <div>
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-lg font-semibold text-[#1E1E1E]">Pricing Variants</h2>
                    <button
                        onClick={handleAddVariant}
                        className="flex items-center gap-2 px-4 py-2 bg-[#C0934B] text-white rounded-lg hover:bg-[#A87F3D] transition-colors text-sm font-medium"
                    >
                        <FaPlus size={12} />
                        Add Variant
                    </button>
                </div>

                <div className="flex flex-col gap-4">
                    {variants.map((variant) => (
                        <div key={variant.id} className="relative p-6 bg-[#EEF2F0] rounded-xl border border-gray-200">
                            {variants.length > 1 && (
                                <button
                                    onClick={() => handleRemoveVariant(variant.id)}
                                    className="absolute top-4 right-4 text-red-500 text-xs font-semibold hover:text-red-700"
                                >
                                    Remove
                                </button>
                            )}

                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-2">
                                {/* Duration Display (Read Only) */}
                                <div className="flex flex-col gap-2">
                                    <label className="text-xs font-semibold text-[#1E1E1E]">Duration Display</label>
                                    <input
                                        type="text"
                                        value={calculateDurationDisplay(variant.durationValue, variant.durationUnit)}
                                        readOnly
                                        className="w-full p-3 bg-[#EEF2F0] border border-gray-400 rounded-lg text-gray-700 focus:outline-none"
                                    />
                                </div>

                                {/* Duration Value */}
                                <div className="flex flex-col gap-2">
                                    <label className="text-xs font-semibold text-[#1E1E1E]">Duration Value</label>
                                    <input
                                        type="number"
                                        value={variant.durationValue}
                                        onChange={(e) => handleVariantChange(variant.id, 'durationValue', e.target.value)}
                                        className="w-full p-3 bg-transparent border border-gray-400 rounded-lg focus:outline-none focus:border-[#C0934B]"
                                    />
                                </div>

                                {/* Duration Unit */}
                                <div className="flex flex-col gap-2">
                                    <label className="text-xs font-semibold text-[#1E1E1E]">Duration Unit</label>
                                    <select
                                        value={variant.durationUnit}
                                        onChange={(e) => handleVariantChange(variant.id, 'durationUnit', e.target.value)}
                                        className="w-full p-3 bg-transparent border border-gray-400 rounded-lg focus:outline-none focus:border-[#C0934B]"
                                    >
                                        {addProductForm.durationUnits.map((unit, idx) => (
                                            <option key={idx} value={unit}>{unit}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Price */}
                                <div className="flex flex-col gap-2">
                                    <label className="text-xs font-semibold text-[#1E1E1E]">Price</label>
                                    <input
                                        type="number"
                                        value={variant.price}
                                        onChange={(e) => handleVariantChange(variant.id, 'price', e.target.value)}
                                        className="w-full p-3 bg-transparent border border-gray-400 rounded-lg focus:outline-none focus:border-[#C0934B]"
                                    />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Footer Buttons */}
            <div className="flex justify-end items-center gap-4 mt-8">
                <button
                    onClick={handleSubmit}
                    disabled={loading}
                    className="px-8 py-3 bg-[#C0934B] text-white font-medium rounded-lg hover:bg-[#A87F3D] transition-colors disabled:opacity-50"
                >
                    {loading ? "Saving..." : (isEditMode ? "Update Product" : "Add Product")}
                </button>
                <Link href="/admin-dashboard/product">
                    <button className="px-8 py-3 border border-[#C0934B] text-[#C0934B] font-medium rounded-lg hover:bg-[#FFF8DC] transition-colors">
                        Cancel
                    </button>
                </Link>
            </div>
        </div>
    );
}
