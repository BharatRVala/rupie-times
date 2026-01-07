import { NextResponse } from 'next/server';
import { sendContactFormEmail } from '@/app/lib/utils/resend';

export async function POST(request) {
    try {
        const body = await request.json();
        const { fullName, email, subject, message } = body;

        // Validate Status
        if (!fullName || !email || !message) {
            return NextResponse.json(
                { success: false, error: 'Name, Email and Message are required' },
                { status: 400 }
            );
        }

        // Send Email
        await sendContactFormEmail(body);

        return NextResponse.json({ success: true, message: 'Message sent successfully' });
    } catch (error) {
        console.error('Contact API Error:', error);
        return NextResponse.json(
            { success: false, error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}
