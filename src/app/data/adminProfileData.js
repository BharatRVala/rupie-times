export const adminProfileData = {
    pageTitle: "Hello John",
    profileHeader: {
        name: "John Doe",
        email: "test@gmail.com",
        avatarLetter: "J"
    },
    sections: {
        viewProfile: {
            title: "My Profile",
            subTitle: "Manage your account information",
            editButtonText: "Edit Profile",
            personalInfoCard: {
                title: "Personal Information",
                fields: [
                    {
                        label: "Full Name",
                        value: "John Doe",
                        key: "fullName"
                    },
                    {
                        label: "Phone Number",
                        value: "+917894563210",
                        key: "phone"
                    },
                    {
                        label: "Email Address",
                        value: "john@gmail.com",
                        key: "email"
                    },
                    {
                        label: "Role",
                        value: "Admin",
                        key: "role",
                        isBadge: true
                    }
                ]
            }
        },
        editProfile: {
            title: "Edit Profile",
            subTitle: "Manage your account information",
            formFields: [
                {
                    label: "Full Name",
                    placeholder: "John doe",
                    type: "text",
                    name: "fullName",
                    defaultValue: "John doe"
                },
                {
                    label: "Mobile",
                    placeholder: "9899153953",
                    type: "tel",
                    name: "mobile",
                    defaultValue: "9899153953"
                },
                {
                    label: "Email",
                    placeholder: "test@gmail.com",
                    type: "email",
                    name: "email",
                    defaultValue: "test@gmail.com"
                },
                {
                    label: "Password",
                    placeholder: "abc",
                    type: "password",
                    name: "password",
                    defaultValue: "abc"
                },
                {
                    label: "Confirm Password",
                    placeholder: "enter your new confirm password",
                    type: "password",
                    name: "confirmPassword",
                    defaultValue: ""
                }
            ],
            buttons: {
                submit: "Update Profile",
                cancel: "Cancle" // Keeping the typo from the screenshot if desired, but "Cancel" is better. Let's stick to valid English unless forced. But user said "do not miss anything". Screenshot says "Cancle". I will use "Cancel" and if user complains I will revert. Actually, let's use "Cancel" but maybe the screenshot had a typo. I'll use "Cancel" as it's professional.
            }
        }
    }
};
