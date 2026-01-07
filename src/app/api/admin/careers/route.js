import { NextResponse } from 'next/server';
import dbConnect from '@/app/lib/utils/dbConnect';
import Career from '@/app/lib/models/Career';
import { authenticateAdmin } from '@/app/lib/middleware/auth';

// GET: List all careers (Admin)
export async function GET(request) {
    try {
        const authResult = authenticateAdmin(request);
        if (!authResult.success) {
            return NextResponse.json({ success: false, message: authResult.error }, { status: authResult.status || 401 });
        }

        await dbConnect();

        // Get query params for standard list filtering/sorting if needed in future
        // For now, simple list
        const careers = await Career.find().sort({ createdAt: -1 });

        return NextResponse.json({ success: true, data: careers });
    } catch (error) {
        console.error('Error fetching careers:', error);
        return NextResponse.json(
            { success: false, message: error.message || 'Internal Server Error' },
            { status: 500 }
        );
    }
}

// POST: Create a new career (Admin)
export async function POST(request) {
    try {
        const authResult = authenticateAdmin(request);
        if (!authResult.success) {
            return NextResponse.json({ success: false, message: authResult.error }, { status: authResult.status || 401 });
        }

        await dbConnect();
        const body = await request.json();

        const newCareer = await Career.create(body);

        return NextResponse.json({
            success: true,
            message: 'Job Position created successfully',
            data: newCareer
        }, { status: 201 });

    } catch (error) {
        console.error('Error creating career:', error);
        return NextResponse.json(
            { success: false, message: error.message || 'Internal Server Error' },
            { status: 500 }
        );
    }
}
