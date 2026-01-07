'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { FaArrowRight } from 'react-icons/fa';
import GlobalLoader from '../../components/GlobalLoader';

const TABS = ["All", "Completed", "Pending", "Failed"];

export default function OrderList() {
    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [activeTab, setActiveTab] = useState("All");
    const router = useRouter();

    useEffect(() => {
        fetchOrders();
    }, [currentPage]);

    const fetchOrders = async () => {
        try {
            setLoading(true);
            setError('');
            // Use Payments API which represents "Orders" (Transactions)
            const response = await fetch(`/api/user/payments?page=${currentPage}&limit=10`);

            if (response.ok) {
                const data = await response.json();
                setPayments(data.payments || []);
                if (data.pagination) {
                    setTotalPages(data.pagination.totalPages);
                }
            } else if (response.status === 401) {
                router.push('/auth/login');
            } else {
                setError('Failed to fetch orders');
            }
        } catch (err) {
            console.error(err);
            setError('Network error');
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (val) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(val);

    const formatDate = (dateStr) => {
        if (!dateStr) return 'N/A';
        return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    };

    // 1. Flatten Data to create "Orders" list
    const allOrders = payments.flatMap(payment => {
        // Special Handling for Trial Activation
        if (payment.metadata?.type === 'trial_activation') {
            return [{
                ...payment,
                id: payment.razorpayOrderId || 'TRIAL',
                date: formatDate(payment.createdAt), // Dynamic date from API
                amount: "0",
                duration: payment.duration || "7 Days", // Dynamic duration from API
                title: "Trial product active",
                image: null,
                category: "Trial",
                paymentStatus: "Completed",
                subscriptionStatus: "Active",
                parentPaymentId: payment._id,
                uniqueItemId: payment._id,
                isMultiItem: false
            }];
        }

        const getSubscriptionStatus = (status, endDate) => {
            if (status === 'expiresoon') return 'ExpireSoon';
            if (status) return status.charAt(0).toUpperCase() + status.slice(1);
            if (endDate) {
                const end = new Date(endDate);
                const now = new Date();
                const diffDays = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
                if (diffDays < 0) return 'Expired';
                if (diffDays <= 5) return 'ExpireSoon';
                return 'Active';
            }
            return payment.status === 'captured' ? 'Active' : 'Pending';
        };

        const mapPaymentStatus = (status) => {
            if (status === 'captured') return 'Completed';
            return status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Pending';
        };

        // Prioritize Subscriptions (Dynamic) > CartItems (Static Metadata)
        const sourceItems = (payment.subscriptions && payment.subscriptions.length > 0 && typeof payment.subscriptions[0] === 'object')
            ? payment.subscriptions
            : (payment.metadata?.cartItems || []);

        if (sourceItems.length > 0) {
            return sourceItems.map((item, idx) => {
                // Normalization
                const isSub = item.product ? true : false;
                const product = item.product || item;

                // ✅ Fix: Safely access Heading/Title
                const title = product.heading || product.title || item.heading || item.title || 'Product Name Unavailable';
                const filename = product.filename || item.filename;
                const duration = item.variant?.duration || item.duration || 'N/A';

                // ✅ Fix: Amount Logic - Prioritize Paid Amount -> Price -> Metadata -> Total Fallback
                const itemAmount =
                    item.variant?.amountPaid ||
                    item.variant?.price ||
                    item.discountedPrice ||
                    item.price ||
                    (sourceItems.length === 1 ? payment.amount : 0);

                return {
                    ...item,
                    id: payment.razorpayOrderId?.startsWith('MANUAL_ADMIN') ? 'MANUAL_ADMIN' : payment.razorpayOrderId,
                    date: formatDate(payment.createdAt),
                    amount: (Number(itemAmount)).toFixed(2), // Simplify for display
                    duration,
                    title,
                    image: filename,
                    category: product.category || item.category,

                    paymentStatus: mapPaymentStatus(payment.status),
                    subscriptionStatus: getSubscriptionStatus(item.status, item.endDate),

                    parentPaymentId: payment._id,
                    uniqueItemId: item._id || `item-${idx}`,
                    isMultiItem: true
                };
            });
        }

        // Single/Legacy Item Fallback
        return [{
            ...payment,
            id: payment.razorpayOrderId?.startsWith('MANUAL_ADMIN') ? 'MANUAL_ADMIN' : payment.razorpayOrderId,
            date: formatDate(payment.createdAt),
            amount: payment.amount,
            duration: 'N/A',
            title: 'Order Details',
            image: null,
            paymentStatus: mapPaymentStatus(payment.status),
            subscriptionStatus: payment.status === 'captured' ? 'Active' : 'Pending',
            parentPaymentId: payment._id,
            uniqueItemId: payment._id,
            isMultiItem: false
        }];
    });

    // 2. Filter Logic
    const filteredOrders = activeTab === "All"
        ? allOrders
        : allOrders.filter(order => {
            // Map Tabs to Statuses
            const pStatus = order.paymentStatus.toLowerCase();
            const sStatus = order.subscriptionStatus.toLowerCase(); // optional usage

            if (activeTab === "Completed") return pStatus === 'completed'; // mapped from captured
            if (activeTab === "Pending") return pStatus === 'created' || pStatus === 'pending';
            if (activeTab === "Failed") return pStatus === 'failed';
            return false;
        });

    if (loading) {
        return <GlobalLoader fullScreen={false} className="min-h-[60vh]" />;
    }

    return (
        <div>
            {/* Tabs */}
            <div className="flex gap-8 border-b border-gray-200 mb-8 overflow-x-auto">
                {TABS.map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`pb-4 text-sm font-semibold relative transition-colors whitespace-nowrap ${activeTab === tab
                            ? "text-[#C0934B]"
                            : "text-gray-500 hover:text-gray-700"
                            }`}
                    >
                        {tab}
                        {/* Count Badge for 'All' */}
                        {tab === "All" && (
                            <span className="ml-2 bg-[#F3EFE6] text-[#C0934B] text-xs px-2 py-0.5 rounded-full">
                                {allOrders.length}
                            </span>
                        )}

                        {/* Active Line */}
                        {activeTab === tab && (
                            <div className="absolute bottom-0 left-0 w-full h-0.5 bg-[#C0934B]" />
                        )}
                    </button>
                ))}
            </div>

            {error && <div className="p-4 bg-red-50 text-red-700 rounded-lg mb-6">{error}</div>}

            {/* List */}
            <div className="flex flex-col gap-6">
                {filteredOrders.length > 0 ? (
                    filteredOrders.map((order, idx) => (
                        <div
                            key={`${order.parentPaymentId}-${idx}`}
                            className="backdrop-blur supports-[backdrop-filter]:bg-white/10 bg-white/10 border border-gray-200 rounded-xl p-6 relative"
                        >
                            {/* Header / Title */}
                            <div className="mb-4">
                                <h3 className="text-xl font-bold text-[#1E4032]">{order.title}</h3>
                                {order.category && <span className="text-xs text-gray-400">{order.category}</span>}
                            </div>

                            {/* Info Row 1 */}
                            <div className="flex flex-wrap gap-y-2 gap-x-8 text-sm text-[#5C5C5C] mb-2 font-medium">
                                <p>Amount : {formatCurrency(order.amount)}</p>
                                <span className="hidden sm:inline text-gray-300">|</span>
                                <p>Duration time : {order.duration}</p>
                                <div className="sm:ml-auto text-gray-500 font-normal flex flex-col items-end gap-1">
                                    <span className={`text-xs font-bold px-3 py-1 rounded-full ${order.subscriptionStatus === 'Active'
                                        ? "bg-[#E6F8EB] text-[#1E4032]"
                                        : order.subscriptionStatus === 'Expired'
                                            ? "bg-[#FFE4E4] text-[#D32F2F]"
                                            : order.subscriptionStatus === 'ExpireSoon'
                                                ? "bg-[#FFF8DC] text-[#C0934B]"
                                                : "bg-gray-100 text-gray-600"
                                        }`}>
                                        {order.subscriptionStatus}
                                    </span>
                                    <span>{order.date}</span>
                                </div>
                            </div>

                            {/* Info Row 2 */}
                            <div className="flex flex-wrap gap-y-2 gap-x-8 text-sm text-[#5C5C5C] items-center">
                                <p>Order ID : {order.id}</p>
                                <span className="hidden sm:inline text-gray-300">|</span>
                                <p>
                                    Payment : <span className={`capitalize ${order.paymentStatus === 'Completed' ? 'text-[#397767]' :
                                        order.paymentStatus === 'Failed' ? 'text-red-500' : 'text-orange-500'
                                        }`}>{order.paymentStatus}</span>
                                </p>

                                <div className="sm:ml-auto">
                                    <Link
                                        href={order.isMultiItem
                                            ? `/user-dashboard/orders/${order.parentPaymentId}?itemId=${order.uniqueItemId}`
                                            : `/user-dashboard/orders/${order.parentPaymentId}`
                                        }
                                        className="flex items-center text-[#1E4032] font-bold text-sm hover:underline"
                                    >
                                        View Details <FaArrowRight className="ml-2 w-3 h-3" />
                                    </Link>
                                </div>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="text-center py-20 bg-gray-50 rounded-xl">
                        <h3 className="text-lg font-semibold text-gray-600">No {activeTab.toLowerCase()} orders found</h3>
                        {activeTab === 'All' && <p className="text-gray-500 mt-2">You haven’t made any purchases yet.</p>}
                    </div>
                )}
            </div>

            {/* Pagination (Simple) */}
            {totalPages > 1 && (
                <div className="mt-8 flex justify-center gap-2">
                    <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="px-4 py-2 bg-white border rounded disabled:opacity-50 hover:bg-gray-50">Prev</button>
                    <span className="px-4 py-2 text-gray-600">Page {currentPage} of {totalPages}</span>
                    <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} className="px-4 py-2 bg-white border rounded disabled:opacity-50 hover:bg-gray-50">Next</button>
                </div>
            )}
        </div>
    );
}
