
import { NextResponse } from 'next/server';
import { sendEmail, generateEmailTemplate, SOCIAL_ATTACHMENTS } from '@/app/lib/utils/resend';
import dbConnect from '@/app/lib/utils/dbConnect';
import TrialRequest from '@/app/lib/models/TrialRequest';

export async function POST(request) {
    try {
        await dbConnect();

        const { name, email, contactNumber, homeAddress, productId, productName } = await request.json();

        // Validation
        if (!name || !email || !contactNumber || !homeAddress || !productId) {
            return NextResponse.json({ success: false, message: 'All fields are required.' }, { status: 400 });
        }

        // Check for duplicates
        const existingRequest = await TrialRequest.findOne({
            $or: [{ email }, { contactNumber }]
        });

        if (existingRequest) {
            return NextResponse.json({ success: false, message: 'A trial request with this email or contact number already exists.' }, { status: 400 });
        }

        // Save to Database
        await TrialRequest.create({
            name,
            email,
            contactNumber,
            homeAddress,
            productId,
            productName
        });

        // Admin Notification Email
        const adminEmailContent = `
            <h2 style="color: #00301F; margin-bottom: 20px;">New Trial Request</h2>
            <p><strong>Product:</strong> ${productName}</p>
            <p><strong>Name:</strong> ${name}</p>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Contact:</strong> ${contactNumber}</p>
            <p><strong>Address:</strong> ${homeAddress}</p>
        `;

        // User Confirmation Email
        const userEmailContent = `
            <h2 style="color: #00301F; margin-bottom: 20px;">Trial Request Received</h2>
            <p>Hi ${name},</p>
            <p>Thank you for your interest in <strong>${productName}</strong>. We have received your request for a free trial.</p>
            <p>Our team will review your details and get back to you shortly.</p>
            <br/>
            <p>Best Regards,<br/>Rupie Times Team</p>
        `;

        // Send emails asynchronously (fire and forget) to speed up response
        Promise.all([
            sendEmail({
                to: process.env.CONTACT_EMAIL || 'valab1203@gmail.com',
                reply_to: email,
                subject: `New Trial Request: ${productName} - ${name}`,
                html: generateEmailTemplate(adminEmailContent),
                attachments: SOCIAL_ATTACHMENTS
            }),
            sendEmail({
                to: email,
                subject: `Trial Request Received - ${productName}`,
                html: generateEmailTemplate(userEmailContent),
                attachments: SOCIAL_ATTACHMENTS
            })
        ]).catch(err => console.error("Background email error:", err));

        return NextResponse.json({ success: true, message: 'Trial request submitted successfully.' });

    } catch (error) {
        console.error('Trial submission error:', error);
        return NextResponse.json({ success: false, message: 'Internal Server Error' }, { status: 500 });
    }
}
