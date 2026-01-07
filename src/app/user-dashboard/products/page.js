import ProductList from "../../components/dashboard/ProductList";

export const metadata = {
    title: "Explore Newsletters | Rupie Times",
    description: "Browse our list of premium products and subscriptions.",
};

export default function DashboardProductsPage() {
    return (
        <>
            {/* Product Listing Logic */}
            <ProductList />
        </>
    );
}
