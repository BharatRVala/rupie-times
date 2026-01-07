import Image from "next/image";

import Link from "next/link";

export default function SummaryStats({ stats }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
      {stats.map((stat) => {
        const CardContent = (
          <div
            className={`backdrop-blur supports-[backdrop-filter]:bg-white/10 bg-white/10 p-6 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between ${stat.path ? "cursor-pointer hover:bg-white/20 transition-colors" : ""
              }`}
          >
            <div>
              <h2 className="text-3xl font-bold text-[#1E4032] mb-1">{stat.value}</h2>
              <p className="text-sm font-medium text-gray-500">{stat.label}</p>
            </div>
            <div className="w-12 h-12 rounded-lg bg-[#FFF8DC] flex items-center justify-center border border-[#C0934B]/20">
              <Image
                src={`/assets/userDashboard/${stat.icon}`}
                alt={stat.label}
                width={24}
                height={24}
                className="text-[#C0934B]"
              />
            </div>
          </div>
        );

        return stat.path ? (
          <Link key={stat.id} href={stat.path}>
            {CardContent}
          </Link>
        ) : (
          <div key={stat.id}>{CardContent}</div>
        );
      })}
    </div>
  );
}
