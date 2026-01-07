"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Download } from "lucide-react";
import Image from "next/image";

import { pdf } from '@react-pdf/renderer';
import InvoicePDF from '../../../components/invoice/InvoicePDF'; // Confirm path
import GlobalLoader from "@/app/components/GlobalLoader";

export default function OrderDetailsPage() {
    const params = useParams();
    const router = useRouter();
    const orderId = params?.id;

    const [orderDetails, setOrderDetails] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [pdfGenerating, setPdfGenerating] = useState(false);

    useEffect(() => {
        const fetchOrder = async () => {
            if (!orderId) return;
            try {
                const response = await fetch(`/api/admin/all-orders/${orderId}`);
                if (!response.ok) throw new Error("Failed to fetch order");
                const data = await response.json();
                if (data.success) {
                    setOrderDetails(data.order);
                } else {
                    setError(data.error);
                }
            } catch (err) {
                console.error(err);
                setError("Error loading order details");
            } finally {
                setLoading(false);
            }
        };
        fetchOrder();
    }, [orderId]);

    const handleDownloadInvoice = async () => {
        if (!orderDetails || !orderDetails.raw) return;
        setPdfGenerating(true);
        try {
            const raw = orderDetails.raw;
            const product = orderDetails.product;

            const pdfData = {
                orderId: (raw.razorpayOrderId?.startsWith('MANUAL_ADMIN') ? 'MANUAL_ADMIN' : raw.razorpayOrderId) || orderDetails.payment.fields.find(f => f.label === 'Payment ID')?.value || 'N/A',
                orderDate: raw.createdAt,
                paymentStatus: orderDetails.payment.status,
                amount: raw.baseAmount,
                discountAmount: raw.discountAmount,
                totalAmount: raw.totalAmount,
                userEmail: orderDetails.user.email,
                subscriptions: [{
                    product: { heading: product.title },
                    variant: {
                        duration: raw.variant?.duration || orderDetails.subscription.fields.find(f => f.label === 'Duration')?.value,
                        price: raw.baseAmount
                    },
                    startDate: raw.startDate,
                    endDate: raw.endDate
                }],
                cartItems: [],
                isPartial: false
            };

            const blob = await pdf(<InvoicePDF order={pdfData} />).toBlob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Invoice_${pdfData.orderId}.pdf`;
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

    if (loading) return <GlobalLoader />;
    if (error) return (
        <div className="flex flex-col items-center justify-center p-10 gap-4">
            <p className="text-red-500">{error}</p>
            <button onClick={() => router.back()} className="px-4 py-2 bg-[#C0934B] text-white rounded-lg">Go Back</button>
        </div>
    );
    if (!orderDetails) return <div className="p-10 text-center">Order not found</div>;

    const { product, user, payment, summary, subscription, orderId: displayOrderId } = orderDetails;

    // Detect manual order
    const paymentIdField = payment.fields.find(f => f.label === 'Payment ID');
    const isManual = paymentIdField?.value?.toString().startsWith('MANUAL_ADMIN');

    // Mask fields
    const displayPaymentFields = payment.fields.map(field => {
        if (isManual && ['Payment Method', 'Payment ID', 'Transaction ID'].includes(field.label)) {
            if (field.label === 'Payment Method' && orderDetails.raw?.metadata?.adminName) {
                return { ...field, value: `Manual Adjustment (Admin: ${orderDetails.raw.metadata.adminName})` };
            }
            return { ...field, value: 'MANUAL_ADMIN' };
        }
        return field;
    });

    return (
        <div className="w-full space-y-6">
            {/* Header Section */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Orders Details</h1>
                </div>
                <button
                    onClick={handleDownloadInvoice}
                    disabled={pdfGenerating}
                    className="flex items-center gap-2 bg-[#CFA56B] text-white px-6 py-2.5 rounded-lg hover:bg-[#b08b58] transition-colors font-medium disabled:opacity-50"
                >
                    <Download className="w-4 h-4" />
                    {pdfGenerating ? 'Generating...' : 'Download Invoice'}
                </button>
            </div>

            {/* Order ID */}
            <div className="text-gray-600 font-medium">
                Order ID : <span className="text-gray-900">{displayOrderId}</span>
            </div>

            {/* Row 1: Product & User Details */}
            <div className="flex flex-col lg:flex-row gap-6">
                {/* Product Details (75%) */}
                <div className="w-full lg:w-3/4 bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                    <h2 className="text-lg font-bold text-gray-900 mb-6">Product details</h2>
                    <div className="flex flex-col sm:flex-row gap-6">
                        <div className="w-32 h-32 bg-gray-200 rounded-lg flex-shrink-0 overflow-hidden relative">
                            <Image
                                src={product.image}
                                alt={product.title}
                                fill
                                className="object-cover"
                            />
                        </div>
                        <div className="flex-1 space-y-3">
                            <h3 className="text-lg font-bold text-gray-900">{product.title}</h3>
                            <p className="text-gray-500 text-sm leading-relaxed max-w-2xl">
                                {product.description}
                            </p>
                            <div className="flex flex-wrap gap-3">
                                {product.badges.map((badge, idx) => (
                                    <span key={idx} className={`px-4 py-1 rounded-full text-xs font-medium ${badge.color}`}>
                                        {badge.text}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* User Details (25%) */}
                <div className="w-full lg:w-1/4 bg-white rounded-xl border border-gray-200 p-6 shadow-sm h-fit">
                    <h2 className="text-lg font-bold text-gray-900 mb-4">{user.title}</h2>
                    <div className="space-y-3">
                        <div className="flex gap-2 text-sm">
                            <span className="text-gray-500 min-w-[50px]">Name :</span>
                            <span className="text-gray-900 font-medium">{user.name}</span>
                        </div>
                        <div className="flex gap-2 text-sm">
                            <span className="text-gray-500 min-w-[50px]">Email :</span>
                            <span className="text-gray-900 font-medium break-all">{user.email}</span>
                        </div>
                        <div className="flex gap-2 text-sm">
                            <span className="text-gray-500 min-w-[50px]">Phone :</span>
                            <span className="text-gray-900 font-medium">{user.phone}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Row 2: Payment & Order Summary */}
            <div className="flex flex-col lg:flex-row gap-6">
                {/* Payment Information (75%) */}
                <div className="w-full lg:w-3/4 bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                    <div className="flex justify-between items-start mb-6">
                        <h2 className="text-lg font-bold text-gray-900">{payment.title}</h2>
                        <span className={`px-4 py-1 rounded-full text-xs font-medium ${payment.statusColor}`}>
                            {payment.status}
                        </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-12">
                        {displayPaymentFields.map((field, idx) => (
                            <div key={idx}>
                                <div className="text-gray-500 text-sm mb-1">{field.label}</div>
                                <div className="text-gray-900 font-medium">{field.value}</div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Order Summary (25%) */}
                <div className="w-full lg:w-1/4 bg-white rounded-xl border border-gray-200 p-6 shadow-sm h-fit">
                    <h2 className="text-lg font-bold text-gray-900 mb-4">{summary.title}</h2>
                    <div className="space-y-3 border-b border-gray-100 pb-4 mb-4">
                        {summary.items.map((item, idx) => (
                            <div key={idx} className="flex justify-between text-sm">
                                <span className="text-gray-500">{item.label}</span>
                                <span className="text-gray-900 font-medium">{item.value}</span>
                            </div>
                        ))}
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-gray-900 font-bold">{summary.total.label}</span>
                        <span className="text-gray-900 font-bold">{summary.total.value}</span>
                    </div>
                </div>
            </div>

            {/* Row 3: Subscription Details (100%) */}
            <div className="w-full bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                <div className="flex justify-between items-start mb-6">
                    <h2 className="text-lg font-bold text-gray-900">{subscription.title}</h2>
                    <span className={`px-4 py-1 rounded-full text-xs font-medium ${subscription.statusColor}`}>
                        {subscription.status}
                    </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                    {subscription.fields.map((field, idx) => (
                        <div key={idx}>
                            <div className="text-gray-500 text-sm mb-1">{field.label}</div>
                            <div className="text-gray-900 font-bold text-base">{field.value}</div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
