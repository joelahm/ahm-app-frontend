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

const stepCards = [
  {
    description: "Upload bulk citation in .csv or .xlsx file",
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
  "Directory Name",
  "Type",
  "Niche",
  "Validation Link",
  "DA",
  "Payment",
] as const;

const mapStepSchema = yup.object({
  da: yup.string().required("Match field is required"),
  directorySite: yup.string().required("Match field is required"),
  niche: yup.string().required("Match field is required"),
  payment: yup.string().required("Match field is required"),
  type: yup.string().required("Match field is required"),
  validationLink: yup.string().required("Match field is required"),
});

export type BulkCitationImportFormValues = yup.InferType<typeof mapStepSchema>;

export interface ImportedCitationRow {
  da: number;
  directorySite: string;
  niche: string;
  payment: string;
  type: string;
  validationLink: string;
}

interface ImportBulkCitationsModalProps {
  isOpen: boolean;
  onImport: (rows: ImportedCitationRow[]) => void | Promise<void>;
  onOpenChange: (open: boolean) => void;
}

const targetFieldToFormKey = {
  DA: "da",
  "Directory Name": "directorySite",
  Niche: "niche",
  Payment: "payment",
  Type: "type",
  "Validation Link": "validationLink",
} as const satisfies Record<string, keyof BulkCitationImportFormValues>;

const parseCsvLine = (line: string) => {
  const values: string[] = [];
  let currentValue = "";
  let isInsideQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    const nextCharacter = line[index + 1];

    if (character === '"' && isInsideQuotes && nextCharacter === '"') {
      currentValue += '"';
      index += 1;
      continue;
    }

    if (character === '"') {
      isInsideQuotes = !isInsideQuotes;
      continue;
    }

    if (character === "," && !isInsideQuotes) {
      values.push(currentValue.trim());
      currentValue = "";
      continue;
    }

    currentValue += character;
  }

  values.push(currentValue.trim());

  return values;
};

const parseCsvFile = async (file: File) => {
  const content = await file.text();
  const lines = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    throw new Error(
      "The file must include a header row and at least one data row.",
    );
  }

  const headers = parseCsvLine(lines[0]).filter(Boolean);

  if (!headers.length) {
    throw new Error("No column headers were found in the file.");
  }

  const rows = lines.slice(1).map((line) => {
    const values = parseCsvLine(line);

    return headers.reduce<Record<string, string>>(
      (accumulator, header, index) => {
        accumulator[header] = values[index] ?? "";

        return accumulator;
      },
      {},
    );
  });

  return {
    headers,
    rows,
  };
};

