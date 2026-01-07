"use client";

import Image from "next/image";
import Link from "next/link";
import { FaArrowRight } from "react-icons/fa";

export default function ProductCard({ product }) {
  // Map API fields to UI fields
  const title = product.heading || product.title;
  const description = product.fullDescription || product.description || product.publicationType || product.shortDescription;
  const imageSrc = product.filename
    ? `/api/user/products/image/${product.filename}`
    : (product.image || "/placeholder.png");
  const link = `/products/${product._id || product.id}`;

  return (
    <div className="backdrop-blur supports-[backdrop-filter]:bg-white/10 bg-white/10 rounded-[20px] border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow flex flex-col h-full">
      {/* Image Placeholder */}
      <div className="relative h-48 bg-gray-200 w-full">
        <Image
          src={imageSrc}
          alt={title || "Product"}
          fill
          className="object-cover"
        />
      </div>

      {/* Content */}
      <div className="p-5 flex flex-col flex-grow">
        <h3 className="text-lg font-bold text-black mb-3 leading-tight line-clamp-2">
          {title}
        </h3>

        <p className="text-sm text-gray-600 mb-4 line-clamp-2 flex-grow">
          {description}
        </p>

        <Link
          href={link}
          className="inline-flex items-center text-[#1E4032] font-semibold text-sm hover:underline mt-auto"
        >
          View <FaArrowRight className="ml-2 w-3 h-3" />
        </Link>
      </div>
    </div>
  );
}
