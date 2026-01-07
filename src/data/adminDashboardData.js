import {
    Box,
    Users,
    ShoppingCart,
    FileText
} from 'lucide-react';
import { adminNotificationData } from '../app/data/adminNotificationData';
import { supportData } from '../app/data/supportData';

// Flatten notifications from sections for the dashboard view
const allNotifications = adminNotificationData.sections.flatMap(section => section.items).slice(0, 5); // Get latest 5

// Get latest 5 support tickets
const latestSupportTickets = supportData.tickets.slice(0, 5).map(ticket => ({
    id: ticket.id,
    title: ticket.subject,
    message: ticket.lastReply || "No message preview",
    time: ticket.date, // You might want to format this relative to now
    canReply: true,
    status: ticket.status,
    type: ticket.type
}));

export const adminDashboardData = {
    stats: [
        {
            id: 1,
            title: "Total Products",
            count: "15",
            icon: Box,
            bgColor: "bg-[#FDF4E7]",
            iconColor: "text-[#C0934B]"
        },
        {
            id: 2,
            title: "Total Users",
            count: "15",
            icon: Users,
            bgColor: "bg-[#FDF4E7]",
            iconColor: "text-[#C0934B]"
        },
        {
            id: 3,
            title: "Total Orders",
            count: "15",
            icon: ShoppingCart,
            bgColor: "bg-[#FDF4E7]",
            iconColor: "text-[#C0934B]"
        },
        {
            id: 4,
            title: "Total Articles",
            count: "15",
            icon: FileText,
            bgColor: "bg-[#FDF4E7]",
            iconColor: "text-[#C0934B]"
        }
    ],
    repeatCustomerData: {
        weekly: [
            { name: 'Sun', value: 20 },
            { name: 'Mon', value: 30 },
            { name: 'Tue', value: 35 },
            { name: 'Wed', value: 25 },
            { name: 'Thu', value: 40 },
            { name: 'Fri', value: 35 },
            { name: 'Sat', value: 35 },
        ],
        monthly: [
            { name: 'Week 1', value: 150 },
            { name: 'Week 2', value: 200 },
            { name: 'Week 3', value: 180 },
            { name: 'Week 4', value: 220 },
        ],
        sixMonthly: [
            { name: 'Jan', value: 800 },
            { name: 'Feb', value: 900 },
            { name: 'Mar', value: 850 },
            { name: 'Apr', value: 1000 },
            { name: 'May', value: 1100 },
            { name: 'Jun', value: 1050 },
        ],
        yearly: [
            { name: '2020', value: 5000 },
            { name: '2021', value: 6000 },
            { name: '2022', value: 5500 },
            { name: '2023', value: 7000 },
            { name: '2024', value: 8000 },
        ]
    },
    revenueData: {
        today: [
            { name: '10am', value: 50 },
            { name: '12pm', value: 120 },
            { name: '2pm', value: 80 },
            { name: '4pm', value: 200 },
            { name: '6pm', value: 150 },
        ],
        weekly: [
            { name: 'Sun', value: 1500 },
            { name: 'Mon', value: 3000 },
            { name: 'Tue', value: 2500 },
            { name: 'Wed', value: 4000 },
            { name: 'Thu', value: 3500 },
            { name: 'Fri', value: 5000 },
            { name: 'Sat', value: 4500 },
        ],
        monthly: [
            { name: 'Week 1', value: 12000 },
            { name: 'Week 2', value: 15000 },
            { name: 'Week 3', value: 11000 },
            { name: 'Week 4', value: 18000 },
        ],
        sixMonthly: [
            { name: 'Jan', value: 50000 },
            { name: 'Feb', value: 60000 },
            { name: 'Mar', value: 55000 },
            { name: 'Apr', value: 70000 },
            { name: 'May', value: 65000 },
            { name: 'Jun', value: 75000 },
        ],
        yearly: [
            { name: '2020', value: 500000 },
            { name: '2021', value: 600000 },
            { name: '2022', value: 550000 },
            { name: '2023', value: 700000 },
            { name: '2024', value: 800000 },
        ]
    },
    subscribedProductData: [
        { name: 'Active', value: 30, color: '#1E4032' },
        { name: 'Expiring soon', value: 8, color: '#C0934B' },
        { name: 'Expired', value: 8, color: '#A0AEC0' },
    ],
    notifications: allNotifications,
    supportTickets: latestSupportTickets
};
