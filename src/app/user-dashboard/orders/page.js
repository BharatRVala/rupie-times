import OrderList from "../../components/dashboard/OrderList";

export const metadata = {
    title: "Order History | Rupie Times",
    description: "View your subscription history and past orders.",
};

export default function OrderHistoryPage() {
    return (
        <>
            {/* Page Title & Subtitle */}
            <div className="mb-8">
                <h2 className="text-2xl font-bold text-[#1E4032] mb-2">Orders History</h2>
                <p className="text-gray-500 text-sm">View your subscription history</p>
            </div>

            {/* Orders List Component */}
            <OrderList />
        </>
    );
}
