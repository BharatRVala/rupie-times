// src/app/components/dashboard/SubscriptionStats.jsx
import Image from "next/image";

export default function SubscriptionStats({ counts }) {
    // Icons provided by user logic: userDashboard assets.
    // Ensure fallback if image fails or path is incorrect.
    const stats = [
        {
            id: 1,
            value: counts?.active || 0,
            label: "Active",
            icon: "products.svg",
            isWarning: false,
            isError: false
        },
        {
            id: 2,
            value: counts?.expiresoon || 0,
            label: "Expiring soon",
            icon: "subscription.svg",
            isWarning: true,
            isError: false
        },
        {
            id: 3,
            value: counts?.expired || 0,
            label: "Expired",
            icon: "subscription.svg",
            isWarning: false,
            isError: true
        }
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {stats.map((stat) => (
                <div key={stat.id} className="backdrop-blur supports-[backdrop-filter]:bg-white/10 bg-white/10 p-6 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
                    <div>
                        <h3 className="text-3xl font-bold text-[#1E4032] mb-1">{stat.value}</h3>
                        <p className={`text-sm font-medium ${stat.isWarning ? 'text-gray-500' :
                            stat.isError ? 'text-gray-400' : 'text-gray-500'
                            }`}>{stat.label}</p>
                    </div>
                    {/* Icon Container */}
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center border border-[#C0934B]/20 ${stat.isWarning ? 'bg-[#FFF8DC]' :
                        stat.isError ? 'bg-[#FFE4E4]' : 'bg-[#F3EFE6]'
                        }`}>
                        <div className="relative w-6 h-6">
                            <Image
                                src={`/assets/userDashboard/${stat.icon}`}
                                alt={stat.label}
                                fill
                                className="object-contain opacity-80"
                                onError={(e) => {
                                    e.target.style.display = 'none';
                                    e.target.parentElement.innerHTML = `<span class="text-xs font-bold">${stat.label[0]}</span>`;
                                }}
                            />
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}
