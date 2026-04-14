"use client";

import { useMemo, useState } from "react";
import { Autocomplete, AutocompleteItem } from "@heroui/autocomplete";
import { Chip } from "@heroui/chip";
import { X } from "lucide-react";

interface AutocompleteMultiSelectOption {
  label: string;
  value: string;
}

interface AutocompleteMultiSelectFieldProps {
  errorMessage?: string;
  label: string;
  maxTokens?: number;
  options: AutocompleteMultiSelectOption[];
  placeholder: string;
  values: string[];
  onChange: (values: string[]) => void;
}

export const AutocompleteMultiSelectField = ({
  errorMessage,
  label,
  maxTokens,
  options,
  placeholder,
  values,
  onChange,
}: AutocompleteMultiSelectFieldProps) => {
  const [autocompleteKey, setAutocompleteKey] = useState(0);
  const [inputValue, setInputValue] = useState("");

  const filteredOptions = useMemo(() => {
    const normalizedQuery = inputValue.trim().toLowerCase();

    return options.filter((option) => {
      const isSelected = values.includes(option.value);

      if (isSelected) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      return option.label.toLowerCase().includes(normalizedQuery);
    });
  }, [inputValue, options, values]);

  const selectedOptions = useMemo(
    () =>
      values
        .map((value) => options.find((option) => option.value === value))
        .filter((option): option is AutocompleteMultiSelectOption =>
          Boolean(option),
        ),
    [options, values],
  );

  const addValue = (value: string) => {
    if (
      !value ||
      (typeof maxTokens === "number" && values.length >= maxTokens)
    ) {
      return;
    }

    if (!values.includes(value)) {
      onChange([...values, value]);
    }

    setInputValue("");
    setAutocompleteKey((currentValue) => currentValue + 1);
  };

  const removeValue = (valueToRemove: string) => {
    onChange(values.filter((value) => value !== valueToRemove));
  };

  return (
    <div>
      <p className="mb-1.5 text-sm text-[#4B5563]">{label}</p>
      <div className="rounded-xl border border-default-200 bg-white">
        <div className="flex items-center gap-2 border-b border-default-200 px-3 py-2">
          <Autocomplete
            key={autocompleteKey}
            allowsCustomValue={false}
            className="flex-1"
            classNames={{
              base: "w-full",
            }}
            inputProps={{
              classNames: {
                inputWrapper: "shadow-none border-none bg-transparent px-0",
              },
            }}
            inputValue={inputValue}
            isDisabled={
              typeof maxTokens === "number" && values.length >= maxTokens
            }
            items={filteredOptions}
            menuTrigger="input"
            placeholder={placeholder}
            radius="none"
            selectedKey={null}
            size="sm"
            onInputChange={setInputValue}
            onSelectionChange={(key) => {
              if (key) {
                addValue(String(key));
              }
            }}
          >
            {(item) => (
              <AutocompleteItem key={item.value} textValue={item.label}>
                {item.label}
              </AutocompleteItem>
            )}
          </Autocomplete>
        </div>
        <div className="flex min-h-14 flex-wrap gap-2 px-3 py-3">
          {selectedOptions.length ? (
            selectedOptions.map((option) => (
              <Chip
                key={option.value}
                className="bg-[#EEF2FF] text-[#4F46E5]"
                endContent={
                  <button
                    aria-label={`Remove ${option.label}`}
                    className="ml-1 inline-flex items-center"
                    type="button"
                    onClick={() => removeValue(option.value)}
                  >
                    <X size={12} />
                  </button>
                }
                radius="full"
                size="sm"
                variant="flat"
              >
                {option.label}
              </Chip>
            ))
          ) : (
            <p className="text-xs text-default-400">No items added yet.</p>
          )}
        </div>
      </div>
      {errorMessage ? (
        <p className="mt-1 text-xs text-danger">{errorMessage}</p>
      ) : null}
    </div>
  );
};
