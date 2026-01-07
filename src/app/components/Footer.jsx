"use client";

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import logo from "../assets/RT-white.svg";
import { FaMapMarkerAlt, FaPhoneAlt, FaEnvelope, FaHeart, FaFacebookF, FaTwitter, FaInstagram, FaLinkedinIn, FaYoutube } from 'react-icons/fa';
import { footerData } from '../data/footerData';
import { useSettings } from '../context/SettingsContext';

const SocialIconMap = {
  facebook: FaFacebookF,
  twitter: FaTwitter,
  instagram: FaInstagram,
  linkedin: FaLinkedinIn,
  youtube: FaYoutube
};

const Footer = ({ showInDashboard = false, settings: propSettings }) => {
  const context = useSettings();
  const settings = propSettings || context?.settings;
  const pathname = usePathname();

  // If we're on a dashboard route...
  if (pathname?.startsWith('/user-dashboard')) {
    // ...render ONLY if explicitly allowed (e.g. from DashboardLayout)
    if (!showInDashboard) {
      return null;
    }
  }

  return (
    <footer className="w-full mx-auto px-0 md:px-4 py-8 font-sans ">
      <div className="w-full max-w-7xl mx-auto px-4 py-8 font-sans">
        <div className="bg-[#00301F] rounded-[15px] p-6 lg:p-16 text-white">
          {/* Main Footer Grid - Conditional Layout for Dashboard */}
          <div className={`grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 mb-16 ${pathname?.startsWith('/user-dashboard')
            ? 'lg:grid-cols-2 xl:grid-cols-4'
            : 'lg:grid-cols-4'
            }`}>

            {/* Row 1, Col 1: Logo & Socials */}
            <div className="flex flex-col items-start">
              <div className="mb-8">
                {/* Logo Placeholder */}
                <Link href="/" className="block relative w-40 h-12 cursor-pointer">
                  {settings?.general?.footerLogo || settings?.general?.logo ? (
                    <img src={settings.general.footerLogo || settings.general.logo} alt="Rupie Times Logo" className="object-contain object-left w-full h-full" />
                  ) : (
                    <Image
                      src={logo}
                      alt="Rupie Times Logo"
                      fill
                      className="object-contain object-left"
                    />
                  )}
                </Link>
              </div>

              {/* Social Icons */}
              <div className="flex gap-4">
                {(settings?.footer?.socialLinks?.length ? settings.footer.socialLinks : footerData.socials).map((social, index) => {
                  // If from settings, it has 'platform' and 'url'. If from static, 'icon' and 'link'.
                  const Icon = social.icon || SocialIconMap[social.platform?.toLowerCase()] || FaHeart;
                  const href = social.link || social.url || "#";

                  return (
                    <Link
                      key={index}
                      href={href}
                      className="w-10 h-10 bg-white/10 rounded-md flex items-center justify-center cursor-pointer hover:bg-[#C0934B] transition-colors group"
                    >
                      <Icon className="text-white group-hover:text-white" />
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* Row 1, Col 2: Company */}
            <div className="flex flex-col">
              <h3 className="text-lg font-bold mb-6">{settings?.footer?.section1?.title || footerData.company.title}</h3>
              <ul className="space-y-4 text-gray-300 text-sm">
                {(settings?.footer?.section1?.links?.length
                  ? settings.footer.section1.links
                  : footerData.company.links
                ).map((link, index) => {
                  let href = link.link || link.href || "#";
                  if (href === "/contact") href = "/contact-us";
                  return (
                    <li key={index}>
                      <Link href={href} className="hover:text-white transition-colors">{link.label || link.text}</Link>
                    </li>
                  );
                })}

              </ul>
            </div>

            {/* Row 2, Col 1: Support */}
            <div className="flex flex-col">
              <h3 className="text-lg font-bold mb-6">{settings?.footer?.section2?.title || footerData.support.title}</h3>
              <ul className="space-y-4 text-gray-300 text-sm">
                {(settings?.footer?.section2?.links?.length
                  ? settings.footer.section2.links
                  : footerData.support.links
                ).map((link, index) => {
                  let href = link.link || link.href || "#";
                  if (href === "/contact") href = "/contact-us";
                  return (
                    <li key={index}>
                      <Link href={href} className="hover:text-white transition-colors">{link.label || link.text}</Link>
                    </li>
                  );
                })}
              </ul>
            </div>

            {/* Row 2, Col 2: Contact Us */}
            <div className="flex flex-col">
              <h3 className="text-lg font-bold mb-6">{footerData.contact.title}</h3>
              <ul className="space-y-6 text-gray-300 text-sm">
                <li className="flex items-start gap-3">
                  <FaMapMarkerAlt className="w-5 h-5 text-[#C0934B] mt-1 flex-shrink-0" />
                  <span>{settings?.footer?.contactInfo?.address || footerData.contact.info.address}</span>
                </li>
                {/* Render Phone and Email similarly if needed, or stick to static structure with dynamic values */}
                <li className="flex items-center gap-3">
                  <FaPhoneAlt className="w-4 h-4 text-[#C0934B] flex-shrink-0" />
                  <span>{settings?.footer?.contactInfo?.phone || footerData.contact.info.phone}</span>
                </li>
                <li className="flex items-center gap-3">
                  <FaEnvelope className="w-4 h-4 text-[#C0934B] flex-shrink-0" />
                  <span>{settings?.footer?.contactInfo?.email || footerData.contact.info.email}</span>
                </li>
              </ul>
            </div>
          </div>


          {/* Bottom Bar */}
          <div className="border-t border-gray-600 pt-8 flex flex-col md:flex-row justify-between items-center text-sm text-gray-300">
            <div className="mb-4 md:mb-0">
              &copy; {new Date().getFullYear()} {footerData.copyright.brand}
            </div>
            <div className="flex items-center gap-1">
              Made With <FaHeart className="w-3 h-3 text-white" /> By <span className="font-bold text-white">{footerData.copyright.bgText}</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
