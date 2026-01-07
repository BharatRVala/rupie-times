
import Link from 'next/link';
import NotificationItem from '@/app/components/dashboard/NotificationItem';

export default function DashboardList({ title, items, seeAllLink, type }) {
    return (
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm h-full flex flex-col">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
                {seeAllLink && (
                    <Link href={seeAllLink} className="text-sm font-bold text-gray-800 hover:text-[#1E4032] hover:underline">
                        See All
                    </Link>
                )}
            </div>

            <div className="mb-2">
                <p className="text-sm text-gray-500 font-medium">Today</p>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto pr-2 custom-scrollbar">
                {items.slice(0, 3).map((item, index) => (
                    <div key={item._id || item.id || index}>
                        {type === 'notification' ? (
                            <NotificationItem notification={item} variant="compact" showNewBadge={false} />
                        ) : (
                            /* Support Ticket Item */
                            <div className="p-4 border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors">
                                <div className="flex items-start gap-3">
                                    <div className={`mt-0.5 min-w-8 min-h-8 rounded-full flex items-center justify-center bg-blue-100 text-blue-600`}>
                                        <span className="text-xs font-bold">
                                            {(() => {
                                                const name = item.title || "";
                                                const parts = name.trim().split(" ");
                                                if (parts.length >= 2) {
                                                    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
                                                }
                                                return (name[0] || "?").toUpperCase();
                                            })()}
                                        </span>
                                    </div>

                                    <div className="flex-1">
                                        <div className="flex justify-between items-start mb-1">
                                            <h4 className="text-sm font-bold text-gray-800">{item.title}</h4>
                                            <span className="text-xs text-gray-400 whitespace-nowrap ml-2">{item.time}</span>
                                        </div>
                                        <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">
                                            {item.message}
                                        </p>
                                        {item.canReply && (
                                            <Link href={`/admin-dashboard/support/${item.id}`}>
                                                <button className="mt-2 text-xs font-bold text-gray-600 hover:text-[#1E4032]">
                                                    Reply
                                                </button>
                                            </Link>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
