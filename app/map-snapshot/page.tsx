"use client";

import { useMemo, useState } from "react";

import { ScanCoverageMiniMap } from "@/components/dashboard/client-details/scan-coverage-mini-map";

type SnapshotPayload = {
  center: {
    latitude: number;
    longitude: number;
  } | null;
  height?: number;
  label?: string | null;
  points?: Array<{
    latitude: number;
    longitude: number;
    rank?: number | null;
  }>;
  width?: number;
};

const decodeBase64UrlPayload = (value: string) => {
  const normalized = value.replaceAll("-", "+").replaceAll("_", "/");
  const padded =
    normalized + "=".repeat((4 - (normalized.length % 4 || 4)) % 4);
  const decodedText = atob(padded);

  return decodeURIComponent(
    Array.from(decodedText)
      .map(
        (character) =>
          `%${character.charCodeAt(0).toString(16).padStart(2, "0")}`,
      )
      .join(""),
  );
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

export default function MapSnapshotPage() {
  const [isMapReady, setIsMapReady] = useState(false);
  const payload = useMemo<SnapshotPayload | null>(() => {
    if (typeof window === "undefined") {
      return null;
    }

    try {
      const params = new URLSearchParams(window.location.search);
      const encodedPayload = params.get("payload");

      if (!encodedPayload) {
        return null;
      }

      const parsed = JSON.parse(
        decodeBase64UrlPayload(encodedPayload),
      ) as SnapshotPayload;

      return parsed;
    } catch {
      return null;
    }
  }, []);

  if (!payload?.center) {
    return (
      <main className="grid min-h-screen place-items-center bg-white text-sm text-danger">
        Invalid snapshot payload.
      </main>
    );
  }

  const width =
    typeof payload.width === "number"
      ? clamp(Math.round(payload.width), 320, 1400)
      : 960;
  const height =
    typeof payload.height === "number"
      ? clamp(Math.round(payload.height), 220, 1000)
      : 540;
  const points = (payload.points || []).map((point, index) => ({
    label: `Coordinate ${index + 1}`,
    latitude: point.latitude,
    longitude: point.longitude,
    rank: point.rank ?? null,
  }));

  return (
    <main className="grid min-h-screen place-items-center bg-white p-6">
      <div
        className="snapshot-map-capture w-full overflow-hidden rounded-xl"
        data-map-ready={isMapReady ? "true" : "false"}
        style={{ maxWidth: width, width }}
      >
        <ScanCoverageMiniMap
          center={payload.center}
          height={height}
          label={payload.label || null}
          points={points}
          onMapReady={() => {
            setIsMapReady(true);
          }}
        />
      </div>
    </main>
  );
}
