// src/app/products/page.js
import ProductList from "./ProductList";

export const metadata = {
    title: "Products | Rupie Times",
    description: "Explore our range of financial products and technical analysis tools.",
};

export default function ProductsPage() {
    return (
        <div className="min-h-screen">
            <ProductList />
        </div>
    );
}
