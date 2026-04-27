import { loadGoogleMapsScript } from "@/components/form/google-maps-loader";

export type ScanCoveragePoint = {
  isOffshore?: boolean;
  label: string;
  latitude: number;
  longitude: number;
  offshoreReason?: string;
};

const LAND_ADDRESS_COMPONENT_TYPES = new Set([
  "administrative_area_level_1",
  "administrative_area_level_2",
  "country",
  "locality",
  "postal_code",
  "premise",
  "route",
  "street_address",
  "sublocality",
]);

const geocodePoint = (
  geocoder: any,
  point: ScanCoveragePoint,
): Promise<{ isOffshore: boolean; offshoreReason?: string }> =>
  new Promise((resolve) => {
    geocoder.geocode(
      {
        location: {
          lat: point.latitude,
          lng: point.longitude,
        },
      },
      (results: any[] | null, status: string) => {
        if (status === "ZERO_RESULTS") {
          resolve({
            isOffshore: true,
            offshoreReason: "No land address found for this coordinate.",
          });

          return;
        }

        if (status !== "OK" || !Array.isArray(results) || !results.length) {
          resolve({ isOffshore: false });

          return;
        }

        const hasLandAddress = results.some((result) =>
          (result.address_components || []).some((component: any) =>
            (component.types || []).some((type: string) =>
              LAND_ADDRESS_COMPONENT_TYPES.has(type),
            ),
          ),
        );

        resolve(
          hasLandAddress
            ? { isOffshore: false }
            : {
                isOffshore: true,
                offshoreReason: "Only water or plus-code location found.",
              },
        );
      },
    );
  });

export const annotateOffshoreCoverage = async <
  TPoint extends ScanCoveragePoint,
>(
  points: TPoint[],
): Promise<
  Array<TPoint & Pick<ScanCoveragePoint, "isOffshore" | "offshoreReason">>
> => {
  if (!points.length) {
    return points;
  }

  await loadGoogleMapsScript();

  const googleMaps = (window as unknown as { google?: any }).google?.maps;

  if (!googleMaps?.Geocoder) {
    return points;
  }

  const geocoder = new googleMaps.Geocoder();
  const annotated: TPoint[] = [];

  for (const point of points) {
    const offshoreState = await geocodePoint(geocoder, point);

    annotated.push({
      ...point,
      ...offshoreState,
    });
  }

  return annotated;
};
