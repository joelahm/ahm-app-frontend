"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import * as yup from "yup";
import * as XLSX from "xlsx";
import { Button } from "@heroui/button";
import {
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
} from "@heroui/modal";
import { Select, SelectItem } from "@heroui/select";
import { FileText, Upload, X } from "lucide-react";

import { useAppToast } from "@/hooks/use-app-toast";

const stepCards = [
  {
    description: "Upload keywords in .csv or .xlsx file",
    title: "Upload",
  },
  {
    description: "Map columns to field",
    title: "Map",
  },
  {
    description: "Confirm and finalise",
    title: "Verify",
  },
] as const;

const targetFields = [
  "Keyword",
  "Use In",
  "Search Volume",
  "Keyword Difficulty",
  "Search Intent",
  "SERP",
  "CPC(USD)",
  "Status",
  "Note",
] as const;

const mapStepSchema = yup.object({
  cpcUsd: yup.string(),
  keyword: yup.string().required("Match field is required"),
  keywordDifficulty: yup.string(),
  note: yup.string(),
  searchIntent: yup.string(),
  searchVolume: yup.string(),
  serp: yup.string(),
  status: yup.string(),
  useIn: yup.string(),
});

type KeywordImportFormValues = yup.InferType<typeof mapStepSchema>;

export interface ImportedKeywordRow {
  cpcUsd: number | null;
  keyword: string;
  keywordDifficulty: number | null;
  note: string;
  searchIntent: string;
  searchVolume: number | null;
  serp: string;
  status: string;
  useIn: string[];
}

interface ImportKeywordsModalProps {
  isOpen: boolean;
  onImport: (rows: ImportedKeywordRow[]) => void | Promise<void>;
  onOpenChange: (open: boolean) => void;
}

const targetFieldToFormKey = {
  "CPC(USD)": "cpcUsd",
  Keyword: "keyword",
  "Keyword Difficulty": "keywordDifficulty",
  Note: "note",
  "Search Intent": "searchIntent",
  "Search Volume": "searchVolume",
  SERP: "serp",
  Status: "status",
  "Use In": "useIn",
} as const satisfies Record<string, keyof KeywordImportFormValues>;

