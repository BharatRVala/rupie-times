import { notFound } from "next/navigation";
import { PRODUCTS_DATA } from "../../../../products/data";
import ProductArticlesView from "../../../../components/dashboard/ProductArticlesView";

export default async function PremiumArticlesPage({ params }) {
    const { id } = await params;
    const product = PRODUCTS_DATA.find((p) => p.id === parseInt(id));

    if (!product || !product.isSubscribed) {
        return notFound();
    }

    const articles = product.articles || [];

    return (
        <ProductArticlesView product={product} backLink="/user-dashboard/products" />
    );
}
