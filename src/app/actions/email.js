"use server";

import nodemailer from "nodemailer";

export async function sendEmail(formData) {
    const name = formData.get("fullName"); // Matching the form field name in ContactPage.jsx
    const email = formData.get("email");
    const number = formData.get("number");
    const subject = formData.get("subject");
    const message = formData.get("message");

    const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT),
        secure: false, // true for 465, false for other ports
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
    });

    try {
        const mailOptions = {
            from: process.env.SMTP_USER, // Sender address
            to: process.env.SMTP_USER,   // List of receivers (sending to self/admin for now)
            subject: `New Contact Form Submission: ${subject || "No Subject"}`,
            text: `
        Name: ${name}
        Email: ${email}
        Number: ${number}
        Message: ${message}
      `,
            html: `
        <h3>New Contact Form Submission</h3>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Number:</strong> ${number}</p>
        <p><strong>Subject:</strong> ${subject}</p>
        <p><strong>Message:</strong></p>
        <p>${message}</p>
      `,
        };

        await transporter.sendMail(mailOptions);
        return { success: true };
    } catch (error) {
        console.error("SMTP Error:", error);
        return { success: false, error: "Failed to send email." };
    }
}
