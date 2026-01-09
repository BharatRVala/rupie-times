"use server";

import { sendEmail as sendEmailUtility, generateEmailTemplate, SOCIAL_ATTACHMENTS } from "@/app/lib/utils/resend";

export async function sendEmail(formData) {
    const name = formData.get("fullName");
    const email = formData.get("email");
    const number = formData.get("number");
    const subject = formData.get("subject");
    const message = formData.get("message");

    const content = `
      <h2 style="color: #00301F; margin-bottom: 20px;">New Contact Message</h2>
      <p><strong>Name:</strong> ${name}</p>
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Phone:</strong> ${number || 'Not provided'}</p>
      <p><strong>Subject:</strong> ${subject}</p>
      <hr style="border-top: 1px solid #eee; margin: 20px 0;" />
      <h3 style="color: #00301F;">Message:</h3>
      <p style="white-space: pre-wrap; background: #f9f9f9; padding: 15px; border-radius: 5px;">${message}</p>
    `;

    try {
        const result = await sendEmailUtility({
            to: process.env.CONTACT_EMAIL || 'aghorimediahouse@gmail.com',
            reply_to: email,
            subject: `New Contact Form Submission: ${subject || "No Subject"}`,
            html: generateEmailTemplate(content),
            attachments: SOCIAL_ATTACHMENTS
        });

        if (!result.success) {
            throw new Error(result.error);
        }

        return { success: true };
    } catch (error) {
        console.error("Email Sending Error:", error);
        return { success: false, error: "Failed to send email." };
    }
}

