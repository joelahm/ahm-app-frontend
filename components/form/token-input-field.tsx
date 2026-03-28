"use client";

import type { ReactNode } from "react";

import { useState } from "react";
import { Button } from "@heroui/button";
import { Chip } from "@heroui/chip";
import { Input } from "@heroui/input";
import { Plus, X } from "lucide-react";

interface TokenInputFieldProps {
  description?: string;
  errorMessage?: string;
  label: string;
  maxTokens?: number;
  placeholder: string;
  startContent?: ReactNode;
  tokens: string[];
  onChange: (tokens: string[]) => void;
}

export const TokenInputField = ({
  description,
  errorMessage,
  label,
  maxTokens,
  placeholder,
  startContent,
  tokens,
  onChange,
}: TokenInputFieldProps) => {
  const [inputValue, setInputValue] = useState("");

  const addToken = () => {
    const nextValue = inputValue.trim();

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
          <Input
            classNames={{
              inputWrapper: "shadow-none border-none bg-transparent px-0",
            }}
            isDisabled={
              typeof maxTokens === "number" && tokens.length >= maxTokens
            }
            placeholder={placeholder}
            radius="none"
            size="sm"
            startContent={startContent}
            value={inputValue}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === ",") {
                event.preventDefault();
                addToken();
              }
            }}
            onValueChange={setInputValue}
          />
          <Button
            isIconOnly
            isDisabled={
              typeof maxTokens === "number" && tokens.length >= maxTokens
            }
            radius="full"
            size="sm"
            variant="light"
            onPress={addToken}
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
      {description ? (
        <p className="mt-1 text-xs text-default-500">{description}</p>
      ) : null}
      {errorMessage ? (
        <p className="mt-1 text-xs text-danger">{errorMessage}</p>
      ) : null}
    </div>
  );
};
