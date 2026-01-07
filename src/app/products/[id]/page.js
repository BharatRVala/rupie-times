import { notFound } from "next/navigation";
import ProductDetails from "./ProductDetails";
import { getProductByIdService, getProductsService } from '@/app/lib/services/productService';
import { cookies } from 'next/headers';
import { authenticateUser } from '@/app/lib/middleware/auth';

// Helper to fetch data safely
async function getProduct(id) {
    let user = null;
    try {
        const cookieStore = await cookies();
        const req = { cookies: cookieStore };
        const authResult = authenticateUser(req);
        if (authResult.success) user = authResult;
    } catch (e) {
        // Ignore auth errors or static generation context
    }

    try {
        const data = await getProductByIdService({ id, user });
        return data.success ? data.product : null;
    } catch (e) {
        console.error("Failed to fetch product", e);
        return null;
    }
}

async function getRelatedProducts() {
    try {
        const data = await getProductsService({ limit: 5 });
        return data.success ? data.products : [];
    } catch (e) {
        console.error("Failed to fetch related products", e);
        return [];
    }
}

export async function generateMetadata({ params }) {
    const { id } = await params;
    // For metadata, we don't need user context strictly, or treat as guest
    const data = await getProductByIdService({ id, user: null });
    const product = data.success ? data.product : null;

    if (!product) {
        return {
            title: "Product Not Found",
        };
    }

    return {
        title: `${product.heading || product.title} | Rupie Times`,
        description: product.description || product.publicationType || product.shortDescription,
    };
}

export default async function ProductPage({ params }) {
    const { id } = await params;

    const [product, allProducts] = await Promise.all([
        getProduct(id),
        getRelatedProducts(),
    ]);

    if (!product) {
        notFound();
    }

    // Filter and map related products
    const relatedProducts = allProducts
        .filter(p => p._id !== id)
        .slice(0, 4)
        .map(p => ({
            id: p._id,
            title: p.heading,
            description: p.fullDescription || p.publicationType || p.shortDescription || p.description,
            image: p.filename ? `/api/user/products/image/${p.filename}` : '/placeholder-image.png',
            price: p.price
        }));

    return <ProductDetails product={product} relatedProducts={relatedProducts} />;
}
