import React, { useEffect, useRef } from "react";

const StockdioWidget = () => {
  const iframeRef = useRef(null);

  useEffect(() => {
    // Fix for ReferenceError: recalculate_stockdio_width & orientationchange_stockdio not defined
    if (typeof window !== "undefined") {
      if (typeof window.recalculate_stockdio_width !== "function") {
        window.recalculate_stockdio_width = function () {};
      }
      if (typeof window.orientationchange_stockdio !== "function") {
        window.orientationchange_stockdio = function () {};
      }
    }
  }, []);

  return (
    <div className="w-full h-[30px] overflow-hidden border-none mt-2">
      <iframe
        ref={iframeRef}
        id="st_6167ec243e2e46648d3ce6a38547da64"
        title="Stockdio Financial Chart"
        scrolling="no"
        width="100%"
        height="100%"
        className="w-full h-full border-none"
        src="https://api.stockdio.com/visualization/financial/charts/v1/Ticker?app-key=1A563358041C4625BDF7FCF78241446D&stockExchange=NSE&symbols=SBIN;LT;ICICIBANK;RELIANCE;HINDALCO&palette=Financial-Light&layoutType=4&onload=st_23484ea4f982426ba0d3c4668f830b00"
        sandbox="allow-scripts allow-same-origin"
      ></iframe>
    </div>
  );
};

export default StockdioWidget;
