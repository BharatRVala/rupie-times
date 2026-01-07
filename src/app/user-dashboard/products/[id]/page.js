import { notFound } from "next/navigation";
import { getProductByIdService } from '@/app/lib/services/productService';
import { cookies } from 'next/headers';
import { authenticateUser } from '@/app/lib/middleware/auth';
import ProductDetails from "../../../products/[id]/ProductDetails";

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

export default async function DashboardProductPage({ params }) {
    const { id } = await params;
    const product = await getProduct(id);

    if (!product) {
        notFound();
    }

    return (
        <div className="">
            {/* Reuse Product Details Component in Dashboard Mode */}
            <div>
                {/* We pass isDashboard=true to adjust styling (e.g. padding/back button) if needed */}
                <ProductDetails product={product} isDashboard={true} />
            </div>
        </div>
    );
}
