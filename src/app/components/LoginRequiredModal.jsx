'use client';
import React from 'react';
import { IoClose } from "react-icons/io5";

const LoginRequiredModal = ({ isOpen, onClose, message }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white text-black p-6 rounded-xl shadow-2xl max-w-md w-full relative border border-gray-100">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-black transition-colors"
                >
                    <IoClose size={24} />
                </button>
                <h3 className="text-xl font-bold mb-2 text-[#00301F]">Login Required</h3>
                <p className="text-gray-600 mb-6 font-medium leading-relaxed">
                    {message || "Please login to perform this action."}
                </p>
                <div className="flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium transition-colors"
                    >
                        Cancel
                    </button>
                    <a
                        href="/login"
                        className="px-6 py-2 bg-[#00301F] text-white rounded-lg hover:bg-[#00301F]/90 transition-colors font-medium shadow-lg shadow-[#00301F]/20"
                    >
                        Login
                    </a>
                </div>
            </div>
        </div>
    );
};

export default LoginRequiredModal;
