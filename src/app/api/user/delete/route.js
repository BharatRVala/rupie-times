import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import User from '@/app/lib/models/User';
import DeletedUser from '@/app/lib/models/deletedUser';
import dbConnect from '@/app/lib/utils/dbConnect';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';

export async function DELETE(request) {
    try {
        await dbConnect();

        // 1. Authenticate Request
        const cookieStore = await cookies();
        const token = cookieStore.get('user_token');

        if (!token) {
            return NextResponse.json(
                { success: false, message: 'Authentication required' },
                { status: 401 }
            );
        }

        let decoded;
        try {
            decoded = jwt.verify(token.value, process.env.JWT_SECRET);
        } catch (error) {
            return NextResponse.json(
                { success: false, message: 'Invalid token' },
                { status: 401 }
            );
        }

        const userId = decoded.id;

        // 2. Find User
        const user = await User.findById(userId);
        if (!user) {
            return NextResponse.json(
                { success: false, message: 'User not found' },
                { status: 404 }
            );
        }

        // 3. Begin Transaction (best practice, but strict transaction requires replica set. 
        // We will do logical transaction: Copy -> Delete)

        // Prepare archived data
        const archivedData = {
            originalUserId: user._id,
            name: user.name,
            email: user.email,
            mobile: user.mobile,
            password: user.password,
            role: user.role,
            userData: {
                favorites: user.favorites,
                isActive: user.isActive,
                createdAt: user.createdAt,
                updatedAt: user.updatedAt
            },
            deletedAt: new Date()
        };

        // 4. Create DeletedUser Record
        await DeletedUser.create(archivedData);

        // 5. Delete from User Collection
        await User.findByIdAndDelete(userId);

        // 6. Clear Cookie
        cookieStore.delete('user_token');

        return NextResponse.json({
            success: true,
            message: 'Account deleted and archived successfully'
        });

    } catch (error) {
        console.error('Account deletion error:', error);
        return NextResponse.json(
            { success: false, message: 'Internal server error while deleting account' },
            { status: 500 }
        );
    }
}
