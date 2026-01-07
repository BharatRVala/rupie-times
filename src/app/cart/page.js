import CartPage from "./CartPage";

export const metadata = {
    title: "Your Cart | Rupie Times",
    description: "Review your selected products and proceed to checkout.",
};

export default function Cart() {
    return (
        <div className="min-h-screen">
            <CartPage />
        </div>
    );
}
