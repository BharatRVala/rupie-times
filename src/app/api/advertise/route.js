import { NextResponse } from 'next/server';
import { sendAdvertiseEmail } from '@/app/lib/utils/resend';

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

        // Send Email using shared utility
        await sendAdvertiseEmail(body);

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
