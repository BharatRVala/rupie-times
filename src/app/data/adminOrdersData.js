export const adminOrdersPageData = {
    header: {
        title: "All Orders",
        subtitle: "Manage your user subscription orders",
        searchPlaceholder: "Search here...",
        viewButton: "View",
        emptyState: "No orders found.",
    },
    stats: [
        {
            id: 1,
            count: 15,
            label: "Total Orders",
            type: "total",
        },
        {
            id: 2,
            count: 15,
            label: "Active Orders",
            type: "active",
            color: "text-green-600",
        },
        {
            id: 3,
            count: 15,
            label: "Expired Orders",
            type: "expired",
            color: "text-red-500",
        },
        {
            id: 4,
            count: 15,
            label: "Expiring Soon",
            type: "expiring_soon",
            color: "text-orange-500",
        },
    ],
    tabs: [
        { id: "all", label: "All Orders", count: 1 },
        { id: "active", label: "Active", count: 1 },
        { id: "expired", label: "Expired", count: 1 },
        { id: "expiring", label: "Expiring Soon", count: 1 },
    ],
    table: {
        columns: [
            "Order no.",
            "Product",
            "User",
            "Price",
            "Duration Range",
            "Created On",
            "Action",
        ],
        rows: [
            {
                id: "0001",
                product: {
                    name: "Profitly weekly latest",
                    description: "Lorem ipsum dolor sit amet, adipiscing elit.",
                    image: "/images/placeholder-square.jpg", // dynamic path, using placeholder for now
                },
                user: {
                    email: "john@gmail.com",
                },
                price: "₹ 100",
                duration: "1 month",
                createdOn: "10 dec 2025",
                status: "active", // internal status for filtering
            },
            {
                id: "0002",
                product: {
                    name: "Profitly weekly latest",
                    description: "Lorem ipsum dolor sit amet, adipiscing elit.",
                    image: "/images/placeholder-square.jpg",
                },
                user: {
                    email: "john@gmail.com",
                },
                price: "₹ 100",
                duration: "1 month",
                createdOn: "10 dec 2025",
                status: "active",
            },
            {
                id: "0003",
                product: {
                    name: "Profitly weekly latest",
                    description: "Lorem ipsum dolor sit amet, adipiscing elit.",
                    image: "/images/placeholder-square.jpg",
                },
                user: {
                    email: "john@gmail.com",
                },
                price: "₹ 100",
                duration: "1 month",
                createdOn: "10 dec 2025",
                status: "expired",
            },
            {
                id: "0004",
                product: {
                    name: "Profitly weekly latest",
                    description: "Lorem ipsum dolor sit amet, adipiscing elit.",
                    image: "/images/placeholder-square.jpg",
                },
                user: {
                    email: "john@gmail.com",
                },
                price: "₹ 100",
                duration: "1 month",
                createdOn: "10 dec 2025",
                status: "expiring",
            },
        ],
    },
    // Detailed view data (example for a single order, in a real app this would be fetched by ID)
    orderDetailsData: {
        header: {
            title: "Orders Details",
            downloadButton: "Download Invoice",
        },
        // Using a function or map in real app, here specific mock data for the design
        details: {
            orderId: "0002",
            product: {
                title: "Rupie Times Talk",
                description: "Lorem ipsum Dolor Sit Amet, Consectetur Adipiscing Elit. Sed Ut Perspiciatis Unde Omnis Iste Natus Error Sit Voluptatem",
                image: "/images/placeholder-square.jpg",
                badges: [
                    { text: "Technical", color: "bg-[#FDF2C8] text-[#D4A017]" }, // Example custom colors for badges
                    { text: "1 year", color: "bg-[#D1FADF] text-[#027A48]" }
                ]
            },
            user: {
                title: "User Details",
                name: "John Deo",
                email: "john@gmail.com",
                phone: "+9101234567896"
            },
            payment: {
                title: "Payment Information",
                status: "Paid",
                statusColor: "bg-[#D1FADF] text-[#027A48]", // Green badge
                fields: [
                    { label: "Payment Method", value: "Razorpay" },
                    { label: "Payment Method", value: "18 Nov 2025 , 12:45 Pm" }, // Label says 'Payment Method' in image for date?? Wait, image has "Payment Method" title above "Razorpay", and "Payment Time" maybe? The image shows "Payment Method" then "Razorpay" below it. And "Payment Method" (sic) then Date. I will correct the label to "Payment Time" for the second one if it looks like a date. Actually the screenshot shows "Payment Method" above "Razorpay", and likely "Payment Time" above the date, but the label in the screenshot might be duplicated or I should infer. Let's look closely at the image description: "Payment Method Razorpay" "18 Nov 2025...". I'll use "Payment Time" for the timestamp.
                    { label: "Payment ID", value: "ABC_1002" },
                    { label: "Transaction ID", value: "ABC_1002" }
                ]
            },
            summary: {
                title: "Order Summary",
                items: [
                    { label: "Amount", value: "₹ 100" },
                    { label: "Discount", value: "₹ 20" },
                    { label: "GST (9 % )", value: "₹ 10" },
                ],
                total: { label: "Total Paid", value: "₹ 110" }
            },
            subscription: {
                title: "Subscription Details",
                status: "Expired",
                statusColor: "bg-[#FEE4E2] text-[#D92D20]", // Red/Pink badge
                fields: [
                    { label: "Start Date", value: "18 Nov 2025" },
                    { label: "End Date", value: "18 Nov 2025" },
                    { label: "Duration", value: "1 Year" }
                ]
            }
        }
    }
};
