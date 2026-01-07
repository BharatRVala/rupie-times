import { NextResponse } from 'next/server';
import connectDB from '@/app/lib/utils/dbConnect';
import User from '@/app/lib/models/User';
import Product from '@/app/lib/models/product';
import { authenticateUser } from '@/app/lib/middleware/auth';

export async function GET(request, { params }) {
    try {
        await connectDB();
        const { id } = await params;

        const auth = authenticateUser(request);
        if (!auth || !auth.id) {
            return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
        }

        const user = await User.findById(auth.id);
        const trial = user?.trial || { isUsed: false };

        // Double check trial validity again (security)
        let isActive = false;
        if (trial.isUsed && trial.startDate) {
            const start = new Date(trial.startDate);
            const now = new Date();

            // ✅ Fix: Use stored endDate for security check
            let end;
            if (trial.endDate) {
                end = new Date(trial.endDate);
            } else {
                const duration = 7 * 24 * 60 * 60 * 1000;
                end = new Date(start.getTime() + duration);
            }

            if (now < end) isActive = true;
        }

        if (!isActive) {
            return NextResponse.json({ success: false, error: "Trial not active" }, { status: 403 });
        }

        const product = await Product.findById(id);
        if (!product) return NextResponse.json({ success: false, error: "Product not found" }, { status: 404 });

        const trialArticles = product.articles
            .filter(a => a.isFreeTrial && a.isActive)
            .map(a => ({
                _id: a._id,
                mainHeading: a.mainHeading,
                description: a.description,
                image: a.image,
                issueDate: a.issueDate,
                issueEndDate: a.issueEndDate,
                category: a.category,
                author: a.author,
                createdAt: a.createdAt
            }));

        return NextResponse.json({
            success: true,
            product: {
                _id: product._id,
                name: product.heading || product.name,
                image: { filename: product.filename }
            },
            articles: trialArticles
        });

    } catch (error) {
        if (error.message.includes('authentication') || error.message.includes('token')) {
            return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
        }
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
