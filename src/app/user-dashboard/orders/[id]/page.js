"use client";

import { useEffect, useState } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { pdf } from '@react-pdf/renderer';
import GlobalLoader from '../../../components/GlobalLoader';
import InvoicePDF from '../../../components/invoice/InvoicePDF';

export default function OrderDetailsPage() {
    const [payment, setPayment] = useState(null);
    const [userEmail, setUserEmail] = useState('');
    const [userDetails, setUserDetails] = useState({}); // ✅ Added for mobile/name
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [pdfGenerating, setPdfGenerating] = useState(false);
    const router = useRouter();
    const params = useParams();
    const searchParams = useSearchParams();
    const itemId = searchParams.get('itemId');

    useEffect(() => {
        const fetchPaymentDetails = async (id) => {
            try {
                setLoading(true);
                setError('');
                const response = await fetch(`/api/user/payments/${id}`);

                if (response.ok) {
                    const data = await response.json();
                    setPayment(data.payment);
                    // Store full user details
                    setUserDetails(data.user || {});
                    setUserEmail(data.user?.email || '');
                } else {
                    if (response.status === 401) {
                        router.push('/auth/login');
                        return;
                    }
                    const errorData = await response.json();
                    setError(errorData.error || 'Failed to fetch order details');
                }
            } catch (error) {
                console.error('Error fetching details:', error);
                setError('Network error. Please try again.');
            } finally {
                setLoading(false);
            }
        };

        if (params.id) {
            fetchPaymentDetails(params.id);
        }
    }, [params.id, router]);

    const handleDownloadInvoice = async () => {
        if (!payment) return;
        setPdfGenerating(true);
        try {
            // Check if we are in Single Item View
            const isSingleItemView = items.length === 1 && itemId;

            let baseVal, finalDiscount, totalVal;
            let pdfSubscriptions = [];
            let pdfCartItems = [];

            if (isSingleItemView) {
                // SINGLE ITEM LOGIC
                const item = items[0];
                const price = Number(item.originalPrice || item.variant?.price || item.price || 0);
                let itemDiscount = Number(item.discountApplied || 0);

                // Fallback: Calculate from discountedPrice/amountPaid if discountApplied is missing
                const paidPrice = Number(item.amountPaid || item.discountedPrice || 0);

                if (itemDiscount === 0 && paidPrice > 0) {
                    if (paidPrice < price) {
                        itemDiscount = price - paidPrice;
                    }
                }

                baseVal = price;
                finalDiscount = itemDiscount;

                // Calculate Total for this item (Taxable + GST)
                const taxable = Math.max(0, baseVal - finalDiscount);
                const gst = taxable * 0.18;
                totalVal = taxable + gst;

                // Restrict PDF items to just this one
                if (payment.subscriptions?.find(s => s._id === item._id)) {
                    pdfSubscriptions = [item];
                } else {
                    pdfCartItems = [item];
                }

            } else {
                // FULL ORDER LOGIC
                totalVal = Number(payment.amount); // Payment amount is ALWAYS final paid amount
                baseVal = Number(payment.metadata?.subtotal || totalVal);
                finalDiscount = Number(payment.metadata?.discount_amount || 0);

                if (finalDiscount === 0 && payment.metadata?.cartItems) {
                    finalDiscount = payment.metadata.cartItems.reduce((sum, item) => {
                        const price = Number(item.price) || 0;
                        const discountedPrice = Number(item.discountedPrice) || price;
                        const quantity = Number(item.quantity) || 1;
                        return sum + ((price - discountedPrice) * quantity);
                    }, 0);
                }

                if (finalDiscount === 0 && totalVal > 0 && totalVal < (baseVal * 1.18 - 1)) {
                    const calculatedDiscount = baseVal - (totalVal / 1.18);
                    if (calculatedDiscount > 0) {
                        finalDiscount = Number(calculatedDiscount.toFixed(2));
                    }
                }

                pdfSubscriptions = payment.subscriptions || [];
                pdfCartItems = payment.metadata?.cartItems || [];
            }

            const pdfData = {
                orderId: payment.razorpayOrderId,
                orderDate: payment.createdAt,
                paymentStatus: payment.status,
                amount: baseVal,
                discountAmount: finalDiscount,
                totalAmount: totalVal,
                totalAmount: totalVal,
                userEmail: userDetails.email || userEmail,
                userPhone: userDetails.mobile, // ✅ Pass Mobile
                userName: userDetails.name, // ✅ Pass Name
                subscriptions: pdfSubscriptions,
                cartItems: pdfCartItems,
                isPartial: isSingleItemView
            };

            const blob = await pdf(<InvoicePDF order={pdfData} />).toBlob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Invoice_${payment.razorpayOrderId}${isSingleItemView ? '_Part' : ''}.pdf`;
            document.body.appendChild(a);
            a.click();
            URL.revokeObjectURL(url);
        } catch (err) {
            console.error('Download failed', err);
            alert('Failed to generate invoice');
        } finally {
            setPdfGenerating(false);
        }
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 2
        }).format(Number(amount) || 0);
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('en-IN', {
            day: '2-digit', month: 'short', year: 'numeric'
        });
    };

    const getImageUrl = (filename) => {
        if (!filename) return null;
        if (filename.startsWith('http')) return filename;
        return `/api/admin/products/image/${filename}`;
    };

    // Helper for Payment Status
    const mapPaymentStatus = (status) => {
        if (status === 'captured') return 'Completed';
        return status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Pending';
    };

    // Helper for Subscription Status
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
        return 'Active';
    };

    if (loading) {
        return <GlobalLoader fullScreen={false} className="min-h-[60vh]" />;
    }

    if (error || !payment) {
        return (
            <div className="max-w-7xl mx-auto p-8 text-center">
                <h2 className="text-2xl font-bold text-red-600 mb-4">{error || 'Order Not Found'}</h2>
                <button onClick={() => router.push('/user-dashboard/orders')} className="text-blue-600 hover:underline">Back to Orders</button>
            </div>
        );
    }

    const { metadata, status, razorpayOrderId } = payment;
    const isManual = razorpayOrderId?.startsWith('MANUAL_ADMIN');

    // Robustly merge Subscriptions with Cart Items metadata
    let rawItems = payment.subscriptions && payment.subscriptions.length > 0 ? payment.subscriptions : (metadata?.cartItems || []);

    let items = rawItems.map((item, idx) => {
        if (payment.subscriptions?.length > 0 && (!item.amountPaid || !item.originalPrice)) {
            const cartItemMatch = metadata?.cartItems?.find(ci =>
                ci.productId === (item.product?._id || item.product) ||
                ci.productId === item._id
            ) || metadata?.cartItems?.[idx];

            if (cartItemMatch) {
                return {
                    ...item,
                    originalPrice: Number(item.originalPrice || cartItemMatch.actualPrice || cartItemMatch.price || 0),
                    amountPaid: Number(item.amountPaid || cartItemMatch.discountedPrice || 0),
                    discountApplied: Number(item.discountApplied || cartItemMatch.discountApplied || 0)
                };
            }
        }
        return item;
    });

    // Filter if itemId is present
    if (itemId && items.length > 1) {
        let filtered = [];
        filtered = items.filter(item => item._id === itemId);
        if (filtered.length === 0 && itemId.startsWith('item-')) {
            const index = parseInt(itemId.split('-')[1], 10);
            if (!isNaN(index) && items[index]) {
                filtered = [items[index]];
            }
        }
        if (filtered.length === 0) {
            filtered = items.filter((item, idx) => {
                const currentId = item._id || `item-${idx}`;
                return currentId === itemId;
            });
        }
        if (filtered.length > 0) {
            items = filtered;
        }
    }

    return (
        <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
            {/* Header */}
            <div className="mb-6">
                <Link href="/user-dashboard/orders" className="flex items-center text-gray-500 hover:text-[#1E4032] transition-colors w-fit">
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                    Back to My Orders
                </Link>
            </div>

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-[#1E4032] mb-2">Orders Details</h2>
                    <p className="text-gray-600">Order ID : {razorpayOrderId}</p>
                </div>
                <button
                    onClick={handleDownloadInvoice}
                    disabled={pdfGenerating}
                    className="flex items-center justify-center px-6 py-2.5 bg-[#1E4032] text-white rounded-lg hover:bg-[#152e24] disabled:opacity-50 transition-colors font-medium text-sm"
                >
                    {pdfGenerating ? 'Generating...' : (
                        <>
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                            Download Invoice
                        </>
                    )}
                </button>
            </div>

            <div className="h-px bg-gray-200 w-full mb-8" />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column (2/3 width) */}
                <div className="lg:col-span-2 flex flex-col gap-6">

                    {/* Product Details Card - GLASSMORPHISM */}
                    <div className="backdrop-blur supports-[backdrop-filter]:bg-white/10 bg-white/10 border border-gray-200 rounded-xl p-6">
                        <div className="flex justify-between items-start mb-6">
                            <h3 className="font-bold text-lg text-[#1E4032]">Product details</h3>
                            {items.length > 0 && items[0].product && items[0].product._id && (
                                <Link href={`/user-dashboard/products/${items[0].product._id}`} className="text-[#397767] text-sm font-semibold hover:underline">View Product</Link>
                            )}
                        </div>

                        <div className="space-y-6">
                            {items.map((item, idx) => {
                                const product = item.product || item;
                                const heading = product.heading || item.heading;
                                const filename = product.filename || item.filename;
                                const duration = item.variant?.duration || item.duration;

                                return (
                                    <div key={idx} className={`flex gap-4 ${idx > 0 ? 'pt-6 border-t border-gray-100' : ''}`}>
                                        <div className="w-20 h-20 bg-gray-200 rounded-lg shrink-0 overflow-hidden relative">
                                            {filename ? (
                                                <img src={getImageUrl(filename)} alt={heading} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="flex items-center justify-center h-full text-xs text-gray-400">No Img</div>
                                            )}
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-[#1E4032] mb-1">{heading}</h4>
                                            {product.shortDescription && (
                                                <p className="text-xs text-gray-500 mb-3 leading-relaxed max-w-md line-clamp-2">
                                                    {product.shortDescription}
                                                </p>
                                            )}
                                            <div className="flex gap-2 flex-wrap">
                                                <span className="bg-[#FFF8DC] text-[#C0934B] text-xs font-bold px-3 py-1 rounded-full">
                                                    {item.category || product.category}
                                                </span>
                                                <span className="bg-[#E6F8EB] text-[#1E4032] text-xs font-bold px-3 py-1 rounded-full">
                                                    {duration}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Payment Information Card - GLASSMORPHISM */}
                    <div className="backdrop-blur supports-[backdrop-filter]:bg-white/10 bg-white/10 border border-gray-200 rounded-xl p-6">
                        <div className="flex justify-between items-start mb-6">
                            <h3 className="font-bold text-lg text-[#1E4032]">Payment Information</h3>
                            <span className="bg-[#E6F8EB] text-[#1E4032] text-xs font-bold px-3 py-1 rounded-full">{mapPaymentStatus(status)}</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-sm">
                            <div>
                                <p className="text-gray-500 mb-1">Payment Method</p>
                                <p className="font-semibold text-[#1E4032]">{isManual ? 'MANUAL_ADMIN' : 'Online (Razorpay)'}</p>
                            </div>
                            <div>
                                <p className="text-gray-500 mb-1">Payment Date</p>
                                <p className="font-semibold text-[#1E4032]">{formatDate(payment.createdAt)}</p>
                            </div>
                            <div>
                                <p className="text-gray-500 mb-1">Payment ID</p>
                                <p className="font-semibold text-[#1E4032]">{isManual ? 'MANUAL_ADMIN' : razorpayOrderId}</p>
                            </div>
                            <div>
                                <p className="text-gray-500 mb-1">Transaction ID</p>
                                <p className="font-semibold text-[#1E4032]">{isManual ? 'MANUAL_ADMIN' : (payment.razorpayPaymentId || 'N/A')}</p>
                            </div>
                        </div>
                    </div>

                    {/* Subscription Details Card - GLASSMORPHISM */}
                    <div className="backdrop-blur supports-[backdrop-filter]:bg-white/10 bg-white/10 border border-gray-200 rounded-xl p-6">
                        <div className="flex justify-between items-start mb-6">
                            <h3 className="font-bold text-lg text-[#1E4032]">Subscription Details</h3>
                            {(() => {
                                const subStatus = getSubscriptionStatus(items[0]?.status, items[0]?.endDate);
                                return (
                                    <span className={`text-xs font-bold px-3 py-1 rounded-full ${subStatus === 'Active' ? 'bg-[#E6F8EB] text-[#1E4032]' :
                                        subStatus === 'ExpireSoon' ? 'bg-[#FFF8DC] text-[#C0934B]' :
                                            'bg-[#FFE4E4] text-[#D32F2F]'
                                        }`}>
                                        {subStatus}
                                    </span>
                                );
                            })()}
                        </div>

                        {items.map((item, idx) => {
                            const subStatus = getSubscriptionStatus(item.status, item.endDate);
                            const isExpired = subStatus === 'Expired';

                            return (
                                <div key={idx} className={`space-y-6 ${idx > 0 ? 'pt-6 border-t border-gray-100 mt-6' : ''}`}>
                                    {items.length > 1 && <h5 className="font-semibold text-sm text-gray-700">{item.heading}</h5>}

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-sm mb-6">
                                        <div>
                                            <p className="text-gray-500 mb-1">Start Date</p>
                                            <p className="font-semibold text-[#1E4032]">{item.startDate ? formatDate(item.startDate) : 'N/A'}</p>
                                        </div>
                                        <div>
                                            <p className="text-gray-500 mb-1">End Date</p>
                                            <p className="font-semibold text-[#1E4032]">{item.endDate ? formatDate(item.endDate) : 'N/A'}</p>
                                        </div>
                                        <div>
                                            <p className="text-gray-500 mb-1">Duration</p>
                                            <p className="font-semibold text-[#1E4032]">{item.duration || item.variant?.duration}</p>
                                        </div>
                                        <div>
                                            <p className="text-gray-500 mb-1">Status</p>
                                            <p className={`font-semibold capitalize ${subStatus === 'Active' ? 'text-[#1E4032]' :
                                                subStatus === 'ExpireSoon' ? 'text-[#C0934B]' : 'text-[#D32F2F]'
                                                }`}>
                                                {subStatus}
                                            </p>
                                        </div>
                                    </div>

                                    {isExpired && (
                                        <div className="bg-[#FFE4E4] border border-[#ffcaca] rounded-lg p-4 flex justify-between items-center">
                                            <span className="text-[#D32F2F] text-sm font-semibold">
                                                Subscription Expired On {formatDate(item.endDate)}
                                            </span>
                                            <Link href={`/user-dashboard/products/${item.product?._id || item.product}`} className="text-[#D32F2F] text-sm font-bold hover:underline">
                                                Renew now
                                            </Link>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Right Column (1/3 width) */}
                <div className="flex flex-col gap-6">

                    {/* Order Summary - GLASSMORPHISM */}
                    <div className="backdrop-blur supports-[backdrop-filter]:bg-white/10 bg-white/10 border border-gray-200 rounded-xl p-6">
                        <h3 className="font-bold text-lg text-[#1E4032] mb-6">Order Summary</h3>
                        {(() => {
                            const isSingleItemView = items.length === 1 && itemId;
                            let subtotal, discount, gst, total;

                            if (isSingleItemView) {
                                const item = items[0];
                                const price = Number(item.originalPrice || item.variant?.price || item.price || 0);
                                let itemDiscount = Number(item.discountApplied || 0);

                                const paidPrice = Number(item.amountPaid || item.discountedPrice || 0);

                                if (itemDiscount === 0 && paidPrice > 0) {
                                    if (paidPrice < price) {
                                        itemDiscount = price - paidPrice;
                                    }
                                }

                                subtotal = price;
                                discount = itemDiscount;
                                const taxable = Math.max(0, subtotal - discount);
                                gst = Number((taxable * 0.18).toFixed(2));
                                total = taxable + gst;
                            } else {
                                subtotal = Number(metadata?.subtotal || payment.amount);
                                discount = Number(metadata?.discount_amount || 0);
                                const taxable = Math.max(0, subtotal - discount);
                                gst = Number((taxable * 0.18).toFixed(2));
                                total = taxable + gst;
                            }

                            return (
                                <div className="space-y-3 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Amount</span>
                                        <span className="font-semibold text-[#1E4032]">{formatCurrency(subtotal)}</span>
                                    </div>
                                    {discount > 0 && (
                                        <div className="flex justify-between text-green-600">
                                            <span>Discount</span>
                                            <span>-{formatCurrency(discount)}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">GST (18%)</span>
                                        <span className="font-semibold text-[#1E4032]">{formatCurrency(gst)}</span>
                                    </div>
                                    <div className="h-px bg-gray-200 w-full my-4" />
                                    <div className="flex justify-between text-base font-bold text-[#1E4032]">
                                        <span>Total Paid</span>
                                        <span>{formatCurrency(total)}</span>
                                    </div>
                                </div>
                            );
                        })()}
                    </div>

                    {/* Order Status Timeline - GLASSMORPHISM */}
                    <div className="backdrop-blur supports-[backdrop-filter]:bg-white/10 bg-white/10 border border-gray-200 rounded-xl p-6">
                        <h3 className="font-bold text-lg text-[#1E4032] mb-6">Order Status</h3>
                        <div className="space-y-6 relative">
                            <div className="flex justify-between items-start text-sm relative z-10">
                                <div>
                                    <p className="font-semibold text-[#1E4032]">Order Placed</p>
                                    <p className="text-[10px] text-gray-400">{formatDate(payment.createdAt)}</p>
                                </div>
                                <span className="text-[#397767] font-semibold text-xs">Completed</span>
                            </div>

                            {(status === 'captured' || status === 'active' || status === 'completed') && (
                                <div className="flex justify-between items-start text-sm relative z-10">
                                    <div>
                                        <p className="font-semibold text-[#1E4032]">Details Validated</p>
                                        <p className="text-[10px] text-gray-400">{formatDate(payment.updatedAt || payment.createdAt)}</p>
                                    </div>
                                    <span className="text-[#397767] font-semibold text-xs">Completed</span>
                                </div>
                            )}

                            <div className="flex justify-between items-start text-sm relative z-10">
                                <div>
                                    <p className="font-semibold text-[#1E4032]">Subscription {getSubscriptionStatus(null, items[0]?.endDate)}</p>
                                    <p className="text-[10px] text-gray-400">
                                        {items[0]?.endDate ? `Valid till ${formatDate(items[0].endDate)}` : 'Duration N/A'}
                                    </p>
                                </div>
                                <span className={`font-semibold text-xs ${getSubscriptionStatus(null, items[0]?.endDate) === 'Active' ? 'text-[#397767]' :
                                    getSubscriptionStatus(null, items[0]?.endDate) === 'ExpireSoon' ? 'text-[#C0934B]' : 'text-[#D32F2F]'
                                    }`}>
                                    {getSubscriptionStatus(null, items[0]?.endDate)}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Renewal Information (Conditional Placeholder) - GLASSMORPHISM */}
                    {payment.metadata?.isRenewal && (
                        <div className="backdrop-blur supports-[backdrop-filter]:bg-white/10 bg-white/10 border border-gray-200 rounded-xl p-6">
                            <h3 className="font-bold text-lg text-[#1E4032] mb-6">Renewal Information</h3>
                            <div className="flex justify-between mb-4 text-sm">
                                <div>
                                    <p className="text-gray-500 mb-1">Previous Plan</p>
                                    <p className="font-semibold text-[#1E4032]">{payment.metadata.previousPlanName || 'Standard Plan'}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-gray-500 mb-1">Previous End Date</p>
                                    <p className="font-semibold text-[#1E4032]">{payment.metadata.previousEndDate ? formatDate(payment.metadata.previousEndDate) : 'N/A'}</p>
                                </div>
                            </div>

                            <div className="bg-[#E6F8EB] text-[#1E4032] text-xs font-semibold p-3 rounded-lg text-center">
                                This order extended your existing subscription
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
