"use client";

import Image from "next/image";
import Link from "next/link";
import { useSettings } from "@/app/context/SettingsContext";
import logo from "../../assets/logo.svg";

export default function AdminNavbar() {
    const { settings } = useSettings();
    const logoSrc = settings?.general?.headerLogo || settings?.general?.logo || logo;
    const isDynamicLogo = !!(settings?.general?.headerLogo || settings?.general?.logo);

    return (
        <header className="fixed top-0 inset-x-0 z-50 bg-white border-b border-gray-200 h-16 lg:h-20">
            <div className="h-full px-4 sm:px-6 lg:px-8 flex items-center justify-between max-w-full mx-auto">
                {/* Logo */}
                <div className="flex items-center gap-2">
                    <Link href="/" className="flex items-center gap-2 group" aria-label="Rupie Times Home">
                        {isDynamicLogo ? (
                            <img src={logoSrc} alt="Rupie Times logo" className="h-10 w-auto sm:h-12 object-contain" />
                        ) : (
                            <Image
                                src={logo}
                                alt="Rupie Times logo"
                                priority
                                className="h-10 w-auto sm:h-12"
                            />
                        )}
                    </Link>
                </div>

                {/* View as User Button */}
                <Link
                    href="/"
                    className="inline-flex items-center justify-center rounded-lg bg-[#1E4032] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-90 transition-opacity whitespace-nowrap"
                >
                    View as User
                </Link>
            </div>
        </header>
    );
}
