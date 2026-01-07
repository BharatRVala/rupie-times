import { NextResponse } from 'next/server';
import { sendCareerApplicationEmail } from '@/app/lib/utils/resend';

export async function POST(request) {
    try {
        const body = await request.json();
        const { fullName, email, contactNumber, position, message, resume, resumeName } = body;

        // Basic server-side validation
        if (!fullName || !email || !position) {
            return NextResponse.json(
                { error: 'Name, Email, and Position are required fields.' },
                { status: 400 }
            );
        }

        // Prepare attachment if resume exists
        let attachments = [];
        if (resume && resumeName) {
            const base64Data = resume.includes(',') ? resume.split(',')[1] : resume;
            attachments.push({
                content: Buffer.from(base64Data, 'base64'),
                filename: resumeName,
                contentType: 'application/pdf'
            });
        }

        // Normalizing data for the email function
        const emailData = {
            name: fullName,
            email,
            phone: contactNumber,
            position,
            message,
            attachments
        };

        // Send email using the utility function
        const result = await sendCareerApplicationEmail(emailData);

        if (result.success) {
            return NextResponse.json({
                success: true,
                message: 'Application submitted successfully'
            });
        } else {
            throw new Error('Failed to send email');
        }

    } catch (error) {
        console.error('Career application error:', error);
        return NextResponse.json(
            { error: 'Failed to submit application. Please try again later.' },
            { status: 500 }
        );
    }
}
