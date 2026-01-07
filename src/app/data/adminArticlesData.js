export const adminArticlesData = {
    pageHeader: {
        title: "Articles",
    },
    searchPlaceholder: "Search here...",
    filterOptions: [
        { value: "all", label: "All Status" },
        { value: "active", label: "Active" },
        { value: "inactive", label: "Inactive" }
    ],
    addButtonText: "Create Article",
    articles: [
        {
            id: 1,
            icon: "sharp.svg",
            title: "Rupie Times Talk",
            subtitle: "Lorem ipsum dolor sit amet, consectetur adipiscing elit.Lorem ipsum dolor sit amet.",
            category: "Technical",
            author: "admin@rupietimes.com",
            uploadDate: "2025-11-04",
            status: "active",
            isActive: true
        },
        {
            id: 2,
            icon: "/assets/sharp.svg",
            title: "Rupie Times Talk",
            subtitle: "Lorem ipsum dolor sit amet, consectetur adipiscing elit.Lorem ipsum dolor sit amet.",
            category: "Technical",
            author: "admin@rupietimes.com",
            uploadDate: "2025-11-04",
            status: "active",
            isActive: true
        },
        {
            id: 3,
            icon: "/assets/sharp.svg",
            title: "Rupie Times Talk",
            subtitle: "Lorem ipsum dolor sit amet, consectetur adipiscing elit.Lorem ipsum dolor sit amet.",
            category: "Technical",
            author: "admin@rupietimes.com",
            uploadDate: "2025-11-04",
            status: "active",
            isActive: true
        },
        {
            id: 4,
            icon: "/assets/sharp.svg",
            title: "Rupie Times Talk",
            subtitle: "Lorem ipsum dolor sit amet, consectetur adipiscing elit.Lorem ipsum dolor sit amet.",
            category: "Technical",
            author: "admin@rupietimes.com",
            uploadDate: "2025-11-04",
            status: "active",
            isActive: true
        },
        {
            id: 5,
            icon: "/assets/sharp.svg",
            title: "Rupie Times Talk",
            subtitle: "Lorem ipsum dolor sit amet, consectetur adipiscing elit.Lorem ipsum dolor sit amet.",
            category: "Technical",
            author: "admin@rupietimes.com",
            uploadDate: "2025-11-04",
            status: "active",
            isActive: true
        },
        {
            id: 6,
            icon: "/assets/sharp.svg",
            title: "Market Analysis Report",
            subtitle: "Comprehensive analysis of current market trends and future predictions.",
            category: "Finance",
            author: "editor@rupietimes.com",
            uploadDate: "2025-11-03",
            status: "inactive",
            isActive: false,
            priority: "High"
        },
        {
            id: 7,
            icon: "/assets/sharp.svg",
            title: "Investment Strategies",
            subtitle: "Expert insights on modern investment approaches for beginners.",
            category: "Investment",
            author: "admin@rupietimes.com",
            uploadDate: "2025-11-02",
            status: "active",
            isActive: true,
            priority: "Highly Recommended"
        },
        {
            id: 8,
            icon: "/assets/sharp.svg",
            title: "Cryptocurrency Guide",
            subtitle: "Understanding the basics of cryptocurrency and blockchain technology.",
            category: "Technology",
            author: "tech@rupietimes.com",
            uploadDate: "2025-11-01",
            status: "inactive",
            isActive: false,
            priority: "Normal"
        }
    ],
    modalConfig: {
        add: {
            title: "Add Article",
            submitButton: "Add Article"
        },
        edit: {
            title: "Edit Article",
            submitButton: "Update Article"
        }
    }
};
