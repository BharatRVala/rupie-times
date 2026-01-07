"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useId, useState } from "react";
import logo from "../assets/logo.svg";
import SearchModal from "./SearchModal";
import CrownIcon from "./CrownIcon";

import { useAuth } from "../../hook/useAuth";

const NAV_ITEMS = [
  { name: "Rupie Talk", href: "/rupiesTimeTalk" },
  { name: "Advertise With US", href: "/advertisewithus" },
  { name: "Our Products", href: "/products" },
  { name: "About Us", href: "/about" },
  { name: "Contact Us", href: "/contact-us" },
  { name: "Trial Products", href: "/user-dashboard/trial-products" }, // Should be in menu or just button? Added here just in case? No user didn't ask.
];
// Removing Trial Products from NAV_ITEMS if not needed there.

export default function Navbar({ settings }) {
  const pathname = usePathname();
  const router = useRouter();
  const { isLoggedIn } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const [announcementDismissed, setAnnouncementDismissed] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const menuButtonId = useId();
  const menuPanelId = useId();

  // Dynamic Navigation Items
  const navItems = settings?.header?.menuItems?.length
    ? settings.header.menuItems.map(item => ({ name: item.label, href: item.link }))
    : NAV_ITEMS;

  // Dynamic Logo - use width/height from Image component normally, but for remote URL we need width/height or fill.
  // The existing logo usage is: src={logo} (imported svg)
  const logoSrc = settings?.general?.headerLogo || settings?.general?.logo || logo;
  // If remote logo, Next/Image requires configured domains or unoptimized.
  // For safety/ease in MVP, we can use <img /> or unoptimized Image for dynamic URL
  const isDynamicLogo = !!(settings?.general?.headerLogo || settings?.general?.logo);

  // Handle scroll detection
  useEffect(() => {
    const handleScroll = () => {
      // Disable fixed behavior on dashboard to prevent layout jumps
      if (pathname.startsWith('/user-dashboard')) {
        setIsScrolled(false);
        document.body.classList.remove("nav-fixed");
        return;
      }

      const scrollPosition = window.scrollY;
      const announcementHeight = 50;
      const scrolled = scrollPosition > announcementHeight;
      setIsScrolled(scrolled);

      if (scrolled) {
        document.body.classList.add("nav-fixed");
      } else {
        document.body.classList.remove("nav-fixed");
      }
    };

    window.addEventListener("scroll", handleScroll);
    // Check on mount 
    handleScroll();
    return () => {
      window.removeEventListener("scroll", handleScroll);
      document.body.classList.remove("nav-fixed");
    };
  }, [pathname]);

  // Show announcement when scrolled back to top (unless manually dismissed)
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY < 10 && announcementDismissed) {
        // Optionally re-show when back at top, or keep dismissed
        // setAnnouncementDismissed(false);
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [announcementDismissed]);

  // Close on ESC for accessibility
  useEffect(() => {
    if (!mobileOpen) return;
    const onKeyDown = (e) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mobileOpen]);

  // Prevent body scroll when menu open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
  }, [mobileOpen]);

  return (
    <>
      {/* Announcement Banner - Non-sticky, scrolls with page */}
      {/* {!announcementDismissed && pathname === "/" && (
        <div className="bg-[#E3E3E3] text-black w-full">
          <div className="mx-auto max-w-7xl px-4 sm:px-5 md:px-6 lg:px-8">
            <div className="flex items-center justify-center gap-4 py-2.5 sm:py-3">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <p className="text-sm sm:text-base font-semibold truncate text-black">
                  Subscribe now to get the latest stock market products.
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <Link
                  href="/products"
                  className="hidden sm:inline-flex items-center rounded-[5px] bg-[#1E4032] px-4 py-1.5 text-sm font-semibold text-white shadow-sm hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#1E4032] transition whitespace-nowrap"
                >
                  Subscribe Now
                </Link>
                <button
                  onClick={() => setAnnouncementDismissed(true)}
                  className="shrink-0 rounded-md p-1.5 text-black hover:bg-black/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-black transition"
                  aria-label="Close announcement"
                >
                  <svg
                    className="h-4 w-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      )} */}

      {/* Navigation Bar - Sticky when at top, fixed when scrolled past announcement */}
      <header
        className={`${isScrolled ? "fixed top-0" : "sticky top-0"
          } inset-x-0 z-50 backdrop-blur supports-[backdrop-filter]:bg-white/10 bg-white/10 border-b border-slate-200/70`}
      >
        <nav
          className="mx-auto flex h-16 sm:h-18 lg:h-20 max-w-7xl items-center justify-between px-4 sm:px-5 md:px-6 lg:px-8"
          aria-label="Primary"
        >
          {/* Mobile Layout: Hamburger -> Logo -> Search -> Login -> Take a Trial */}
          <div className="flex lg:hidden items-center gap-2 sm:gap-3 flex-1">
            {/* Hamburger Menu - Left */}
            <button
              id={menuButtonId}
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileOpen}
              aria-controls={menuPanelId}
              onClick={() => setMobileOpen((v) => !v)}
              className="flex items-center justify-center rounded-md p-2 text-black hover:bg-slate-100/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 transition"
            >
              <svg
                className="size-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                {mobileOpen ? (
                  <path d="M18 6L6 18M6 6l12 12" />
                ) : (
                  <path d="M3 6h18M3 12h18M3 18h18" />
                )}
              </svg>
            </button>

            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 group" aria-label="Rupie Times Home">
              {isDynamicLogo ? (
                <img src={logoSrc} alt="Rupie Times logo" className="h-10 w-auto sm:h-12 object-contain" />
              ) : (
                <Image
                  src={logoSrc}
                  alt="Rupie Times logo"
                  priority
                  className="h-10 w-auto sm:h-12"
                />
              )}
            </Link>

            {/* Spacer to push items to right */}
            <div className="flex-1" />

            {/* Search Icon */}
            <button
              onClick={() => setIsSearchOpen(true)}
              className="flex items-center justify-center rounded-md p-2 text-black hover:bg-slate-100/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 transition"
              aria-label="Search"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
            </button>

            {/* User/Login Icon */}
            {isLoggedIn ? (
              <Link
                href="/user-dashboard"
                className="flex items-center justify-center gap-2 rounded-[5px] bg-[#1E4032] px-3 py-1.5 text-white shadow-sm hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1E4032] transition"
                aria-label="Dashboard"
              >
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="3" y="3" width="7" height="7" />
                  <rect x="14" y="3" width="7" height="7" />
                  <rect x="14" y="14" width="7" height="7" />
                  <rect x="3" y="14" width="7" height="7" />
                </svg>
                <span className="text-sm font-semibold">Desk</span>
              </Link>
            ) : (
              <Link
                href="/auth"
                className="flex items-center justify-center gap-2 rounded-[5px] bg-[#1E4032] px-3 py-1.5 text-white shadow-sm hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1E4032] transition"
                aria-label="Login"
              >
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                <span className="text-sm font-semibold">Login</span>
              </Link>
            )}

            {/* Take a Trial Button */}
            <button
              onClick={() => {
                if (isLoggedIn) {
                  router.push('/user-dashboard/trial-products?activate_trial=true');
                } else {
                  // Redirect to auth with return url including the activation param
                  const redirectUrl = encodeURIComponent('/user-dashboard/trial-products?activate_trial=true');
                  router.push(`/auth?redirect=${redirectUrl}`);
                }
              }}
              className="inline-flex rounded-[5px] bg-transparent border border-[#1E4032] px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold text-[#1E4032] shadow-sm hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#1E4032] transition whitespace-nowrap"
            >
              Trial
            </button>
          </div>

          {/* Desktop Layout: Logo -> Navigation Menu -> Icons -> Take a Trial */}
          <div className="hidden lg:flex items-center justify-between w-full">
            {/* Left: Logo */}
            <div className="flex items-center gap-2">
              <Link href="/" className="flex items-center gap-2 group" aria-label="Rupie Times Home">
                {isDynamicLogo ? (
                  <img src={logoSrc} alt="Rupie Times logo" className="h-14 w-auto object-contain" />
                ) : (
                  <Image
                    src={logoSrc}
                    alt="Rupie Times logo"
                    priority
                    className="h-14 w-auto"
                  />
                )}
              </Link>
            </div>

            {/* Center: Desktop navigation */}
            <div className="flex bg-[#E3E3E3] rounded-lg p-2 items-center gap-1 xl:gap-2">
              {navItems.map((item, index) => {
                const isActive = pathname === item.href;
                // Highlight the second item (index 1) - "Advertise With US"
                const isHighlighted = index === 1;

                return (
                  <div key={item.name} className="relative group/nav">
                    <Link
                      href={item.href}
                      className={`relative z-10 block px-3 xl:px-4 py-2 text-sm xl:text-[0.95rem] rounded-md transition focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60 
                      ${isHighlighted
                          ? "text-white bg-[#007846ba] shadow-sm font-bold hover:bg-[#1E4032]/90 hover:shadow-md"
                          : isActive
                            ? "text-slate-900 bg-slate-100/80 font-semibold"
                            : "text-slate-700 hover:text-slate-900 hover:bg-slate-100/80 font-semibold"
                        }`}
                    >
                      {item.name}
                    </Link>
                    {isHighlighted && (
                      <div className="absolute -top-3 -right-3 pointer-events-none z-20">
                        <CrownIcon className="w-5 h-5 xl:w-6 xl:h-6 text-[#c19855] rotate-[40deg] drop-shadow-sm transform" color="currentColor" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            {/* Right: Icons and CTA */}
            <div className="flex items-center gap-4">
              {/* Search Icon */}
              <button
                onClick={() => setIsSearchOpen(true)}
                className="flex items-center justify-center rounded-md p-2 text-black hover:bg-slate-100/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 transition"
                aria-label="Search"
              >
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.35-4.35" />
                </svg>
              </button>

              {/* User/Login Icon */}
              {isLoggedIn ? (
                <Link
                  href="/user-dashboard"
                  className="flex items-center justify-center gap-2 rounded-md bg-primary px-3.5 py-2 text-white shadow-sm hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-accent transition"
                  aria-label="Dashboard"
                >
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect x="3" y="3" width="7" height="7" />
                    <rect x="14" y="3" width="7" height="7" />
                    <rect x="14" y="14" width="7" height="7" />
                    <rect x="3" y="14" width="7" height="7" />
                  </svg>
                  <span className="text-sm font-semibold">Desk</span>
                </Link>
              ) : (
                <Link
                  href="/auth"
                  className="flex items-center justify-center gap-2 rounded-md bg-primary px-3.5 py-2 text-white shadow-sm hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-accent transition"
                  aria-label="Login"
                >
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                  <span className="text-sm font-semibold">Login</span>
                </Link>
              )}

              <button
                onClick={() => {
                  if (isLoggedIn) {
                    router.push('/user-dashboard/trial-products?activate_trial=true');
                  } else {
                    const redirectUrl = encodeURIComponent('/user-dashboard/trial-products?activate_trial=true');
                    router.push(`/auth?redirect=${redirectUrl}`);
                  }
                }}
                className="inline-flex rounded-md bg-transparent border border-primary px-3.5 py-2 text-sm font-semibold text-primary shadow-sm hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-accent transition"
              >
                Trial
              </button>
            </div>
          </div>
        </nav>
      </header>

      <SearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />

      <SearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />

      {/* Mobile panel - Overlay menu - Outside header */}
      {mobileOpen && (
        <div
          id={menuPanelId}
          className={`fixed left-0 bottom-0 w-full sm:w-96 bg-white shadow-2xl z-[9999] lg:hidden flex flex-col top-16 sm:top-18`}
          style={{
            display: 'flex',
            visibility: 'visible'
          }}
        >
          {/* Menu items */}
          <div className="flex flex-col flex-1 px-4 sm:px-6 pb-4 pt-0 overflow-y-auto">
            <div className="flex flex-col gap-2">
              {navItems.map((item, index) => {
                const isActive = pathname === item.href;
                const isHighlighted = index === 1;

                return (
                  <div key={item.name} className="relative">
                    <Link
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      className={`block relative rounded-md px-4 py-4 text-base transition focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500
                          ${isHighlighted
                          ? "bg-[#1E4032] text-white font-bold"
                          : isActive
                            ? "bg-slate-100/80 text-black font-bold"
                            : "text-slate-800 hover:bg-slate-100/80 font-medium"
                        }`}
                    >
                      <div className="flex items-center justify-between">
                        <span>{item.name}</span>
                      </div>
                    </Link>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}