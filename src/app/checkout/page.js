import CheckoutPage from "./CheckoutPage";

export const metadata = {
    title: "Checkout | Rupie Times",
    description: "Securely complete your purchase.",
};

export default function Checkout() {
    return (
        <div className="min-h-screen">
            <CheckoutPage />
        </div>
    );
}
