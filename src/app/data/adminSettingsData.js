export const adminSettingsData = {
    pageHeader: {
        title: "Settings",
        subTitle: "Customize until to match your workflows",
        publishButton: "Publish"
    },
    tabs: [
        { id: "general", label: "General" },
        { id: "header", label: "Header" },
        { id: "footer", label: "Footer" }
    ],
    generalTab: {
        title: "General Information",
        sections: [
            {
                id: "logo",
                label: "Website logo",
                type: "file-upload",
                uploadText: "Drop here to attach or upload"
            },
            {
                id: "favicon",
                label: "Favicon",
                type: "file-upload",
                uploadText: "Drop here to attach or upload"
            }
        ],
        footerButtons: {
            cancel: "Cancle",
            save: "Save"
        }
    },
    headerTab: {
        title: "Header Information",
        subTitle: "You can change name of navigation menu of header",
        fields: [
            {
                label: "Rupie Talk",
                name: "rupieTalk",
                placeholder: "Rupie Talk",
                defaultValue: "Rupie Talk"
            },
            {
                label: "Advertise With Us",
                name: "advertise",
                placeholder: "Advertise With Us",
                defaultValue: "Advertise With Us"
            },
            {
                label: "Our Products",
                name: "products",
                placeholder: "Our Products",
                defaultValue: "Our Products"
            },
            {
                label: "About Us",
                name: "about",
                placeholder: "About Us",
                defaultValue: "About Us"
            },
            {
                label: "Contact Us",
                name: "contact",
                placeholder: "Contact Us",
                defaultValue: "Contact Us"
            }
        ],
        footerButtons: {
            cancel: "Cancle",
            save: "Save"
        }
    },
    footerTab: {
        title: "Footer Information",
        subTitle: "You can change name of navigation menu of Footer",
        fields: [
            {
                label: "Disclaimer",
                name: "disclaimer",
                placeholder: "Disclaimer",
                defaultValue: "Disclaimer"
            },
            {
                label: "Carrers",
                name: "careers",
                placeholder: "Carrers",
                defaultValue: "Carrers"
            },
            {
                label: "FAQs",
                name: "faqs",
                placeholder: "FAQs",
                defaultValue: "FAQs"
            },
            {
                label: "Privacy Policy",
                name: "privacy",
                placeholder: "Privacy Policy",
                defaultValue: "Privacy Policy"
            },
            {
                label: "Term & Conditions",
                name: "terms",
                placeholder: "Term & Conditions",
                defaultValue: "Term & Conditions"
            }
        ],
        contactInfo: {
            title: "Contact Information",
            fields: [
                {
                    label: "Address",
                    name: "address",
                    placeholder: "Address",
                    defaultValue: "Madhu Vihar, Ground Floor, Office No. 4 MG Road Kandivali West; 400067"
                },
                {
                    label: "Contact Number",
                    name: "contactNumber",
                    placeholder: "Contact Number",
                    defaultValue: "1234567890"
                },
                {
                    label: "Email Address",
                    name: "email",
                    placeholder: "Email Address",
                    defaultValue: "test.support@gmail.com"
                }
            ]
        },
        footerButtons: {
            cancel: "Cancle",
            save: "Save"
        }
    }
};
