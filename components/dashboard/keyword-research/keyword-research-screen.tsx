"use client";

import type { Selection } from "@react-types/shared";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert } from "@heroui/alert";
import { Autocomplete, AutocompleteItem } from "@heroui/autocomplete";
import { Button } from "@heroui/button";
import { Card, CardBody } from "@heroui/card";
import { Input } from "@heroui/input";
import { Textarea } from "@heroui/input";
import {
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
} from "@heroui/modal";
import { Select, SelectItem } from "@heroui/select";
import { Tab, Tabs } from "@heroui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
} from "@heroui/table";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Download,
  ListPlus,
  Search,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";

import {
  keywordResearchApi,
  type KeywordResearchCountryOption,
  type KeywordResearchItem,
  type KeywordResearchLanguageOption,
  type KeywordResearchRequestBody,
} from "@/apis/keyword-research";
import { keywordContentListsApi } from "@/apis/keyword-content-lists";
import { clientsApi, type ClientApiItem } from "@/apis/clients";
import { scansApi } from "@/apis/scans";
import { useAuth } from "@/components/auth/auth-context";
import { AddKeywordsToWebContentModal } from "@/components/dashboard/keyword-research/add-keywords-to-web-content-modal";
import {
  WebsiteContentKeywordsModal,
  type WebsiteContentKeywordItem,
  type WebsiteContentFormValues,
} from "@/components/dashboard/keyword-research/website-content-keywords-modal";
import { useAppToast } from "@/hooks/use-app-toast";

type KeywordResearchRow = {
  cpc: number | null;
  id: string;
  intent: string | null;
  kd: number | null;
  keyword: string;
  searchVolume: number | null;
  serp: string | null;
};

const RESULTS_PER_PAGE = 10;
const LOCAL_RANKINGS_LAUNCH_KEY = "ahm-local-rankings-launch";

const tabClassNames = {
  cursor: "bg-white shadow-none",
  panel: "p-0",
  tabList: "h-11 gap-0 rounded-xl bg-[#F3F4F6] p-1",
  tab: "h-9 rounded-lg px-10 text-sm font-medium data-[hover-unselected=true]:opacity-100",
  tabContent:
    "group-data-[selected=true]:text-[#111827] group-data-[selected=false]:text-[#111827]",
};

const headerCellClass =
  "bg-[#F9FAFB] text-xs font-medium text-[#111827] uppercase tracking-[0.02em]";

const formatCpc = (value: number | null) =>
  value === null ? "-" : `$ ${value.toFixed(2)}`;

const formatMetric = (value: number | null) =>
  value === null ? "-" : new Intl.NumberFormat("en-US").format(value);

const escapeCsvValue = (value: string) => {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }

  return value;
};

const normalizeSelection = (selection: Selection) => {
  if (selection === "all") {
    return null;
  }

  const [firstKey] = Array.from(selection);

  return firstKey ? String(firstKey) : null;
};

const normalizeAutocompleteValue = (value: string) => value.trimStart();

const mapApiRowToTableRow = (
  item: KeywordResearchItem,
): KeywordResearchRow => ({
  cpc: item.cpc,
  id: item.id,
  intent: item.intent,
  kd: item.kd,
  keyword: item.keyword,
  searchVolume: item.searchVolume,
  serp: item.serp,
});

const DEFAULT_COUNTRY_OPTION: KeywordResearchCountryOption = {
  key: "GB",
  label: "United Kingdom",
  locationCode: 2826,
  value: "GB",
};

const DEFAULT_LANGUAGE_OPTION: KeywordResearchLanguageOption = {
  key: "en",
  label: "English",
  value: "en",
};

const SEARCH_VOLUME_RANGES = [
  { label: "100,001+", max: null, min: 100001, value: "100001:" },
  { label: "10,001–100,000", max: 100000, min: 10001, value: "10001:100000" },
  { label: "1,001–10,000", max: 10000, min: 1001, value: "1001:10000" },
  { label: "101–1,000", max: 1000, min: 101, value: "101:1000" },
  { label: "11–100", max: 100, min: 11, value: "11:100" },
  { label: "1–10", max: 10, min: 1, value: "1:10" },
] as const;

const KEYWORD_DIFFICULTY_RANGES = [
  { label: "Very hard", max: 100, min: 85, suffix: "85–100%", value: "85:100" },
  { label: "Hard", max: 84, min: 70, suffix: "70–84%", value: "70:84" },
  { label: "Difficult", max: 69, min: 50, suffix: "50–69%", value: "50:69" },
  { label: "Possible", max: 49, min: 30, suffix: "30–49%", value: "30:49" },
  { label: "Easy", max: 29, min: 15, suffix: "15–29%", value: "15:29" },
  { label: "Very easy", max: 14, min: 0, suffix: "0–14%", value: "0:14" },
] as const;

const DEFAULT_INTENT_OPTIONS = [
  "Informational",
  "Navigational",
  "Commercial",
  "Transactional",
] as const;

type CanonicalIntent = (typeof DEFAULT_INTENT_OPTIONS)[number];

const CANONICAL_INTENT_MAP = new Map(
  DEFAULT_INTENT_OPTIONS.map((value) => [value.toLowerCase(), value] as const),
);

const parseCanonicalIntents = (value: string | null | undefined) =>
  Array.from(
    new Set(
      (value ?? "")
        .split(",")
        .map((item) => item.trim().toLowerCase())
        .map((item) => CANONICAL_INTENT_MAP.get(item) ?? null)
        .filter((item): item is CanonicalIntent => Boolean(item)),
    ),
  );

const getSearchVolumeRangeLabel = (value: string) => {
  if (!value) {
    return "Search Volume";
  }

  const preset = SEARCH_VOLUME_RANGES.find((item) => item.value === value);

  if (preset) {
    return preset.label;
  }

  const [from = "", to = ""] = value.split(":");

  if (from && to) {
    return `${formatMetric(Number(from))}-${formatMetric(Number(to))}`;
  }

  if (from) {
    return `${formatMetric(Number(from))}+`;
  }

  if (to) {
    return `Up to ${formatMetric(Number(to))}`;
  }

  return "Search Volume";
};

const parseSearchVolumeRange = (value: string) => {
  if (!value) {
    return { max: null, min: null };
  }

  const [minValue = "", maxValue = ""] = value.split(":");
  const min = minValue ? Number(minValue) : null;
  const max = maxValue ? Number(maxValue) : null;

  return {
    max: Number.isFinite(max) ? max : null,
    min: Number.isFinite(min) ? min : null,
  };
};

const getKeywordDifficultyRangeLabel = (value: string) => {
  if (!value) {
    return "Keyword Difficulty";
  }

  const preset = KEYWORD_DIFFICULTY_RANGES.find((item) => item.value === value);

  if (preset) {
    return preset.label;
  }

  const [from = "", to = ""] = value.split(":");

  if (from && to) {
    return `${from}-${to}%`;
  }

  if (from) {
    return `${from}%+`;
  }

  if (to) {
    return `Up to ${to}%`;
  }

  return "Keyword Difficulty";
};

const parseKeywordDifficultyRange = (value: string) => {
  if (!value) {
    return { max: null, min: null };
  }

  const [minValue = "", maxValue = ""] = value.split(":");
  const min = minValue ? Number(minValue) : null;
  const max = maxValue ? Number(maxValue) : null;

  return {
    max: Number.isFinite(max) ? max : null,
    min: Number.isFinite(min) ? min : null,
  };
};

