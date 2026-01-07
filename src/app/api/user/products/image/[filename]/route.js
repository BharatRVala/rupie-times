import { NextResponse } from 'next/server';
import { GridFSBucket } from 'mongodb';
import mongoose from 'mongoose';
import connectDB from '@/app/lib/utils/dbConnect';

export async function GET(request, { params }) {
    try {
        const { filename } = await params;

        await connectDB();
        const db = mongoose.connection.db;
        const bucket = new GridFSBucket(db, { bucketName: 'products' });

        // Find the file by filename
        const files = await bucket.find({ filename }).toArray();
        if (files.length === 0) {
            return new NextResponse('Image not found', { status: 404 });
        }

        const file = files[0];

        // Create download stream
        const downloadStream = bucket.openDownloadStream(file._id);

        return new Promise((resolve, reject) => {
            const chunks = [];

            downloadStream.on('data', (chunk) => {
                chunks.push(chunk);
            });

            downloadStream.on('end', () => {
                const buffer = Buffer.concat(chunks);
                resolve(new NextResponse(buffer, {
                    status: 200,
                    headers: {
                        'Content-Type': file.contentType,
                        'Content-Length': file.length.toString(),
                        'Cache-Control': 'public, max-age=31536000',
                        'Content-Disposition': `inline; filename="${file.filename}"`
                    },
                }));
            });

            downloadStream.on('error', (error) => {
                reject(new NextResponse('Error streaming image', { status: 500 }));
            });
        });

    } catch (error) {
        console.error('Image serve error:', error);
        return new NextResponse('Internal server error', { status: 500 });
    }
}
