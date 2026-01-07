"use client";

import { useState, useEffect, useMemo } from "react";
import { HiArrowRight } from "react-icons/hi";
import Link from "next/link";
import GlobalLoader from "@/app/components/GlobalLoader";
import { Search } from "lucide-react";

export default function SupportPage() {
    // Client-side States
    const [allTickets, setAllTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("All");
    const [searchQuery, setSearchQuery] = useState("");
    const [itemsPerPage, setItemsPerPage] = useState(10);

    // Stats calculation based on fetched data
    const stats = useMemo(() => {
        const counts = {
            all: allTickets.length,
            open: 0,
            waiting: 0,
            closed: 0
        };
        allTickets.forEach(t => {
            if (t.status === 'open') counts.open++;
            else if (t.status === 'waiting') counts.waiting++;
            else if (t.status === 'closed') counts.closed++;
        });
        return counts;
    }, [allTickets]);

    // Fetch All Tickets
    const fetchTickets = async () => {
        try {
            setLoading(true);
            // Fetch all tickets for client-side functionality
            const response = await fetch(`/api/admin/support/tickets?limit=1000&status=all`);

            if (response.ok) {
                const data = await response.json();
                setAllTickets(data.tickets || []);
            } else {
                console.error("Failed to fetch tickets");
            }
        } catch (error) {
            console.error("Error fetching tickets:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTickets();
    }, []);

    // Filter Logic
    const filteredTickets = useMemo(() => {
        if (!allTickets) return [];

        return allTickets.filter(ticket => {
            // 1. Status Filter (Tab)
            if (activeTab !== "All") {
                if (ticket.status !== activeTab.toLowerCase()) return false;
            }

            // 2. Search Filter
            if (!searchQuery) return true;
            const lowerQuery = searchQuery.toLowerCase();
            return (
                (ticket.subject || "").toLowerCase().includes(lowerQuery) ||
                (ticket.initialMessage || "").toLowerCase().includes(lowerQuery) ||
                (ticket.name || "").toLowerCase().includes(lowerQuery) ||
                (ticket.email || "").toLowerCase().includes(lowerQuery) ||
                (ticket.ticketNumber || "").toLowerCase().includes(lowerQuery)
            );
        });
    }, [allTickets, activeTab, searchQuery]);

    // Pagination Logic
    const visibleTickets = useMemo(() => {
        if (itemsPerPage === 'All') return filteredTickets;
        return filteredTickets.slice(0, itemsPerPage);
    }, [filteredTickets, itemsPerPage]);

    // Config
    const navTabs = [
        { name: "All", count: stats.all },
        { name: "Open", count: stats.open },
        { name: "Waiting", count: stats.waiting },
        { name: "Closed", count: stats.closed }
    ];

    const summaryCards = [
        { key: 'total', label: 'Total Tickets', count: stats.all },
        { key: 'waiting', label: 'Waiting on Feature', count: stats.waiting },
        { key: 'open', label: 'In Progress', count: stats.open },
        { key: 'closed', label: 'Resolved', count: stats.closed }
    ];

    const formatDate = (dateStr) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleDateString('en-US', {
            month: 'short', day: 'numeric', year: 'numeric'
        });
    };

    if (loading) {
        return (
            <div className="h-[calc(100vh-200px)] w-full relative">
                <GlobalLoader fullScreen={false} />
            </div>
        );
    }

    return (
        <div className="w-full space-y-6">

            {/* Page Header Section */}
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-[#1E4032]">Support Center</h1>
                <p className="text-gray-500 mt-1 text-sm">
                    Manage support tickets and user inquiries
                </p>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {summaryCards.map((card) => (
                    <div key={card.key} className="bg-white border border-gray-200 rounded-lg p-6 flex flex-col justify-between h-32 relative overflow-hidden shadow-sm">
                        <div className="flex justify-between items-start">
                            <div>
                                <h2 className="text-3xl font-bold text-[#1E4032]">{card.count}</h2>
                                <p className="text-gray-400 text-sm mt-1">{card.label}</p>
                            </div>
                            <div className="w-12 h-12 bg-[#FFF3E1] rounded-lg flex items-center justify-center text-[#C0934B] border border-[#F5E6CC]">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                                </svg>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Main Content White Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">

                {/* Header Controls: Tabs + Search + Rows */}
                <div className="sticky top-0 z-10 bg-white flex flex-col xl:flex-row justify-between items-start xl:items-center p-4 border-b border-gray-100 gap-4">

                    {/* Tabs */}
                    <div className="flex items-center gap-6 overflow-x-auto w-full xl:w-auto pb-2 xl:pb-0">
                        {navTabs.map((tab) => (
                            <button
                                key={tab.name}
                                onClick={() => setActiveTab(tab.name)}
                                className={`relative flex items-center gap-2 text-sm font-medium transition-colors pb-1 border-b-2 ${activeTab === tab.name
                                    ? "text-[#C0934B] border-[#C0934B]"
                                    : "text-gray-500 border-transparent hover:text-gray-700"
                                    }`}
                            >
                                {tab.name}
                                <span className={`flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 rounded-full text-xs ${activeTab === tab.name ? "bg-[#FFF8DC] text-[#C0934B]" : "bg-gray-100 text-gray-500"
                                    }`}>
                                    {tab.count}
                                </span>
                            </button>
                        ))}
                    </div>

                    {/* Right Controls */}
                    <div className="flex items-center gap-3 w-full xl:w-auto">
                        {/* Rows Per Page */}
                        <div className="relative">
                            <select
                                value={itemsPerPage}
                                onChange={(e) => setItemsPerPage(e.target.value === 'All' ? 'All' : Number(e.target.value))}
                                className="appearance-none px-4 py-2 pr-8 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C0934B]/50 focus:border-[#C0934B] bg-white cursor-pointer text-sm"
                            >
                                <option value={10}>10</option>
                                <option value={30}>30</option>
                                <option value={50}>50</option>
                                <option value={100}>100</option>
                                <option value="All">All</option>
                            </select>
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                </svg>
                            </div>
                        </div>

                        {/* Search Box */}
                        <div className="relative w-full sm:w-64">
                            <input
                                type="text"
                                placeholder="Search tickets..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C0934B]/50 focus:border-[#C0934B] transition-colors text-sm"
                            />
                            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                        </div>
                    </div>
                </div>

                {/* Tickets List */}
                <div className="flex flex-col divide-y divide-gray-100">
                    {visibleTickets.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">
                            {searchQuery ? "No matching tickets found." : "No tickets found."}
                        </div>
                    ) : (
                        visibleTickets.map((ticket) => {
                            const lastMsg = ticket.messages?.[ticket.messages?.length - 1]?.message || ticket.initialMessage || 'No messages';
                            const uiStatus = ticket.status.charAt(0).toUpperCase() + ticket.status.slice(1);
                            const assignedToName = ticket.status === 'waiting' ? 'Waiting..' : (ticket.assignedAdmin?.name || ticket.assignedTo?.name || 'Unassigned');
                            const msgCount = ticket.messages?.length || 0;

                            return (
                                <div
                                    key={ticket._id}
                                    className="p-6 flex flex-col lg:flex-row gap-6 justify-between items-start lg:items-center hover:bg-gray-50/50 transition-colors bg-white"
                                >
                                    {/* Left Content */}
                                    <div className="flex-1 space-y-4 w-full">
                                        <div>
                                            <h3 className="text-lg font-bold text-[#1E4032]">{ticket.subject}</h3>
                                            <p className="text-gray-500 text-sm mt-1 line-clamp-1">{lastMsg}</p>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500 font-medium">
                                            <span>User: {ticket.user?.name || ticket.name || "Guest"}</span>
                                            <span className="hidden sm:inline w-px h-3 bg-gray-300"></span>
                                            <span>Assigned to : {assignedToName}</span>
                                            <span className="hidden sm:inline w-px h-3 bg-gray-300"></span>
                                            <span>{msgCount} messages</span>
                                        </div>
                                    </div>

                                    {/* Right Content */}
                                    <div className="flex flex-col items-start lg:items-end gap-3 w-full lg:w-auto mt-2 lg:mt-0">
                                        <div className="flex items-center gap-2 self-start lg:self-end">
                                            <span className="bg-[#FFF8DC] text-[#C0934B] px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap">
                                                {ticket.category ? ticket.category.replace('_', ' ') : 'General'}
                                            </span>
                                            <span
                                                className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${uiStatus === "Open"
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

                                        <Link href={`/admin-dashboard/support/${ticket._id}`} className="self-start lg:self-end mt-2">
                                            <button className="flex items-center gap-2 text-[#1E4032] hover:text-[#C0934B] text-sm font-medium transition-colors">
                                                View Details <HiArrowRight />
                                            </button>
                                        </Link>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
}
