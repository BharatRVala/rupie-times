import { NextResponse } from 'next/server';
import dbConnect from '@/app/lib/utils/dbConnect';
import DeletedUser from '@/app/lib/models/deletedUser';
import { cookies } from 'next/headers';
import { authenticateAdmin } from '@/app/lib/middleware/auth';

export async function GET(request) {
    try {
        await dbConnect();

        // 1. Authenticate Admin
        // In App Router, we need to pass the request object which contains cookies
        // However, our middleware helper expects 'req' with cookies. 
        // We can simulate it or just use the cookie store directly if the helper isn't compatible with direct NextRequest

        // Let's manually check for now since we are in a route handler
        const cookieStore = await cookies();

        // Construct a mock request object for the helper if needed, OR just rebuild auth check here slightly
        // The helper `authenticateAdmin` takes `req`. 
        // Let's pass a mock object with cookies map
        const mockReq = {
            cookies: cookieStore
        };

        const authResult = authenticateAdmin(mockReq);

        if (!authResult.success) {
            return NextResponse.json(
                { success: false, message: authResult.error },
                { status: authResult.status }
            );
        }

        // 2. Fetch Deleted Users
        const deletedUsers = await DeletedUser.find({})
            .sort({ deletedAt: -1 }) // Newest first
            .lean();

        return NextResponse.json({
            success: true,
            users: deletedUsers
        });

    } catch (error) {
        console.error('Error fetching deleted users:', error);
        return NextResponse.json(
            { success: false, message: 'Internal server error' },
            { status: 500 }
        );
    }
}
