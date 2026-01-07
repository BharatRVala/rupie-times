export const adminAdvertisementsData = {
    pageHeader: {
        title: "Advertisement Management",
        subtitle: "Manage your advertisement"
    },
    searchPlaceholder: "Search here...",
    filterOptions: [
        { value: "all", label: "All Status" },
        { value: "active", label: "Active" },
        { value: "inactive", label: "Inactive" }
    ],
    addButtonText: "Add Advertisement",
    advertisements: [
        {
            id: 1,
            image: "/assets/ad-placeholder.jpg",
            name: "advertisement name",
            position: "Left",
            details: {
                image: "lenkart-hero-banner.jpg",
                link: "https://www.lenkart.com"
            },
            ctr: 18,
            status: "active",
            isActive: true
        },
        {
            id: 2,
            image: "/assets/ad-placeholder.jpg",
            name: "advertisement name",
            position: "Left",
            details: {
                image: "lenkart-hero-banner.jpg",
                link: "https://www.lenkart.com"
            },
            ctr: 18,
            status: "active",
            isActive: true
        },
        {
            id: 3,
            image: "/assets/ad-placeholder.jpg",
            name: "advertisement name",
            position: "Left",
            details: {
                image: "lenkart-hero-banner.jpg",
                link: "https://www.lenkart.com"
            },
            ctr: 18,
            status: "active",
            isActive: true
        },
        {
            id: 4,
            image: "/assets/ad-placeholder.jpg",
            name: "advertisement name",
            position: "Left",
            details: {
                image: "lenkart-hero-banner.jpg",
                link: "https://www.lenkart.com"
            },
            ctr: 18,
            status: "active",
            isActive: true
        },
        {
            id: 5,
            image: "/assets/ad-placeholder.jpg",
            name: "Summer Sale Banner",
            position: "Top",
            details: {
                image: "summer-sale-banner.jpg",
                link: "https://www.example.com/sale"
            },
            ctr: 25,
            status: "inactive",
            isActive: false
        },
        {
            id: 6,
            image: "/assets/ad-placeholder.jpg",
            name: "Product Showcase",
            position: "Right",
            details: {
                image: "product-showcase.jpg",
                link: "https://www.example.com/products"
            },
            ctr: 32,
            status: "active",
            isActive: true
        },
        {
            id: 7,
            image: "/assets/ad-placeholder.jpg",
            name: "Center Hero Ad",
            position: "Center",
            details: {
                image: "hero-center-ad.jpg",
                link: "https://www.example.com/hero"
            },
            ctr: 45,
            status: "active",
            isActive: true
        },
        {
            id: 8,
            image: "/assets/ad-placeholder.jpg",
            name: "Footer Banner",
            position: "Left",
            details: {
                image: "footer-banner.jpg",
                link: "https://www.example.com/footer"
            },
            ctr: 12,
            status: "inactive",
            isActive: false
        }
    ],
    modalConfig: {
        add: {
            title: "Add Advertisement",
            submitButton: "Add Advertisement"
        },
        edit: {
            title: "Edit Advertisement",
            submitButton: "Update Advertisement"
        }
    }
};
