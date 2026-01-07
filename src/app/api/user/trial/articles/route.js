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

        // Check Trial Status
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

        // Fetch Trial Articles from ALL products
        const products = await Product.find({
            "articles.isFreeTrial": true,
            isActive: true
        }).select('name image articles category');

        let trialArticles = [];

        products.forEach(product => {
            // Filter only active and free trial articles
            const validArticles = product.articles?.filter(a => a.isFreeTrial && a.isActive) || [];

            validArticles.forEach(article => {
                trialArticles.push({
                    _id: article._id,
                    productId: product._id,
                    productName: product.name,
                    heading: article.mainHeading,
                    description: article.description,
                    image: article.image || product.image, // Fallback to product image
                    issueDate: article.issueDate,
                    category: article.category,
                    type: 'trial'
                });
            });
        });

        return NextResponse.json({ success: true, articles: trialArticles });

    } catch (error) {
        if (error.message.includes('authentication') || error.message.includes('token')) {
            return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
        }
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
