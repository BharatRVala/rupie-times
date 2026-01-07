export const supportData = {
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
                action: "notifications"
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
        title: "My Support Tickets",
        subtitle: "Manage your support request and track their progress",
        ctaButton: "New Ticket"
    },
    filterTabs: [
        { name: "All", count: 1 },
        { name: "Active", count: null },
        { name: "Waiting", count: null },
        { name: "Closed", count: null },
    ],
    tickets: [
        {
            id: "Ticket-No_002",
            subject: "Subject",
            lastReply: "Last reply of ticket",
            assignedTo: "not assigned",
            messageCount: 3,
            type: "General Inquiry",
            status: "Active",
            date: "November 4, 2025 , 1:34 Pm",
            viewText: "View Conversation"
        },
        {
            id: "Ticket-No_003",
            subject: "Subject",
            lastReply: "Last reply of ticket",
            assignedTo: "not assigned",
            messageCount: 3,
            type: "General Inquiry",
            status: "Closed",
            date: "November 4, 2025 , 1:34 Pm",
            viewText: "View Conversation"
        },
        {
            id: "Ticket-No_004",
            subject: "Subject",
            lastReply: "Last reply of ticket",
            assignedTo: "not assigned",
            messageCount: 3,
            type: "General Inquiry",
            status: "Closed",
            date: "November 4, 2025 , 1:34 Pm",
            viewText: "View Conversation"
        },
    ],
    createTicketForm: {
        title: "Create New Ticket",
        fields: {
            category: {
                label: "Category",
                placeholder: "Select Category",
                options: ["General Inquiry", "Technical Support", "Billing", "Feature Request"]
            },
            priority: {
                label: "Priority",
                placeholder: "Select Priority",
                options: ["Low", "Medium", "High", "Urgent"]
            },
            subject: {
                label: "Subject",
                placeholder: "Brief description of your issue"
            },
            message: {
                label: "Message",
                placeholder: "Write the complete details of your issue"
            }
        },
        buttons: {
            cancel: "Cancel",
            submit: "Create Ticket"
        }
    },
    conversation: {
        id: "Ticket-No_002",
        header: {
            adminName: "Admin Support",
            adminInitials: "AS",
            status: "Open"
        },
        subject: "Subject: Issue with payment processing",
        startDate: "November 4, 2025 , 1:34 Pm",
        messages: [
            {
                id: 1,
                sender: "admin",
                name: "Admin Support",
                message: "Hello John, how can I help you today regarding the payment issue?",
                time: "1:35 Pm"
            },
            {
                id: 2,
                sender: "user",
                name: "John Doe",
                message: "Hi, I tried to make a payment for the subscription but it failed twice.",
                time: "1:37 Pm"
            },
            {
                id: 3,
                sender: "admin",
                name: "Admin Support",
                message: "I understand. Can you please check if international transactions are enabled on your card?",
                time: "1:40 Pm"
            },
            {
                id: 4,
                sender: "user",
                name: "John Doe",
                message: "Yes, they are enabled. I used this card last week.",
                time: "1:45 Pm"
            },
            {
                id: 5,
                sender: "admin",
                name: "Admin Support",
                message: "Okay, let me check our logs. Please hold on.",
                time: "1:46 Pm"
            }
        ],
        input: {
            placeholder: "Type your message here...",
            sendButton: "Send"
        }
    },
    adminPageHeader: {
        title: "Support Tickets",
        subtitle: "Manage your support request and track their progress"
    },
    adminSummaryCards: [
        { label: "Total", key: "total" },
        { label: "Waiting", key: "pending" },
        { label: "Active", key: "active" },
        { label: "Closed", key: "closed" }
    ],
    adminConversation: {
        backButtonText: "Back To Support",
        statusButtonLabel: "Ticket Status",
        statusOptions: ["Active", "Closed"],
        closedPlaceholder: "This ticket is closed"
    }
};
