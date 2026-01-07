export const supportData = {
    pageHeader: {
        title: "Support Tickets",
        subtitle: "Manage your support requests and inquiries",
        ctaButton: "Create Ticket"
    },
    header: {
        title: "Support"
    },
    createTicketForm: {
        title: "Create New Ticket",
        fields: {
            category: {
                label: "Category",
                options: ["General Inquiry", "Technical Support", "Billing", "Feature Request"]
            },
            priority: {
                label: "Priority",
                options: ["Low", "Medium", "High", "Urgent"]
            },
            subject: {
                label: "Subject",
                placeholder: "Brief summary of the issue"
            },
            message: {
                label: "Message",
                placeholder: "Describe your issue in detail..."
            }
        },
        buttons: {
            cancel: "Cancel",
            submit: "Create Ticket"
        }
    }
};
