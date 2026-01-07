import { NextResponse } from 'next/server';
import connectDB from '@/app/lib/utils/dbConnect';
import User from '@/app/lib/models/User';
import Product from '@/app/lib/models/product';
import { authenticateUser } from '@/app/lib/middleware/auth';

export async function GET(request) {
    try {
        await connectDB();

        const auth = authenticateUser(request);
        if (!auth || !auth.id) {
            return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
        }

        const user = await User.findById(auth.id);
        if (!user) {
            return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
        }

        // Check active trial
        const trial = user.trial || { isUsed: false };
        let isActive = false;
        if (trial.isUsed && trial.startDate) {
            const start = new Date(trial.startDate);
            const now = new Date();
            const end = new Date(start.getTime() + (7 * 24 * 60 * 60 * 1000));
            if (now < end) isActive = true;
        }

        if (!isActive) {
            return NextResponse.json({ success: false, error: "Trial not active or expired", code: "TRIAL_EXPIRED" }, { status: 403 });
        }

        // Find products with at least one free trial article
        const products = await Product.find({
            "articles.isFreeTrial": true,
            isActive: true
        }).select('name description image heading shortDescription articles filename');

        // Filter to ensure there are actually active trial articles (double check)
        const validProducts = products.filter(p =>
            p.articles.some(a => a.isFreeTrial && a.isActive)
        ).map(p => ({
            _id: p._id,
            name: p.heading || p.name, // Use heading if available as per other headers
            description: p.shortDescription || p.description,
            image: { filename: p.filename }, // Construct object to match frontend expectation
            articleCount: p.articles.filter(a => a.isFreeTrial && a.isActive).length
        }));

        return NextResponse.json({ success: true, products: validProducts });

    } catch (error) {
        if (error.message.includes('authentication') || error.message.includes('token')) {
            return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
        }
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
