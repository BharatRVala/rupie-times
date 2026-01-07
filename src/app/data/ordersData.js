export const ORDERS_DATA = [
    {
        id: "ABC_1002",
        title: "Rupie Times Talk",
        amount: 110, // Total Paid matches screenshot
        duration: "1 Year",
        date: "November 4, 2025",
        paymentStatus: "Completed",
        subscriptionStatus: "Active",
        orderStatus: "Completed",
        // Extended Details
        details: {
            product: {
                image: "https://placehold.co/100x100/e2e8f0/1e293b?text=RT",
                description: "Lorem Ipsum Dolor Sit Amet, Consectetur Adipiscing Elit. Sed Ut Perspiciatis Unde Omnis Iste Natus Error Sit Voluptatem",
                category: "Technical",
                planDuration: "1 year"
            },
            payment: {
                method: "Razorpay",
                paymentId: "ABC_1002",
                transactionId: "ABC_1002",
                date: "18 Nov 2025, 12:45 Pm"
            },
            subscription: {
                startDate: "18 Nov 2025",
                endDate: "18 Nov 2025",
                status: "Expired", // Matches screenshot alert example
                renewalDate: "18 Nov 2025"
            },
            summary: {
                amount: 100,
                discount: 10,
                discountLabel: "Discount",
                gst: 10,
                gstLabel: "GST (9 % )",
                total: 100,
                totalLabel: "Total Paid"
            },
            headings: {
                productDetails: "Product details",
                paymentInfo: "Payment Information",
                subscriptionDetails: "Subscription Details",
                orderSummary: "Order Summary",
                orderStatus: "Order Status",
                renewalInfo: "Renewal Information"
            },
            labels: {
                viewProduct: "View Product",
                paid: "Paid",
                paymentMethod: "Payment Method",
                paymentDate: "Payment Date",
                paymentId: "Payment ID",
                transactionId: "Transaction ID",
                startDate: "Start Date",
                endDate: "End Date",
                duration: "Duration",
                status: "Status",
                renewNow: "Renew now",
                renewalNotice: "This order extented your existing subscription",
                previousPlan: "Previous Plan",
                previousEndDate: "Previous End Date",
                amount: "Amount"
            },
            timeline: [
                { status: "Order Placed", date: "18 Nov 2025, 1:45 Pm", completed: true },
                { status: "Payment Processed", date: "18 Nov 2025, 1:45 Pm", completed: true },
                { status: "Subscription Activated", date: "18 Nov 2025, 1:45 Pm", completed: true },
                { status: "Access Granted", date: "18 Nov 2025, 1:45 Pm", completed: true },
                { status: "Subscription Granted", date: "18 Nov 2025, 1:45 Pm", completed: true }
            ],
            renewal: {
                previousPlan: "1 Year",
                previousEndDate: "18 Nov 2025"
            },
            buttons: {
                downloadInvoice: "Download invoice"
            }
        }
    },
    // ... Copy structure for others if needed, keeping simple for demo
    {
        id: "ABC_1003",
        title: "Rupie Times Talk",
        amount: 1000,
        duration: "1 year",
        date: "November 4, 2025",
        paymentStatus: "Completed",
        subscriptionStatus: "Expired",
        orderStatus: "Completed",
        details: {
            product: {
                image: "https://placehold.co/100x100/e2e8f0/1e293b?text=RT",
                description: "Lorem Ipsum Dolor Sit Amet.",
                category: "Technical",
                planDuration: "1 year"
            },
            payment: { method: "Razorpay", paymentId: "ABC_1003", transactionId: "TXN_1003", date: "18 Nov 2025" },
            subscription: { startDate: "18 Nov 2025", endDate: "18 Nov 2026", status: "Expired" },
            summary: {
                amount: 1000,
                discount: 0,
                discountLabel: "Discount",
                gst: 0,
                gstLabel: "GST (0 % )",
                total: 1000,
                totalLabel: "Total Paid"
            },
            headings: {
                productDetails: "Product details",
                paymentInfo: "Payment Information",
                subscriptionDetails: "Subscription Details",
                orderSummary: "Order Summary",
                orderStatus: "Order Status",
                renewalInfo: "Renewal Information"
            },
            labels: {
                viewProduct: "View Product",
                paid: "Paid",
                paymentMethod: "Payment Method",
                paymentDate: "Payment Date",
                paymentId: "Payment ID",
                transactionId: "Transaction ID",
                startDate: "Start Date",
                endDate: "End Date",
                duration: "Duration",
                status: "Status",
                renewNow: "Renew now",
                renewalNotice: "This order extented your existing subscription",
                previousPlan: "Previous Plan",
                previousEndDate: "Previous End Date",
                amount: "Amount"
            },
            timeline: [{ status: "Order Placed", date: "18 Nov 2025", completed: true }],
            renewal: { previousPlan: "1 Year", previousEndDate: "18 Nov 2025" },
            buttons: { downloadInvoice: "Download invoice" }
        }
    },
    {
        id: "ABC_1004",
        title: "Rupie Times Talk",
        amount: 1000,
        duration: "1 year",
        date: "November 4, 2025",
        paymentStatus: "Completed",
        subscriptionStatus: "Active",
        orderStatus: "Completed"
    },
    {
        id: "ABC_1005",
        title: "Technical Analysis Course",
        amount: 5000,
        duration: "Lifetime",
        date: "October 20, 2025",
        paymentStatus: "Pending",
        subscriptionStatus: "Inactive",
        orderStatus: "Pending"
    },
    {
        id: "ABC_1006",
        title: "Market Insights",
        amount: 12000,
        duration: "6 Months",
        date: "October 15, 2025",
        paymentStatus: "Failed",
        subscriptionStatus: "Inactive",
        orderStatus: "Failed"
    }
];
