export const adminNotificationData = {
    pageHeader: {
        title: "Notification",
        addButton: {
            text: "+ Add Notification",
            path: "/admin-dashboard/notifications/create"
        }
    },
    sections: [
        {
            title: "Today",
            items: [
                {
                    id: 1,
                    title: "Subscription Expired",
                    description: 'Your product "rupie talks "has expired. Renew to regain the access.',
                    time: "2h Ago",
                    type: "expired"
                },
                {
                    id: 2,
                    title: "Subscription Active",
                    description: 'Your product " rupie talks " has active now . you can start reading your articles.',
                    time: "4h Ago",
                    type: "success"
                },
                {
                    id: 3,
                    title: "New Farm Added Successfully",
                    description: 'Your new farm has been added successfully',
                    time: "23h Ago",
                    type: "info"
                }
            ]
        },
        {
            title: "Yesterday",
            items: [
                {
                    id: 4,
                    title: "Subscription Expiring Soon",
                    description: 'Your " rupie talks " subscription is expiring in 1 day. Renew now to continue access.',
                    time: "4:40pm , 10 Nov 2025",
                    type: "warning"
                }
            ]
        }
    ],
    createPage: {
        title: "Add Notification",
        subTitle: "You can add send the notification.",
        backButtonText: "Back To Notification",
        cardTitle: "New notification",
        form: {
            heading: {
                label: "Notification Heading",
                placeholder: "Enter notification heading ....",
                name: "heading"
            },
            description: {
                label: "Notifcation Description",
                placeholder: "Enter notification description ....",
                name: "description"
            },
            audience: {
                label: "Select Users", // In screenshot it's inside the dropdown or just implied? Screenshot shows dropdown with placeholder "Select Users"
                placeholder: "Select Users",
                options: [
                    { value: "general", label: "General" },
                    { value: "active", label: "Active" },
                    { value: "expired", label: "Expired" }
                ]
            },
            submitButton: "Send Notification"
        }
    }
};
