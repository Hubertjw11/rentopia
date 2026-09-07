"use client";

import { ChevronLeft, ChevronRight, Rotate3d } from "lucide-react";
import Image from "next/image";
import dynamic from "next/dynamic";
import React, { useState } from "react";

// ssr:false is permitted because this is a Client Component, and it keeps
// three.js out of the server render entirely.
const PanoramaViewer = dynamic(() => import("@/components/PanoramaViewer"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-gray-900 text-sm text-white">
      Loading tour…
    </div>
  ),
});

const ImagePreviews = ({ images, panoramaUrl }: ImagePreviewsProps) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [failed, setFailed] = useState<Record<number, boolean>>({});
  const [showTour, setShowTour] = useState(false);

  const handlePrev = () => {
    setCurrentImageIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setCurrentImageIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  return (
    <div className="relative h-112.5 w-full">
      {showTour && panoramaUrl ? (
        <PanoramaViewer url={panoramaUrl} />
      ) : (
        <>
          {images.map((image, index) => (
            <div
              key={image}
              className={`absolute inset-0 transition-opacity duration-500 ease-in-out ${
                index === currentImageIndex ? "opacity-100" : "opacity-0"
              }`}
            >
              <Image
                src={failed[index] ? "/placeholder.jpg" : image}
                alt={`Property Image ${index + 1}`}
                fill
                priority={index === 0}
                className="object-cover cursor-pointer transition-transform duration-500 ease-in-out"
                onError={() => setFailed((prev) => ({ ...prev, [index]: true }))}
              />
            </div>
          ))}
          <button
            onClick={handlePrev}
            className="absolute left-0 top-1/2 transform -translate-y-1/2 bg-primary-700/50 p-2 rounded-full focus:outline-none focus:ring focus:ring-secondary-300"
            aria-label="Previous Image"
          >
            <ChevronLeft className="text-white" />
          </button>
          <button
            onClick={handleNext}
            className="absolute right-0 top-1/2 transform -translate-y-1/2 bg-primary-700/50 p-2 rounded-full focus:outline-none focus:ring focus:ring-secondary-300"
            aria-label="Next Image"
          >
            <ChevronRight className="text-white" />
          </button>
        </>
      )}

      {panoramaUrl && (
        <button
          type="button"
          onClick={() => setShowTour((on) => !on)}
          className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 items-center gap-2 rounded-full bg-primary-700 px-4 py-2 text-sm font-medium text-white shadow-lg"
        >
          <Rotate3d className="h-4 w-4" />
          {showTour ? "Show photos" : "360° Tour"}
        </button>
      )}
    </div>
  );
};

export default ImagePreviews;