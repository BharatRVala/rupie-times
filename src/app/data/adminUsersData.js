export const adminUsersData = {
    pageHeader: {
        title: "User Management",
        subtitle: "Manage your user information",
        buttons: [
            {
                label: "Add User",
                icon: "plus.svg",
                action: "addUser",
                variant: "primary"
            },
            {
                label: "Export CSV",
                icon: "export.svg",
                action: "exportCsv",
                variant: "secondary"
            }
        ]
    },
    filterTabs: [
        { id: "active", label: "Active User", count: 10 },
        { id: "deleted", label: "Deleted User", count: 2 }
    ],
    searchPlaceholder: "Search here...",
    users: [
        {
            id: 1,
            firstName: "John",
            lastName: "Doe",
            userName: "John Doe",
            role: "User",
            email: "test@gmail.com",
            phone: "+910123456789",
            joinedDate: "06 / 11 / 2025",
            progress: 75,
            status: "active",
            subscribedProducts: [
                {
                    id: 1,
                    name: "Profitly weekly latest",
                    description: "Lorem ipsum dolor sit amet, adipiscing elit.",
                    image: "/assets/products/placeholder.png",
                    category: "Technical",
                    price: "₹ 100",
                    startDate: "10/12/2025",
                    endDate: "10/12/2025",
                    daysLeft: "30 days",
                    status: "Active"
                },
                {
                    id: 2,
                    name: "Profitly weekly latest",
                    description: "Lorem ipsum dolor sit amet, adipiscing elit.",
                    image: "/assets/products/placeholder.png",
                    category: "Technical",
                    price: "₹ 100",
                    startDate: "10/12/2025",
                    endDate: "10/12/2025",
                    daysLeft: "30 days",
                    status: "Expired"
                },
                {
                    id: 3,
                    name: "Profitly weekly latest",
                    description: "Lorem ipsum dolor sit amet, adipiscing elit.",
                    image: "/assets/products/placeholder.png",
                    category: "Technical",
                    price: "₹ 100",
                    startDate: "10/12/2025",
                    endDate: "10/12/2025",
                    daysLeft: "30 days",
                    status: "Active"
                }
            ]
        },
        {
            id: 2,
            firstName: "Alice",
            lastName: "Smith",
            userName: "Alice Smith",
            role: "User",
            email: "alice@gmail.com",
            phone: "+910987654321",
            joinedDate: "12 / 10 / 2025",
            progress: 45,
            status: "active",
            subscribedProducts: [
                {
                    id: 1,
                    name: "Profitly weekly latest",
                    description: "Lorem ipsum dolor sit amet, adipiscing elit.",
                    image: "/assets/products/placeholder.png",
                    category: "Technical",
                    price: "₹ 100",
                    startDate: "10/12/2025",
                    endDate: "10/12/2025",
                    daysLeft: "15 days",
                    status: "Active"
                }
            ]
        },
        {
            id: 3,
            firstName: "Bob",
            lastName: "Johnson",
            userName: "Bob Johnson",
            role: "User",
            email: "bob@gmail.com",
            phone: "+910112233445",
            joinedDate: "01 / 09 / 2025",
            progress: 90,
            status: "active",
            subscribedProducts: []
        },
        {
            id: 4,
            firstName: "Jane",
            lastName: "Doe",
            userName: "Jane Doe",
            role: "User",
            email: "jane@gmail.com",
            phone: "+910554433221",
            joinedDate: "20 / 08 / 2025",
            progress: 20,
            status: "deleted",
            subscribedProducts: []
        }
    ]
};
