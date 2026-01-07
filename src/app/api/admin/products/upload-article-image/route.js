// src/app/api/admin/products/upload-article-image/route.js
import { NextResponse } from 'next/server';
import { GridFSBucket } from 'mongodb';
import mongoose from 'mongoose';
import { authenticateAdmin } from '@/app/lib/middleware/auth';
import dbConnect from '@/app/lib/utils/dbConnect';

export async function POST(request) {
    try {
        // console.log('Starting premium article image upload process...');

        // Check admin authentication
        const admin = authenticateAdmin(request);

        // console.log('Admin authenticated for upload:', admin.email);

        await dbConnect();

        const formData = await request.formData();
        const file = formData.get('file');

        if (!file) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'No file provided'
                },
                { status: 400 }
            );
        }

        // Validate file type
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/avif'];
        if (!allowedTypes.includes(file.type)) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Invalid file type. Only JPEG, PNG, GIF, WebP, and AVIF images are allowed.'
                },
                { status: 400 }
            );
        }

        // Validate file size (5MB max)
        const maxSize = 5 * 1024 * 1024; // 5MB
        if (file.size > maxSize) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'File size too large. Maximum size is 5MB.'
                },
                { status: 400 }
            );
        }

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        const db = mongoose.connection.db;

        // Use 'article' bucket for premium product articles
        const bucket = new GridFSBucket(db, { bucketName: 'article' });

        // Upload file to GridFS
        const timestamp = Date.now();
        const filename = `${timestamp}-${file.name.replace(/\s+/g, '-')}`;

        const uploadStream = bucket.openUploadStream(filename, {
            contentType: file.type,
            metadata: {
                originalName: file.name,
                uploadedBy: admin.id,
                uploadedByEmail: admin.email,
                uploadDate: new Date(),
                type: 'article'
            }
        });

        const uploadResult = await new Promise((resolve, reject) => {
            uploadStream.end(buffer);
            uploadStream.on('finish', () => {
                resolve({
                    filename: filename,
                    contentType: file.type,
                    size: buffer.length,
                    gridfsId: uploadStream.id.toString()
                });
            });
            uploadStream.on('error', reject);
        });

        // console.log('Premium article image uploaded successfully:', uploadResult.filename);

        return NextResponse.json({
            success: true,
            message: 'File uploaded successfully',
            ...uploadResult,
            admin: {
                id: admin.id,
                name: admin.name,
                email: admin.email
            }
        });

    } catch (error) {
        console.error('Article upload error:', error);

        if (error.message.includes('authentication failed')) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Admin authentication required to upload images'
                },
                { status: 401 }
            );
        }

        return NextResponse.json(
            {
                success: false,
                error: 'Failed to upload file: ' + error.message
            },
            { status: 500 }
        );
    }
}
