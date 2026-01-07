export const newsData = {
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
        title: "News"
    },
    newsList: [
        {
            id: 1,
            title: "Global Market Update: Shifts in Asian Economy",
            description: "A deep dive into the recent economic shifts in Asian markets and what it means for global investors.",
            author: "admin@rupietimes.com",
            publisher: "Rupie Times Team",
            date: "November 4, 2025",
            category: "Technical",
            readMoreText: "Read More",
            thumbnail: "https://picsum.photos/800/400?random=1",
            priority: 1,
            sections: [
                {
                    type: "text_image",
                    content: {
                        text: "The Asian markets have shown remarkable resilience in the face of global inflationary pressures. Key indices in Tokyo, Hong Kong, and Mumbai have rallied, driven by strong tech sector performance and renewed foreign investment. Analysts suggest that this trend might continue well into the next quarter, provided that geopolitical stability is maintained.",
                        image: "https://picsum.photos/800/400?random=11"
                    }
                },
                {
                    type: "custom_list",
                    content: {
                        items: [
                            "Tech sector leads the rally across major Asian indices.",
                            "Foreign direct investment (FDI) sees a 15% quarter-over-quarter increase.",
                            "Inflation rates stabilize in key economies like Japan and India."
                        ]
                    }
                }
            ],
            footer: {
                authors: [{ name: "Rupie Times Team", url: "#" }],
                signup: { text: "Stay updated with our daily newsletter.", linkText: "Subscribe", url: "#" },
                copyright: "© 2025 RUPIE TIMES All rights reserved."
            }
        },
        {
            id: 2,
            title: "Tech Giants Announce New AI Initiatives",
            description: "Major technology companies unveil their roadmaps for Artificial Intelligence integration in consumer products.",
            author: "admin@rupietimes.com",
            publisher: "Tech Desk",
            date: "November 5, 2025",
            category: "Technology",
            readMoreText: "Read More",
            thumbnail: "https://picsum.photos/800/400?random=2",
            priority: 0,
            sections: [
                {
                    type: "text_image",
                    content: {
                        text: "In a coordinated series of announcements, leading tech firms have outlined their vision for the next generation of AI. From personalized assistants that predict your needs to autonomous coding agents, the future looks automated. However, privacy concerns remain a significant hurdle that these companies must address to win consumer trust.",
                        image: "https://picsum.photos/800/400?random=12"
                    }
                }
            ],
            footer: {
                authors: [{ name: "Tech Desk", url: "#" }],
                signup: { text: "Get the latest tech news.", linkText: "Join Now", url: "#" },
                copyright: "© 2025 RUPIE TIMES All rights reserved."
            }
        },
        {
            id: 3,
            title: "Crypto Regulation: What to Expect in 2026",
            description: "Governments worldwide are preparing a new framework for cryptocurrency regulation. Here is what you need to know.",
            author: "admin@rupietimes.com",
            publisher: "Crypto Analyst",
            date: "November 6, 2025",
            category: "Finance",
            readMoreText: "Read More",
            thumbnail: "https://picsum.photos/800/400?random=3",
            priority: 0,
            sections: [
                {
                    type: "text_image",
                    content: {
                        text: "Regulatory clarity has been a long-standing demand of the crypto industry. The upcoming framework aims to balance innovation with financial stability. Key proposals include clearer definitions of utility tokens versus securities and stricter KYC norms for exchanges.",
                        image: null
                    }
                },
                {
                    type: "table",
                    title: "Proposed Tax Slabs",
                    content: {
                        headers: ["Asset Class", "Holding Period", "Tax Rate"],
                        rows: [
                            ["Bitcoin/Ether", "< 1 Year", "30%"],
                            ["Bitcoin/Ether", "> 1 Year", "15%"],
                            ["Stablecoins", "Any", "Income Tax Slab"]
                        ]
                    }
                }
            ],
            footer: {
                authors: [{ name: "Crypto Analyst", url: "#" }],
                signup: { text: "Crypto insights delivered.", linkText: "Sign Up", url: "#" },
                copyright: "© 2025 RUPIE TIMES All rights reserved."
            }
        },
        {
            id: 4,
            title: "Sustainable Energy: The Green Revolution",
            description: "Solar and wind energy projects are outpacing fossil fuel investments for the first time in history.",
            author: "admin@rupietimes.com",
            publisher: "Green Earth",
            date: "November 7, 2025",
            category: "Environment",
            readMoreText: "Read More",
            thumbnail: "https://picsum.photos/800/400?random=4",
            priority: 0,
            sections: [
                {
                    type: "text_image",
                    content: {
                        text: "The transition to renewable energy is accelerating. Investment in solar farms has doubled in the last year alone. Policy incentives and falling costs of photovoltaic cells are driving this change.",
                        image: "https://picsum.photos/800/400?random=14"
                    }
                }
            ],
            footer: {
                authors: [{ name: "Green Earth", url: "#" }],
                signup: { text: "Join the green movement.", linkText: "Subscribe", url: "#" },
                copyright: "© 2025 RUPIE TIMES All rights reserved."
            }
        },
        {
            id: 5,
            title: "Startup Ecosystem: Funding Winter Thaws",
            description: "Venture Capitalists are opening their wallets again, but with stricter due diligence.",
            author: "admin@rupietimes.com",
            publisher: "Startup Insider",
            date: "November 8, 2025",
            category: "Business",
            readMoreText: "Read More",
            thumbnail: "https://picsum.photos/800/400?random=5",
            priority: 0,
            sections: [
                {
                    type: "custom_list",
                    content: {
                        items: [
                            "Series A funding rounds see a 20% uptick.",
                            "Focus shifts from 'growth at all costs' to 'sustainable profitability'.",
                            "AI and CleanTech are the hottest sectors for investment."
                        ]
                    }
                }
            ],
            footer: {
                authors: [{ name: "Startup Insider", url: "#" }],
                signup: { text: "Startup news daily.", linkText: "Subscribe", url: "#" },
                copyright: "© 2025 RUPIE TIMES All rights reserved."
            }
        }
    ]
};
