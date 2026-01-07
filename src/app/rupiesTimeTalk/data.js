import sharpIcon from "../assets/sharp.svg";

export const ARTICLES_DATA = [
    {
        id: 1,
        title: "Rupie Times Talk And Nefty Bank",
        date: "Nov 4, 2025",
        description: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed Ut Perspiciatis Unde Omnis Iste Natus Error Sit Voluptatem Accusantium Doloremque Laudantium.",
        category: "Technical",
        author: "admin@rupietimes.com",
        publisher: "Lucy Brewster",
        sectionCount: "3 section",
        link: "/rupiesTimeTalk/1",
        thumbnail: "https://placehold.co/800x400/e2e8f0/1e293b?text=Main+Article+Image",
        sections: [
            {
                type: "text_image",
                content: {
                    text: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed Ut Perspiciatis Unde Omnis Iste Natus Error Sit Voluptatem Accusantium Doloremque Laudantium. Quis Autem Vel Eum Iure Reprehenderit Qui In Ea Voluptate Velit Esse Quam Nihil Molestiae. Consequatur.Lorem Ipsum Dolor Sit Amet, Consectetur Adipiscing Elit. Sed Ut Perspiciatis Unde Omnis Iste Natus Error Sit Voluptatem Accusantium Doloremque Laudantium. Quis Autem Vel Eum Iure Reprehenderit Qui In Ea Voluptate Velit Esse Quam Nihil Molestiae Consequatur.Lorem Ipsum Dolor Sit Amet, Consectetur Adipiscing Elit. Sed Ut Perspiciatis Unde Omnis Iste Natus Error Sit Voluptatem Accusantium Doloremque Laudantium. Quis Autem Vel Eum Iure Reprehenderit Qui In Ea Voluptate Velit Esse Quam Nihil Molestiae",
                    image: "https://placehold.co/800x400/e2e8f0/1e293b?text=Section+Image"
                }
            },
            {
                type: "custom_list",
                content: {
                    items: [
                        "Consequatur.Lorem Ipsum Dolor Sit Amet, Consectetur Adipiscing Elit. Sed Ut",
                        "Consequatur.Lorem Ipsum Dolor Sit Amet, Consectetur Adipiscing Elit. Sed Ut",
                        "Consequatur.Lorem Ipsum Dolor Sit Amet, Consectetur Adipiscing Elit. Sed Ut"
                    ]
                }
            },
            {
                type: "table",
                title: "Rupie Times Talk",
                content: {
                    headers: ["Company Name", "Opening Date", "Closing Date", "Issue Price"],
                    rows: [
                        ["Lenskart Solutions Ltd.", "Oct 31, 2025", "Oct 31, 2025", "₹382 to ₹402 per share"],
                        ["Lenskart Solutions Ltd.", "Oct 31, 2025", "Oct 31, 2025", "₹382 to ₹402 per share"],
                        ["Lenskart Solutions Ltd.", "Oct 31, 2025", "Oct 31, 2025", "₹382 to ₹402 per share"],
                        ["Lenskart Solutions Ltd.", "Oct 31, 2025", "Oct 31, 2025", "₹382 to ₹402 per share"],
                        ["Lenskart Solutions Ltd.", "Oct 31, 2025", "Oct 31, 2025", "₹382 to ₹402 per share"]
                    ]
                }
            }
        ],
        footer: {
            authors: [
                { name: "Lucy Brewster", url: "#" },
                { name: "Sissy Yan", url: "#" },
                { name: "Mark Reeth", url: "#" }
            ],
            signup: {
                text: "Was This Email Forwarded To You? Sign Up",
                linkText: "Here",
                url: "#"
            },
            copyright: "© 2025 RUPIE TIMES All rights reserved."
        }
    },
    {
        id: 2,
        title: "Market Analysis 2025",
        date: "Nov 5, 2025",
        description: "Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam.",
        category: "Financial",
        author: "editor@rupietimes.com",
        publisher: "Mark Reeth",
        sectionCount: "5 section",
        link: "/rupiesTimeTalk/2",
        thumbnail: "https://placehold.co/800x400/e2e8f0/1e293b?text=Market+Analysis",
        sections: [
            {
                type: "text_image",
                content: {
                    text: "Detailed market analysis content goes here...",
                    image: "https://placehold.co/800x400/e2e8f0/1e293b?text=Analysis+Chart"
                }
            }
        ],
        footer: {
            authors: [
                { name: "Lucy Brewster", url: "#" },
                { name: "Sissy Yan", url: "#" },
                { name: "Mark Reeth", url: "#" }
            ],
            signup: {
                text: "Was This Email Forwarded To You? Sign Up",
                linkText: "Here",
                url: "#"
            },
            copyright: "© 2025 RUPIE TIMES All rights reserved."
        }
    },
    {
        id: 3,
        title: "Crypto Trends",
        date: "Nov 6, 2025",
        description: "Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.",
        category: "Crypto",
        author: "analyst@rupietimes.com",
        publisher: "Sissy Yan",
        sectionCount: "2 section",
        link: "/rupiesTimeTalk/3",
        thumbnail: "https://placehold.co/800x400/e2e8f0/1e293b?text=Crypto+Trends",
        sections: [],
        footer: {
            authors: [
                { name: "Lucy Brewster", url: "#" },
                { name: "Sissy Yan", url: "#" },
                { name: "Mark Reeth", url: "#" }
            ],
            signup: {
                text: "Was This Email Forwarded To You? Sign Up",
                linkText: "Here",
                url: "#"
            },
            copyright: "© 2025 RUPIE TIMES All rights reserved."
        }
    },
    {
        id: 4,
        title: "Stock Market Updates",
        date: "Nov 7, 2025",
        description: "Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.",
        category: "Stocks",
        author: "trader@rupietimes.com",
        publisher: "John Doe",
        sectionCount: "4 section",
        link: "/rupiesTimeTalk/4",
        thumbnail: "https://placehold.co/800x400/e2e8f0/1e293b?text=Stock+Updates",
        sections: [],
        footer: {
            authors: [
                { name: "Lucy Brewster", url: "#" },
                { name: "Sissy Yan", url: "#" },
                { name: "Mark Reeth", url: "#" }
            ],
            signup: {
                text: "Was This Email Forwarded To You? Sign Up",
                linkText: "Here",
                url: "#"
            },
            copyright: "© 2025 RUPIE TIMES All rights reserved."
        }
    },
    {
        id: 5,
        title: "Global Economy Outlook",
        date: "Nov 8, 2025",
        description: "Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores.",
        category: "Economy",
        author: "expert@rupietimes.com",
        publisher: "Jane Smith",
        sectionCount: "6 section",
        link: "/rupiesTimeTalk/5",
        thumbnail: "https://placehold.co/800x400/e2e8f0/1e293b?text=Global+Economy",
        sections: [],
        footer: {
            authors: [
                { name: "Lucy Brewster", url: "#" },
                { name: "Sissy Yan", url: "#" },
                { name: "Mark Reeth", url: "#" }
            ],
            signup: {
                text: "Was This Email Forwarded To You? Sign Up",
                linkText: "Here",
                url: "#"
            },
            copyright: "© 2025 RUPIE TIMES All rights reserved."
        }
    },
    {
        id: 6,
        title: "Tech Innovations",
        date: "Nov 9, 2025",
        description: "Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit.",
        category: "Technology",
        author: "tech@rupietimes.com",
        publisher: "Alan Turing",
        sectionCount: "3 section",
        link: "/rupiesTimeTalk/6",
        thumbnail: "https://placehold.co/800x400/e2e8f0/1e293b?text=Tech+Innovations",
        sections: [],
        footer: {
            authors: [
                { name: "Lucy Brewster", url: "#" },
                { name: "Sissy Yan", url: "#" },
                { name: "Mark Reeth", url: "#" }
            ],
            signup: {
                text: "Was This Email Forwarded To You? Sign Up",
                linkText: "Here",
                url: "#"
            },
            copyright: "© 2025 RUPIE TIMES All rights reserved."
        }
    }
];
