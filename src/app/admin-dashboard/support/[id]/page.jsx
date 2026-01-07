"use client";

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import SupportChat from '@/app/components/SupportChat';
import { HiArrowLeft } from "react-icons/hi";
import GlobalLoader from "@/app/components/GlobalLoader";

export default function AdminTicketDetailPage({ params }) {

    const unwrappedParams = use(params);

    const [ticket, setTicket] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const router = useRouter();

    useEffect(() => {
        if (unwrappedParams?.id) fetchTicket(unwrappedParams.id);
    }, [unwrappedParams?.id]);

    const fetchTicket = async (ticketId) => {
        try {
            setLoading(true);
            const response = await fetch(`/api/admin/support/tickets/${ticketId}`, {
                credentials: 'include'
            });
            const data = await response.json();
            if (data.success) {
                setTicket(data.ticket);
            } else {
                setError(data.error || 'Failed to load ticket');
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSendMessage = async (message, attachments = []) => {
        const response = await fetch(`/api/admin/support/tickets/${ticket._id}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ message, attachments })
        });

        if (!response.ok) {
            throw new Error('Failed to send');
        }

        const data = await response.json();
        return data.ticket;
    };

    const handleStatusChange = async (newStatus) => {
        try {
            const response = await fetch(`/api/admin/support/tickets/${ticket._id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus })
            });

            if (response.ok) {
                const data = await response.json();
                setTicket(data.ticket);
            }
        } catch (error) {
            console.error('Failed to update status:', error);
        }
    };

    if (loading) return (
        <div className="h-[calc(100vh-140px)] flex items-center justify-center p-8">
            <GlobalLoader fullScreen={false} />
        </div>
    );

    if (error || !ticket) return (
        <div className="p-8 text-center">
            <p className="text-red-500 mb-4">{error || "Ticket not found"}</p>
            <button onClick={() => router.back()} className="text-gray-500 hover:underline">Go Back</button>
        </div>
    );

    return (
        <div className="w-full space-y-6 flex flex-col h-[calc(100vh-140px)]">
            <div className="flex items-center justify-between">
                <button
                    onClick={() => router.back()}
                    className="flex items-center gap-2 text-[#1E4032] hover:text-[#C0934B] font-medium transition-colors"
                >
                    <HiArrowLeft size={20} />
                    Back To Support
                </button>

                <div className="relative">
                    <select
                        value={ticket.status}
                        onChange={(e) => handleStatusChange(e.target.value)}
                        className={`appearance-none px-4 py-2 pr-8 rounded-lg text-white font-medium text-sm transition-colors cursor-pointer focus:outline-none ${ticket.status === 'open' || ticket.status === 'active' ? 'bg-[#C0934B] hover:bg-[#a37c3f]' :
                            ticket.status === 'closed' ? 'bg-red-500 hover:bg-red-600' :
                                'bg-gray-500 hover:bg-gray-600'
                            }`}
                    >
                        <option value="open">Open</option>
                        <option value="waiting">Waiting</option>
                        <option value="closed">Closed</option>
                    </select>
                </div>
            </div>

            <SupportChat
                ticket={ticket}
                onSendMessage={handleSendMessage}
                userType="admin"
                otherPartyName={ticket.user?.name || ticket.name || "User"}
                otherPartyEmail={ticket.user?.email || ticket.email || ""}
            />
        </div>
    );
}
