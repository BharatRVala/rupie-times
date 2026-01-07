"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import FloatingCartButton from "../components/FloatingCartButton";
import PendingArchiveHandler from "../components/PendingArchiveHandler";
import { useSettings } from "../context/SettingsContext";

export default function NavigationWrapper({ children }) {
    const pathname = usePathname();
    const isAdminRoute = pathname.startsWith("/admin-dashboard") || pathname.startsWith("/auth/admin");

    // Use settings from Context (provided by RootLayout -> SettingsProvider)
    const { settings } = useSettings();



    return (
        <>
            {!isAdminRoute && <PendingArchiveHandler />}
            {!isAdminRoute && <Navbar settings={settings} />}
            {children}
            {!isAdminRoute && <FloatingCartButton />}
            {!isAdminRoute && <Footer settings={settings} />}
        </>
    );
}
