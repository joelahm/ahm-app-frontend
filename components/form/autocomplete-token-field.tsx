"use client";

import { useMemo, useState } from "react";
import { Autocomplete, AutocompleteItem } from "@heroui/autocomplete";
import { Button } from "@heroui/button";
import { Chip } from "@heroui/chip";
import { Plus, X } from "lucide-react";

interface AutocompleteTokenFieldProps {
  errorMessage?: string;
  label: string;
  maxTokens?: number;
  options: string[];
  placeholder: string;
  tokens: string[];
  onChange: (tokens: string[]) => void;
}

export const AutocompleteTokenField = ({
  errorMessage,
  label,
  maxTokens,
  options,
  placeholder,
  tokens,
  onChange,
}: AutocompleteTokenFieldProps) => {
  const [inputValue, setInputValue] = useState("");

  const filteredOptions = useMemo(() => {
    const normalizedQuery = inputValue.trim().toLowerCase();

    return options.filter((option) => {
      const isSelected = tokens.some(
        (token) => token.toLowerCase() === option.toLowerCase(),
      );

      if (isSelected) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      return option.toLowerCase().includes(normalizedQuery);
    });
  }, [inputValue, options, tokens]);

  const addToken = (value: string) => {
    const nextValue = value.trim();

    if (
      !nextValue ||
      (typeof maxTokens === "number" && tokens.length >= maxTokens)
    ) {
      return;
    }

    const exists = tokens.some(
      (token) => token.toLowerCase() === nextValue.toLowerCase(),
    );

    if (!exists) {
      onChange([...tokens, nextValue]);
    }

    setInputValue("");
  };

  const removeToken = (tokenToRemove: string) => {
    onChange(tokens.filter((token) => token !== tokenToRemove));
  };

  return (
    <div>
      <p className="mb-1.5 text-sm text-[#4B5563]">{label}</p>
      <div className="rounded-xl border border-default-200 bg-white">
        <div className="flex items-center gap-2 border-b border-default-200 px-3 py-2">
          <Autocomplete
            allowsCustomValue
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
              typeof maxTokens === "number" && tokens.length >= maxTokens
            }
            items={filteredOptions.map((option) => ({
              id: option,
              label: option,
            }))}
            menuTrigger="input"
            placeholder={placeholder}
            radius="none"
            selectedKey={null}
            size="sm"
            onInputChange={setInputValue}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === ",") {
                event.preventDefault();
                addToken(inputValue);
              }
            }}
            onSelectionChange={(key) => {
              if (key) {
                addToken(String(key));
              }
            }}
          >
            {(item) => (
              <AutocompleteItem key={item.id} textValue={item.label}>
                {item.label}
              </AutocompleteItem>
            )}
          </Autocomplete>
          <Button
            isIconOnly
            isDisabled={
              typeof maxTokens === "number" && tokens.length >= maxTokens
            }
            radius="full"
            size="sm"
            variant="light"
            onPress={() => addToken(inputValue)}
          >
            <Plus size={16} />
          </Button>
        </div>
        <div className="flex min-h-14 flex-wrap gap-2 px-3 py-3">
          {tokens.length ? (
            tokens.map((token) => (
              <Chip
                key={token}
                className="bg-[#EEF2FF] text-[#4F46E5]"
                endContent={
                  <button
                    aria-label={`Remove ${token}`}
                    className="ml-1 inline-flex items-center"
                    type="button"
                    onClick={() => removeToken(token)}
                  >
                    <X size={12} />
                  </button>
                }
                radius="full"
                size="sm"
                variant="flat"
              >
                {token}
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
