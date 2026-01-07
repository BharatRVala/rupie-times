import { NextResponse } from 'next/server';
import { GridFSBucket } from 'mongodb';
import mongoose from 'mongoose';
import dbConnect from '@/app/lib/utils/dbConnect';

export async function GET(request, { params }) {
    try {
        await dbConnect();

        const { filename } = await params;

        if (!filename) {
            return NextResponse.json(
                { success: false, error: 'Filename is required' },
                { status: 400 }
            );
        }

        const db = mongoose.connection.db;
        const bucket = new GridFSBucket(db, { bucketName: 'support' });

        // Check if file exists
        const file = await db.collection('support.files').findOne({ filename });

        if (!file) {
            return NextResponse.json(
                { success: false, error: 'File not found' },
                { status: 404 }
            );
        }

        // Create a stream
        const downloadStream = bucket.openDownloadStreamByName(filename);

        // Convert stream to ReadableStream for Next.js Response
        const stream = new ReadableStream({
            start(controller) {
                downloadStream.on('data', (chunk) => controller.enqueue(chunk));
                downloadStream.on('end', () => controller.close());
                downloadStream.on('error', (err) => controller.error(err));
            }
        });

        return new NextResponse(stream, {
            headers: {
                'Content-Type': file.contentType || 'application/octet-stream',
                'Content-Length': file.length.toString(),
                'Cache-Control': 'public, max-age=31536000, immutability',
            },
        });

    } catch (error) {
        console.error('Error fetching support image:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch image' },
            { status: 500 }
        );
    }
}
