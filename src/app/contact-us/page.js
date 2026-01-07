import ContactPage from "./ContactPage";
import fs from 'fs';
import path from 'path';

// Generate metadata dynamically from content.json (optional/advanced, or just static)
export const metadata = {
    title: "Contact Us | Rupie Times",
    description: "Get in touch with us.",
};

export default function Contact() {
    return (
        <div className="min-h-screen ">
            <ContactPage />
        </div>
    );
}
