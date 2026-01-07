import { NextResponse } from 'next/server';
import { GridFSBucket } from 'mongodb';
import mongoose from 'mongoose';
import { authenticateUser } from '@/app/lib/middleware/auth';
import dbConnect from '@/app/lib/utils/dbConnect';

export async function POST(request) {
    try {
        // Authenticate user (or admin - currently using user auth but could be expanded)
        // For now, let's assume both admins and users can upload via this route if they have a valid token
        // But since `authenticateUser` might differ from `authenticateAdmin`, we should check who is calling.
        // However, for simplicity and common use case, we'll start with generic auth check or check both.

        // In many systems, "upload" is public or semi-protected. 
        // Let's use a more flexible approach: check for user token. 
        // NOTE: If admins need to upload, we might need to handle that too. 
        // Given the context of "Support Tickets", usually the user uploads evidence.

        // Let's try to authenticate as user first.
        let uploader = null;
        let uploaderType = 'user';

        try {
            const user = await authenticateUser(request);
            if (user) uploader = user;
            else throw new Error('Authentication required');
        } catch (e) {
            throw new Error('Authentication required');
        }

        await dbConnect();

        const formData = await request.formData();
        const file = formData.get('file');

        if (!file) {
            return NextResponse.json(
                { success: false, error: 'No file provided' },
                { status: 400 }
            );
        }

        // Validate file type
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
        if (!allowedTypes.includes(file.type)) {
            return NextResponse.json(
                { success: false, error: 'Invalid file type. Only images are allowed.' },
                { status: 400 }
            );
        }

        // Validate size (5MB)
        if (file.size > 5 * 1024 * 1024) {
            return NextResponse.json(
                { success: false, error: 'File size too large. Max 5MB.' },
                { status: 400 }
            );
        }

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const db = mongoose.connection.db;
        const bucket = new GridFSBucket(db, { bucketName: 'support' });

        const timestamp = Date.now();
        const filename = `${timestamp}-${file.name.replace(/\s+/g, '-')}`;

        const uploadStream = bucket.openUploadStream(filename, {
            contentType: file.type,
            metadata: {
                originalName: file.name,
                uploadedBy: uploader.id,
                uploadedAt: new Date(),
                context: 'support_ticket'
            }
        });

        const uploadResult = await new Promise((resolve, reject) => {
            uploadStream.end(buffer);
            uploadStream.on('finish', () => {
                resolve({
                    filename: filename,
                    fileId: uploadStream.id,
                    url: `/api/support/image/${filename}` // Virtual URL, we need a GET route for this too if we want to serve it directly, or use a general file server route
                });
            });
            uploadStream.on('error', reject);
        });

        return NextResponse.json({
            success: true,
            message: 'Image uploaded successfully',
            attachment: {
                filename: uploadResult.filename,
                originalName: file.name,
                contentType: file.type,
                size: file.size,
                url: uploadResult.url // This will be stored in the message
            }
        });

    } catch (error) {
        console.error('Support upload error:', error);
        return NextResponse.json(
            { success: false, error: error.message || 'Upload failed' },
            { status: 500 }
        );
    }
}
