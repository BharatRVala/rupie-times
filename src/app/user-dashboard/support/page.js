"use client";

import { useState, useEffect } from "react";
import { HiPlus, HiArrowRight } from "react-icons/hi";
import Link from "next/link";
import { supportData } from "../../data/supportData";
import Pagination from "../../components/Pagination";
import GlobalLoader from "../../components/GlobalLoader";

export default function SupportPage() {
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("All");
    const [stats, setStats] = useState({
        All: 0,
        Open: 0,
        Waiting: 0,
        Closed: 0
    });

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const LIMIT = 10;

    useEffect(() => {
        // Reset to page 1 when tab changes
        setCurrentPage(1);
    }, [activeTab]);

    useEffect(() => {
        fetchTickets();
    }, [activeTab, currentPage]);

    const fetchTickets = async () => {
        try {
            setLoading(true);
            const statusParam = activeTab === "All" ? "all" : activeTab.toLowerCase();
            const response = await fetch(`/api/user/support/tickets?status=${statusParam}&page=${currentPage}&limit=${LIMIT}`);

            if (response.ok) {
                const data = await response.json();
                setTickets(data.tickets || []);

                if (data.pagination) {
                    setTotalPages(data.pagination.pages || 1);
                }

                if (data.stats && data.stats.statusCounts) {
                    setStats({
                        All: data.stats.statusCounts.all || 0,
                        Open: data.stats.statusCounts.open || 0,
                        Waiting: data.stats.statusCounts.waiting || 0,
                        Closed: data.stats.statusCounts.closed || 0
                    });
                }
            } else {
                console.error("Failed to fetch tickets");
            }
        } catch (error) {
            console.error("Error fetching tickets:", error);
        } finally {
            setLoading(false);
        }
    };

    // Helper to map API status to UI status
    const getUIStatus = (apiStatus) => {
        if (!apiStatus) return 'Open';
        return apiStatus === 'open' ? 'Open' : apiStatus.charAt(0).toUpperCase() + apiStatus.slice(1);
    };

    // Helper to format date
    const formatDate = (dateStr) => {
        return new Date(dateStr).toLocaleDateString('en-US', {
            month: 'short', day: 'numeric', year: 'numeric'
        });
    };

    // Handle page change
    const handlePageChange = (newPage) => {
        if (newPage >= 1 && newPage <= totalPages) {
            setCurrentPage(newPage);
        }
    };

    return (
        <div className="w-full space-y-6">

            {/* Page Header Section */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-[#1E4032]">{supportData.pageHeader.title}</h1>
                    <p className="text-gray-500 mt-1 text-sm">
                        {supportData.pageHeader.subtitle}
                    </p>
                </div>
                <Link href="/user-dashboard/support/create-ticket">
                    <button className="flex items-center gap-2 bg-[#C0934B] hover:bg-[#a37c3f] text-white px-5 py-2.5 rounded-lg transition-colors font-medium text-sm">
                        <HiPlus size={18} />
                        {supportData.pageHeader.ctaButton}
                    </button>
                </Link>
            </div>

            {/* Filter Tabs */}
            <div className="border border-gray-200 rounded-lg p-1 backdrop-blur supports-[backdrop-filter]:bg-white/10 bg-white/10 flex items-center gap-6 px-6 h-16 overflow-x-auto">
                {["All", "Open", "Waiting", "Closed"].map((tabName) => (
                    <button
                        key={tabName}
                        onClick={() => setActiveTab(tabName)}
                        className={`relative flex items-center gap-2 text-sm font-medium transition-colors pb-1 ${activeTab === tabName
                            ? "text-[#C0934B] after:absolute after:bottom-[-18px] after:left-0 after:w-full after:h-[2px] after:bg-[#C0934B]"
                            : "text-gray-500 hover:text-gray-700"
                            }`}
                    >
                        {tabName}
                        <span className={`flex items-center justify-center w-5 h-5 rounded-full text-xs ${activeTab === tabName ? "bg-[#FFF8DC] text-[#C0934B]" : "bg-gray-100 text-gray-500"
                            }`}>
                            {stats[tabName] || 0}
                        </span>
                    </button>
                ))}
            </div>

            {/* Tickets List */}
            <div className="space-y-4">
                {loading ? (
                    <GlobalLoader fullScreen={false} className="min-h-[60vh]" />
                ) : tickets.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                        No tickets found.
                    </div>
                ) : (
                    <>
                        {tickets.map((ticket, index) => {
                            // Logic to find last reply or assigned info
                            const lastMsg = ticket.messages?.[ticket.messages?.length - 1]?.message || ticket.initialMessage || 'No messages';
                            const uiStatus = getUIStatus(ticket.status);
                            const assignedToName = ticket.status === 'waiting' ? 'Waiting..' : (ticket.assignedAdmin?.name || ticket.assignedTo?.name || 'Support Team');
                            const msgCount = ticket.messages?.length || 0;

                            return (
                                <div
                                    key={ticket._id || index}
                                    className="backdrop-blur supports-[backdrop-filter]:bg-white/10 bg-white/10 border border-gray-200 rounded-xl p-6 flex flex-col lg:flex-row gap-6 justify-between items-start lg:items-center shadow-sm hover:shadow-md transition-shadow"
                                >
                                    {/* Left Content */}
                                    <div className="flex-1 space-y-4 w-full">
                                        <div>
                                            <h3 className="text-lg font-bold text-[#1E4032]">{ticket.subject}</h3>
                                            <p className="text-gray-500 text-sm mt-1 line-clamp-1">{lastMsg}</p>
                                        </div>
                                        <div className="flex items-center gap-4 text-xs text-gray-500 font-medium">
                                            <span>Assigned to : {assignedToName}</span>
                                            <span className="w-px h-3 bg-gray-300"></span>
                                            <span>{msgCount} messages</span>
                                        </div>
                                    </div>

                                    {/* Right Content */}
                                    <div className="flex flex-col items-start lg:items-end gap-3 w-full lg:w-auto mt-2 lg:mt-0">
                                        <div className="flex items-center gap-2 self-start lg:self-end">
                                            <span className="bg-[#FFF8DC] text-[#C0934B] px-3 py-1 rounded-full text-xs font-medium">
                                                {ticket.category ? ticket.category.replace('_', ' ') : 'General'}
                                            </span>
                                            <span
                                                className={`px-3 py-1 rounded-full text-xs font-medium ${uiStatus === "Open"
                                                    ? "bg-[#E8F5E9] text-green-700"
                                                    : uiStatus === "Waiting"
                                                        ? "bg-[#FFF8E1] text-amber-700"
                                                        : uiStatus === "Closed"
                                                            ? "bg-[#FFEBEE] text-red-500"
                                                            : "bg-gray-100 text-gray-600"
                                                    }`}
                                            >
                                                {uiStatus}
                                            </span>
                                        </div>

                                        <div className="text-right space-y-1 self-start lg:self-end">
                                            <p className="text-xs text-gray-500">{formatDate(ticket.createdAt)}</p>
                                            <p className="text-xs text-gray-400">#{ticket.ticketNumber || ticket._id.slice(-6)}</p>
                                        </div>

                                        <Link href={`/user-dashboard/support/${ticket._id}`} className="self-start lg:self-end mt-2">
                                            <button className="flex items-center gap-2 text-[#1E4032] hover:text-[#C0934B] text-sm font-medium transition-colors">
                                                View Ticket <HiArrowRight />
                                            </button>
                                        </Link>
                                    </div>
                                </div>
                            );
                        })}

                        {/* Pagination UI */}
                        {totalPages > 1 && (
                            <Pagination
                                currentPage={currentPage}
                                totalPages={totalPages}
                                onPageChange={handlePageChange}
                            />
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
