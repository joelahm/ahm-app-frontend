"use client";

import type { AIPromptDynamicValueOption } from "@/lib/ai-prompt-dynamic-values";

import { Button } from "@heroui/button";
import { Select, SelectItem } from "@heroui/select";

interface DynamicValuePillsPickerProps {
  items: AIPromptDynamicValueOption[];
  sourceFilterOptions: string[];
  selectedSourceFilter: string;
  onSourceFilterChange: (value: string) => void;
  onTokenClick: (token: string) => void;
  showSourceSelect?: boolean;
  pillsContainerClassName?: string;
}

export const DynamicValuePillsPicker = ({
  items,
  sourceFilterOptions,
  selectedSourceFilter,
  onSourceFilterChange,
  onTokenClick,
  showSourceSelect = true,
  pillsContainerClassName,
}: DynamicValuePillsPickerProps) => (
  <div className="space-y-2">
    {showSourceSelect ? (
      <Select
        aria-label="Filter dynamic keys by source"
        placeholder="Select source"
        radius="sm"
        selectedKeys={selectedSourceFilter ? [selectedSourceFilter] : []}
        size="sm"
        onSelectionChange={(keys) => {
          const selectedKey = keys === "all" ? null : (keys.currentKey ?? null);

          onSourceFilterChange(selectedKey ? String(selectedKey) : "all");
        }}
      >
        {sourceFilterOptions.map((option) => (
          <SelectItem key={option}>
            {option === "all" ? "All Sources" : option}
          </SelectItem>
        ))}
      </Select>
    ) : null}

    <div
      className={
        pillsContainerClassName ??
        "max-h-40 overflow-y-auto rounded-lg border border-default-200 bg-default-50 p-2"
      }
    >
      <div className="flex flex-wrap gap-2">
        {items.length ? (
          items.map((item) => (
            <Button
              key={item.token}
              className="h-auto min-h-7 px-2 py-1 text-xs"
              radius="full"
              size="sm"
              variant="flat"
              onPress={() => {
                onTokenClick(item.token);
              }}
            >
              {item.token}
            </Button>
          ))
        ) : (
          <p className="px-1 text-xs text-default-500">
            No mapped keys available for this page.
          </p>
        )}
      </div>
    </div>
  </div>
);
