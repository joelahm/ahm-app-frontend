"use client";

import { useEffect, useRef, useState } from "react";

import { loadGoogleMapsScript } from "@/components/form/google-maps-loader";

interface ScanCoverageMiniMapProps {
  center: {
    latitude: number;
    longitude: number;
  } | null;
  label?: string | null;
  points?: Array<{
    label: string;
    latitude: number;
    longitude: number;
    rank?: number | null;
  }>;
}

const buildMarkerSvg = (rank?: number | null) => {
  if (rank === 1) {
    return `
      <svg xmlns="http://www.w3.org/2000/svg" width="58" height="58" viewBox="0 0 58 58">
        <defs>
          <filter id="starShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="1.5" stdDeviation="1.4" flood-color="#0f172a" flood-opacity="0.2"/>
          </filter>
        </defs>
        <path d="M29 7.2l5.62 11.39 12.6 1.83-9.11 8.88 2.15 12.53L29 35.95l-11.26 5.9 2.15-12.53-9.11-8.88 12.6-1.83L29 7.2z" fill="#4ade80" stroke="#ffffff" stroke-width="2.1" stroke-linejoin="round" filter="url(#starShadow)"/>
        <text x="29" y="33" text-anchor="middle" font-family="Arial, sans-serif" font-size="17" font-weight="700" fill="#ffffff">1</text>
      </svg>
    `;
  }

  const hasRank = typeof rank === "number" && Number.isFinite(rank);
  const fill = hasRank && rank <= 9 ? "#f5bf4c" : "#cb4f4f";
  const text = hasRank ? String(rank) : "";
  const fontSize = text.length >= 2 ? 12 : 14;

  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="38" height="38" viewBox="0 0 38 38">
      <defs>
        <filter id="pinShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="1.2" stdDeviation="1.2" flood-color="#0f172a" flood-opacity="0.18"/>
        </filter>
      </defs>
      <circle cx="19" cy="19" r="13.5" fill="${fill}" stroke="#ffffff" stroke-width="1.7" filter="url(#pinShadow)"/>
      ${
        text
          ? `<text x="19" y="23" text-anchor="middle" font-family="Arial, sans-serif" font-size="${fontSize}" font-weight="700" fill="#ffffff">${text}</text>`
          : ""
      }
    </svg>
  `;
};

const createMarkerIcon = (rank?: number | null) => {
  const googleMaps = window.google?.maps;

  return {
    anchor:
      rank === 1
        ? googleMaps
          ? new googleMaps.Point(29, 29)
          : undefined
        : googleMaps
          ? new googleMaps.Point(19, 19)
          : undefined,
    scaledSize:
      rank === 1
        ? googleMaps
          ? new googleMaps.Size(58, 58)
          : undefined
        : googleMaps
          ? new googleMaps.Size(38, 38)
          : undefined,
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(buildMarkerSvg(rank))}`,
  };
};

export const ScanCoverageMiniMap = ({
  center,
  label,
  points = [],
}: ScanCoverageMiniMapProps) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<{
    setCenter?: (center: { lat: number; lng: number }) => void;
  } | null>(null);
  const centerMarkerRef = useRef<{
    setMap: (map: unknown | null) => void;
  } | null>(null);
  const pointMarkersRef = useRef<
    Array<{ setMap: (map: unknown | null) => void }>
  >([]);
  const [isReady, setIsReady] = useState(false);
  const [mapError, setMapError] = useState("");

  useEffect(() => {
    let isMounted = true;

    const initializeMap = async () => {
      try {
        await loadGoogleMapsScript();

        if (!isMounted) {
          return;
        }

        setMapError("");
        setIsReady(true);
      } catch {
        if (!isMounted) {
          return;
        }

        setMapError("Failed to load Google Maps.");
        setIsReady(false);
      }
    };

    void initializeMap();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (
      !center ||
      !isReady ||
      !mapRef.current ||
      !containerRef.current ||
      !window.google?.maps?.Map
    ) {
      return;
    }

    let frameId = 0;
    let resizeObserver: ResizeObserver | null = null;

    const initializeMap = () => {
      const googleMaps = window.google?.maps;

      if (!mapRef.current || !containerRef.current || !googleMaps?.Map) {
        setMapError("Google Maps is unavailable.");

        return;
      }

      if (
        containerRef.current.offsetHeight === 0 ||
        containerRef.current.offsetWidth === 0
      ) {
        frameId = window.requestAnimationFrame(initializeMap);

        return;
      }

      const map = new googleMaps.Map(mapRef.current, {
        center: {
          lat: center.latitude,
          lng: center.longitude,
        },
        clickableIcons: false,
        disableDefaultUI: true,
        fullscreenControl: false,
        gestureHandling: "cooperative",
        mapTypeControl: false,
        streetViewControl: false,
        zoom: 13,
        zoomControl: true,
      });

      mapInstanceRef.current = map;
      centerMarkerRef.current?.setMap(null);
      centerMarkerRef.current = new googleMaps.Marker({
        map,
        position: {
          lat: center.latitude,
          lng: center.longitude,
        },
        title: label ?? "Current GBP location",
      });

      pointMarkersRef.current.forEach((marker) => marker.setMap(null));
      pointMarkersRef.current = points.map(
        (point) =>
          new googleMaps.Marker({
            icon: createMarkerIcon(point.rank),
            map,
            position: {
              lat: point.latitude,
              lng: point.longitude,
            },
            title: point.label,
          }),
      );

      if (points.length > 0 && googleMaps.LatLngBounds) {
        const bounds = new googleMaps.LatLngBounds();

        bounds.extend({
          lat: center.latitude,
          lng: center.longitude,
        });

        points.forEach((point) => {
          bounds.extend({
            lat: point.latitude,
            lng: point.longitude,
          });
        });

        map.fitBounds?.(bounds);
      }

      googleMaps.event?.trigger(map, "resize");
      map.setCenter?.({
        lat: center.latitude,
        lng: center.longitude,
      });

      resizeObserver = new ResizeObserver(() => {
        if (!mapInstanceRef.current) {
          return;
        }

        googleMaps.event?.trigger(mapInstanceRef.current, "resize");
        mapInstanceRef.current.setCenter?.({
          lat: center.latitude,
          lng: center.longitude,
        });
      });

      resizeObserver.observe(containerRef.current);
    };

    frameId = window.requestAnimationFrame(initializeMap);

    return () => {
      if (frameId) {
        window.cancelAnimationFrame(frameId);
      }

      resizeObserver?.disconnect();
      centerMarkerRef.current?.setMap(null);
      centerMarkerRef.current = null;
      pointMarkersRef.current.forEach((marker) => marker.setMap(null));
      pointMarkersRef.current = [];
      mapInstanceRef.current = null;
    };
  }, [center, isReady, label, points]);

  if (!center) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      className="overflow-hidden rounded-xl border border-default-200"
      style={{ height: 512, minHeight: 512 }}
    >
      {mapError ? (
        <div className="grid h-full w-full place-items-center bg-[linear-gradient(180deg,#f8fbff_0%,#eef2ff_100%)] px-4 text-center text-xs text-danger">
          {mapError}
        </div>
      ) : isReady ? (
        <div
          ref={mapRef}
          className="h-full w-full"
          style={{ height: 512, minHeight: 512 }}
        />
      ) : (
        <div className="grid h-full w-full place-items-center bg-[linear-gradient(180deg,#f8fbff_0%,#eef2ff_100%)] text-xs text-default-500">
          Loading Google map...
        </div>
      )}
    </div>
  );
};
