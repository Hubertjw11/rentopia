"use client";
import React, { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { useAppSelector } from "@/state/redux";
import { useGetPropertyMarkersQuery } from "@/state/api";
import { PropertyMarker } from "@/types/model";
import { formatIDRCompact } from "@/lib/utils";

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN as string;

const Map = () => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);

  const filters = useAppSelector((state) => state.global.filters);
  const {
    data: markers,
    isLoading,
    isError,
  } = useGetPropertyMarkersQuery(filters);

  useEffect(() => {
    if (mapRef.current || !mapContainerRef.current) return;

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: "mapbox://styles/hubertjw11/cmrufaqjn00d101sc1a96e286",
      center: [-74.5, 40],
      zoom: 9,
    });
    mapRef.current = map;

    const observer = new ResizeObserver(() => map.resize());
    observer.observe(mapContainerRef.current);

    return () => {
      observer.disconnect();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current || !filters.coordinates) return;
    mapRef.current.flyTo({ center: filters.coordinates, zoom: 9 });
  }, [filters.coordinates]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !markers) return;

    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = markers.map((marker) =>
      createPropertyMarker(marker, map),
    );
  }, [markers]);

  return (
    <div className="relative h-full w-full rounded-xl">
      <div
        className="map-container rounded-xl"
        ref={mapContainerRef}
        style={{ height: "100%", width: "100%" }}
      />
      {(isLoading || isError) && (
        <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-white/70 text-sm text-gray-600">
          {isError ? "Failed to load map pins." : "Loading…"}
        </div>
      )}
    </div>
  );
};

const createPropertyMarker = (property: PropertyMarker, map: mapboxgl.Map) => {
  const marker = new mapboxgl.Marker()
    .setLngLat([property.longitude, property.latitude])
    .setPopup(
      new mapboxgl.Popup().setHTML(
        `
        <div class="marker-popup">
            <div class="marker-popup-image"></div>
            <div>
                <a href="/search/${property.id}" target="_blank" class="marker-popup-title">${property.name}</a>
                <p class="marker-popup-price">
                    ${formatIDRCompact(property.pricePerMonth)}
                    <span class="marker-popup-price-unit"> / month</span>
                </p>
            </div>
        </div>
        `,
      ),
    )
    .addTo(map);

  const path = marker.getElement().querySelector("path[fill='#3FB1CE']");
  if (path) path.setAttribute("fill", "#000000");

  return marker;
};

export default Map;
