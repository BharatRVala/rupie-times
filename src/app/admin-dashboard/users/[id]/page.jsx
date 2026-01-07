"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import GlobalLoader from "@/app/components/GlobalLoader";

export default function UserDetailsPage() {
    const params = useParams();
    const router = useRouter();
    const userId = params?.id;

    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Modal state
    const [selectedSubscription, setSelectedSubscription] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    // Edit form state
    const [editFormData, setEditFormData] = useState({
        productName: "",
        plan: "",
        status: "Active",
        startDate: "",
        endDate: "",
        historicalArticleLimit: ""
    });

    // ✅ NEW: Add Subscription State
    const [isAddSubModalOpen, setIsAddSubModalOpen] = useState(false);
    const [allProducts, setAllProducts] = useState([]);
    const [loadingProducts, setLoadingProducts] = useState(false);
    const [newSubFormData, setNewSubFormData] = useState({
        productId: "",
        status: "active",
        duration: "1_month", // Default preset
        customStartDate: "",
        customEndDate: ""
    });

    // Helper to calculate end date based on duration
    const calculateEndDate = (startDate, duration) => {
        const start = new Date(startDate);
        const end = new Date(start);

        if (duration === 'custom') return null;

        const [value, unit] = duration.split('_');
        const val = parseInt(value);

        if (unit === 'day' || unit === 'days') end.setDate(end.getDate() + val);
        if (unit === 'month' || unit === 'months') end.setMonth(end.getMonth() + val);
        if (unit === 'year' || unit === 'years') end.setFullYear(end.getFullYear() + val);

        return end;
    };

    const fetchProducts = async () => {
        if (allProducts.length > 0) return;
        setLoadingProducts(true);
        try {
            const res = await fetch('/api/admin/products?limit=100'); // Fetch enough products
            const data = await res.json();
            if (data.success) {
                setAllProducts(data.products);
            }
        } catch (err) {
            console.error("Failed to fetch products", err);
        } finally {
            setLoadingProducts(false);
        }
    };

    const [selectedProductVariants, setSelectedProductVariants] = useState([]);
    const [selectedVariantIndex, setSelectedVariantIndex] = useState("");

    const openAddSubModal = () => {
        fetchProducts(); // Lazy load products

        // Default start date to NOW (IST friendly string for input)
        const now = new Date();
        const istOffset = 5.5 * 60 * 60 * 1000;
        const istDate = new Date(now.getTime() + istOffset);
        const defaultStart = istDate.toISOString().slice(0, 16);

        setNewSubFormData({
            productId: "",
            status: "active",
            duration: "", // Not used as generic anymore, but keeping for structure if needed
            customStartDate: defaultStart,
            customEndDate: ""
        });
        setSelectedProductVariants([]);
        setSelectedVariantIndex("");
        setIsAddSubModalOpen(true);
    };

    const closeAddSubModal = () => setIsAddSubModalOpen(false);

    const handleNewSubChange = (e) => {
        const { name, value } = e.target;

        if (name === "productId") {
            const product = allProducts.find(p => p.id === value);
            setSelectedProductVariants(product ? product.variants : []);
            setSelectedVariantIndex(""); // Reset variant
            setNewSubFormData(prev => ({ ...prev, productId: value }));
        } else if (name === "variantIndex") {
            setSelectedVariantIndex(value);
        } else {
            setNewSubFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleAddSubscription = async (e) => {
        e.preventDefault();

        if (!newSubFormData.productId) {
            alert("Please select a product");
            return;
        }
        if (selectedVariantIndex === "") {
            alert("Please select a duration/plan");
            return;
        }

        const product = allProducts.find(p => p.id === newSubFormData.productId);
        const variant = product.variants[parseInt(selectedVariantIndex)];

        // Start Date is FIXED to current time
        const startDate = new Date(); // Actual current time object for API

        // Calculate End Date based on variant
        const endDate = new Date(startDate);
        const val = variant.durationValue || 0;
        const unit = variant.durationUnit || 'days';

        if (unit === 'minutes') endDate.setMinutes(endDate.getMinutes() + val);
        if (unit === 'hours') endDate.setHours(endDate.getHours() + val);
        if (unit === 'day' || unit === 'days') endDate.setDate(endDate.getDate() + val);
        if (unit === 'month' || unit === 'months') endDate.setMonth(endDate.getMonth() + val);
        if (unit === 'year' || unit === 'years') endDate.setFullYear(endDate.getFullYear() + val);

        // Calculate Price (if needed for backend record, though backend usually fetches. We pass what we have)
        // Backend handles logic, we just pass basics. But `variant` object in API expected full details? 
        // Our new API creates variant from body if passed.

        try {
            const response = await fetch('/api/admin/subscriptions/assign', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId,
                    productId: newSubFormData.productId,
                    startDate: startDate.toISOString(),
                    endDate: endDate.toISOString(),
                    status: 'active', // User said "one button active", imply always active? Or status dropdown?
                    // "one button active" -> imply creation IS activation.
                    // But I will keep status as default active.
                    variant: {
                        duration: variant.duration, // e.g. "1 Month"
                        durationValue: variant.durationValue,
                        durationUnit: variant.durationUnit,
                        price: variant.price
                    }
                })
            });

            const data = await response.json();
            if (data.success) {
                alert("Active Subscription Assigned!");
                closeAddSubModal();
                // Refresh user data
                const userRes = await fetch(`/api/admin/users/${userId}`);
                const userData = await userRes.json();
                if (userData.success) setUser(userData.user);
            } else {
                alert(data.error || "Failed to assign subscription");
            }
        } catch (error) {
            console.error("Assignment failed", error);
            alert("An error occurred.");
        }
    };

    useEffect(() => {
        const fetchUser = async () => {
            if (!userId) return;
            try {
                const response = await fetch(`/api/admin/users/${userId}`);
                const data = await response.json();
                if (data.success) {
                    setUser(data.user);
                } else {
                    setError(data.error || 'Failed to fetch user');
                }
            } catch (err) {
                console.error(err);
                setError('Error connecting to server');
            } finally {
                setLoading(false);
            }
        };
        fetchUser();
    }, [userId]);

    const openSubscriptionModal = (product) => {
        setSelectedSubscription(product);
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setTimeout(() => setSelectedSubscription(null), 300);
    };

    const openEditModal = (product) => {
        setSelectedSubscription(product);

        // Helper to convert to IST YYYY-MM-DDTHH:mm for datetime-local input
        const formatToISTInput = (dateString) => {
            if (!dateString) return "";
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return "";

            // Create a date object shifted to IST
            // We use toLocaleString to get components in IST, then build the string
            const options = { timeZone: "Asia/Kolkata", hour12: false, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' };
            const istString = date.toLocaleString('en-US', options);
            // istString format depends on locale, but en-US usually: "MM/DD/YYYY, HH:mm"
            // Let's parse it carefully or use a simpler offset method

            // Simpler offset method:
            // IST is UTC+5:30. 
            // We want the literal numbers of IST to appear in the input.
            // So if it's 12:00 UTC, it's 17:30 IST. We want "17:30" in the input.
            const istOffset = 5.5 * 60 * 60 * 1000;
            const istDate = new Date(date.getTime() + istOffset);

            return istDate.toISOString().slice(0, 16); // YYYY-MM-DDTHH:mm
        };

        setEditFormData({
            productName: product.name,
            plan: `${product.variant?.duration || 'N/A'} - ${product.price}`,
            status: product.status, // "Active" or "Inactive"
            startDate: formatToISTInput(product.startDate),
            endDate: formatToISTInput(product.endDate),
            historicalArticleLimit: product.historicalArticleLimit || "10"
        });
        setIsEditModalOpen(true);
    };

    const closeEditModal = () => {
        setIsEditModalOpen(false);
        setTimeout(() => {
            setSelectedSubscription(null);
            setEditFormData({
                productName: "",
                plan: "",
                status: "Active",
                startDate: "",
                endDate: "",
                historicalArticleLimit: ""
            });
        }, 300);
    };

    const handleEditFormChange = (e) => {
        const { name, value } = e.target;
        setEditFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleUpdateSubscription = async (e) => {
        e.preventDefault();
        try {
            const response = await fetch('/api/admin/subscriptions/update', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    subscriptionId: selectedSubscription.id, // Ensure this ID is available from the list
                    status: editFormData.status.toLowerCase(),
                    // Append timezone offset to ensure backend treats it as IST
                    startDate: new Date(editFormData.startDate + "+05:30"),
                    endDate: new Date(editFormData.endDate + "+05:30"),
                    historicalArticleLimit: editFormData.historicalArticleLimit
                })
            });

            const data = await response.json();
            if (data.success) {
                // Refresh user data
                const userRes = await fetch(`/api/admin/users/${userId}`);
                const userData = await userRes.json();
                if (userData.success) {
                    setUser(userData.user);
                }
                closeEditModal();
                alert("Subscription updated successfully!");
            } else {
                alert(data.error || "Failed to update subscription");
            }
        } catch (error) {
            console.error("Update failed", error);
            alert("An error occurred while updating.");
        }
    };

    // User Edit State
    const [isUserEditModalOpen, setIsUserEditModalOpen] = useState(false);
    const [userEditFormData, setUserEditFormData] = useState({
        name: "",
        email: "",
        mobile: "",
        isActive: true,
        password: ""
    });

    const openUserEditModal = () => {
        if (!user) return;
        setUserEditFormData({
            name: user.name || "",
            email: user.email || "",
            mobile: user.mobile || user.phone || "",
            isActive: user.isActive,
            password: ""
        });
        setIsUserEditModalOpen(true);
    };

    const closeUserEditModal = () => {
        setIsUserEditModalOpen(false);
    };

    const handleUserEditFormChange = (e) => {
        const { name, value, type, checked } = e.target;
        setUserEditFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleUpdateUser = async (e) => {
        e.preventDefault();
        try {
            const response = await fetch(`/api/admin/users/${userId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(userEditFormData)
            });

            const data = await response.json();
            if (data.success) {
                setUser(prev => ({
                    ...data.user,
                    subscribedProducts: prev?.subscribedProducts || []
                })); // Update local state while preserving subscriptions
                setUserEditFormData(prev => ({ ...prev, password: "" })); // Clear password field
                closeUserEditModal();
                alert("User updated successfully!");
            } else {
                alert(data.error || "Failed to update user");
            }
        } catch (error) {
            console.error("User update failed", error);
            alert("An error occurred while updating user.");
        }
    };

    if (loading) return <GlobalLoader />;
    if (error) return (
        <div className="flex flex-col items-center justify-center py-12">
            <p className="text-red-500 mb-4">{error}</p>
            <button onClick={() => router.push('/admin-dashboard/users')} className="px-4 py-2 bg-[#C0934B] text-white rounded-lg">Back to Users</button>
        </div>
    );
    if (!user) return <div className="p-12 text-center">User not found</div>;

    return (
        <>
            <div className="flex flex-col gap-6 w-full">
                {/* Page Title */}
                <h1 className="text-2xl font-bold text-[#1E4032]">User Details</h1>

                {/* Personal Information Card */}
                <div className="border border-gray-200 rounded-lg p-6 bg-white">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-lg font-semibold text-[#1E4032]">Personal Information</h2>
                        {/* 
                           The previous code linked to /admin-dashboard/users/${userId}/edit. 
                           If that page exists and handles user edit, keep it. 
                           I'll assume it might be cleaner to keep or remove if we want full inline edit.
                           Keeping the link for now.
                        */}
                        {!user.isDeleted && (
                            <button
                                onClick={openUserEditModal}
                                className="px-4 py-2 bg-[#C0934B] text-white rounded-lg hover:bg-[#a17a3e] transition-colors text-sm"
                            >
                                Edit
                            </button>
                        )}
                    </div>

                    <div className="flex gap-6">
                        {/* Avatar */}
                        <div className="w-20 h-20 rounded-lg bg-[#faeccd] flex items-center justify-center text-[#C0934B] font-semibold text-3xl flex-shrink-0">
                            {user.name ? user.name[0].toUpperCase() : 'U'}
                        </div>

                        {/* User Information Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4 flex-1">
                            <div>
                                <p className="text-xs text-gray-500 mb-1">Full Name</p>
                                <p className="text-sm font-medium text-gray-900">{user.name}</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 mb-1">Email Address</p>
                                <p className="text-sm font-medium text-gray-900">{user.email}</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 mb-1">Phone Number</p>
                                <p className="text-sm font-medium text-gray-900">{user.mobile || user.phone || 'N/A'}</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 mb-1">User Role</p>
                                <p className="text-sm font-medium text-gray-900">{user.role}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Subscribed Products Section */}
                {!user.isDeleted && (
                    <div className="flex flex-col gap-4">
                        <div className="flex justify-between items-center">
                            <h2 className="text-lg font-semibold text-[#1E4032]">Subscribed Products</h2>
                            <button
                                onClick={openAddSubModal}
                                className="px-4 py-2 bg-[#C0934B] text-white rounded-lg hover:bg-[#a17a3e] transition-colors text-sm flex items-center gap-2"
                            >
                                <span className="text-xl leading-none">+</span> Add Subscription
                            </button>
                        </div>

                        {user.subscribedProducts && user.subscribedProducts.length > 0 ? (
                            <div className="border border-gray-200 rounded-lg overflow-hidden">
                                {/* Table Header */}
                                <div className="grid grid-cols-12 gap-4 p-4 bg-[#C0934B] text-white text-sm font-medium items-center">
                                    <div className="col-span-3">Product</div>
                                    <div className="col-span-1">Category</div>
                                    <div className="col-span-1">Price</div>
                                    <div className="col-span-1">Start Date</div>
                                    <div className="col-span-1">End Date</div>
                                    <div className="col-span-1">Days Left</div>
                                    <div className="col-span-2">Status</div>
                                    <div className="col-span-2 text-right">Action</div>
                                </div>

                                {/* Table Body */}
                                <div className="divide-y divide-gray-100">
                                    {user.subscribedProducts.map((product) => (
                                        <div key={product.id} className="grid grid-cols-12 gap-4 p-4 items-center bg-white hover:bg-gray-50 transition-colors">
                                            {/* Product Column */}
                                            <div className="col-span-3 flex items-center gap-3">
                                                <div className="w-12 h-12 bg-gray-200 rounded-lg flex-shrink-0 overflow-hidden relative">
                                                    <Image
                                                        src={product.image}
                                                        alt={product.name}
                                                        fill
                                                        className="object-cover"
                                                    />
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="font-semibold text-gray-900 text-sm truncate">{product.name}</div>
                                                    <div className="text-xs text-gray-500 line-clamp-1">{product.description}</div>
                                                </div>
                                            </div>

                                            {/* Category */}
                                            <div className="col-span-1">
                                                <span className="inline-block px-2 py-1 bg-[#FFF4E0] text-[#C0934B] text-xs rounded">
                                                    {product.category}
                                                </span>
                                            </div>

                                            {/* Price */}
                                            <div className="col-span-1 text-sm text-gray-900">
                                                {product.price}
                                            </div>

                                            {/* Start Date */}
                                            <div className="col-span-1 text-sm text-gray-900">
                                                {new Date(product.startDate).toLocaleDateString("en-GB", {
                                                    day: "2-digit",
                                                    month: "short",
                                                    year: "numeric"
                                                })}
                                            </div>

                                            {/* End Date */}
                                            <div className="col-span-1 text-sm text-gray-900">
                                                {new Date(product.endDate).toLocaleDateString("en-GB", {
                                                    day: "2-digit",
                                                    month: "short",
                                                    year: "numeric"
                                                })}
                                            </div>

                                            {/* Days Left */}
                                            <div className="col-span-1 text-sm text-gray-900">
                                                {product.daysLeft}
                                            </div>

                                            {/* Status */}
                                            <div className="col-span-2">
                                                <span className={`inline-block px-3 py-1 text-xs rounded-full ${product.status === "Active"
                                                    ? "bg-green-100 text-green-700"
                                                    : product.status === "Expiring Soon"
                                                        ? "bg-yellow-100 text-yellow-700"
                                                        : "bg-red-100 text-red-700"
                                                    }`}>
                                                    {product.status}
                                                </span>
                                            </div>

                                            {/* Action */}
                                            <div className="col-span-2 flex items-center justify-end gap-3">
                                                <button
                                                    onClick={() => openSubscriptionModal(product)}
                                                    className="w-9 h-9 flex items-center justify-center bg-[#C0934B] hover:bg-[#a17a3e] rounded-md transition-colors shadow-sm"
                                                >
                                                    <img src="/assets/eye.svg" alt="View" className="w-4 h-4 brightness-0 invert" />
                                                </button>
                                                <button
                                                    onClick={() => openEditModal(product)}
                                                    className="w-9 h-9 flex items-center justify-center bg-[#C0934B] hover:bg-[#a17a3e] rounded-md transition-colors shadow-sm"
                                                >
                                                    <img src="/assets/edit.svg" alt="Edit" className="w-4 h-4 brightness-0 invert" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="border border-gray-200 rounded-lg p-8 bg-white text-center">
                                <p className="text-gray-500">No subscribed products found.</p>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Subscription Details Modal */}
            <AnimatePresence>
                {isModalOpen && selectedSubscription && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        {/* Backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={closeModal}
                            className="absolute inset-0 bg-black/50"
                        />

                        {/* Modal */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6 z-10"
                        >
                            {/* Close Button */}
                            <button
                                onClick={closeModal}
                                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>

                            {/* Modal Header */}
                            <h3 className="text-xl font-semibold text-[#1E4032] mb-6">Subscription Details</h3>

                            {/* Modal Content */}
                            <div className="flex flex-col gap-4">
                                <div>
                                    <p className="text-xs text-gray-500 mb-1">Product Name</p>
                                    <p className="text-sm font-medium text-gray-900">{selectedSubscription.name}</p>
                                </div>
                                {/* ... Other fields similarly mapped ... */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-xs text-gray-500 mb-1">Price</p>
                                        <p className="text-sm font-medium text-gray-900">{selectedSubscription.price}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500 mb-1">Duration Range</p>
                                        <p className="text-sm font-medium text-gray-900">{selectedSubscription.variant?.duration || 'N/A'}</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-xs text-gray-500 mb-1">Start Date</p>
                                        <p className="text-sm font-medium text-gray-900">
                                            {new Date(selectedSubscription.startDate).toLocaleString("en-IN", {
                                                timeZone: "Asia/Kolkata",
                                                day: "numeric",
                                                month: "short",
                                                year: "numeric",
                                                hour: "numeric",
                                                minute: "numeric",
                                                hour12: true
                                            })}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500 mb-1">End Date</p>
                                        <p className="text-sm font-medium text-gray-900">
                                            {new Date(selectedSubscription.endDate).toLocaleString("en-IN", {
                                                timeZone: "Asia/Kolkata",
                                                day: "numeric",
                                                month: "short",
                                                year: "numeric",
                                                hour: "numeric",
                                                minute: "numeric",
                                                hour12: true
                                            })}
                                        </p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-xs text-gray-500 mb-1">Status</p>
                                        <span className={`inline-block px-3 py-1 text-xs rounded-full ${selectedSubscription.status === "Active"
                                            ? "bg-green-100 text-green-700"
                                            : "bg-red-100 text-red-700"
                                            }`}>
                                            {selectedSubscription.status}
                                        </span>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500 mb-1">Purchase Date</p>
                                        <p className="text-sm font-medium text-gray-900">
                                            {selectedSubscription.createdAt ? new Date(selectedSubscription.createdAt).toLocaleString("en-IN", {
                                                timeZone: "Asia/Kolkata",
                                                day: "numeric",
                                                month: "short",
                                                year: "numeric",
                                                hour: "numeric",
                                                minute: "numeric",
                                                hour12: true
                                            }) : 'N/A'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Edit Subscription Modal - reused mostly from existing code but connected to data */}
            <AnimatePresence>
                {isEditModalOpen && selectedSubscription && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        {/* Backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={closeEditModal}
                            className="absolute inset-0 bg-black/50"
                        />
                        {/* Modal */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="relative bg-white rounded-lg shadow-xl max-w-lg w-full p-6 z-10"
                        >
                            <button onClick={closeEditModal} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                            <h3 className="text-xl font-semibold text-[#1E4032] mb-6">Edit Subscription Details</h3>
                            <form onSubmit={handleUpdateSubscription} className="flex flex-col gap-4">
                                <div>
                                    <label className="text-sm text-gray-600 mb-2 block">Product Name</label>
                                    <input type="text" name="productName" value={editFormData.productName} onChange={handleEditFormChange} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-gray-50" readOnly />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-sm text-gray-600 mb-2 block">Status</label>
                                        <select name="status" value={editFormData.status} onChange={handleEditFormChange} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg">
                                            <option value="Active">Active</option>
                                            <option value="Inactive">Inactive</option>
                                            <option value="Expired">Expired</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-sm text-gray-600 mb-2 block">Historical Limit</label>
                                        <input type="number" name="historicalArticleLimit" value={editFormData.historicalArticleLimit} onChange={handleEditFormChange} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg" />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-sm text-gray-600 mb-2 block">Start Date (IST)</label>
                                        <input type="datetime-local" name="startDate" value={editFormData.startDate} onChange={handleEditFormChange} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg" />
                                    </div>
                                    <div>
                                        <label className="text-sm text-gray-600 mb-2 block">End Date (IST)</label>
                                        <input type="datetime-local" name="endDate" value={editFormData.endDate} onChange={handleEditFormChange} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg" />
                                    </div>
                                </div>

                                <div className="flex gap-3 mt-4">
                                    <button type="submit" className="px-6 py-2.5 bg-[#C0934B] text-white rounded-lg hover:bg-[#a17a3e]">Update</button>
                                    <button type="button" onClick={closeEditModal} className="px-6 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg">Cancel</button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* User Edit Modal */}
            <AnimatePresence>
                {isUserEditModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={closeUserEditModal}
                            className="absolute inset-0 bg-black/50"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="relative bg-white rounded-lg shadow-xl max-w-lg w-full p-6 z-10"
                        >
                            <button onClick={closeUserEditModal} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                            <h3 className="text-xl font-semibold text-[#1E4032] mb-6">Edit Personal Information</h3>
                            <form onSubmit={handleUpdateUser} className="flex flex-col gap-4">
                                <div>
                                    <label className="text-sm text-gray-600 mb-2 block">Full Name</label>
                                    <input type="text" name="name" value={userEditFormData.name} onChange={handleUserEditFormChange} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg" required />
                                </div>
                                <div>
                                    <label className="text-sm text-gray-600 mb-2 block">Email Address</label>
                                    <input type="email" name="email" value={userEditFormData.email} onChange={handleUserEditFormChange} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg" required />
                                </div>
                                <div>
                                    <label className="text-sm text-gray-600 mb-2 block">Phone Number</label>
                                    <input type="text" name="mobile" value={userEditFormData.mobile} onChange={handleUserEditFormChange} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg" required />
                                </div>
                                <div>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input type="checkbox" name="isActive" checked={userEditFormData.isActive} onChange={handleUserEditFormChange} className="w-5 h-5 text-[#C0934B] border-gray-300 rounded focus:ring-[#C0934B]" />
                                        <span className="text-sm text-gray-700">Account Active</span>
                                    </label>
                                </div>
                                <div>
                                    <label className="text-sm text-gray-600 mb-2 block">New Password (leave blank to keep current)</label>
                                    <input type="password" name="password" value={userEditFormData.password} onChange={handleUserEditFormChange} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg" placeholder="••••••••" />
                                </div>
                                <div className="flex gap-3 mt-4">
                                    <button type="submit" className="px-6 py-2.5 bg-[#C0934B] text-white rounded-lg hover:bg-[#a17a3e]">Save Changes</button>
                                    <button type="button" onClick={closeUserEditModal} className="px-6 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg">Cancel</button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Add Subscription Modal */}
            <AnimatePresence>
                {isAddSubModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={closeAddSubModal}
                            className="absolute inset-0 bg-black/50"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="relative bg-white rounded-lg shadow-xl max-w-lg w-full p-6 z-10"
                        >
                            <button onClick={closeAddSubModal} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                            <h3 className="text-xl font-semibold text-[#1E4032] mb-6">Add New Subscription</h3>

                            <form onSubmit={handleAddSubscription} className="flex flex-col gap-4">
                                {/* Product Select */}
                                <div>
                                    <label className="text-sm text-gray-600 mb-2 block">Select Product</label>
                                    <select
                                        name="productId"
                                        value={newSubFormData.productId}
                                        onChange={handleNewSubChange}
                                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg"
                                        required
                                    >
                                        <option value="">-- Choose a Product --</option>
                                        {loadingProducts ? (
                                            <option disabled>Loading products...</option>
                                        ) : (
                                            allProducts.map(p => (
                                                <option key={p.id} value={p.id}>{p.name} ({p.price})</option>
                                            ))
                                        )}
                                    </select>
                                </div>

                                {/* Duration Select - Only shows if product selected */}
                                <div>
                                    <label className="text-sm text-gray-600 mb-2 block">Duration / Plan</label>
                                    <select
                                        name="variantIndex"
                                        value={selectedVariantIndex}
                                        onChange={handleNewSubChange}
                                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg"
                                        required
                                        disabled={!newSubFormData.productId}
                                    >
                                        <option value="">-- Select Duration --</option>
                                        {selectedProductVariants.map((v, idx) => (
                                            <option key={idx} value={idx}>
                                                {v.duration} ({v.durationValue} {v.durationUnit}) - ₹{v.price}
                                            </option>
                                        ))}
                                    </select>
                                    {newSubFormData.productId && selectedProductVariants.length === 0 && (
                                        <p className="text-xs text-red-500 mt-1">No plans available for this product.</p>
                                    )}
                                </div>

                                {/* Start Date (Fixed/Read-only display) */}
                                <div>
                                    <label className="text-sm text-gray-600 mb-2 block">Start Date</label>
                                    <div className="w-full px-4 py-2.5 border border-gray-200 bg-gray-50 rounded-lg text-gray-700">
                                        {new Date().toLocaleString("en-IN", {
                                            timeZone: "Asia/Kolkata",
                                            day: "numeric",
                                            month: "short",
                                            year: "numeric",
                                            hour: "numeric",
                                            minute: "numeric",
                                            hour12: true
                                        })}
                                        <span className="ml-2 text-xs text-gray-400">(Now)</span>
                                    </div>
                                    <input type="hidden" name="status" value="active" />
                                </div>

                                <div className="flex gap-3 mt-4">
                                    <button type="submit" className="px-6 py-2.5 bg-[#C0934B] text-white rounded-lg hover:bg-[#a17a3e] w-full font-bold">
                                        Active
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence >
        </>
    );
}
