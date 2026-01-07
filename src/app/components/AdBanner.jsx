"use client";

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';

const AdBanner = ({
  position = "top",
  altText = "Advertisement",
  className = "",
  showEmptyState = false,
  dimensions = null,
  autoRefresh = false,
  refreshInterval = 30000
}) => {
  const [adData, setAdData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAd = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/advertisements?position=${position}&limit=1`);

      if (!response.ok) {
        throw new Error(`Failed to fetch ads: ${response.status}`);
      }

      const data = await response.json();

      if (!data.success || !data.data || !Array.isArray(data.data)) {
        throw new Error('Invalid response format');
      }

      if (data.data.length === 0) {
        setAdData(null);
        return;
      }

      // Get the first ad (already limited to 1 by API)
      const ad = data.data[0];

      // Prepare ad data with click tracking
      const adWithTracking = {
        ...ad,
        imageUrl: ad.imageUrl || `/api/advertisements/image/${ad.imageFilename}`,
        clickUrl: `/api/advertisements/click/${ad._id}?redirect=${encodeURIComponent(ad.link)}`
      };

      setAdData(adWithTracking);

      setAdData(adWithTracking);

      // Impression tracking removed as per request


    } catch (err) {
      console.error('Error fetching ad:', err);
      setError(err.message);
      setAdData(null);
    } finally {
      setLoading(false);
    }
  }, [position]);

  const handleClick = async (e, adId, originalUrl) => {
    e.preventDefault();

    if (!originalUrl) return;

    try {
      // Track click
      if (adId) {
        await fetch(`/api/advertisements/click/${adId}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        });
      }

      // Open in new tab
      window.open(originalUrl, '_blank', 'noopener,noreferrer');

    } catch (error) {
      console.error('Error tracking click:', error);
      // Fallback: open directly if tracking fails
      window.open(originalUrl, '_blank', 'noopener,noreferrer');
    }
  };

  useEffect(() => {
    fetchAd();

    // Set up auto-refresh if enabled
    let refreshTimer;
    if (autoRefresh) {
      refreshTimer = setInterval(fetchAd, refreshInterval);
    }

    return () => {
      if (refreshTimer) {
        clearInterval(refreshTimer);
      }
    };
  }, [fetchAd, autoRefresh, refreshInterval]);

  // Calculate styles based on position and dimensions
  const getAdStyles = () => {
    // Use provided dimensions or default based on position
    const width = dimensions?.width || adData?.width || 0;
    const height = dimensions?.height || adData?.height || 0;

    const styles = {
      container: '',
      image: {}
    };

    switch (position) {
      case 'top':
        styles.container = 'w-full h-[300px]';
        if (width && height) {
          styles.image = {
            width: '100%',
            height: 'auto',
            maxHeight: '300px'
          };
        }
        break;

      case 'left':
      case 'right':
        styles.container = 'w-[200px] h-[800px]';
        if (width && height) {
          styles.image = {
            width: '100%',
            height: 'auto',
            maxWidth: '200px'
          };
        }
        break;

      case 'center':
        styles.container = 'w-full h-[600px]';
        if (width && height) {
          styles.image = {
            width: '100%',
            height: 'auto',
            maxHeight: '600px'
          };
        }
        break;

      case 'bottom':
        styles.container = 'w-full h-[250px]';
        if (width && height) {
          styles.image = {
            width: '100%',
            height: 'auto',
            maxHeight: '250px'
          };
        }
        break;

      default:
        styles.container = 'w-full';
        if (width && height) {
          styles.image = {
            width: '100%',
            height: 'auto'
          };
        }
    }

    return styles;
  };

  const getImageSizes = () => {
    switch (position) {
      case 'top':
        return "100vw";
      case 'left':
      case 'right':
        return "200px";
      case 'center':
        return "1200px";
      case 'bottom':
        return "400px";
      default:
        return "100vw";
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className={`${getAdStyles().container} ${className}`}>
        <div className="w-full h-full bg-gray-300 animate-pulse rounded-lg"></div>
      </div>
    );
  }

  // Error state with optional empty state
  if (error || !adData) {
    if (showEmptyState) {
      return (
        <div className={`${getAdStyles().container} ${className}`}>
          <div className="w-full h-full bg-gray-100 rounded-lg flex items-center justify-center text-gray-400">
            No {position} advertisement
          </div>
        </div>
      );
    }
    return null; // Don't render anything if no ad and showEmptyState is false
  }

  const styles = getAdStyles();
  const imageSizes = getImageSizes();
  const shouldFill = !adData.width || !adData.height;

  const AdImage = () => {
    if (shouldFill) {
      return (
        <Image
          src={adData.imageUrl}
          alt={adData.title || adData.name || altText}
          fill
          className="object-contain rounded-lg"
          sizes={imageSizes}
          priority={position === 'top' || position === 'center'}
        />
      );
    }

    return (
      <Image
        src={adData.imageUrl}
        alt={adData.title || adData.name || altText}
        width={adData.width}
        height={adData.height}
        style={styles.image}
        className="object-contain rounded-lg"
        sizes={imageSizes}
        priority={position === 'top' || position === 'center'}
      />
    );
  };

  // Check if we should wrap in a link
  if (adData.link) {
    return (
      <div className={`${styles.container} ${className}`}>
        <a
          href={adData.link}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => handleClick(e, adData._id, adData.link)}
          className="block w-full h-full hover:opacity-95 transition-opacity relative"
        >
          <AdImage />

          {/* Ad badge */}
          <div className="absolute top-2 right-2">
            <span className="bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded">
              Ad
            </span>
          </div>
        </a>
      </div>
    );
  }

  // Just show the image without link
  return (
    <div className={`${styles.container} ${className}`}>
      <div className="relative w-full h-full">
        <AdImage />
        <div className="absolute top-2 right-2">
          <span className="bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded">
            Ad
          </span>
        </div>
      </div>
    </div>
  );
};

export default AdBanner;
