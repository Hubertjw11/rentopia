"use client";

import React, { useEffect, useRef, useState } from "react";
import { Viewer } from "@photo-sphere-viewer/core";
import "@photo-sphere-viewer/core/index.css";

const PanoramaViewer = ({ url }: { url: string }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    setError(null);

    const viewer = new Viewer({
      container,  
      panorama: url,
      navbar: ["zoom", "fullscreen"],
    });

    viewer.addEventListener("panorama-error", ({ error: cause }) => {
      console.error("Panorama failed to load:", url, cause);
      setError("This 360° tour could not be loaded.");
    });

    return () => viewer.destroy();
  }, [url]);

  return (
    <div className="relative h-full w-full">
      <div ref={containerRef} className="h-full w-full" />
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900 px-6 text-center text-sm text-white">
          {error}
        </div>
      )}
    </div>
  );
};

export default PanoramaViewer;