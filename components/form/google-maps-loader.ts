"use client";

declare global {
  interface Window {
    __googleMapsLoaderPromise?: Promise<void>;
    google?: {
      maps?: {
        event?: {
          trigger: (instance: unknown, eventName: string) => void;
        };
        LatLngBounds: new () => {
          extend: (point: { lat: number; lng: number }) => void;
        };
        Point: new (x: number, y: number) => unknown;
        Size: new (width: number, height: number) => unknown;
        Map: new (
          element: HTMLElement,
          options: {
            center: { lat: number; lng: number };
            clickableIcons?: boolean;
            disableDefaultUI?: boolean;
            fullscreenControl?: boolean;
            gestureHandling?: "auto" | "cooperative" | "greedy" | "none";
            mapTypeControl?: boolean;
            mapId?: string;
            streetViewControl?: boolean;
            zoom: number;
            zoomControl?: boolean;
          },
        ) => {
          fitBounds?: (bounds: unknown) => void;
          setCenter?: (center: { lat: number; lng: number }) => void;
        };
        Marker: new (options: {
          map: unknown;
          position: { lat: number; lng: number };
          icon?: {
            anchor?: unknown;
            scaledSize?: unknown;
            url: string;
          };
          label?: string;
          title?: string;
        }) => {
          setMap: (map: unknown | null) => void;
        };
        places?: {
          AutocompleteService: new () => {
            getPlacePredictions: (
              request: {
                input: string;
                types?: string[];
              },
              callback: (
                predictions: Array<{
                  description?: string;
                  place_id?: string;
                  structured_formatting?: {
                    main_text?: string;
                    secondary_text?: string;
                  };
                }> | null,
                status: string,
              ) => void,
            ) => void;
          };
        };
      };
    };
  }
}

const GOOGLE_SCRIPT_ID = "google-maps-script";

export const loadGoogleMapsScript = async () => {
  if (typeof window === "undefined") {
    return;
  }

  if (window.google?.maps?.Map) {
    return;
  }

  if (window.__googleMapsLoaderPromise) {
    await window.__googleMapsLoaderPromise;

    return;
  }

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    throw new Error("Missing NEXT_PUBLIC_GOOGLE_MAPS_API_KEY.");
  }

  window.__googleMapsLoaderPromise = new Promise<void>((resolve, reject) => {
    const existingScript = document.getElementById(
      GOOGLE_SCRIPT_ID,
    ) as HTMLScriptElement | null;

    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(), { once: true });
      existingScript.addEventListener(
        "error",
        () => reject(new Error("Failed to load Google Maps script.")),
        { once: true },
      );

      return;
    }

    const script = document.createElement("script");

    script.id = GOOGLE_SCRIPT_ID;
    script.async = true;
    script.defer = true;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.onload = () => resolve();
    script.onerror = () =>
      reject(new Error("Failed to load Google Maps script."));

    document.head.appendChild(script);
  });

  await window.__googleMapsLoaderPromise;
};
