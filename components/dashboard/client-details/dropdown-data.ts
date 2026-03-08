"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

export interface DropdownOption {
  key: string;
  label: string;
}

export const DROPDOWN_DEFAULT_DATA = {
  countries: [
    { key: "United Kingdom", label: "United Kingdom" },
    { key: "United States", label: "United States" },
    { key: "Canada", label: "Canada" },
    { key: "Australia", label: "Australia" },
    { key: "Philippines", label: "Philippines" },
  ],
  cityStates: [
    { key: "Birmingham", label: "Birmingham" },
    { key: "London", label: "London" },
    { key: "Manchester", label: "Manchester" },
    { key: "Leeds", label: "Leeds" },
    { key: "Liverpool", label: "Liverpool" },
    { key: "New York, NY", label: "New York, NY" },
    { key: "Los Angeles, CA", label: "Los Angeles, CA" },
    { key: "Chicago, IL", label: "Chicago, IL" },
    { key: "Houston, TX", label: "Houston, TX" },
    { key: "Phoenix, AZ", label: "Phoenix, AZ" },
  ],
  niches: [
    {
      key: "General Surgeon and Upper GI",
      label: "General Surgeon and Upper GI",
    },
    { key: "ENT Surgeon", label: "ENT Surgeon" },
    { key: "Cardiologist", label: "Cardiologist" },
  ],
  practiceTypes: [
    { key: "Solo Practice", label: "Solo Practice" },
    { key: "Group Practice", label: "Group Practice" },
    { key: "Hospital Practice", label: "Hospital Practice" },
  ],
  medicalSpecialties: [
    { key: "General Surgery", label: "General Surgery" },
    { key: "ENT", label: "ENT" },
    { key: "Cardiology", label: "Cardiology" },
    { key: "Dermatology", label: "Dermatology" },
    { key: "Endocrinology", label: "Endocrinology" },
    { key: "Gastroenterology", label: "Gastroenterology" },
    { key: "Gynecology", label: "Gynecology" },
    { key: "Neurology", label: "Neurology" },
    { key: "Oncology", label: "Oncology" },
    { key: "Ophthalmology", label: "Ophthalmology" },
    { key: "Orthopedics", label: "Orthopedics" },
    { key: "Pediatrics", label: "Pediatrics" },
    { key: "Psychiatry", label: "Psychiatry" },
    { key: "Pulmonology", label: "Pulmonology" },
    { key: "Radiology", label: "Radiology" },
    { key: "Urology", label: "Urology" },
  ],
  subSpecialties: [
    { key: "Upper GI Surgery", label: "Upper GI Surgery" },
    { key: "Colorectal Surgery", label: "Colorectal Surgery" },
    { key: "Hepatobiliary Surgery", label: "Hepatobiliary Surgery" },
    { key: "Head and Neck Surgery", label: "Head and Neck Surgery" },
    { key: "Interventional Cardiology", label: "Interventional Cardiology" },
    { key: "Cardiac Electrophysiology", label: "Cardiac Electrophysiology" },
    { key: "Pediatric Cardiology", label: "Pediatric Cardiology" },
    { key: "Foot and Ankle", label: "Foot and Ankle" },
    { key: "Sports Medicine", label: "Sports Medicine" },
    { key: "Spine Surgery", label: "Spine Surgery" },
    { key: "Cosmetic Dermatology", label: "Cosmetic Dermatology" },
    { key: "Dermatopathology", label: "Dermatopathology" },
    { key: "Pediatric Neurology", label: "Pediatric Neurology" },
    { key: "Neurocritical Care", label: "Neurocritical Care" },
    { key: "Gynecologic Oncology", label: "Gynecologic Oncology" },
    { key: "Urogynecology", label: "Urogynecology" },
  ],
  specialInterests: [
    { key: "Minimally Invasive Surgery", label: "Minimally Invasive Surgery" },
    { key: "Robotic Surgery", label: "Robotic Surgery" },
    { key: "Cancer Care", label: "Cancer Care" },
    { key: "Chronic Pain Management", label: "Chronic Pain Management" },
    { key: "Preventive Cardiology", label: "Preventive Cardiology" },
    {
      key: "Sports Injury Rehabilitation",
      label: "Sports Injury Rehabilitation",
    },
    { key: "Women's Health", label: "Women's Health" },
    { key: "Men's Health", label: "Men's Health" },
    { key: "Weight Management", label: "Weight Management" },
    { key: "Diabetes Care", label: "Diabetes Care" },
    { key: "Digestive Health", label: "Digestive Health" },
    { key: "Sleep Disorders", label: "Sleep Disorders" },
    { key: "Skin Rejuvenation", label: "Skin Rejuvenation" },
    { key: "Child Development", label: "Child Development" },
    { key: "Mental Wellness", label: "Mental Wellness" },
    { key: "Executive Health Checkups", label: "Executive Health Checkups" },
  ],
  treatments: [
    { key: "Appendectomy", label: "Appendectomy" },
    { key: "Hernia Repair", label: "Hernia Repair" },
    { key: "Gallbladder Removal", label: "Gallbladder Removal" },
    { key: "Colonoscopy", label: "Colonoscopy" },
    { key: "Endoscopy", label: "Endoscopy" },
    { key: "Cataract Surgery", label: "Cataract Surgery" },
    { key: "LASIK", label: "LASIK" },
    { key: "Angioplasty", label: "Angioplasty" },
    { key: "Cardiac Ablation", label: "Cardiac Ablation" },
    { key: "Knee Replacement", label: "Knee Replacement" },
    { key: "Hip Replacement", label: "Hip Replacement" },
    { key: "Arthroscopy", label: "Arthroscopy" },
    { key: "Dermal Fillers", label: "Dermal Fillers" },
    { key: "Chemical Peel", label: "Chemical Peel" },
    { key: "Botox", label: "Botox" },
    { key: "Physiotherapy", label: "Physiotherapy" },
  ],
} satisfies Record<string, DropdownOption[]>;

