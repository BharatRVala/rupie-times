import { FaFacebookF, FaYoutube, FaInstagram, FaTwitter } from 'react-icons/fa';

export const footerData = {
    socials: [
        { name: "Facebook", icon: FaFacebookF, link: "#" },
        { name: "Youtube", icon: FaYoutube, link: "#" },
        { name: "Instagram", icon: FaInstagram, link: "#" },
        { name: "Twitter", icon: FaTwitter, link: "#" },
    ],
    company: {
        title: "Company",
        links: [
            { text: "Advertise With Us", href: "/advertisewithus" },
            { text: "Disclaimer", href: "/disclaimer" },
            { text: "About Us", href: "/about" },
            { text: "Careers", href: "/careers" },
        ]
    },
    support: {
        title: "Support",
        links: [
            { text: "FAQs", href: "/faqs" },
            { text: "Contact Us", href: "/contact-us" },
            { text: "Privacy Policy", href: "/privacy-policy" },
            { text: "Term & Condition", href: "/terms" },
        ]
    },
    contact: {
        title: "Contact Us",
        info: {
            address: "Madhu Vihar, Ground Floor, Office No. 4 MG Road Kandivali West; 400067",
            phone: "+911234567890",
            email: "test.support@gmail.com"
        }
    },
    copyright: {
        year: "2025",
        brand: "RUPIE TIMES",
        bgText: "Aghori"
    }
};
