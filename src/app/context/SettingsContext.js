"use client";

import { createContext, useContext, useState } from "react";

const SettingsContext = createContext(null);

export function SettingsProvider({ children, initialSettings }) {
    const [settings, setSettings] = useState(initialSettings || {
        general: {},
        header: { menuItems: [] },
        footer: { section1: { links: [] }, section2: { links: [] }, contactInfo: {} }
    });

    const updateSettings = (newSettings) => {
        setSettings(newSettings);
    };

    return (
        <SettingsContext.Provider value={{ settings, updateSettings }}>
            {children}
        </SettingsContext.Provider>
    );
}

export function useSettings() {
    return useContext(SettingsContext);
}