export type DatasetKey = keyof typeof DROPDOWN_DEFAULT_DATA;

export const DROPDOWN_API_ENDPOINTS: Partial<Record<DatasetKey, string>> = {
  countries: "/api/dropdowns/countries",
  cityStates: "/api/dropdowns/city-states",
  niches: "/api/dropdowns/niches",
  practiceTypes: "/api/dropdowns/practice-types",
  medicalSpecialties: "/api/dropdowns/medical-specialties",
  subSpecialties: "/api/dropdowns/sub-specialties",
  specialInterests: "/api/dropdowns/special-interests",
  treatments: "/api/dropdowns/treatments",
};

interface UseDropdownDataOptions {
  source?: "local" | "api";
  apiBaseUrl?: string;
  endpoints?: Partial<Record<DatasetKey, string>>;
}

const normalizeOptions = (value: unknown): DropdownOption[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      if (typeof item === "string") {
        return { key: item, label: item };
      }

      if (typeof item === "object" && item !== null) {
        const record = item as {
          id?: string;
          key?: string;
          label?: string;
          name?: string;
          value?: string;
        };
        const key = record.key ?? record.id ?? record.value ?? record.name;
        const label = record.label ?? record.name ?? key;

        if (!key || !label) {
          return null;
        }

        return { key, label };
      }

      return null;
    })
    .filter((item): item is DropdownOption => item !== null);
};

export const useDropdownData = (options: UseDropdownDataOptions = {}) => {
  const { source = "local", apiBaseUrl = "", endpoints = {} } = options;
  const [data, setData] = useState(DROPDOWN_DEFAULT_DATA);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mergedEndpoints = useMemo(
    () => ({ ...DROPDOWN_API_ENDPOINTS, ...endpoints }),
    [endpoints],
  );

  const fetchFromApi = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const datasetKeys = Object.keys(DROPDOWN_DEFAULT_DATA) as DatasetKey[];
      const results = await Promise.all(
        datasetKeys.map(async (dataset) => {
          const endpoint = mergedEndpoints[dataset];

          if (!endpoint) {
            return [dataset, DROPDOWN_DEFAULT_DATA[dataset]] as const;
          }

          const url = `${apiBaseUrl}${endpoint}`;
          const response = await fetch(url, {
            credentials: "include",
          });

          if (!response.ok) {
            throw new Error(`Failed to fetch ${dataset}`);
          }

          const payload = await response.json();
          const optionsData = normalizeOptions(payload);

          return [
            dataset,
            optionsData.length > 0
              ? optionsData
              : DROPDOWN_DEFAULT_DATA[dataset],
          ] as const;
        }),
      );

      setData((previousData) => {
        const nextData = { ...previousData };

        results.forEach(([dataset, datasetOptions]) => {
          nextData[dataset] = datasetOptions;
        });

        return nextData;
      });
    } catch (fetchError) {
      setError(
        fetchError instanceof Error
          ? fetchError.message
          : "Failed to fetch dropdown data",
      );
      setData(DROPDOWN_DEFAULT_DATA);
    } finally {
      setIsLoading(false);
    }
  }, [apiBaseUrl, mergedEndpoints]);

  useEffect(() => {
    if (source !== "api") {
      return;
    }

    void fetchFromApi();
  }, [fetchFromApi, source]);

  const getOptions = (dataset: DatasetKey) => data[dataset];

  return {
    countries: getOptions("countries"),
    cityStates: getOptions("cityStates"),
    niches: getOptions("niches"),
    practiceTypes: getOptions("practiceTypes"),
    medicalSpecialties: getOptions("medicalSpecialties"),
    subSpecialties: getOptions("subSpecialties"),
    specialInterests: getOptions("specialInterests"),
    treatments: getOptions("treatments"),
    getOptions,
    allDropdownData: data,
    isLoading,
    error,
    refresh: fetchFromApi,
  };
};