const sanitizeTextCell = (value: unknown) =>
  String(value ?? "")
    .replace(/[\r\n]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const sanitizeNumberCell = (value: unknown) => {
  const parsedValue = Number(sanitizeTextCell(value).replace(/[^\d.]+/g, ""));

  return Number.isFinite(parsedValue) ? parsedValue : null;
};

const sanitizeUseInCell = (value: unknown) =>
  sanitizeTextCell(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

const getMappedCell = (
  row: Record<string, string>,
  header: string | undefined,
) => sanitizeTextCell(header ? row[header] : "");

const parseWorksheetRows = (sheetRows: (string | number | null)[][]) => {
  if (sheetRows.length < 2) {
    throw new Error(
      "The file must include a header row and at least one data row.",
    );
  }

  const headers = sheetRows[0]
    .map((cell) => sanitizeTextCell(cell))
    .filter(Boolean);

  if (!headers.length) {
    throw new Error("No column headers were found in the file.");
  }

  const rows = sheetRows
    .slice(1)
    .map((row) =>
      headers.reduce<Record<string, string>>((accumulator, header, index) => {
        accumulator[header] = sanitizeTextCell(row[index]);

        return accumulator;
      }, {}),
    )
    .filter((row) => Object.values(row).some((value) => value.length > 0));

  return {
    headers,
    rows,
  };
};

const parseFile = async (file: File) => {
  const fileExtension = file.name.split(".").pop()?.toLowerCase();
  const workbook =
    fileExtension === "xlsx"
      ? XLSX.read(await file.arrayBuffer(), { type: "array" })
      : XLSX.read(await file.text(), { type: "string" });
  const firstSheetName = workbook.SheetNames[0];

  if (!firstSheetName) {
    throw new Error("No worksheet was found in the file.");
  }

  const worksheet = workbook.Sheets[firstSheetName];
  const sheetRows = XLSX.utils.sheet_to_json<(string | number | null)[]>(
    worksheet,
    {
      blankrows: false,
      defval: "",
      header: 1,
    },
  );

  return parseWorksheetRows(sheetRows);
};

const renderStepCard = (stepNumber: number, currentStep: number) => {
  const step = stepCards[stepNumber - 1];
  const isActive = currentStep === stepNumber;

  return (
    <div
      className={[
        "rounded-lg border p-3 transition-colors",
        isActive
          ? "border-primary bg-[#EEF0FF]"
          : "border-default-200 bg-white",
      ].join(" ")}
    >
      <div className="flex items-center gap-4">
        <div
          className={[
            "flex h-11 w-11 items-center justify-center rounded-lg text-lg font-semibold",
            isActive
              ? "bg-primary text-white"
              : "bg-default-100 text-default-400",
          ].join(" ")}
        >
          {stepNumber}
        </div>
        <div>
          <p className="text-sm font-semibold text-[#111827]">{step.title}</p>
          <p className="text-xs text-[#6B7280]">{step.description}</p>
        </div>
      </div>
    </div>
  );
};

export const ImportKeywordsModal = ({
  isOpen,
  onImport,
  onOpenChange,
}: ImportKeywordsModalProps) => {
  const toast = useAppToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [isImporting, setIsImporting] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parsedHeaders, setParsedHeaders] = useState<string[]>([]);
  const [parsedRows, setParsedRows] = useState<Record<string, string>[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const {
    control,
    clearErrors,
    formState: { errors, isSubmitting },
    reset,
    setError,
    watch,
  } = useForm<KeywordImportFormValues>({
    defaultValues: {
      cpcUsd: "",
      keyword: "",
      keywordDifficulty: "",
      note: "",
      searchIntent: "",
      searchVolume: "",
      serp: "",
      status: "",
      useIn: "",
    },
    mode: "onBlur",
  });
  const mappings = watch();
  const firstParsedRow = parsedRows[0] ?? {};

  useEffect(() => {
    if (!isOpen) {
      setCurrentStep(1);
      setIsImporting(false);
      setSelectedFile(null);
      setParsedHeaders([]);
      setParsedRows([]);
      reset();
      clearErrors();
    }
  }, [clearErrors, isOpen, reset]);

  const verifyRows = useMemo(
    () =>
      targetFields.map((targetField) => {
        const formKey = targetFieldToFormKey[targetField];
        const selectedHeader = mappings[formKey] ?? "";

        return {
          columnHeader: selectedHeader || "-",
          preview: selectedHeader
            ? (firstParsedRow[selectedHeader] ?? "-")
            : "-",
          targetField,
        };
      }),
    [firstParsedRow, mappings],
  );

  const handleFileChange = async (file: File | null) => {
    if (!file) return;

    const fileExtension = file.name.split(".").pop()?.toLowerCase();

    if (fileExtension !== "csv" && fileExtension !== "xlsx") {
      toast.danger("Invalid file type.", {
        description: "Only .csv and .xlsx files are supported.",
      });

      return;
    }

    try {
      const parsedFile = await parseFile(file);

      setSelectedFile(file);
      setParsedHeaders(parsedFile.headers);
      setParsedRows(parsedFile.rows);
      clearErrors();
      reset({
        cpcUsd:
          parsedFile.headers.find((header) => /(cpc|cost)/i.test(header)) ?? "",
        keyword:
          parsedFile.headers.find((header) => /keyword/i.test(header)) ?? "",
        keywordDifficulty:
          parsedFile.headers.find((header) =>
            /(keyword difficulty|\bkd\b|difficulty)/i.test(header),
          ) ?? "",
        note: parsedFile.headers.find((header) => /notes?/i.test(header)) ?? "",
        searchIntent:
          parsedFile.headers.find((header) => /(intent)/i.test(header)) ?? "",
        searchVolume:
          parsedFile.headers.find((header) =>
            /(search volume|\bsv\b|volume)/i.test(header),
          ) ?? "",
        serp: parsedFile.headers.find((header) => /serp/i.test(header)) ?? "",
        status:
          parsedFile.headers.find((header) => /status/i.test(header)) ?? "",
        useIn:
          parsedFile.headers.find((header) =>
            /(use in|used in|usage)/i.test(header),
          ) ?? "",
      });
    } catch (error) {
      setSelectedFile(null);
      setParsedHeaders([]);
      setParsedRows([]);
      toast.danger("Failed to parse the file.", {
        description:
          error instanceof Error ? error.message : "Failed to parse the file.",
      });
    }
  };

  const handleNext = async () => {
    if (currentStep === 1) {
      if (!selectedFile || !parsedHeaders.length || !parsedRows.length) {
        toast.danger("No file selected.", {
          description: "Please choose a valid .csv or .xlsx file first.",
        });

        return;
      }

      clearErrors();
      setCurrentStep(2);

      return;
    }

    if (currentStep === 2) {
      clearErrors();

      try {
        await mapStepSchema.validate(mappings, { abortEarly: false });
      } catch (error) {
        if (!(error instanceof yup.ValidationError)) return;

        error.inner.forEach((issue) => {
          if (!issue.path) return;
          setError(issue.path as keyof KeywordImportFormValues, {
            message: issue.message,
            type: "manual",
          });
        });

        return;
      }

      setCurrentStep(3);
    }
  };

  const handleImport = async () => {
    setIsImporting(true);

    try {
      const importedRows = parsedRows
        .map((row) => ({
          cpcUsd: sanitizeNumberCell(getMappedCell(row, mappings.cpcUsd)),
          keyword: getMappedCell(row, mappings.keyword),
          keywordDifficulty: sanitizeNumberCell(
            getMappedCell(row, mappings.keywordDifficulty),
          ),
          note: getMappedCell(row, mappings.note),
          searchIntent: getMappedCell(row, mappings.searchIntent),
          searchVolume: sanitizeNumberCell(
            getMappedCell(row, mappings.searchVolume),
          ),
          serp: getMappedCell(row, mappings.serp),
          status: getMappedCell(row, mappings.status),
          useIn: sanitizeUseInCell(getMappedCell(row, mappings.useIn)),
        }))
        .filter((row) => row.keyword);

      if (!importedRows.length) {
        throw new Error("No rows with mapped keywords were found.");
      }

      await onImport(importedRows);
      onOpenChange(false);
    } catch (error) {
      toast.danger("Failed to import keywords.", {
        description:
          error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Modal
      hideCloseButton
      classNames={{ base: "max-w-[1180px]" }}
      isDismissable={false}
      isOpen={isOpen}
      scrollBehavior="inside"
      size="5xl"
      onOpenChange={onOpenChange}
    >
      <ModalContent>
        <ModalHeader className="flex items-center justify-between border-b border-default-200">
          <h2 className="text-lg font-semibold text-[#111827]">
            Import Keywords
          </h2>
          <Button
            isIconOnly
            radius="full"
            size="sm"
            variant="light"
            onPress={() => onOpenChange(false)}
          >
            <X size={22} />
          </Button>
        </ModalHeader>

        <ModalBody className="space-y-6 py-5">
          <div className="grid gap-4 lg:grid-cols-3">
            {stepCards.map((_, index) => (
              <div key={index + 1}>
                {renderStepCard(index + 1, currentStep)}
              </div>
            ))}
          </div>

          {currentStep === 1 ? (
            <div className="mx-auto flex w-full flex-col gap-2">
              <p className="text-sm font-medium text-[#4B5563]">Keywords</p>
              <input
                ref={fileInputRef}
                accept=".csv,.xlsx"
                className="hidden"
                type="file"
                onChange={async (event) => {
                  await handleFileChange(event.target.files?.[0] ?? null);
                  event.target.value = "";
                }}
              />
              <button
                className="flex min-h-[300px] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-default-200 bg-white px-6 py-12 text-center"
                type="button"
                onClick={() => fileInputRef.current?.click()}
              >
                <FileText className="mb-4 text-primary" size={30} />
                <p className="mb-2 text-xs font-medium text-[#9CA3AF]">
                  .CSV, .xlsx
                </p>
                <p className="mb-5 font-medium text-[#111827]">
                  Drag and Drop your file here or
                </p>
                <span className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-base font-medium text-white">
                  <Upload size={16} />
                  Choose File
                </span>
                {selectedFile ? (
                  <p className="mt-5 text-sm text-[#4B5563]">
                    Selected file: {selectedFile.name}
                  </p>
                ) : null}
              </button>
            </div>
          ) : null}

          {currentStep === 2 ? (
            <div className="rounded-2xl border border-default-200">
              <div className="grid grid-cols-[1.2fr_1.1fr_1.2fr] gap-4 bg-[#F9FAFB] px-5 py-4 text-sm font-medium text-[#111827]">
                <span>Column header</span>
                <span>Preview</span>
                <span>Match Fields</span>
              </div>
              {targetFields.map((targetField) => {
                const fieldName = targetFieldToFormKey[targetField];
                const selectedHeader = mappings[fieldName];
                const previewValue = selectedHeader
                  ? (firstParsedRow[selectedHeader] ?? "-")
                  : "-";

                return (
                  <div
                    key={targetField}
                    className="grid grid-cols-[1.2fr_1.1fr_1.2fr] gap-4 border-t border-default-200 px-5 py-4"
                  >
                    <span className="text-sm text-[#374151]">
                      {targetField}
                    </span>
                    <span className="truncate text-sm text-[#374151]">
                      {previewValue}
                    </span>
                    <Controller
                      control={control}
                      name={fieldName}
                      render={({ field }) => (
                        <Select
                          errorMessage={errors[fieldName]?.message}
                          isInvalid={!!errors[fieldName]}
                          placeholder="Select column header"
                          radius="sm"
                          selectedKeys={field.value ? [field.value] : []}
                          size="sm"
                          onSelectionChange={(keys) => {
                            const selectedKey =
                              keys === "all" ? null : (keys.currentKey ?? null);

                            field.onChange(
                              selectedKey ? String(selectedKey) : "",
                            );
                          }}
                        >
                          {parsedHeaders.map((header) => (
                            <SelectItem key={header}>{header}</SelectItem>
                          ))}
                        </Select>
                      )}
                    />
                  </div>
                );
              })}
            </div>
          ) : null}

          {currentStep === 3 ? (
            <div className="space-y-4">
              <p className="text-sm text-[#4B5563]">
                {parsedRows.length} items to import
              </p>
              <div className="overflow-hidden rounded-2xl border border-default-200">
                <div className="grid grid-cols-3 gap-4 bg-[#F9FAFB] px-5 py-4 text-sm font-medium text-[#111827]">
                  <span>Column header</span>
                  <span>Preview</span>
                  <span>Column header</span>
                </div>
                {verifyRows.map((row) => (
                  <div
                    key={row.targetField}
                    className="grid grid-cols-3 gap-4 border-t border-default-200 px-5 py-4"
                  >
                    <span className="text-sm text-[#374151]">
                      {row.columnHeader}
                    </span>
                    <span className="truncate text-sm text-[#374151]">
                      {row.preview}
                    </span>
                    <span className="text-sm text-[#374151]">
                      {row.targetField}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </ModalBody>

        <ModalFooter className="border-t border-default-200">
          {currentStep === 1 ? (
            <Button
              radius="sm"
              variant="bordered"
              onPress={() => onOpenChange(false)}
            >
              Cancel
            </Button>
          ) : (
            <Button
              radius="sm"
              variant="bordered"
              onPress={() => setCurrentStep((step) => Math.max(1, step - 1))}
            >
              Prev
            </Button>
          )}

          {currentStep < 3 ? (
            <Button
              className="bg-primary px-10 text-white"
              radius="sm"
              onPress={handleNext}
            >
              Next
            </Button>
          ) : (
            <Button
              className="bg-primary px-10 text-white"
              isLoading={isSubmitting || isImporting}
              radius="sm"
              onPress={() => {
                void handleImport();
              }}
            >
              Import
            </Button>
          )}
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};