const getCpcRangeLabel = (value: string) => {
  if (!value) {
    return "CPC";
  }

  const [from = "", to = ""] = value.split(":");

  if (from && to) {
    return `$${from}-$${to}`;
  }

  if (from) {
    return `$${from}+`;
  }

  if (to) {
    return `Up to $${to}`;
  }

  return "CPC";
};

const parseCpcRange = (value: string) => {
  if (!value) {
    return { max: null, min: null };
  }

  const [minValue = "", maxValue = ""] = value.split(":");
  const min = minValue ? Number(minValue) : null;
  const max = maxValue ? Number(maxValue) : null;

  return {
    max: Number.isFinite(max) ? max : null,
    min: Number.isFinite(min) ? min : null,
  };
};

const parseExcludedKeywords = (value: string) =>
  value
    .split(/\r?\n/)
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);

const normalizeExcludedKeywordsValue = (value: string) =>
  parseExcludedKeywords(value).join("\n");

export const KeywordResearchScreen = () => {
  const router = useRouter();
  const toast = useAppToast();
  const { getValidAccessToken, session } = useAuth();
  const [activeTab, setActiveTab] = useState("keywords");
  const [keywordMode, setKeywordMode] = useState("similar-keywords");
  const [selectedKeys, setSelectedKeys] = useState<Selection>(new Set([]));
  const [clients, setClients] = useState<ClientApiItem[]>([]);
  const [isAddToListOpen, setIsAddToListOpen] = useState(false);
  const [isWebsiteContentModalOpen, setIsWebsiteContentModalOpen] =
    useState(false);
  const [isLocalRankingsChoiceOpen, setIsLocalRankingsChoiceOpen] =
    useState(false);
  const [websiteContentLocation, setWebsiteContentLocation] = useState("");
  const [websiteContentSelectedClientId, setWebsiteContentSelectedClientId] =
    useState("");
  const [localRankingsSelectedClientId, setLocalRankingsSelectedClientId] =
    useState("");
  const [websiteContentKeywords, setWebsiteContentKeywords] = useState<
    WebsiteContentKeywordItem[]
  >([]);
  const [page, setPage] = useState(1);
  const [pageSearch, setPageSearch] = useState("");
  const [searchKeyword, setSearchKeyword] = useState("");
  const [selectedSearchVolume, setSelectedSearchVolume] = useState("");
  const [isSearchVolumeFilterOpen, setIsSearchVolumeFilterOpen] =
    useState(false);
  const searchVolumeFilterRef = useRef<HTMLDivElement | null>(null);
  const [customSearchVolumeFrom, setCustomSearchVolumeFrom] = useState("");
  const [customSearchVolumeTo, setCustomSearchVolumeTo] = useState("");
  const [selectedKeywordDifficulty, setSelectedKeywordDifficulty] =
    useState("");
  const [isKeywordDifficultyFilterOpen, setIsKeywordDifficultyFilterOpen] =
    useState(false);
  const keywordDifficultyFilterRef = useRef<HTMLDivElement | null>(null);
  const [customKeywordDifficultyFrom, setCustomKeywordDifficultyFrom] =
    useState("");
  const [customKeywordDifficultyTo, setCustomKeywordDifficultyTo] =
    useState("");
  const [selectedCpc, setSelectedCpc] = useState("");
  const [isCpcFilterOpen, setIsCpcFilterOpen] = useState(false);
  const cpcFilterRef = useRef<HTMLDivElement | null>(null);
  const [customCpcFrom, setCustomCpcFrom] = useState("");
  const [customCpcTo, setCustomCpcTo] = useState("");
  const [selectedIntents, setSelectedIntents] = useState<CanonicalIntent[]>([]);
  const [draftIntents, setDraftIntents] = useState<CanonicalIntent[]>([]);
  const [isIntentFilterOpen, setIsIntentFilterOpen] = useState(false);
  const intentFilterRef = useRef<HTMLDivElement | null>(null);
  const [selectedExcludedKeyword, setSelectedExcludedKeyword] = useState("");
  const [draftExcludedKeywords, setDraftExcludedKeywords] = useState("");
  const [isExcludeKeywordFilterOpen, setIsExcludeKeywordFilterOpen] =
    useState(false);
  const excludeKeywordFilterRef = useRef<HTMLDivElement | null>(null);
  const [languageOptions, setLanguageOptions] = useState<
    KeywordResearchLanguageOption[]
  >([]);
  const [searchLanguage, setSearchLanguage] = useState("");
  const [countryOptions, setCountryOptions] = useState<
    KeywordResearchCountryOption[]
  >([]);
  const [searchCountry, setSearchCountry] = useState("");
  const [searchCountryLabel, setSearchCountryLabel] = useState("");
  const [searchCountryLocationCode, setSearchCountryLocationCode] = useState<
    number | null
  >(null);
  const [similarKeywordResults, setSimilarKeywordResults] = useState<
    KeywordResearchRow[]
  >([]);
  const [keywordSuggestionResults, setKeywordSuggestionResults] = useState<
    KeywordResearchRow[]
  >([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingLocations, setIsLoadingLocations] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [saveSuccessMessage, setSaveSuccessMessage] = useState("");
  const [hasSearched, setHasSearched] = useState(false);
  const [lastSubmittedSearch, setLastSubmittedSearch] =
    useState<KeywordResearchRequestBody | null>(null);

  useEffect(() => {
    if (!session?.accessToken) {
      setClients([]);
      setCountryOptions([]);
      setLanguageOptions([]);
      setSearchCountry("");
      setSearchCountryLabel("");
      setSearchCountryLocationCode(null);
      setSearchLanguage("");

      return;
    }

    let isMounted = true;

    const loadCountries = async () => {
      try {
        setIsLoadingLocations(true);
        const accessToken = await getValidAccessToken();
        const [countriesResponse, languagesResponse, clientsResponse] =
          await Promise.all([
            keywordResearchApi.getCountries(accessToken),
            keywordResearchApi.getLanguages(accessToken),
            clientsApi.getClients(accessToken),
          ]);

        if (!isMounted) {
          return;
        }

        const resolvedCountries = countriesResponse.countries.length
          ? countriesResponse.countries
          : [DEFAULT_COUNTRY_OPTION];
        const resolvedLanguages = languagesResponse.languages.length
          ? languagesResponse.languages
          : [DEFAULT_LANGUAGE_OPTION];

        setCountryOptions(
          resolvedCountries.map((item) => ({
            ...item,
            key: item.value,
          })),
        );
        setLanguageOptions(
          resolvedLanguages.map((item) => ({
            ...item,
            key: item.value,
          })),
        );
        setClients(clientsResponse);

        const defaultCountry =
          resolvedCountries.find((item) => item.value.toUpperCase() === "GB") ??
          resolvedCountries[0];
        const defaultLanguage =
          resolvedLanguages.find((item) => item.value === "en") ??
          resolvedLanguages[0];

        if (defaultCountry) {
          setSearchCountry(defaultCountry.value);
          setSearchCountryLabel(defaultCountry.label);
          setSearchCountryLocationCode(defaultCountry.locationCode);
        }

        if (defaultLanguage) {
          setSearchLanguage(defaultLanguage.value);
        }
      } catch {
        if (!isMounted) {
          return;
        }

        setCountryOptions([DEFAULT_COUNTRY_OPTION]);
        setLanguageOptions([DEFAULT_LANGUAGE_OPTION]);
        setSearchCountry(DEFAULT_COUNTRY_OPTION.value);
        setSearchCountryLabel(DEFAULT_COUNTRY_OPTION.label);
        setSearchCountryLocationCode(DEFAULT_COUNTRY_OPTION.locationCode);
        setSearchLanguage(DEFAULT_LANGUAGE_OPTION.value);
        setLoadError("");
      } finally {
        if (isMounted) {
          setIsLoadingLocations(false);
        }
      }
    };

    void loadCountries();

    return () => {
      isMounted = false;
    };
  }, [getValidAccessToken, session?.accessToken]);

  const executeSearch = useCallback(
    async (payload: KeywordResearchRequestBody) => {
      if (!session?.accessToken) {
        setLoadError("You must be signed in to search keywords.");
        setSimilarKeywordResults([]);
        setKeywordSuggestionResults([]);

        return;
      }

      try {
        setIsLoading(true);
        setLoadError("");
        const accessToken = await getValidAccessToken();

        const [similarKeywordsResponse, keywordSuggestionsResponse] =
          await Promise.all([
            keywordResearchApi.getSimilarKeywords(accessToken, payload),
            keywordResearchApi.getKeywordSuggestions(accessToken, payload),
          ]);

        setSimilarKeywordResults(
          similarKeywordsResponse.keywords.map(mapApiRowToTableRow),
        );
        setKeywordSuggestionResults(
          keywordSuggestionsResponse.keywords.map(mapApiRowToTableRow),
        );
        setSelectedKeys(new Set([]));
      } catch (error) {
        setLoadError(
          error instanceof Error
            ? error.message
            : "Failed to fetch keyword research results.",
        );
        setSimilarKeywordResults([]);
        setKeywordSuggestionResults([]);
        setSelectedKeys(new Set([]));
      } finally {
        setIsLoading(false);
      }
    },
    [getValidAccessToken, session?.accessToken],
  );

  const handleSearch = useCallback(() => {
    const normalizedKeyword = searchKeyword.trim();

    if (!normalizedKeyword) {
      setLoadError("Keyword is required.");
      setSimilarKeywordResults([]);
      setKeywordSuggestionResults([]);
      setHasSearched(false);

      return;
    }

    const selectedLanguage =
      languageOptions.find((item) => item.value === searchLanguage) ?? null;

    if (!selectedLanguage) {
      setLoadError("Language is required.");
      setSimilarKeywordResults([]);
      setKeywordSuggestionResults([]);
      setHasSearched(false);

      return;
    }

    const payload = {
      country: searchCountryLabel,
      countryIsoCode: searchCountry || undefined,
      forceRefresh: true,
      keyword: normalizedKeyword,
      languageCode: selectedLanguage.value,
      languageName: selectedLanguage.label,
      locationCode: searchCountryLocationCode ?? undefined,
    };

    setHasSearched(true);
    setLastSubmittedSearch(payload);
    setPage(1);
  }, [
    searchCountry,
    searchCountryLabel,
    searchCountryLocationCode,
    searchKeyword,
    searchLanguage,
  ]);

  useEffect(() => {
    if (!lastSubmittedSearch) {
      return;
    }

    void executeSearch(lastSubmittedSearch);
  }, [executeSearch, lastSubmittedSearch]);

  useEffect(() => {
    setPage(1);
  }, [pageSearch]);

  useEffect(() => {
    if (!isSearchVolumeFilterOpen) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (
        searchVolumeFilterRef.current &&
        !searchVolumeFilterRef.current.contains(event.target as Node)
      ) {
        setIsSearchVolumeFilterOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [isSearchVolumeFilterOpen]);

  useEffect(() => {
    if (!isKeywordDifficultyFilterOpen) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (
        keywordDifficultyFilterRef.current &&
        !keywordDifficultyFilterRef.current.contains(event.target as Node)
      ) {
        setIsKeywordDifficultyFilterOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [isKeywordDifficultyFilterOpen]);

  useEffect(() => {
    if (!isCpcFilterOpen) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (
        cpcFilterRef.current &&
        !cpcFilterRef.current.contains(event.target as Node)
      ) {
        setIsCpcFilterOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [isCpcFilterOpen]);

  useEffect(() => {
    if (!isIntentFilterOpen) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (
        intentFilterRef.current &&
        !intentFilterRef.current.contains(event.target as Node)
      ) {
        setIsIntentFilterOpen(false);
        setDraftIntents(selectedIntents);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [isIntentFilterOpen, selectedIntents]);

  useEffect(() => {
    if (!isExcludeKeywordFilterOpen) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (
        excludeKeywordFilterRef.current &&
        !excludeKeywordFilterRef.current.contains(event.target as Node)
      ) {
        setIsExcludeKeywordFilterOpen(false);
        setDraftExcludedKeywords(selectedExcludedKeyword);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [isExcludeKeywordFilterOpen, selectedExcludedKeyword]);

  const activeResults = useMemo(
    () =>
      keywordMode === "similar-keywords"
        ? similarKeywordResults
        : keywordSuggestionResults,
    [keywordMode, keywordSuggestionResults, similarKeywordResults],
  );

  const filteredCountryOptions = useMemo(() => {
    const query = searchCountryLabel.trim().toLowerCase();

    if (!query) {
      return countryOptions;
    }

    return countryOptions.filter((item) =>
      item.label.toLowerCase().includes(query),
    );
  }, [countryOptions, searchCountryLabel]);

  const intentFilterOptions = DEFAULT_INTENT_OPTIONS.map((value) => ({
    key: value,
    label: value,
    value,
  }));

  const filteredRows = useMemo(() => {
    const query = pageSearch.trim().toLowerCase();
    const searchVolumeRange = parseSearchVolumeRange(selectedSearchVolume);
    const keywordDifficultyRange = parseKeywordDifficultyRange(
      selectedKeywordDifficulty,
    );
    const cpcRange = parseCpcRange(selectedCpc);
    const excludedKeywords = new Set(
      parseExcludedKeywords(selectedExcludedKeyword),
    );

    return activeResults.filter((row) => {
      const matchesQuery = !query
        ? true
        : [row.keyword, row.intent ?? "", row.serp ?? ""].some((value) =>
            value.toLowerCase().includes(query),
          );

      const matchesSearchVolume =
        searchVolumeRange.min === null && searchVolumeRange.max === null
          ? true
          : row.searchVolume !== null &&
            (searchVolumeRange.min === null ||
              row.searchVolume >= searchVolumeRange.min) &&
            (searchVolumeRange.max === null ||
              row.searchVolume <= searchVolumeRange.max);
      const matchesKeywordDifficulty =
        keywordDifficultyRange.min === null &&
        keywordDifficultyRange.max === null
          ? true
          : row.kd !== null &&
            (keywordDifficultyRange.min === null ||
              row.kd >= keywordDifficultyRange.min) &&
            (keywordDifficultyRange.max === null ||
              row.kd <= keywordDifficultyRange.max);
      const matchesCpc =
        cpcRange.min === null && cpcRange.max === null
          ? true
          : row.cpc !== null &&
            (cpcRange.min === null || row.cpc >= cpcRange.min) &&
            (cpcRange.max === null || row.cpc <= cpcRange.max);
      const rowIntents = parseCanonicalIntents(row.intent);
      const matchesIntent = selectedIntents.length
        ? selectedIntents.some((intent) => rowIntents.includes(intent))
        : true;
      const matchesExcludedKeyword = excludedKeywords.size
        ? !excludedKeywords.has(row.keyword.trim().toLowerCase())
        : true;

      return (
        matchesQuery &&
        matchesSearchVolume &&
        matchesKeywordDifficulty &&
        matchesCpc &&
        matchesIntent &&
        matchesExcludedKeyword
      );
    });
  }, [
    activeResults,
    pageSearch,
    selectedCpc,
    selectedExcludedKeyword,
    selectedIntents,
    selectedKeywordDifficulty,
    selectedSearchVolume,
  ]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredRows.length / RESULTS_PER_PAGE),
  );

  const paginatedRows = useMemo(() => {
    const safePage = Math.min(page, totalPages);
    const startIndex = (safePage - 1) * RESULTS_PER_PAGE;

    return filteredRows.slice(startIndex, startIndex + RESULTS_PER_PAGE);
  }, [filteredRows, page, totalPages]);

  const exportRows = useMemo(() => {
    if (selectedKeys === "all") {
      return filteredRows;
    }

    const selectedIds = new Set(Array.from(selectedKeys).map(String));

    if (!selectedIds.size) {
      return filteredRows;
    }

    return filteredRows.filter((row) => selectedIds.has(row.id));
  }, [filteredRows, selectedKeys]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const emptyStateMessage = isLoading
    ? "Loading keywords..."
    : loadError
      ? loadError
      : hasSearched
        ? "No keywords found."
        : "Enter a keyword and run a search.";

  const handleExport = useCallback(() => {
    if (!exportRows.length) {
      return;
    }

    const headers = [
      "Keyword",
      "Search Volume",
      "KD%",
      "Search Intent",
      "SERP",
      "CPC (USD)",
    ];

    const csv = [
      headers.join(","),
      ...exportRows.map((row) =>
        [
          escapeCsvValue(row.keyword),
          row.searchVolume ?? "",
          row.kd ?? "",
          escapeCsvValue(row.intent ?? ""),
          escapeCsvValue(row.serp ?? ""),
          row.cpc ?? "",
        ].join(","),
      ),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const filename =
      keywordMode === "similar-keywords"
        ? "similar-keywords.csv"
        : "keyword-suggestions.csv";

    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [exportRows, keywordMode]);

  const handleAddToList = useCallback(
    async ({ clientId, location }: { clientId: string; location: string }) => {
      setSaveSuccessMessage("");

      if (location === "Local Rankings") {
        setLocalRankingsSelectedClientId(clientId);
        setIsLocalRankingsChoiceOpen(true);

        return;
      }

      if (location !== "Website Content") {
        return;
      }

      setWebsiteContentSelectedClientId(clientId);
      setWebsiteContentLocation(location);
      setWebsiteContentKeywords(
        exportRows.map((row) => ({
          cpc: row.cpc,
          id: row.id,
          intent: row.intent,
          kd: row.kd,
          keyword: row.keyword,
          searchVolume: row.searchVolume,
        })),
      );
      setIsWebsiteContentModalOpen(true);
    },
    [exportRows],
  );

  const handleOpenLocalRankingsNow = useCallback(() => {
    if (!localRankingsSelectedClientId) {
      toast.warning("Client is required to continue.");

      return;
    }

    const keywords = Array.from(
      new Set(
        exportRows
          .map((row) => row.keyword.trim())
          .filter((keyword) => keyword.length > 0),
      ),
    );

    if (!keywords.length) {
      toast.warning("No keywords selected.");

      return;
    }

    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(
        LOCAL_RANKINGS_LAUNCH_KEY,
        JSON.stringify({
          clientId: localRankingsSelectedClientId,
          keywords,
        }),
      );
    }

    setIsLocalRankingsChoiceOpen(false);
    setIsAddToListOpen(false);
    const encodedKeywords = encodeURIComponent(JSON.stringify(keywords));

    router.push(
      `/dashboard/clients/${encodeURIComponent(localRankingsSelectedClientId)}/local-rankings?openScanModal=1&prefillKeywords=${encodedKeywords}`,
    );
  }, [exportRows, localRankingsSelectedClientId, router, toast]);

  const handleSaveForScanLater = useCallback(() => {
    if (!session?.accessToken) {
      toast.warning("You must be signed in.");

      return;
    }

    if (!localRankingsSelectedClientId) {
      toast.warning("Client is required to continue.");

      return;
    }

    const keywords = Array.from(
      new Set(
        exportRows
          .map((row) => row.keyword.trim())
          .filter((keyword) => keyword.length > 0),
      ),
    );

    if (!keywords.length) {
      toast.warning("No keywords selected.");

      return;
    }

    void getValidAccessToken()
      .then((accessToken) =>
        scansApi.saveLocalRankingKeywords(
          accessToken,
          localRankingsSelectedClientId,
          keywords,
        ),
      )
      .then(() => {
        setIsLocalRankingsChoiceOpen(false);
        setIsAddToListOpen(false);
        toast.success("Keywords saved for local ranking scan later.");
      })
      .catch((error) => {
        toast.danger("Failed to save keywords", {
          description:
            error instanceof Error ? error.message : "Please try again.",
        });
      });
  }, [
    exportRows,
    getValidAccessToken,
    localRankingsSelectedClientId,
    session?.accessToken,
    toast,
  ]);

  const handleSaveWebsiteContentKeywords = useCallback(
    async (values: WebsiteContentFormValues) => {
      if (!session?.accessToken) {
        throw new Error("You must be signed in to save keywords.");
      }

      if (!websiteContentSelectedClientId) {
        throw new Error("Client is required.");
      }

      const clusteringEnabled = values.keywords.length > 1;
      const pillarKeywordId = values.keywords[0]?.id ?? null;
      const accessToken = await getValidAccessToken();

      await keywordContentListsApi.createKeywordContentList(accessToken, {
        audience: values.audience || "",
        clientId: websiteContentSelectedClientId,
        enableContentClustering: clusteringEnabled,
        keywords: values.keywords.map((item, index) => ({
          contentType: item.contentType || "",
          cpc: item.cpc,
          id: item.id,
          intent: item.intent,
          isPillarArticle: clusteringEnabled && index === 0,
          kd: item.kd,
          keyword: item.keyword,
          parentKeywordId:
            clusteringEnabled && index > 0 && pillarKeywordId
              ? pillarKeywordId
              : null,
          searchVolume: item.searchVolume,
          title: item.title || "",
        })),
        location: websiteContentLocation || "Website Content",
        topic: values.topic || "",
      });
      setSaveSuccessMessage("Keyword list saved successfully.");
    },
    [
      getValidAccessToken,
      session?.accessToken,
      websiteContentLocation,
      websiteContentSelectedClientId,
    ],
  );

  return (
    <>
      {saveSuccessMessage ? (
        <div className="mb-3">
          <Alert color="success" title={saveSuccessMessage} variant="flat" />
        </div>
      ) : null}
      <Tabs
        aria-label="Keyword research mode"
        classNames={tabClassNames}
        color="default"
        radius="lg"
        selectedKey={activeTab}
        variant="solid"
        onSelectionChange={(key) => setActiveTab(String(key))}
      >
        <Tab key="keywords" title="Search by Keywords">
          <div className="space-y-5 pt-5">
            <Card className="border border-default-200 shadow-none">
              <CardBody className="p-4">
                <div className="grid gap-3 lg:grid-cols-4">
                  <div className="flex min-w-0 flex-col gap-2 sm:flex-row lg:col-span-2">
                    <Input
                      label="Search"
                      labelPlacement="outside"
                      placeholder="Enter Keyword"
                      radius="md"
                      startContent={
                        <Search className="text-default-400" size={16} />
                      }
                      value={searchKeyword}
                      onValueChange={setSearchKeyword}
                    />
                    <div className="flex items-end">
                      <Button
                        className="h-10 w-full bg-[#022279] px-7 text-white sm:w-auto"
                        isLoading={isLoading}
                        radius="md"
                        onPress={() => void handleSearch()}
                      >
                        Search
                      </Button>
                    </div>
                  </div>
                  <div className="min-w-0">
                    <Select
                      items={languageOptions}
                      label="Language"
                      labelPlacement="outside"
                      radius="md"
                      selectedKeys={searchLanguage ? [searchLanguage] : []}
                      onSelectionChange={(keys) => {
                        const value = normalizeSelection(keys);

                        if (value) {
                          setSearchLanguage(value);
                        }
                      }}
                    >
                      {(item) => (
                        <SelectItem key={item.value}>{item.label}</SelectItem>
                      )}
                    </Select>
                  </div>

                  <div className="min-w-0">
                    <Autocomplete
                      allowsCustomValue={false}
                      inputValue={searchCountryLabel}
                      isLoading={isLoadingLocations}
                      items={filteredCountryOptions}
                      label="Country"
                      labelPlacement="outside"
                      placeholder="Select country"
                      radius="md"
                      selectedKey={searchCountry || null}
                      onInputChange={(value) => {
                        const normalizedValue =
                          normalizeAutocompleteValue(value);

                        setSearchCountryLabel(normalizedValue);

                        const matchesSelectedCountry = countryOptions.some(
                          (item) =>
                            item.value === searchCountry &&
                            item.label === normalizedValue,
                        );

                        if (matchesSelectedCountry) {
                          return;
                        }

                        setSearchCountry("");
                        setSearchCountryLocationCode(null);
                      }}
                      onSelectionChange={(key) => {
                        if (!key) {
                          setSearchCountry("");
                          setSearchCountryLabel("");
                          setSearchCountryLocationCode(null);

                          return;
                        }

                        const selectedCountry = countryOptions.find(
                          (item) => item.value === String(key),
                        );

                        if (selectedCountry) {
                          setSearchCountry(selectedCountry.value);
                          setSearchCountryLabel(selectedCountry.label);
                          setSearchCountryLocationCode(
                            selectedCountry.locationCode,
                          );
                        }
                      }}
                    >
                      {(item) => (
                        <AutocompleteItem
                          key={item.value}
                          textValue={item.label}
                        >
                          {item.label}
                        </AutocompleteItem>
                      )}
                    </Autocomplete>
                  </div>
                </div>
              </CardBody>
            </Card>
            <Card className="overflow-visible border border-default-200 shadow-none">
              <CardBody className="overflow-visible p-4">
                <div className="relative z-20 flex flex-wrap items-center gap-3 overflow-visible">
                  <Tabs
                    fullWidth
                    aria-label="Keyword mode"
                    className="min-w-0 flex-[1_1_280px]"
                    classNames={{
                      cursor: "bg-white shadow-none",
                      tabList: "h-11 gap-0 bg-[#F3F4F6] p-1",
                      panel: "hidden",
                      tab: "h-9 rounded-lg data-[hover-unselected=true]:opacity-100",
                      tabContent:
                        "text-sm font-medium group-data-[selected=true]:text-[#111827] group-data-[selected=false]:text-[#111827]",
                    }}
                    radius="lg"
                    selectedKey={keywordMode}
                    variant="solid"
                    onSelectionChange={(key) => setKeywordMode(String(key))}
                  >
                    <Tab key="similar-keywords" title="Similar Keywords" />
                    <Tab
                      key="keyword-suggestions"
                      title="Keyword Suggestions"
                    />
                  </Tabs>
                  <div
                    ref={searchVolumeFilterRef}
                    className="relative z-50 min-w-0 flex-[1_1_180px] overflow-visible sm:max-w-[240px]"
                  >
                    <Button
                      className="h-10 w-full justify-between border-default-200 bg-white px-3 text-left text-[#111827]"
                      endContent={
                        <span className="flex items-center gap-1">
                          {selectedSearchVolume ? (
                            <span
                              aria-label="Clear search volume filter"
                              className="grid h-5 w-5 place-items-center rounded-full text-default-500 hover:bg-default-100 hover:text-[#111827]"
                              role="button"
                              tabIndex={0}
                              onClick={(event) => {
                                event.stopPropagation();
                                setSelectedSearchVolume("");
                                setCustomSearchVolumeFrom("");
                                setCustomSearchVolumeTo("");
                                setIsSearchVolumeFilterOpen(false);
                              }}
                              onKeyDown={(event) => {
                                if (
                                  event.key !== "Enter" &&
                                  event.key !== " "
                                ) {
                                  return;
                                }

                                event.preventDefault();
                                event.stopPropagation();
                                setSelectedSearchVolume("");
                                setCustomSearchVolumeFrom("");
                                setCustomSearchVolumeTo("");
                                setIsSearchVolumeFilterOpen(false);
                              }}
                            >
                              <X size={14} />
                            </span>
                          ) : null}
                          <ChevronDown className="text-default-500" size={16} />
                        </span>
                      }
                      radius="md"
                      variant="bordered"
                      onPress={() => {
                        setIsSearchVolumeFilterOpen((current) => !current);
                      }}
                    >
                      <span className="truncate">
                        {getSearchVolumeRangeLabel(selectedSearchVolume)}
                      </span>
                    </Button>

                    {isSearchVolumeFilterOpen ? (
                      <div className="absolute left-0 top-12 z-[999] w-[250px] overflow-hidden rounded-lg border border-default-200 bg-white shadow-lg">
                        <div className="py-2">
                          {SEARCH_VOLUME_RANGES.map((range) => {
                            const isSelected =
                              selectedSearchVolume === range.value;

                            return (
                              <button
                                key={range.value}
                                className={`block w-full px-3 py-2.5 text-left text-base text-[#111827] hover:bg-[#F3F4F6] ${
                                  isSelected ? "bg-[#F3F4F6]" : ""
                                }`}
                                type="button"
                                onClick={() => {
                                  setSelectedSearchVolume(range.value);
                                  setIsSearchVolumeFilterOpen(false);
                                }}
                              >
                                {range.label}
                              </button>
                            );
                          })}
                        </div>
                        <div className="border-t border-default-200 p-4">
                          <p className="mb-3 text-base font-semibold leading-7 text-[#111827]">
                            Custom range
                          </p>
                          <div className="mb-3 grid grid-cols-2 overflow-hidden rounded-lg border border-default-300">
                            <Input
                              classNames={{
                                input: "text-base placeholder:text-[#9CA3AF]",
                                inputWrapper:
                                  "rounded-none border-0 shadow-none",
                              }}
                              min={0}
                              placeholder="From"
                              radius="none"
                              type="number"
                              value={customSearchVolumeFrom}
                              variant="flat"
                              onValueChange={setCustomSearchVolumeFrom}
                            />
                            <Input
                              classNames={{
                                input: "text-base placeholder:text-[#9CA3AF]",
                                inputWrapper:
                                  "rounded-none border-0 border-l border-default-300 shadow-none",
                              }}
                              min={0}
                              placeholder="To"
                              radius="none"
                              type="number"
                              value={customSearchVolumeTo}
                              variant="flat"
                              onValueChange={setCustomSearchVolumeTo}
                            />
                          </div>
                          <Button
                            className="w-full rounded-lg bg-primary text-base font-semibold text-white"
                            onPress={() => {
                              const from = customSearchVolumeFrom.trim();
                              const to = customSearchVolumeTo.trim();

                              setSelectedSearchVolume(
                                from || to ? `${from}:${to}` : "",
                              );
                              setIsSearchVolumeFilterOpen(false);
                            }}
                          >
                            Apply
                          </Button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                  <div
                    ref={keywordDifficultyFilterRef}
                    className="relative z-50 min-w-0 flex-[1_1_180px] overflow-visible sm:max-w-[240px]"
                  >
                    <Button
                      className="h-10 w-full justify-between border-default-200 bg-white px-3 text-left text-[#111827]"
                      endContent={
                        <span className="flex items-center gap-1">
                          {selectedKeywordDifficulty ? (
                            <span
                              aria-label="Clear keyword difficulty filter"
                              className="grid h-5 w-5 place-items-center rounded-full text-default-500 hover:bg-default-100 hover:text-[#111827]"
                              role="button"
                              tabIndex={0}
                              onClick={(event) => {
                                event.stopPropagation();
                                setSelectedKeywordDifficulty("");
                                setCustomKeywordDifficultyFrom("");
                                setCustomKeywordDifficultyTo("");
                                setIsKeywordDifficultyFilterOpen(false);
                              }}
                              onKeyDown={(event) => {
                                if (
                                  event.key !== "Enter" &&
                                  event.key !== " "
                                ) {
                                  return;
                                }

                                event.preventDefault();
                                event.stopPropagation();
                                setSelectedKeywordDifficulty("");
                                setCustomKeywordDifficultyFrom("");
                                setCustomKeywordDifficultyTo("");
                                setIsKeywordDifficultyFilterOpen(false);
                              }}
                            >
                              <X size={14} />
                            </span>
                          ) : null}
                          <ChevronDown className="text-default-500" size={16} />
                        </span>
                      }
                      radius="md"
                      variant="bordered"
                      onPress={() => {
                        setIsKeywordDifficultyFilterOpen((current) => !current);
                      }}
                    >
                      <span className="truncate">
                        {getKeywordDifficultyRangeLabel(
                          selectedKeywordDifficulty,
                        )}
                      </span>
                    </Button>

                    {isKeywordDifficultyFilterOpen ? (
                      <div className="absolute left-0 top-12 z-[999] w-[min(300px,calc(100vw-2rem))] overflow-hidden rounded-lg border border-default-200 bg-white shadow-lg">
                        <div className="py-2">
                          {KEYWORD_DIFFICULTY_RANGES.map((range) => {
                            const isSelected =
                              selectedKeywordDifficulty === range.value;

                            return (
                              <button
                                key={range.value}
                                className={`grid w-full grid-cols-[minmax(0,1fr)_auto] gap-3 px-3 py-2.5 text-left text-base text-[#111827] hover:bg-[#F3F4F6] ${
                                  isSelected ? "bg-[#F3F4F6]" : ""
                                }`}
                                type="button"
                                onClick={() => {
                                  setSelectedKeywordDifficulty(range.value);
                                  setIsKeywordDifficultyFilterOpen(false);
                                }}
                              >
                                <span className="truncate">{range.label}</span>
                                <span className="text-[#6B7280]">
                                  {range.suffix}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                        <div className="border-t border-default-200 p-4">
                          <p className="mb-3 text-base font-semibold leading-7 text-[#111827]">
                            Custom range
                          </p>
                          <div className="mb-3 grid grid-cols-2 overflow-hidden rounded-lg border border-default-300">
                            <Input
                              classNames={{
                                input: "text-base placeholder:text-[#9CA3AF]",
                                inputWrapper:
                                  "rounded-none border-0 shadow-none",
                              }}
                              max={100}
                              min={0}
                              placeholder="From"
                              radius="none"
                              type="number"
                              value={customKeywordDifficultyFrom}
                              variant="flat"
                              onValueChange={setCustomKeywordDifficultyFrom}
                            />
                            <Input
                              classNames={{
                                input: "text-base placeholder:text-[#9CA3AF]",
                                inputWrapper:
                                  "rounded-none border-0 border-l border-default-300 shadow-none",
                              }}
                              max={100}
                              min={0}
                              placeholder="To"
                              radius="none"
                              type="number"
                              value={customKeywordDifficultyTo}
                              variant="flat"
                              onValueChange={setCustomKeywordDifficultyTo}
                            />
                          </div>
                          <Button
                            className="w-full rounded-lg bg-primary text-base font-semibold text-white"
                            onPress={() => {
                              const from = customKeywordDifficultyFrom.trim();
                              const to = customKeywordDifficultyTo.trim();

                              setSelectedKeywordDifficulty(
                                from || to ? `${from}:${to}` : "",
                              );
                              setIsKeywordDifficultyFilterOpen(false);
                            }}
                          >
                            Apply
                          </Button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                  <div
                    ref={cpcFilterRef}
                    className="relative z-50 min-w-0 flex-[1_1_180px] overflow-visible sm:max-w-[240px]"
                  >
                    <Button
                      className="h-10 w-full justify-between border-default-200 bg-white px-3 text-left text-[#111827]"
                      endContent={
                        <span className="flex items-center gap-1">
                          {selectedCpc ? (
                            <span
                              aria-label="Clear CPC filter"
                              className="grid h-5 w-5 place-items-center rounded-full text-default-500 hover:bg-default-100 hover:text-[#111827]"
                              role="button"
                              tabIndex={0}
                              onClick={(event) => {
                                event.stopPropagation();
                                setSelectedCpc("");
                                setCustomCpcFrom("");
                                setCustomCpcTo("");
                                setIsCpcFilterOpen(false);
                              }}
                              onKeyDown={(event) => {
                                if (
                                  event.key !== "Enter" &&
                                  event.key !== " "
                                ) {
                                  return;
                                }

                                event.preventDefault();
                                event.stopPropagation();
                                setSelectedCpc("");
                                setCustomCpcFrom("");
                                setCustomCpcTo("");
                                setIsCpcFilterOpen(false);
                              }}
                            >
                              <X size={14} />
                            </span>
                          ) : null}
                          <ChevronDown className="text-default-500" size={16} />
                        </span>
                      }
                      radius="md"
                      variant="bordered"
                      onPress={() => {
                        setIsCpcFilterOpen((current) => !current);
                      }}
                    >
                      <span className="truncate">
                        {getCpcRangeLabel(selectedCpc)}
                      </span>
                    </Button>

                    {isCpcFilterOpen ? (
                      <div className="absolute left-0 top-12 z-[999] w-[min(300px,calc(100vw-2rem))] overflow-hidden rounded-lg border border-default-200 bg-white shadow-lg">
                        <div className="border-t-0 p-4">
                          <p className="mb-3 text-base font-semibold leading-7 text-[#111827]">
                            Custom range
                          </p>
                          <div className="mb-3 grid grid-cols-2 overflow-hidden rounded-lg border border-default-300">
                            <Input
                              classNames={{
                                input: "text-base placeholder:text-[#9CA3AF]",
                                inputWrapper:
                                  "rounded-none border-0 shadow-none",
                              }}
                              min={0}
                              placeholder="From"
                              radius="none"
                              step="0.01"
                              type="number"
                              value={customCpcFrom}
                              variant="flat"
                              onValueChange={setCustomCpcFrom}
                            />
                            <Input
                              classNames={{
                                input: "text-base placeholder:text-[#9CA3AF]",
                                inputWrapper:
                                  "rounded-none border-0 border-l border-default-300 shadow-none",
                              }}
                              min={0}
                              placeholder="To"
                              radius="none"
                              step="0.01"
                              type="number"
                              value={customCpcTo}
                              variant="flat"
                              onValueChange={setCustomCpcTo}
                            />
                          </div>
                          <Button
                            className="w-full rounded-lg bg-primary text-base font-semibold text-white"
                            onPress={() => {
                              const from = customCpcFrom.trim();
                              const to = customCpcTo.trim();

                              setSelectedCpc(from || to ? `${from}:${to}` : "");
                              setIsCpcFilterOpen(false);
                            }}
                          >
                            Apply
                          </Button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                  <div
                    ref={intentFilterRef}
                    className="relative z-50 min-w-0 flex-[1_1_180px] overflow-visible sm:max-w-[240px]"
                  >
                    <Button
                      className="h-10 w-full justify-between border-default-200 bg-white px-3 text-left text-[#111827]"
                      endContent={
                        <span className="flex items-center gap-1">
                          {selectedIntents.length ? (
                            <span
                              aria-label="Clear intent filter"
                              className="grid h-5 w-5 place-items-center rounded-full text-default-500 hover:bg-default-100 hover:text-[#111827]"
                              role="button"
                              tabIndex={0}
                              onClick={(event) => {
                                event.stopPropagation();
                                setSelectedIntents([]);
                                setDraftIntents([]);
                                setIsIntentFilterOpen(false);
                              }}
                              onKeyDown={(event) => {
                                if (
                                  event.key !== "Enter" &&
                                  event.key !== " "
                                ) {
                                  return;
                                }

                                event.preventDefault();
                                event.stopPropagation();
                                setSelectedIntents([]);
                                setDraftIntents([]);
                                setIsIntentFilterOpen(false);
                              }}
                            >
                              <X size={14} />
                            </span>
                          ) : null}
                          <ChevronDown className="text-default-500" size={16} />
                        </span>
                      }
                      radius="md"
                      variant="bordered"
                      onPress={() => {
                        setDraftIntents(selectedIntents);
                        setIsIntentFilterOpen((current) => !current);
                      }}
                    >
                      <span className="truncate">
                        {selectedIntents.length
                          ? `Intent (${selectedIntents.length})`
                          : "Intent"}
                      </span>
                    </Button>

                    {isIntentFilterOpen ? (
                      <div className="absolute left-0 top-12 z-[999] w-[220px] overflow-hidden rounded-lg border border-default-200 bg-white shadow-lg">
                        <div className="py-1">
                          {intentFilterOptions.map((item) => {
                            const isChecked = draftIntents.includes(item.value);

                            return (
                              <button
                                key={item.value}
                                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-[#111827] hover:bg-[#F3F4F6]"
                                type="button"
                                onClick={() => {
                                  setDraftIntents((current) =>
                                    current.includes(item.value)
                                      ? current.filter(
                                          (value) => value !== item.value,
                                        )
                                      : [...current, item.value],
                                  );
                                }}
                              >
                                <span
                                  className={`grid h-4 w-4 place-items-center rounded-[4px] border ${
                                    isChecked
                                      ? "border-[#1597EA] bg-[#1597EA] text-white"
                                      : "border-default-300 bg-white text-transparent"
                                  }`}
                                >
                                  <Check size={12} />
                                </span>
                                <span className="truncate">{item.label}</span>
                              </button>
                            );
                          })}
                        </div>
                        <div className="border-t border-default-200 p-3">
                          <Button
                            className="w-full rounded-lg bg-primary text-base font-semibold text-white"
                            onPress={() => {
                              setSelectedIntents(draftIntents);
                              setIsIntentFilterOpen(false);
                            }}
                          >
                            Apply
                          </Button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                  <div
                    ref={excludeKeywordFilterRef}
                    className="relative z-50 min-w-0 flex-[1_1_180px] overflow-visible sm:max-w-[240px]"
                  >
                    <Button
                      className="h-10 w-full justify-between border-default-200 bg-white px-3 text-left text-[#111827]"
                      endContent={
                        <span className="flex items-center gap-1">
                          {selectedExcludedKeyword ? (
                            <span
                              aria-label="Clear excluded keywords"
                              className="grid h-5 w-5 place-items-center rounded-full text-default-500 hover:bg-default-100 hover:text-[#111827]"
                              role="button"
                              tabIndex={0}
                              onClick={(event) => {
                                event.stopPropagation();
                                setSelectedExcludedKeyword("");
                                setDraftExcludedKeywords("");
                                setIsExcludeKeywordFilterOpen(false);
                              }}
                              onKeyDown={(event) => {
                                if (
                                  event.key !== "Enter" &&
                                  event.key !== " "
                                ) {
                                  return;
                                }

                                event.preventDefault();
                                event.stopPropagation();
                                setSelectedExcludedKeyword("");
                                setDraftExcludedKeywords("");
                                setIsExcludeKeywordFilterOpen(false);
                              }}
                            >
                              <X size={14} />
                            </span>
                          ) : null}
                          <ChevronDown className="text-default-500" size={16} />
                        </span>
                      }
                      radius="md"
                      variant="bordered"
                      onPress={() => {
                        setDraftExcludedKeywords(selectedExcludedKeyword);
                        setIsExcludeKeywordFilterOpen((current) => !current);
                      }}
                    >
                      <span className="truncate">
                        {selectedExcludedKeyword
                          ? `Exclude Keywords (${parseExcludedKeywords(selectedExcludedKeyword).length})`
                          : "Exclude Keywords"}
                      </span>
                    </Button>

                    {isExcludeKeywordFilterOpen ? (
                      <div className="absolute left-0 top-12 z-[999] w-[min(420px,calc(100vw-2rem))] overflow-hidden rounded-lg border border-default-200 bg-white shadow-lg">
                        <div className="p-4">
                          <p className="mb-4 text-sm text-[#111827]">
                            Enter keywords one per line. Each line excludes an
                            exact keyword match.
                          </p>
                          <Textarea
                            classNames={{
                              input:
                                "min-h-[140px] text-base placeholder:text-[#9CA3AF]",
                              inputWrapper:
                                "rounded-lg border border-[#1597EA] shadow-none",
                            }}
                            minRows={6}
                            placeholder={
                              "dental implants\nteeth whitening\nemergency dentist"
                            }
                            value={draftExcludedKeywords}
                            variant="bordered"
                            onValueChange={setDraftExcludedKeywords}
                          />
                          <div className="mt-4 flex items-center gap-3">
                            <Button
                              className="rounded-lg bg-primary text-base font-semibold text-white"
                              onPress={() => {
                                const normalizedValue =
                                  normalizeExcludedKeywordsValue(
                                    draftExcludedKeywords,
                                  );

                                setDraftExcludedKeywords(normalizedValue);
                                setSelectedExcludedKeyword(normalizedValue);
                                setIsExcludeKeywordFilterOpen(false);
                              }}
                            >
                              Apply
                            </Button>
                            <Button
                              className="rounded-lg"
                              variant="bordered"
                              onPress={() => {
                                setDraftExcludedKeywords("");
                                setSelectedExcludedKeyword("");
                                setIsExcludeKeywordFilterOpen(false);
                              }}
                            >
                              Clear all
                            </Button>
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              </CardBody>
            </Card>

            <Card className="border border-default-200 shadow-none">
              <CardBody className="p-0">
                <div className="flex flex-col gap-4 border-b border-default-200 px-4 py-2 lg:flex-row lg:items-center lg:justify-between">
                  <h2 className="font-semibold text-[#111827]">
                    {keywordMode === "similar-keywords"
                      ? "Similar Keywords"
                      : "Keyword Suggestions"}
                  </h2>

                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                    <Input
                      className="w-full lg:w-[260px]"
                      placeholder="Search here"
                      radius="md"
                      startContent={
                        <Search className="text-default-400" size={18} />
                      }
                      value={pageSearch}
                      onValueChange={setPageSearch}
                    />
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        isDisabled={!paginatedRows.length}
                        radius="md"
                        startContent={<ListPlus size={16} />}
                        variant="bordered"
                        onPress={() => setIsAddToListOpen(true)}
                      >
                        Add to List
                      </Button>
                      <Button
                        isIconOnly
                        aria-label="Export keywords"
                        isDisabled={!filteredRows.length}
                        radius="md"
                        variant="bordered"
                        onPress={handleExport}
                      >
                        <Download size={16} />
                      </Button>
                    </div>
                  </div>
                </div>

                <Table
                  removeWrapper
                  aria-label="Keyword research results"
                  classNames={{
                    table: "border-collapse border-spacing-0",
                    tbody:
                      "[&_tr]:border-b [&_tr]:border-default-200 [&_tr:nth-child(even)]:bg-[#FCFCFD]",
                    td: "px-4 py-6 text-sm text-[#111827]",
                    th: "!rounded-none px-4 py-4",
                    tr: "rounded-none",
                  }}
                  selectedKeys={selectedKeys}
                  selectionMode="multiple"
                  onSelectionChange={setSelectedKeys}
                >
                  <TableHeader>
                    <TableColumn className={headerCellClass}>
                      Keyword
                    </TableColumn>
                    <TableColumn className={headerCellClass}>
                      Search Volume
                    </TableColumn>
                    <TableColumn className={headerCellClass}>KD%</TableColumn>
                    <TableColumn className={headerCellClass}>
                      Search Intent
                    </TableColumn>
                    <TableColumn className={headerCellClass}>SERP</TableColumn>
                    <TableColumn className={headerCellClass}>
                      CPC (USD)
                    </TableColumn>
                  </TableHeader>
                  <TableBody
                    emptyContent={emptyStateMessage}
                    items={paginatedRows}
                  >
                    {(item) => (
                      <TableRow key={item.id}>
                        <TableCell>{item.keyword}</TableCell>
                        <TableCell>{formatMetric(item.searchVolume)}</TableCell>
                        <TableCell>{formatMetric(item.kd)}</TableCell>
                        <TableCell>{item.intent ?? "-"}</TableCell>
                        <TableCell>{item.serp ?? "-"}</TableCell>
                        <TableCell>{formatCpc(item.cpc)}</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>

                <div className="flex flex-wrap items-center justify-center gap-2 px-4 py-5 text-[#4B5563]">
                  <Button
                    isDisabled={page <= 1}
                    startContent={<ChevronLeft size={18} />}
                    variant="light"
                    onPress={() =>
                      setPage((current) => Math.max(1, current - 1))
                    }
                  >
                    Back
                  </Button>

                  {Array.from(
                    { length: Math.min(totalPages, 5) },
                    (_, index) => {
                      const item = index + 1;
                      const isActive = item === page;

                      return (
                        <Button
                          key={item}
                          className={`min-h-11 min-w-11 ${isActive ? "bg-[#022279] text-white" : ""}`}
                          radius="full"
                          variant={isActive ? "solid" : "light"}
                          onPress={() => setPage(item)}
                        >
                          {item}
                        </Button>
                      );
                    },
                  )}

                  {totalPages > 5 ? (
                    <>
                      <span className="px-2 text-sm text-[#6B7280]">...</span>
                      <Button
                        radius="full"
                        variant="light"
                        onPress={() => setPage(totalPages)}
                      >
                        {totalPages}
                      </Button>
                    </>
                  ) : null}

                  <Button
                    endContent={<ChevronRight size={18} />}
                    isDisabled={page >= totalPages}
                    variant="light"
                    onPress={() =>
                      setPage((current) => Math.min(totalPages, current + 1))
                    }
                  >
                    Next
                  </Button>
                </div>
              </CardBody>
            </Card>
          </div>
        </Tab>
        <Tab key="website" title="Search by Website">
          <Card className="mt-5 border border-default-200 shadow-none">
            <CardBody className="p-6 text-sm text-[#6B7280]">
              Search by website view is not built yet.
            </CardBody>
          </Card>
        </Tab>
      </Tabs>
      <AddKeywordsToWebContentModal
        clients={clients}
        isOpen={isAddToListOpen}
        onOpenChange={setIsAddToListOpen}
        onSubmit={handleAddToList}
      />
      <WebsiteContentKeywordsModal
        isOpen={isWebsiteContentModalOpen}
        keywords={websiteContentKeywords}
        selectedClientId={websiteContentSelectedClientId}
        selectedLocation={websiteContentLocation}
        onOpenChange={setIsWebsiteContentModalOpen}
        onSubmit={handleSaveWebsiteContentKeywords}
      />
      <Modal
        isOpen={isLocalRankingsChoiceOpen}
        placement="center"
        onOpenChange={setIsLocalRankingsChoiceOpen}
      >
        <ModalContent>
          <ModalHeader className="text-lg font-semibold text-[#111827]">
            Local Rankings
          </ModalHeader>
          <ModalBody className="pb-2 pt-0 text-sm text-[#4B5563]">
            Do you want to open Local Rankings now with selected keywords, or
            save these keywords for scan later?
          </ModalBody>
          <ModalFooter>
            <Button
              radius="md"
              variant="bordered"
              onPress={handleSaveForScanLater}
            >
              Save For Scan Later
            </Button>
            <Button
              className="bg-[#022279] text-white"
              radius="md"
              onPress={handleOpenLocalRankingsNow}
            >
              Go To Local Rankings
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
};
