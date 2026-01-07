import { LucideIcon } from 'lucide-react';

export default function StatsCard({ title, count, icon: Icon, bgColor, iconColor }) {
    return (
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex flex-col justify-between h-32 relative overflow-hidden group hover:shadow-md transition-all duration-300">
            <div className={`absolute top-4 right-4 p-2 rounded-lg ${bgColor}`}>
                <Icon className={`w-5 h-5 ${iconColor}`} />
            </div>
            <div>
                <p className="text-gray-500 text-sm font-medium mb-1">Total {title.replace('Total ', '')}</p>
                <h3 className="text-3xl font-bold text-gray-800">{count}</h3>
            </div>
        </div>
    );
}
