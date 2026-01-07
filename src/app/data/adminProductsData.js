export const adminProductsData = {
    header: {
        title: "Products",
        subtitle: "Manage your account information",
        actions: [
            {
                id: "add_product",
                action: "add_product",
                label: "Add Product",
                icon: "plus",
                variant: "primary"
            },
            {
                id: "global_promo",
                label: "Global Promo Code",
                variant: "secondary"
            }
        ]
    },
    stats: [
        {
            id: 1,
            value: 4,
            label: "Total Products",
            subLabel: "All Products",
            icon: "box"
        },
        {
            id: 2,
            value: 4,
            label: "Active",
            subLabel: "Currently Avalible",
            icon: "check"
        },
        {
            id: 3,
            value: 4,
            label: "Total Articles",
            subLabel: "Accross all Product",
            icon: "file"
        },
        {
            id: 4,
            value: 4,
            label: "Pricing Variants",
            subLabel: "All duration products",
            icon: "tag"
        }
    ],
    productsTable: {
        headers: [
            "Product",
            "Category",
            "Price",
            "Duration Range",
            "Articles",
            "Status",
            "Action"
        ],
        data: [
            {
                id: 1,
                name: "Profitly weekly latest",
                description: "Lorem ipsum dolor sit amet, adipiscing elit.",
                image: "/assets/products/placeholder.png", // Ensure this exists or use a generic one
                category: "Technical",
                price: "₹ 100",
                duration: "1 month",
                articleCount: 9,
                status: "Active",
                isActive: true
            },
            {
                id: 2,
                name: "Profitly weekly latest",
                description: "Lorem ipsum dolor sit amet, adipiscing elit.",
                image: "/assets/products/placeholder.png",
                category: "Technical",
                price: "₹ 100",
                duration: "1 month",
                articleCount: 9,
                status: "Deactive",
                isActive: false
            },
            {
                id: 3,
                name: "Profitly weekly latest",
                description: "Lorem ipsum dolor sit amet, adipiscing elit.",
                image: "/assets/products/placeholder.png",
                category: "Technical",
                price: "₹ 100",
                duration: "1 month",
                articleCount: 9,
                status: "Active",
                isActive: true
            },
            {
                id: 4,
                name: "Profitly weekly latest",
                description: "Lorem ipsum dolor sit amet, adipiscing elit.",
                image: "/assets/products/placeholder.png",
                category: "Technical",
                price: "₹ 100",
                duration: "1 month",
                articleCount: 9,
                status: "Active",
                isActive: true
            }
        ]
    },
    addProductForm: {
        categories: [
            "Technical",
            "Fundamental",
            "IPO",
            "Market News"
        ],
        durationUnits: [
            "Days",
            "Month",
            "Year"
        ]
    },
    promoCodes: [
        {
            id: 1,
            code: "WINTER2445",
            discount: 10,
            type: "Percentage",
            validUntil: "12/12/2025",
            isActive: true
        },
        {
            id: 2,
            code: "SUMMER2025",
            discount: 20,
            type: "Percentage",
            validUntil: "06/06/2025",
            isActive: true
        }
    ],
    promoCodeForm: {
        types: [
            "Percentage",
            "Fixed"
        ]
    }
};
