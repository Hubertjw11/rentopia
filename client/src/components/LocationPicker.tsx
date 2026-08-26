"use client";

import React, { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { useFormContext } from "react-hook-form";
import { Check, MapPin, Search, Wand2, X } from "lucide-react";
import { Button } from "@/components/ui/button";

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN as string;

const DEFAULT_CENTER: [number, number] = [106.8272, -6.1754];
const TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN as string;

type AddressSuggestion = {
  address: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
};

const featureToSuggestion = (feature: any): AddressSuggestion => {
  const context = feature?.properties?.context ?? {};
  const type = feature?.properties?.feature_type;
  const streetish = type === "address" || type === "street";

  return {
    address:
      context.address?.name ??
      (streetish ? feature?.properties?.name : undefined) ??
      context.street?.name ??
      "",
    city: context.place?.name ?? context.district?.name ?? "",
    state: context.region?.name ?? "",
    postalCode: context.postcode?.name ?? "",
    country: context.country?.name ?? "",
  };
};

const looselyMatches = (a?: string, b?: string) => {
  if (!a || !b) return true;
  const x = a.trim().toLowerCase();
  const y = b.trim().toLowerCase();
  return x.includes(y) || y.includes(x);
};

type LocationPickerProps = {
  initialLongitude?: number;
  initialLatitude?: number;
};

const LocationPicker = ({
  initialLongitude,
  initialLatitude,
}: LocationPickerProps) => {
  const { getValues, setValue, watch, formState } = useFormContext();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markerRef = useRef<mapboxgl.Marker | null>(null);

  const [pending, setPending] = useState<[number, number]>(
    typeof initialLongitude === "number" && typeof initialLatitude === "number"
      ? [initialLongitude, initialLatitude]
      : DEFAULT_CENTER,
  );
  const [busy, setBusy] = useState<"search" | "fill" | "confirm" | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [matched, setMatched] = useState<string | null>(null);
  const [suggestion, setSuggestion] = useState<AddressSuggestion | null>(null);
  const [searchHit, setSearchHit] = useState<{
    coords: [number, number];
    suggestion: AddressSuggestion;
  } | null>(null);
  const [mismatch, setMismatch] = useState(false);

  const latitude = watch("latitude");
  const longitude = watch("longitude");
  const confirmed =
    typeof latitude === "number" && typeof longitude === "number";
  const pinError = Boolean(
    formState.errors.latitude || formState.errors.longitude,
  );

  useEffect(() => {
    if (mapRef.current || !containerRef.current) return;

    const center: [number, number] =
      typeof initialLongitude === "number" &&
      typeof initialLatitude === "number"
        ? [initialLongitude, initialLatitude]
        : DEFAULT_CENTER;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/hubertjw11/cmrufaqjn00d101sc1a96e286",
      center,
      zoom: center === DEFAULT_CENTER ? 12 : 16,
    });
    mapRef.current = map;

    const marker = new mapboxgl.Marker({ draggable: true })
      .setLngLat(center)
      .addTo(map);
    markerRef.current = marker;

    marker.on("dragend", () => {
      const { lng, lat } = marker.getLngLat();
      setPending([lng, lat]);
      setValue("longitude", lng, { shouldValidate: true });
      setValue("latitude", lat, { shouldValidate: true });
      setSuggestion(null);
      setMismatch(false);
      setMatched(null);
      setMessage(null);
    });

    const observer = new ResizeObserver(() => map.resize());
    observer.observe(containerRef.current);

    return () => {
      observer.disconnect();
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, [setValue, initialLongitude, initialLatitude]);

  const describePin = async ([lng, lat]: [number, number]) => {
    const params = new URLSearchParams({
      longitude: String(lng),
      latitude: String(lat),
      types: "address,street",
      limit: "1",
      access_token: TOKEN,
    });

    const response = await fetch(
      `https://api.mapbox.com/search/geocode/v6/reverse?${params.toString()}`,
    );
    const data = await response.json();
    const feature = data?.features?.[0];
    if (!feature) return null;

    return featureToSuggestion(feature);
  };

  const findOnMap = async () => {
    const { address, city, state, country } = getValues();
    if (!address) {
      setMessage("Type an address or a landmark first");
      return;
    }

    setBusy("search");
    setMessage(null);
    setMatched(null);
    try {
      const params = new URLSearchParams({
        q: [address, city, state, country].filter(Boolean).join(", "),
        types: "poi,address,street",
        limit: "1",
        autocomplete: "false",
        access_token: TOKEN,
      });

      const response = await fetch(
        `https://api.mapbox.com/search/geocode/v6/forward?${params.toString()}`,
      );
      const data = await response.json();
      const feature = data?.features?.[0];
      const found = feature?.properties?.coordinates;

      if (typeof found?.longitude !== "number") {
        setMessage("Couldn't find that — drag the pin to the right spot instead");
        return;
      }

      const next: [number, number] = [found.longitude, found.latitude];
      setPending(next);
      markerRef.current?.setLngLat(next);
      mapRef.current?.flyTo({ center: next, zoom: 16 });
      setMatched(
        feature.properties?.full_address ?? feature.properties?.name ?? null,
      );
      setSearchHit({ coords: next, suggestion: featureToSuggestion(feature) });
      setSuggestion(null);
      setMismatch(false);
      setValue("longitude", undefined);
      setValue("latitude", undefined);
      setMessage("Check the pin, then confirm it or drag it where it belongs");
    } catch {
      setMessage("Lookup failed — drag the pin instead");
    } finally {
      setBusy(null);
    }
  };

  const confirmPin = async () => {
    setValue("longitude", pending[0], { shouldValidate: true });
    setValue("latitude", pending[1], { shouldValidate: true });
    setMessage(null);

    setBusy("confirm");
    try {
      const described = await describePin(pending);
      setSuggestion(described);

      if (described) {
        const { city, state } = getValues();
        setMismatch(
          !looselyMatches(described.city, city) ||
            !looselyMatches(described.state, state),
        );
      }
    } catch {
      setSuggestion(null);
    } finally {
      setBusy(null);
    }
  };

  const fillFromPin = async () => {
    setBusy("fill");
    setMessage(null);
    try {
      const fromSearch =
        searchHit &&
        searchHit.coords[0] === pending[0] &&
        searchHit.coords[1] === pending[1]
          ? searchHit.suggestion
          : null;

      const described = fromSearch ?? suggestion ?? (await describePin(pending));
      if (!described) {
        setMessage("Couldn't read an address from this pin");
        return;
      }

      const options = { shouldValidate: true } as const;
      if (described.address) setValue("address", described.address, options);
      if (described.city) setValue("city", described.city, options);
      if (described.state) setValue("state", described.state, options);
      if (described.postalCode)
        setValue("postalCode", described.postalCode, options);
      if (described.country) setValue("country", described.country, options);

      setSuggestion(described);
      setMismatch(false);
      setMessage(
        described.address
          ? "Filled from the pin — check it, Mapbox is often coarse here"
          : "Mapbox has no street address for this point — fill the address in yourself",
      );
    } catch {
      setMessage("Couldn't read an address from this pin");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={findOnMap}
          disabled={busy !== null}
          className="gap-2 rounded-xl"
        >
          <Search className="h-4 w-4" />
          {busy === "search" ? "Searching…" : "Find address or landmark"}
        </Button>

        <Button
          type="button"
          onClick={confirmPin}
          disabled={busy !== null}
          className="gap-2 rounded-xl bg-primary-700 text-white"
        >
          <MapPin className="h-4 w-4" />
          {busy === "confirm" ? "Confirming…" : "Confirm this location"}
        </Button>
        {confirmed && (
          <span className="flex items-center gap-1 text-sm font-medium text-green-700">
            <Check className="h-4 w-4" />
            Location confirmed
          </span>
        )}
      </div>

      <div
        ref={containerRef}
        className="h-80 w-full overflow-hidden rounded-xl border"
      />

      <p className="text-xs text-gray-500">
        Pin: {pending[1].toFixed(6)}, {pending[0].toFixed(6)}
        {!confirmed && (
          <span className="ml-2 font-medium text-secondary-700">
            — drag the marker onto your building, then confirm
          </span>
        )}
      </p>

      {!confirmed && pinError && (
        <p className="text-xs font-medium text-red-500">
          Confirm the pin before saving — this listing has no location yet.
        </p>
      )}

      {matched && (
        <p className="text-xs text-gray-500">
          Matched: <span className="font-medium">{matched}</span>
        </p>
      )}

      {message && <p className="text-xs text-primary-700">{message}</p>}

      {mismatch && suggestion && (
        <div className="flex items-start gap-3 rounded-lg border border-secondary-400 bg-secondary-100 px-3 py-2">
          <div className="min-w-0 flex-1 text-xs text-primary-800">
            <p className="font-semibold">Does this pin match your address?</p>
            <p className="mt-0.5">
              The marker looks like it&apos;s in{" "}
              <span className="font-medium">
                {[suggestion.city, suggestion.state]
                  .filter(Boolean)
                  .join(", ")}
              </span>
              , but you entered{" "}
              <span className="font-medium">
                {[getValues("city"), getValues("state")]
                  .filter(Boolean)
                  .join(", ")}
              </span>
              .
            </p>
            <button
              type="button"
              onClick={fillFromPin}
              className="mt-1 font-semibold text-primary-700 hover:underline"
            >
              Use the pin&apos;s address
            </button>
          </div>
          <button
            type="button"
            onClick={() => setMismatch(false)}
            aria-label="Dismiss"
            className="shrink-0 text-gray-500 hover:text-primary-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
};

export default LocationPicker;