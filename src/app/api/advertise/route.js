import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(req) {
    try {
        const body = await req.json();
        const { firstName, lastName, companyName, workEmail, interest } = body;

        // Basic validation
        if (!firstName || !lastName || !workEmail) {
            return NextResponse.json(
                { success: false, message: 'Missing required fields' },
                { status: 400 }
            );
        }

        // Configure SMTP Transporter
        // using credentials provided by user
        const transporter = nodemailer.createTransport({
            host: "smtp.gmail.com",
            port: 587,
            secure: false, // true for 465, false for other ports
            auth: {
                user: "aghorimediahouse@gmail.com",
                pass: "mtts nruc rvdu wmgm",
            },
        });

        // Email Content
        const mailOptions = {
            from: '"Rupie Times Advertiser" <aghorimediahouse@gmail.com>', // sender address
            to: "aghorimediahouse@gmail.com", // list of receivers
            replyTo: workEmail,
            subject: `New Advertise Inquiry: ${companyName || firstName} - ${interest}`,
            html: `
                <h2>New Advertising Inquiry</h2>
                <p><strong>Name:</strong> ${firstName} ${lastName}</p>
                <p><strong>Company:</strong> ${companyName || 'N/A'}</p>
                <p><strong>Email:</strong> ${workEmail}</p>
                <p><strong>Interest:</strong> ${interest}</p>
                <br/>
                <p>Sent from Rupie Times Advertise With Us Page.</p>
            `,
        };

        // Send Email
        await transporter.sendMail(mailOptions);

        return NextResponse.json(
            { success: true, message: 'Inquiry sent successfully' },
            { status: 200 }
        );

    } catch (error) {
        console.error('Error sending advertise email:', error);
        return NextResponse.json(
            { success: false, message: 'Failed to send inquiry' },
            { status: 500 }
        );
    }
}
