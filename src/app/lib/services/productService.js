import Product from '@/app/lib/models/product';
import connectDB from '@/app/lib/utils/dbConnect';
import mongoose from 'mongoose';

export async function getProductsService({
    page = 1,
    limit = 12,
    search = '',
    category = ''
}) {
    await connectDB();

    const skip = (page - 1) * limit;

    // Build query for active products only (and not deleted)
    let query = { isActive: true, isDeleted: { $ne: true } };

    if (category) {
        query.category = { $regex: category, $options: 'i' };
    }

    if (search) {
        query.$or = [
            { heading: { $regex: search, $options: 'i' } },
            { publicationType: { $regex: search, $options: 'i' } },
            { fullDescription: { $regex: search, $options: 'i' } },
            { category: { $regex: search, $options: 'i' } },
            { tags: { $in: [new RegExp(search, 'i')] } }
        ];
    }

    // Get products with price calculation
    const products = await Product.find(query)
        .select('_id heading publicationType fullDescription category tags variants filename isActive createdAt')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();

    const total = await Product.countDocuments(query);

    // Get unique categories for filter
    const categories = await Product.distinct('category', { isActive: true });

    // Process products to calculate basePrice
    const processedProducts = products.map(product => {
        // Calculate basePrice from variants
        let basePrice = 0;

        if (product.variants && product.variants.length > 0) {
            // Get the lowest price from variants as basePrice
            const prices = product.variants
                .filter(variant => variant.price && !isNaN(variant.price))
                .map(variant => variant.price);

            if (prices.length > 0) {
                basePrice = Math.min(...prices);
            }
        }

        return {
            _id: product._id.toString(),
            heading: product.heading,
            publicationType: product.publicationType,
            frequency: product.frequency,
            fullDescription: product.fullDescription,
            category: product.category,
            tags: product.tags || [],
            basePrice: basePrice,
            filename: product.filename,
            isActive: product.isActive,
            createdAt: product.createdAt,
            // Add img alias for backward compatibility
            img: product.filename,
            // Also include variants for detailed view
            variants: product.variants || []
        };
    });

    return {
        success: true,
        products: processedProducts,
        categories,
        pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit)
        }
    };
}

export async function getProductByIdService({ id, user = null }) {
    await connectDB();

    if (!mongoose.Types.ObjectId.isValid(id)) {
        return { success: false, error: 'Invalid product ID format', status: 400 };
    }

    // Get product with variants and basic info
    const product = await Product.findById(id)
        .select('heading publicationType frequency fullDescription category tags variants filename basePrice isActive articles.mainHeading articles.description articles.author articles.category articles.isActive articles.createdAt articles.updatedAt createdAt updatedAt')
        .lean();

    if (!product || !product.isActive) {
        return { success: false, error: 'Product not found or inactive', status: 404 };
    }

    // Check for user subscription
    // Check for user subscription
    let isSubscribed = false;

    if (user && user.id) {
        try {
            const Subscription = (await import('@/app/lib/models/Subscription')).default;

            // Check for active subscription
            const subscription = await Subscription.findOne({
                user: user.id,
                product: id,
                status: { $in: ['active'] },
                endDate: { $gt: new Date() }
            });

            if (subscription) {
                isSubscribed = true;
            }
        } catch (e) {
            console.error('Subscription check error:', e);
        }
    }

    // Helper to serialize product data
    const serializedProduct = {
        ...product,
        _id: product._id.toString(),
        createdAt: product.createdAt ? product.createdAt.toISOString() : null,
        updatedAt: product.updatedAt ? product.updatedAt.toISOString() : null,
        variants: (product.variants || []).map(v => ({
            ...v,
            _id: v._id ? v._id.toString() : undefined
        })),
        articles: (product.articles || []).map(a => ({
            ...a,
            _id: a._id ? a._id.toString() : undefined,
            createdAt: a.createdAt ? new Date(a.createdAt).toISOString() : null,
            updatedAt: a.updatedAt ? new Date(a.updatedAt).toISOString() : null
        })),
        articlesCount: product.articles ? product.articles.length : 0,
        isSubscribed
    };


    return {
        success: true,
        product: serializedProduct
    };
}

export async function getProductByArticleIdService(articleId) {
    await connectDB();

    if (!mongoose.Types.ObjectId.isValid(articleId)) {
        return { success: false, error: 'Invalid article ID' };
    }

    try {
        const product = await Product.findOne({
            'articles._id': articleId
        }).select('_id variants heading isActive');

        if (product) {
            return {
                success: true,
                product: {
                    _id: product._id.toString(),
                    heading: product.heading,
                    isActive: product.isActive
                }
            };
        }

        return { success: false, error: 'Product article not found' };
    } catch (error) {
        console.error('Error finding product by article ID:', error);
        return { success: false, error: 'Database error' };
    }
}
