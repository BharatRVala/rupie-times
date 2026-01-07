import mongoose from 'mongoose';

const SiteSettingsSchema = new mongoose.Schema({
    general: {
        logo: {
            type: String,
            default: '' // Legacy/Fallback
        },
        headerLogo: {
            type: String,
            default: ''
        },
        footerLogo: {
            type: String,
            default: ''
        },
        favicon: {
            type: String,
            default: '' // URL or path to favicon
        }
    },
    header: {
        menuItems: [{
            label: { type: String, required: true },
            link: { type: String, required: true },
            isActive: { type: Boolean, default: true }
        }]
    },
    footer: {
        disclaimer: {
            type: String,
            default: ''
        },
        section1: {
            title: { type: String, default: 'Company' },
            links: [{
                label: { type: String },
                link: { type: String }
            }]
        },
        section2: {
            title: { type: String, default: 'Resources' },
            links: [{
                label: { type: String },
                link: { type: String }
            }]
        },
        contactInfo: {
            address: { type: String, default: '' },
            phone: { type: String, default: '' },
            email: { type: String, default: '' }
        },
        socialLinks: [{
            platform: { type: String }, // e.g., 'facebook', 'twitter'
            url: { type: String }
        }]
    }
}, {
    timestamps: true
});

// Helper to ensure only one document exists (singleton pattern via logic, or just by convention)
// We will typically access this via findOne()
// Default Menu Items
const DEFAULT_MENU_ITEMS = [
    { label: "Rupie Talk", link: "/rupiesTimeTalk", isActive: true },
    { label: "Advertise With US", link: "/advertisewithus", isActive: true },
    { label: "Our Products", link: "/products", isActive: true },
    { label: "About Us", link: "/about", isActive: true },
    { label: "Contact Us", link: "/contact-us", isActive: true },
];

const DEFAULT_FOOTER_DATA = {
    section1: {
        title: "Company",
        links: [
            { label: "Advertise With Us", link: "/advertisewithus" },
            { label: "Disclaimer", link: "/disclaimer" },
            { label: "About Us", link: "/about" },
            { label: "Careers", link: "/careers" }
        ]
    },
    section2: {
        title: "Support",
        links: [
            { label: "FAQs", link: "/faqs" },
            { label: "Contact Us", link: "/contact-us" },
            { label: "Privacy Policy", link: "/privacy-policy" },
            { label: "Term & Condition", link: "/terms" }
        ]
    },
    contactInfo: {
        address: "Madhu Vihar, Ground Floor, Office No. 4 MG Road Kandivali West; 400067",
        phone: "+911234567890",
        email: "test.support@gmail.com"
    }
};

SiteSettingsSchema.statics.getSettings = async function () {
    let settings = await this.findOne();

    if (!settings) {
        settings = await this.create({
            general: {},
            header: { menuItems: DEFAULT_MENU_ITEMS },
            footer: DEFAULT_FOOTER_DATA
        });
    } else {
        // Backfill checks
        let updated = false;
        if (!settings.header?.menuItems || settings.header.menuItems.length === 0) {
            settings.header = { ...settings.header, menuItems: DEFAULT_MENU_ITEMS };
            updated = true;
        }
        // Backfill Footer if empty (checks distinct parts)
        if (!settings.footer?.contactInfo?.address) {
            settings.footer = { ...settings.footer, ...DEFAULT_FOOTER_DATA };
            updated = true;
        }

        if (updated) await settings.save();
    }

    return settings;
};

export default mongoose.models.SiteSettings || mongoose.model('SiteSettings', SiteSettingsSchema);
