import { redirect } from 'next/navigation';
import connectDB from '@/app/lib/utils/dbConnect';
import Product from '@/app/lib/models/product';

export default async function TrialProductRedirectPage({ params }) {
    const { id } = await params;

    await connectDB();

    // Fetch product and its articles needed for redirect
    // utilizing lean() for performance since we don't need mongoose methods
    const product = await Product.findById(id).select('articles').lean();

    if (!product || !product.articles) {
        // If product not found, maybe redirect back to list?
        // For now, let's render a simple message or 404
        return <div className="p-8 text-center text-gray-500">Product not found.</div>;
    }

    // Filter relevant articles (Active ones)
    // We mimic the default sorting: Newest First
    const validArticles = product.articles
        .filter(article => article.isActive)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    if (validArticles.length > 0) {
        // Redirect to the first article
        redirect(`/user-dashboard/trial-products/${id}/articles/${validArticles[0]._id}`);
    }

    return (
        <div className="w-full h-[80vh] flex items-center justify-center text-gray-500">
            No active articles available for this trial product.
        </div>
    );
}
