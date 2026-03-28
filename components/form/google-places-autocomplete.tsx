"use client";

import type { Key } from "react";

import { useEffect, useRef, useState } from "react";
import { Autocomplete, AutocompleteItem } from "@heroui/autocomplete";
import { Search } from "lucide-react";

import { loadGoogleMapsScript } from "@/components/form/google-maps-loader";

export type GooglePlacesAutocompleteItem = {
  description: string;
  mainText: string;
  placeId: string;
  secondaryText: string;
};

interface GooglePlacesAutocompleteProps {
  className?: string;
  isDisabled?: boolean;
  placeholder?: string;
  radius?: "none" | "sm" | "md" | "lg" | "full";
  size?: "sm" | "md" | "lg";
  value?: string;
  onSelect?: (item: GooglePlacesAutocompleteItem | null) => void;
}

export const GooglePlacesAutocomplete = ({
  className,
  isDisabled = false,
  placeholder = "Search Google Business Profile",
  radius = "sm",
  size = "md",
  value = "",
  onSelect,
}: GooglePlacesAutocompleteProps) => {
  const autocompleteServiceRef = useRef<{
    getPlacePredictions: (
      request: { input: string; types?: string[] },
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
  } | null>(null);
  const [inputValue, setInputValue] = useState(value);
  const [items, setItems] = useState<GooglePlacesAutocompleteItem[]>([]);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  useEffect(() => {
    let isMounted = true;

    const initializePlaces = async () => {
      try {
        await loadGoogleMapsScript();

        if (!isMounted) {
          return;
        }

        const AutocompleteService =
          window.google?.maps?.places?.AutocompleteService;

        if (!AutocompleteService) {
          throw new Error("Google Places AutocompleteService is unavailable.");
        }

        autocompleteServiceRef.current = new AutocompleteService();
        setIsReady(true);
      } catch {
        if (!isMounted) {
          return;
        }

        setIsReady(false);
      }
    };

    void initializePlaces();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!isReady || !autocompleteServiceRef.current) {
      return;
    }

    const normalizedInput = inputValue.trim();

    if (normalizedInput.length < 2) {
      setItems([]);

      return;
    }

    const timeout = window.setTimeout(() => {
      autocompleteServiceRef.current?.getPlacePredictions(
        {
          input: normalizedInput,
          types: ["establishment"],
        },
        (predictions, status) => {
          if (status !== "OK" || !predictions) {
            setItems([]);

            return;
          }

          setItems(
            predictions
              .filter(
                (prediction) => prediction.place_id && prediction.description,
              )
              .map((prediction) => ({
                description: prediction.description ?? "",
                mainText:
                  prediction.structured_formatting?.main_text ??
                  prediction.description ??
                  "",
                placeId: prediction.place_id ?? "",
                secondaryText:
                  prediction.structured_formatting?.secondary_text ?? "",
              })),
          );
        },
      );
    }, 250);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [inputValue, isReady]);

  return (
    <Autocomplete
      allowsCustomValue
      className={className}
      defaultItems={items}
      inputValue={inputValue}
      isDisabled={isDisabled || !isReady}
      items={items}
      menuTrigger="input"
      placeholder={placeholder}
      radius={radius}
      selectedKey={null}
      size={size}
      startContent={
        <Search className="text-[#6B7280]" size={18} strokeWidth={1.75} />
      }
      onInputChange={(nextValue) => {
        setInputValue(nextValue);

        if (!nextValue) {
          onSelect?.(null);
        }
      }}
      onSelectionChange={(key) => {
        const selectedItem =
          items.find((item) => item.placeId === String(key as Key)) ?? null;

        setInputValue(selectedItem?.description ?? "");
        onSelect?.(selectedItem);
      }}
    >
      {(item) => (
        <AutocompleteItem key={item.placeId} textValue={item.description}>
          <div className="flex flex-col">
            <span className="text-sm font-medium text-[#111827]">
              {item.mainText}
            </span>
            {item.secondaryText ? (
              <span className="text-xs text-default-500">
                {item.secondaryText}
              </span>
            ) : null}
          </div>
        </AutocompleteItem>
      )}
    </Autocomplete>
  );
};
