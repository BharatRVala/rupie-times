export const dashboardData = {
    header: {
        welcomeMessage: "",
        buttons: [
            {
                icon: "star.svg",
                alt: "Favorites",
                action: "favorites",
                path: "/user-dashboard/archive"
            },
            {
                icon: "bell.svg",
                alt: "Notifications",
                action: "notifications",
                path: "/user-dashboard/notifications"
            }
        ],
        learningProgress: {
            percentage: 75,
            label: "Articles Learned",
            totalArticles: 20,
            completedArticles: 15
        }
    },
    summaryStats: [
        {
            id: 1,
            value: "15",
            label: "Total Subscribed Newsletters",
            icon: "products.svg"
        },
        {
            id: 2,
            value: "15",
            label: "Total Active Subscriptions",
            icon: "subscription.svg"
        },
        {
            id: 3,
            value: "15",
            label: "Total Orders",
            icon: "cart.svg"
        }
    ],
    subscribedProducts: {
        title: "Subscribed Newsletters",
        items: [
            {
                id: 1,
                name: "Product Name",
                description: "Lorem ipsum dolor sit amet, adipiscing elit. consectetur adipiscing elit.",
                startDate: "12 Nov 2025",
                endDate: "12 Nov 2025",
                status: "Active",
                isFavorite: true, // Star icon filled
                thumbnail: "" // Placeholder for now or use a generic image if available
            },
            {
                id: 2,
                name: "Product Name",
                description: "Lorem ipsum dolor sit amet, adipiscing elit. consectetur adipiscing elit.",
                startDate: "12 Nov 2025",
                endDate: "12 Nov 2025",
                status: "Active",
                isFavorite: true,
                thumbnail: ""
            }
        ],
        emptyState: {
            message: "There is no subscribed any news letter or something",
            icon: "products.svg" // Reuse products icon or find an empty box one
        }
    },
    notifications: {
        title: "Notification",
        items: []
    },
    createTicket: {
        text: "Submit a support ticket for assistance from our team.",
        buttonText: "Create Support",
        path: "/user-dashboard/support/create-ticket"
    },
    userProfile: {
        firstName: "John",
        lastName: "doe",
        fullName: "John doe",
        email: "test@gmail.com",
        mobile: "0123456789",
        status: "Active",
        dangerZone: {
            title: "Danger Zone",
            warning: "Once you delete your account, there is no going back. Please be certain.",
            buttonText: "Delete Account"
        }
    }
};