const parseXlsxFile = async (file: File) => {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
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

  if (sheetRows.length < 2) {
    throw new Error(
      "The file must include a header row and at least one data row.",
    );
  }

  const headers = sheetRows[0]
    .map((cell) => String(cell ?? "").trim())
    .filter(Boolean);

  if (!headers.length) {
    throw new Error("No column headers were found in the file.");
  }

  const rows = sheetRows.slice(1).map((row) =>
    headers.reduce<Record<string, string>>((accumulator, header, index) => {
      accumulator[header] = String(row[index] ?? "").trim();

      return accumulator;
    }, {}),
  );

  return {
    headers,
    rows,
  };
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

export const ImportBulkCitationsModal = ({
  isOpen,
  onImport,
  onOpenChange,
}: ImportBulkCitationsModalProps) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [importError, setImportError] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState("");
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
  } = useForm<BulkCitationImportFormValues>({
    defaultValues: {
      da: "",
      directorySite: "",
      niche: "",
      payment: "",
      type: "",
      validationLink: "",
    },
    mode: "onBlur",
  });

  const mappings = watch();
  const firstParsedRow = parsedRows[0] ?? {};

  useEffect(() => {
    if (!isOpen) {
      setCurrentStep(1);
      setImportError("");
      setIsImporting(false);
      setSelectedFile(null);
      setUploadError("");
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

  const closeModal = () => {
    onOpenChange(false);
  };

  const openFilePicker = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (file: File | null) => {
    if (!file) {
      setSelectedFile(null);
      setParsedHeaders([]);
      setParsedRows([]);
      setUploadError("");
      clearErrors();

      return;
    }

    const fileExtension = file.name.split(".").pop()?.toLowerCase();

    if (fileExtension !== "csv" && fileExtension !== "xlsx") {
      setSelectedFile(null);
      setParsedHeaders([]);
      setParsedRows([]);
      setUploadError("Only .csv and .xlsx files are supported.");

      return;
    }

    try {
      const parsedFile =
        fileExtension === "xlsx"
          ? await parseXlsxFile(file)
          : await parseCsvFile(file);

      setSelectedFile(file);
      setParsedHeaders(parsedFile.headers);
      setParsedRows(parsedFile.rows);
      setUploadError("");
      clearErrors();
      reset({
        da: parsedFile.headers.find((header) => /\bda\b/i.test(header)) ?? "",
        directorySite:
          parsedFile.headers.find((header) =>
            /(directory|site|name)/i.test(header),
          ) ?? "",
        niche: parsedFile.headers.find((header) => /niche/i.test(header)) ?? "",
        payment:
          parsedFile.headers.find((header) => /payment/i.test(header)) ?? "",
        type: parsedFile.headers.find((header) => /type/i.test(header)) ?? "",
        validationLink:
          parsedFile.headers.find((header) =>
            /(validation|link|url|website)/i.test(header),
          ) ?? "",
      });
    } catch (error) {
      setSelectedFile(null);
      setParsedHeaders([]);
      setParsedRows([]);
      setUploadError(
        error instanceof Error ? error.message : "Failed to parse the file.",
      );
    }
  };

  const handleNext = async () => {
    if (currentStep === 1) {
      if (!selectedFile || !parsedHeaders.length || !parsedRows.length) {
        setUploadError("Please choose a valid .csv or .xlsx file first.");

        return;
      }

      setUploadError("");
      setImportError("");
      clearErrors();
      setCurrentStep(2);

      return;
    }

    if (currentStep === 2) {
      clearErrors();

      try {
        await mapStepSchema.validate(mappings, { abortEarly: false });
      } catch (error) {
        if (!(error instanceof yup.ValidationError)) {
          return;
        }

        error.inner.forEach((issue) => {
          if (!issue.path) {
            return;
          }

          setError(issue.path as keyof BulkCitationImportFormValues, {
            message: issue.message,
            type: "manual",
          });
        });

        return;
      }

      setCurrentStep(3);
    }
  };

  const handlePrev = () => {
    setCurrentStep((step) => Math.max(1, step - 1));
  };

  const handleImport = async () => {
    setImportError("");
    setIsImporting(true);

    try {
      await onImport(
        parsedRows.map((row) => ({
          da: Number(row[mappings.da] ?? 0),
          directorySite: row[mappings.directorySite] ?? "",
          niche: row[mappings.niche] ?? "",
          payment: row[mappings.payment] ?? "",
          type: row[mappings.type] ?? "",
          validationLink: row[mappings.validationLink] ?? "",
        })),
      );
      closeModal();
    } catch (error) {
      setImportError(
        error instanceof Error ? error.message : "Failed to import citations.",
      );
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
      size="5xl"
      onOpenChange={onOpenChange}
    >
      <ModalContent>
        <ModalHeader className="flex items-center justify-between border-b border-default-200">
          <h2 className="text-lg font-semibold text-[#111827]">
            Upload Bulk Citation in Database
          </h2>
          <Button
            isIconOnly
            radius="full"
            size="sm"
            variant="light"
            onPress={closeModal}
          >
            <X size={22} />
          </Button>
        </ModalHeader>

        <ModalBody className="space-y-6 py-5">
          {importError ? (
            <p className="text-sm text-danger">{importError}</p>
          ) : null}
          <div className="grid gap-4 lg:grid-cols-3">
            {stepCards.map((_, index) => (
              <div key={index + 1}>
                {renderStepCard(index + 1, currentStep)}
              </div>
            ))}
          </div>

          {currentStep === 1 ? (
            <div className="mx-auto flex w-full max-w-[1020px] flex-col gap-2">
              <p className="text-sm font-medium text-[#4B5563]">
                Citation database
              </p>
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
                onClick={openFilePicker}
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
                {uploadError ? (
                  <p className="mt-3 text-sm text-danger">{uploadError}</p>
                ) : null}
              </button>
            </div>
          ) : null}

          {currentStep === 2 ? (
            <div className="overflow-hidden rounded-2xl border border-default-200">
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
                    <span className="text-sm text-[#374151]">
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
                    <span className="text-sm text-[#374151]">
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
            <Button radius="sm" variant="bordered" onPress={closeModal}>
              Cancel
            </Button>
          ) : (
            <Button radius="sm" variant="bordered" onPress={handlePrev}>
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
