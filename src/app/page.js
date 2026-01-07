"use client";

import React from 'react';
import StockdioWidget from './components/StockdioWidget';
import HomeHero from './components/HomeHero';
import IpoMarquee from './components/IpoMarquee';
import ProductSlider from './components/ProductSlider';
import LatestNews from './components/LatestNews';
import IpoList from './components/IpoList';
import HowItWorks from './components/HowItWorks';
import YouMayLike from './components/YouMayLike';
export default function Home() {
  return (
    <div className="font-sans">
      <StockdioWidget />
      <HomeHero />
      <IpoMarquee />
      <ProductSlider />
      <LatestNews />
      <IpoList />
      <HowItWorks />
      <YouMayLike />

    </div>
  );
}