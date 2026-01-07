import { NextResponse } from 'next/server';
import dbConnect from '@/app/lib/utils/dbConnect';
import Career from '@/app/lib/models/Career';

// GET: List active careers (Public/User)
export async function GET() {
    try {
        await dbConnect();

        // Fetch only active job positions
        const activeCareers = await Career.find({ isActive: true })
            .sort({ createdAt: -1 });

        return NextResponse.json({ success: true, data: activeCareers });
    } catch (error) {
        console.error('Error fetching active careers:', error);
        return NextResponse.json(
            { success: false, message: error.message || 'Internal Server Error' },
            { status: 500 }
        );
    }
}
