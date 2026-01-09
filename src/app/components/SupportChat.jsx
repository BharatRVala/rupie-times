"use client";

import { useEffect, useRef, useState, useLayoutEffect } from 'react';
import { io } from 'socket.io-client';
import { HiPaperAirplane, HiPhotograph, HiX } from "react-icons/hi";

export default function SupportChat({
    ticket,
    onSendMessage,
    userType = 'user',
    otherPartyName = 'Support Agent',
}) {
    // --- Logic State (from Reference) ---
    const [messages, setMessages] = useState(ticket?.messages || []);
    const [currentStatus, setCurrentStatus] = useState(ticket?.status || 'waiting');

    // --- UI State (from SupportConversationPage) ---
    const [newMessage, setNewMessage] = useState("");
    const messagesContainerRef = useRef(null);
    const fileInputRef = useRef(null);
    const [selectedImage, setSelectedImage] = useState(null);

    // --- Socket Refs ---
    const socketRef = useRef(null);
    const typingTimeoutRef = useRef(null);
    const [isTyping, setIsTyping] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [uploading, setUploading] = useState(false);

    const isClosed = currentStatus === "closed";

    // --- Socket & Setup Logic ---
    useEffect(() => {
        if (!ticket?._id) return;

        // Initialize Socket.io
        // Defaults to connecting to the same host/port serving the page
        const socket = io({
            path: '/socket.io', // Standard path
        });

        socket.on('connect', () => {
            // console.log('Connected to socket server');
            socket.emit('join_ticket', ticket._id);
        });

        socket.on('receive_message', (newMessage) => {
            setMessages((prev) => {
                // Prevent duplicates
                const exists = prev.some(m =>
                    (m._id && m._id === newMessage._id) ||
                    (m.createdAt === newMessage.createdAt && m.message === newMessage.message)
                );
                if (exists) return prev;
                return [...prev, newMessage];
            });
        });

        socket.on('status_changed', (newStatus) => {
            setCurrentStatus(newStatus);
        });

        socket.on('user_typing', (data) => {
            // Check if others are typing
            // We assume backend broadcasts to others in room, but we double check userId if possible
            // For now, if we receive it and it's not us (logic can be refined if we had myUserId)
            // But 'socket.to(...).emit' in server specifically excludes sender, so we don't need to filter!
            setIsTyping(data.typing);
        });

        // Store for cleanup and access
        socketRef.current = socket;

        return () => {
            socket.off('connect');
            socket.off('receive_message');
            socket.off('status_changed');
            socket.off('user_typing');
            socket.disconnect();
            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        };
    }, [ticket?._id]);

    // Sync props with state
    useEffect(() => {
        if (ticket) {
            setMessages(ticket.messages || []);
            setCurrentStatus(ticket.status);
        }
    }, [ticket]);

    // --- Scroll Logic ---
    const scrollToBottom = (smooth = true) => {
        const container = messagesContainerRef.current;
        if (container) {
            container.scrollTo({
                top: container.scrollHeight,
                behavior: smooth ? "smooth" : "auto"
            });
        }
    };

    // 1. INSTANT Scroll on Initial Load & Updates
    useLayoutEffect(() => {
        if (messages.length > 0) {
            scrollToBottom(false); // Instant scroll for "open with last message"
        }
    }, [messages.length]);



    // --- Logic Functions ---

    const handleTyping = () => {
        if (!ticket?._id || !socketRef.current) return;

        const triggerTyping = (isTyping) => {
            // Emit simple typing event
            socketRef.current.emit('typing', { ticketId: ticket._id, typing: isTyping });
        };

        triggerTyping(true);

        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => {
            triggerTyping(false);
        }, 1000);
    };

    const handleImageUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Reset input
        e.target.value = '';

        if (!file.type.startsWith('image/')) {
            alert('Only image files are allowed');
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            alert('File size must be less than 5MB');
            return;
        }

        setUploading(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await fetch('/api/support/upload', {
                method: 'POST',
                body: formData,
            });
            const data = await res.json();

            if (data.success) {
                // Send message with attachment
                await sendMessageInternal('', [data.attachment]);
            } else {
                alert(data.error || 'Upload failed');
            }
        } catch (error) {
            console.error('Upload error:', error);
            alert('Failed to upload image');
        } finally {
            setUploading(false);
        }
    };

    const sendMessageInternal = async (msgText, attachments = []) => {
        if ((!msgText.trim() && attachments.length === 0) || submitting) return;

        setSubmitting(true);
        try {
            // Stop typing indicator
            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
            if (socketRef.current) socketRef.current.emit('typing', { ticketId: ticket._id, typing: false });

            // Call parent prop to save to DB
            const savedTicketData = await onSendMessage(msgText.trim(), attachments);

            // Extract the new message object from the response
            const newMsgObj = savedTicketData.messages[savedTicketData.messages.length - 1];

            // Optimistic update: Show message immediately (Check for duplicates from socket)
            setMessages(prev => {
                const exists = prev.some(m => m._id === newMsgObj._id);
                if (exists) return prev;
                return [...prev, newMsgObj];
            });

            // Emit via socket - REMOVED (Handled by API + Pusher Trigger)
            /*
            if (socketRef.current) {
                // Pusher updates come via the channel subscription
            }
            */

            setNewMessage("");
            setTimeout(() => scrollToBottom(true), 10);

        } catch (error) {
            console.error("Failed to send:", error);
            alert("Failed to send message");
        } finally {
            setSubmitting(false);
        }
    };

    const handleSendMessageBtn = () => {
        sendMessageInternal(newMessage);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessageBtn();
        }
    };

    // Helper to format time (UI requirement)
    const formatTime = (dateStr) => {
        try {
            return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } catch (e) { return ''; }
    };


    return (
        <div className="w-full space-y-6 flex flex-col h-[calc(100vh-140px)]">

            {/* Chat Container */}
            <div className="flex-1 backdrop-blur supports-[backdrop-filter]:bg-white/10 bg-white/10 border border-gray-200 rounded-xl overflow-hidden flex flex-col shadow-sm">

                {/* Chat Header */}
                <div className="p-4 border-b border-gray-100 flex items-center justify-between supports-[backdrop-filter]:bg-white/10 bg-white/10">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#FFF8DC] flex items-center justify-center text-[#C0934B] font-bold text-sm">
                            {otherPartyName ? otherPartyName.slice(0, 2).toUpperCase() : 'SA'}
                        </div>
                        <div>
                            <h3 className={`text-sm font-bold ${currentStatus === 'waiting' ? 'text-[#C0934B]' : 'text-[#1E4032]'}`}>
                                {otherPartyName}
                            </h3>
                            <p className="text-xs text-gray-500">Support Team</p>
                        </div>
                    </div>

                    {/* Status on the right */}
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/50 border border-gray-100 shadow-sm">
                        <span className={`w-2 h-2 rounded-full ${currentStatus === 'open' ? 'bg-green-500 animate-pulse' :
                            currentStatus === 'waiting' ? 'bg-[#C0934B]' :
                                'bg-gray-400'
                            }`}></span>
                        <span className={`text-xs font-semibold ${currentStatus === 'open' ? 'text-green-600' :
                            currentStatus === 'waiting' ? 'text-[#C0934B]' :
                                'text-gray-500'
                            }`}>
                            {currentStatus.charAt(0).toUpperCase() + currentStatus.slice(1)}
                        </span>
                    </div>
                </div>

                {/* Subject Line */}
                <div className="px-6 py-2 backdrop-blur supports-[backdrop-filter]:bg-gray-50/50 bg-gray-50/50 border-b border-gray-100 flex justify-between items-center text-xs text-gray-500">
                    <span className="font-medium text-[#1E4032]">{ticket.subject}</span>
                    <span>{new Date(ticket.createdAt).toLocaleDateString()}</span>
                </div>

                {/* Messages Area */}
                <div
                    ref={messagesContainerRef}
                    className="flex-1 overflow-y-auto p-6 space-y-6 bg-gray-50/30 custom-scrollbar"
                    data-lenis-prevent
                >
                    {messages.map((msg, index) => {
                        // Logic: Determine if message is from "me" or "them"
                        // If userType is 'user', then 'me' is !msg.isAdmin
                        // If userType is 'admin', then 'me' is msg.isAdmin
                        const isMe = userType === 'user' ? !msg.isAdmin : msg.isAdmin;

                        const msgContent = msg.message;
                        const msgImage = msg.attachments && msg.attachments.length > 0 ? (msg.attachments[0].url || `/api/support/image/${msg.attachments[0].filename}`) : null;
                        const msgTime = formatTime(msg.createdAt);

                        return (
                            <div key={msg._id || index} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                                <div className={`max-w-[80%] md:max-w-[60%] relative group ${isMe ? "items-end" : "items-start"} flex flex-col`}>

                                    {/* Bubble */}
                                    <div
                                        className={`relative ${msgImage ? 'p-1' : 'px-5 py-3'} text-sm leading-relaxed shadow-sm
                                        ${isMe
                                                ? "bg-[#C0934B] text-white rounded-3xl rounded-br-none"
                                                : "bg-white text-gray-700 border border-gray-200 rounded-3xl rounded-bl-none"
                                            }
                                    `}
                                    >
                                        {!msgImage && null}

                                        {msgImage ? (
                                            <div
                                                className="cursor-pointer overflow-hidden rounded-2xl"
                                                onClick={() => setSelectedImage(msgImage)}
                                            >
                                                <img
                                                    src={msgImage}
                                                    alt="Uploaded attachment"
                                                    onLoad={() => scrollToBottom(true)}
                                                    className="block max-w-[280px] sm:max-w-sm max-h-80 object-cover hover:scale-[1.02] transition-transform duration-200"
                                                />
                                            </div>
                                        ) : (
                                            <p>{msgContent}</p>
                                        )}
                                    </div>

                                    {/* Timestamp */}
                                    <span className="text-[10px] text-gray-400 mt-1 px-1">
                                        {msgTime}
                                    </span>
                                </div>
                            </div>
                        );
                    })}

                </div>

                {/* Input Area */}
                <div className="p-4 bg-white border-t border-gray-100">
                    <div className={`relative flex items-center border border-gray-300 rounded-xl px-2 py-2 bg-white ${isClosed ? 'opacity-60 cursor-not-allowed' : 'focus-within:border-[#C0934B] focus-within:ring-1 focus-within:ring-[#C0934B]'}`}>

                        <input
                            type="file"
                            ref={fileInputRef}
                            className="hidden"
                            accept="image/png, image/jpeg, image/jpg, image/webp"
                            onChange={handleImageUpload}
                        />

                        <button
                            disabled={isClosed || uploading}
                            onClick={() => fileInputRef.current?.click()}
                            className="p-2 text-gray-400 hover:text-[#C0934B] transition-colors rounded-full hover:bg-gray-50"
                            title="Attach Image"
                        >
                            {uploading ? <div className="animate-spin w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full"></div> : <HiPhotograph size={20} />}
                        </button>

                        <input
                            type="text"
                            value={newMessage}
                            onChange={(e) => { setNewMessage(e.target.value); handleTyping(); }}
                            onKeyDown={handleKeyDown}
                            placeholder={isClosed ? "This ticket is closed" : (uploading ? "Uploading..." : "Type your message...")}
                            disabled={isClosed || uploading || submitting}
                            className="flex-1 px-3 py-2 text-sm text-[#1E4032] placeholder-gray-400 bg-transparent focus:outline-none disabled:cursor-not-allowed"
                        />

                        <button
                            onClick={handleSendMessageBtn}
                            disabled={!newMessage.trim() || isClosed || submitting}
                            className={`p-2 rounded-lg transition-all duration-200 ${newMessage.trim() && !isClosed && !submitting
                                ? "bg-[#C0934B] text-white hover:bg-[#a37c3f] shadow-sm transform hover:scale-105 active:scale-95"
                                : "bg-gray-100 text-gray-400 cursor-not-allowed"
                                }`}
                        >
                            <HiPaperAirplane className="rotate-90" size={18} />
                        </button>
                    </div>
                </div>

            </div>

            {/* Image Lightbox */}
            {selectedImage && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-fadeIn"
                    onClick={() => setSelectedImage(null)}
                >
                    <button
                        className="absolute top-6 right-6 text-white/70 hover:text-white transition-colors p-2 bg-white/10 rounded-full hover:bg-white/20"
                    >
                        <HiX size={24} />
                    </button>
                    <img
                        src={selectedImage}
                        alt="Full view"
                        className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl animate-scaleIn"
                        onClick={(e) => e.stopPropagation()}
                    />
                </div>
            )}
        </div>
    );
}
