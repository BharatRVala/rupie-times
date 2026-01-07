export const notificationData = {
    header: {
        welcomeMessage: "Hello John",
        buttons: [
            {
                icon: "star.svg",
                alt: "Favorites",
                action: "favorites"
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
    pageHeader: {
        title: "Notification"
    },
    sections: [
        {
            title: "Today",
            items: [
                {
                    id: 1,
                    title: "Subscription Expired",
                    description: 'Your product "rupie talks" has expired. Renew to regain the access.',
                    time: "2h Ago",
                    type: "expired" // Icons: red circle X
                },
                {
                    id: 2,
                    title: "Subscription Active",
                    description: 'Your product "rupie talks" has active now. you can start reading your articles.',
                    time: "4h Ago",
                    type: "success" // Icons: green circle check
                },
                {
                    id: 3,
                    title: "New Farm Added Successfully",
                    description: 'Your new farm has been added successfully',
                    time: "23h Ago",
                    type: "info" // Icons: blue chat bubble
                }
            ]
        },
        {
            title: "Yesterday",
            items: [
                {
                    id: 4,
                    title: "Subscription Expiring Soon",
                    description: 'Your "rupie talks" subscription is expiring in 1 day. Renew now to continue access.',
                    time: "4:40pm , 10 Nov 2025",
                    type: "warning" // Icons: yellow triangle warning
                }
            ]
        }
    ]
};
