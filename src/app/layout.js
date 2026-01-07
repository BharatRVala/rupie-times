
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import SmoothScroll from "./components/SmoothScroll";
import { CartProvider } from './context/CartContext';
import { AuthProvider } from './context/AuthContext';
import { FavoritesProvider } from './context/FavoritesContext';
import ClickSpark from "./components/ClickSpark";
import CanvasCursor from "./components/CanvasCursor";
import NavigationWrapper from "./components/NavigationWrapper";
import { SettingsProvider } from "./context/SettingsContext"; // Import Context
import dbConnect from "@/app/lib/utils/dbConnect";
import SiteSettings from "@/app/lib/models/SiteSettings";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata() {
  const settings = await getSiteSettings();

  return {
    title: "Rupie Times",
    description: "Market news, insights, subscriptions, and investor education.",
    icons: {
      icon: settings?.general?.favicon || '/favicon.ico',
      shortcut: settings?.general?.favicon || '/favicon.ico',
      apple: settings?.general?.favicon || '/favicon.ico',
    }
  };
}

async function getSiteSettings() {
  try {
    await dbConnect();
    const settings = await SiteSettings.getSettings();
    // Serialize mongoose document to plain object for client component
    return JSON.parse(JSON.stringify(settings));
  } catch (error) {
    console.error("Failed to fetch settings in layout:", error);
    return null;
  }
}

export default async function RootLayout({ children }) {
  const settings = await getSiteSettings();

  return (
    <html lang="en" className="scroll-pt-20">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <SmoothScroll>
          <ClickSpark
            sparkColor='#00301F'
            sparkSize={10}
            sparkRadius={15}
            sparkCount={8}
            duration={400}
          >
            <AuthProvider>
              <CartProvider>
                <FavoritesProvider>
                  <SettingsProvider initialSettings={settings}>
                    <NavigationWrapper>
                      <CanvasCursor />
                      <main>{children}</main>
                    </NavigationWrapper>
                  </SettingsProvider>
                </FavoritesProvider>
              </CartProvider>
            </AuthProvider>
          </ClickSpark>
        </SmoothScroll>
      </body>
    </html>
  );
}