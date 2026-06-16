"use client";

import { useMemo, useState } from "react";
import { Autocomplete, AutocompleteItem } from "@heroui/autocomplete";
import { Button } from "@heroui/button";
import { Card, CardBody, CardHeader } from "@heroui/card";
import { Checkbox } from "@heroui/checkbox";
import { Chip } from "@heroui/chip";
import { DatePicker } from "@heroui/date-picker";
import { Divider } from "@heroui/divider";
import { Input, Textarea } from "@heroui/input";
import { Select, SelectItem } from "@heroui/select";
import { parseDate } from "@internationalized/date";
import { ChevronDown, ExternalLink, Search } from "lucide-react";

type FieldType =
  | "autocomplete"
  | "checkbox"
  | "date"
  | "email"
  | "multiSelect"
  | "number"
  | "password"
  | "select"
  | "text"
  | "textarea"
  | "url"
  | "userSelect";

type FieldValue = boolean | string | string[];

type FieldConfig = {
  group: string;
  fieldType: FieldType;
  id: string;
  label: string;
  options?: string[];
  placeholder?: string;
};

type FieldGroup = {
  description?: string;
  fields: FieldConfig[];
  title: string;
};

const toFieldKey = (label: string) =>
  label
    .replace(/['/]/g, " ")
    .replace(/[^a-zA-Z0-9]+(.)/g, (_, character: string) =>
      character.toUpperCase(),
    )
    .replace(/^[A-Z]/, (character) => character.toLowerCase());

const createField = (
  group: string,
  label: string,
  fieldType: FieldType,
  options: string[] = [],
  placeholder?: string,
): FieldConfig => ({
  fieldType,
  group,
  id: toFieldKey(label),
  label,
  options,
  placeholder,
});

// Dynamic user options should come from the users API/database later.
const dynamicUserOptions: string[] = [];
// For future database-driven fields, keep options empty here and hydrate them
// from the API before rendering the select/autocomplete control.

const fieldGroups: FieldGroup[] = [
  {
    title: "Client Information",
    fields: [
      createField("Client Information", "Type of Client", "autocomplete", [
        "Old",
        "New",
      ]),
      createField("Client Information", "Type of Service", "multiSelect", [
        "Full Web Development",
        "Local SEO",
        "Website Maintenance",
        "1 Pager Website",
      ]),
      createField("Client Information", "Niche", "text"),
      createField("Client Information", "Medical Specialty", "checkbox"),
      createField("Client Information", "Area", "textarea"),
      createField("Client Information", "Date Joined", "date"),
      createField("Client Information", "Contact Email", "email"),
      createField(
        "Client Information",
        "LC Assignee",
        "userSelect",
        dynamicUserOptions,
        "Select user",
      ),
      createField("Client Information", "Pods", "autocomplete", [
        "Dominators (Shinna)",
        "Diez (Rankers)",
        "Unassigned",
      ]),
      createField("Client Information", "Link to Client", "url"),
    ],
  },
  {
    title: "Website Access & Links",
    fields: [
      createField("Website Access & Links", "Website Status", "autocomplete", [
        "Client Owns",
        "No Website",
        "Need Revamp",
        "Waiting for Info",
      ]),
      createField("Website Access & Links", "Website", "url"),
      createField(
        "Website Access & Links",
        "Client's Live Website Link",
        "url",
      ),
      createField("Website Access & Links", "Staging Link", "url"),
      createField("Website Access & Links", "Staging Username", "text"),
      createField("Website Access & Links", "Staging Password", "password"),
      createField("Website Access & Links", "Website Email/Username", "text"),
      createField("Website Access & Links", "Website Password", "password"),
      createField("Website Access & Links", "Link to Client's Folder", "url"),
      createField("Website Access & Links", "Figma Link", "url"),
    ],
  },
  {
    title: "Website Project / Build",
    fields: [
      createField("Website Project / Build", "Web Design", "autocomplete", [
        "To Do",
        "In Progress",
        "Internal QA",
        "Ready for Client Review",
        "Sent to Client for Review",
        "Final QA",
        "Completed",
        "N/A",
      ]),
      createField(
        "Website Project / Build",
        "Web Development",
        "autocomplete",
        [
          "To Do",
          "In Progress",
          "Internal QA",
          "Sent to Client for Review",
          "Ready for Live",
          "Final QA",
          "Ready for Upload",
          "Done / Staging",
          "Done / Live",
          "N/A",
        ],
      ),
      createField("Website Project / Build", "Web Content", "autocomplete", [
        "To Do",
        "Writing",
        "Internal QA",
        "Pending Client Review",
        "Need Changes",
        "Ready for Upload",
        "Uploading",
        "Completed",
        "N/A",
      ]),
      createField("Website Project / Build", "Website/LP Workbook", "url"),
      createField("Website Project / Build", "Accelerator Workbook", "url"),
      createField(
        "Website Project / Build",
        "Workbook Status",
        "autocomplete",
        ["To do", "In Progress", "Updated", "Sent to CSM", "Completed"],
      ),
      createField("Website Project / Build", "Onboarding", "multiSelect", [
        "Onboarding Form",
        "Primary Onboarding Call",
        "Secondary Onboarding Call",
        "Third Onboarding Call",
      ]),
      createField(
        "Website Project / Build",
        "Onboarding Form",
        "autocomplete",
        ["To Export", "Missing", "Added to client's folder"],
      ),
      createField(
        "Website Project / Build",
        "Campaign Launch",
        "autocomplete",
        [
          "To Do",
          "In Progress",
          "Ready for Client Review",
          "Client Review",
          "Prepare to go live",
          "Completed",
          "N/A",
        ],
      ),
    ],
  },
  {
    title: "SEO Setup",
    fields: [
      createField("SEO Setup", "SEO Checklist", "multiSelect", [
        "Rank Math",
        "Local Schema",
        "Local Citations",
        "Internal Linking",
        "External Linking",
        "Image Optimisation",
        "Fix Broken Links",
        "Remove Duplicate Content",
        "Robots txt",
        "Minify CSS/JS",
      ]),
      createField("SEO Setup", "SEO Optimisation", "autocomplete", [
        "To do",
        "Audit",
        "In Progress",
        "Phase 1 - Meta Tag / H Tag",
        "Phase 2 - I/E Links",
        "Phase 3 - Other Technical SEO",
        "Internal Review",
        "Monitoring",
        "Completed",
      ]),
      createField("SEO Setup", "Rank Math", "checkbox"),
      createField("SEO Setup", "Local Schema", "autocomplete", [
        "To do",
        "Generate Local Schema",
        "Internal Review",
        "Ready for Installation",
        "Installed",
        "N/a",
      ]),
      createField("SEO Setup", "Local Citations", "autocomplete", [
        "Pending Info",
        "To do",
        "Need Client Info",
        "Internal Review",
        "Ready",
        "In Progress",
        "Ready for Client Review",
        "Completed",
        "N/A",
      ]),
      createField("SEO Setup", "SMTP", "autocomplete", [
        "To do",
        "Requested",
        "Ready for setup",
        "SMTP Applied",
        "Ready for testing",
        "Completed",
      ]),
      createField("SEO Setup", "GA4", "checkbox"),
      createField("SEO Setup", "GSC", "checkbox"),
      createField("SEO Setup", "Keyword Planner", "url"),
      createField("SEO Setup", "Heatmaps", "autocomplete", [
        "To Do",
        "Keywords Draft",
        "In Progress",
        "Done",
        "Monitoring",
        "N/A",
      ]),
      createField("SEO Setup", "Last heatmap generated", "date"),
      createField("SEO Setup", "Keywords", "autocomplete", [
        "To Do",
        "In Progress",
        "Internal Review",
        "Ready for Client Review",
        "Sent to Client for Review",
        "Need Revision",
        "Approved",
      ]),
    ],
  },
  {
    title: "GBP Management",
    fields: [
      createField("GBP Management", "Access / GBP", "autocomplete", [
        "Accelerator",
        "Meetings",
      ]),
      createField("GBP Management", "GBP Creation", "autocomplete", [
        "To Do",
        "Under Verification",
        "Verified",
        "Need to Retrieve",
        "Need Access",
        "N/A",
      ]),
      createField("GBP Management", "GBP Monitoring", "autocomplete", [
        "Pending info",
        "Rank Dropping",
        "No Change",
        "Slight Increase",
        "Good Increase",
        "Very Good Increase",
      ]),
      createField("GBP Management", "GBP Optimisation", "autocomplete", [
        "To do",
        "Pending GBP",
        "Pending Info",
        "In Progress",
        "Completed",
        "N/A",
      ]),
      createField(
        "GBP Management",
        "GBP Optimisation Checklist",
        "multiSelect",
        ["Hospital Photo", "GBP Entitites", "GBP Services", "N/A"],
      ),
      createField("GBP Management", "GBP Profiles", "number"),
      createField("GBP Management", "GBP Services", "autocomplete", [
        "To do",
        "In Progress",
        "Internal Review",
        "Ready for Client Review",
        "Implementation",
        "Completed",
      ]),
      createField("GBP Management", "New GBP Posting", "date"),
      createField("GBP Management", "GBP Posting Campaign", "autocomplete", [
        "To do",
        "Keywords",
        "Keyword feedback",
        "Descriptions / Creatives",
        "Descriptions / Creatives Feedback",
        "Ready for scheduling",
        "Scheduled",
      ]),
      createField("GBP Management", "GBP Posting Notes", "textarea"),
      createField("GBP Management", "GBP Post Checklist", "multiSelect", [
        "In Contact with Client",
        "Unresponsive",
        "Keywords",
        "Image Copies",
        "GBP Descriptions",
        "GBP Creatives",
        "N/A",
      ]),
      createField("GBP Management", "Review Campaign", "multiSelect", [
        "Review Mgmt Guide Call",
        "Campaign Copies",
        "SMTP",
        "Workflow Setup",
        "GBP Access",
        "Form",
        "N/A",
      ]),
    ],
  },
  {
    title: "Content & Blogging",
    fields: [
      createField("Content & Blogging", "Blogs", "autocomplete", [
        "To do",
        "Keyword Research",
        "KW - Internal Review",
        "KW - Client Review",
        "Writing",
        "Writing - Internal Review",
        "Writing - Client Review",
        "Ready for Scheduling",
        "Scheduled",
        "N/A",
      ]),
      createField("Content & Blogging", "Content Planner", "autocomplete", [
        "To do",
        "In Progress",
        "Linking",
        "Completed",
        "N/A",
      ]),
      createField(
        "Content & Blogging",
        "Content Writer",
        "userSelect",
        dynamicUserOptions,
        "Select user",
      ),
    ],
  },
  {
    title: "Backlinks",
    fields: [
      createField("Backlinks", "Backlink Phase", "autocomplete", [
        "Month 1",
        "Month 2",
        "Month 3",
      ]),
      createField("Backlinks", "Backlink Status", "autocomplete", [
        "To do",
        "In Progress",
        "Internal Review",
        "On Hold",
        "Completed",
      ]),
    ],
  },
  {
    title: "Billing & Payment",
    fields: [
      createField("Billing & Payment", "Payment Status", "autocomplete", [
        "Paid",
        "Invoice Sent",
        "Delayed",
        "On Hold",
        "N/A",
      ]),
      createField("Billing & Payment", "Schedule of Payment", "autocomplete", [
        "One-time",
        "Monthly",
        "Quarterly",
        "N/A",
      ]),
      createField("Billing & Payment", "Last Date of Payment", "date"),
      createField("Billing & Payment", "Next Invoice", "date"),
    ],
  },
];

const buildInitialValues = () =>
  fieldGroups.reduce<Record<string, FieldValue>>((values, group) => {
    group.fields.forEach((field) => {
      values[field.id] =
        field.fieldType === "checkbox"
          ? false
          : field.fieldType === "multiSelect"
            ? []
            : "";
    });

    return values;
  }, {});

const toDateValue = (value: FieldValue) => {
  if (typeof value !== "string" || !value) {
    return null;
  }

  try {
    return parseDate(value);
  } catch {
    return null;
  }
};

const normalizeExternalUrl = (value: string) =>
  /^https?:\/\//i.test(value) ? value : `https://${value}`;

interface FieldRendererProps {
  field: FieldConfig;
  onChange: (fieldId: string, value: FieldValue) => void;
  value: FieldValue;
}

const FieldRenderer = ({ field, onChange, value }: FieldRendererProps) => {
  const commonProps = {
    "aria-label": field.label,
    radius: "sm" as const,
    variant: "bordered" as const,
  };

  if (field.fieldType === "textarea") {
    return (
      <Textarea
        {...commonProps}
        minRows={3}
        placeholder={field.placeholder ?? field.label}
        value={String(value)}
        onValueChange={(nextValue) => onChange(field.id, nextValue)}
      />
    );
  }

  if (field.fieldType === "select") {
    return (
      <Select
        {...commonProps}
        placeholder={field.placeholder ?? "Select option"}
        selectedKeys={value ? new Set([String(value)]) : new Set([])}
        onSelectionChange={(keys) => {
          if (keys === "all") {
            return;
          }

          const selected = Array.from(keys)[0];

          onChange(field.id, selected ? String(selected) : "");
        }}
      >
        {(field.options ?? []).map((option) => (
          <SelectItem key={option}>{option}</SelectItem>
        ))}
      </Select>
    );
  }

  if (field.fieldType === "autocomplete" || field.fieldType === "userSelect") {
    // Future extension point: hydrate autocomplete/userSelect options from the
    // API/database. HeroUI Autocomplete already opens options on focus.
    return (
      <Autocomplete
        {...commonProps}
        allowsCustomValue={false}
        inputValue={String(value)}
        items={(field.options ?? []).map((option) => ({
          label: option,
          value: option,
        }))}
        menuTrigger="focus"
        placeholder={field.placeholder ?? "Select option"}
        selectedKey={typeof value === "string" && value ? value : null}
        onInputChange={(nextValue) => onChange(field.id, nextValue)}
        onSelectionChange={(key) => {
          onChange(field.id, key ? String(key) : "");
        }}
      >
        {(option) => (
          <AutocompleteItem key={option.value} textValue={option.label}>
            {option.label}
          </AutocompleteItem>
        )}
      </Autocomplete>
    );
  }

  if (field.fieldType === "multiSelect") {
    const selectedValues = Array.isArray(value) ? value : [];

    return (
      <Select
        {...commonProps}
        placeholder={field.placeholder ?? "Select options"}
        selectedKeys={new Set(selectedValues)}
        selectionMode="multiple"
        onSelectionChange={(keys) => {
          if (keys === "all") {
            onChange(field.id, field.options ?? []);

            return;
          }

          onChange(field.id, Array.from(keys).map(String));
        }}
      >
        {(field.options ?? []).map((option) => (
          <SelectItem key={option}>{option}</SelectItem>
        ))}
      </Select>
    );
  }

  if (field.fieldType === "date") {
    return (
      <DatePicker
        {...commonProps}
        value={toDateValue(value)}
        onChange={(nextValue) => {
          onChange(field.id, nextValue ? nextValue.toString() : "");
        }}
      />
    );
  }

  if (field.fieldType === "checkbox") {
    return (
      <div className="flex min-h-10 items-center">
        <Checkbox
          classNames={{
            label: "text-sm text-[#111827]",
          }}
          isSelected={Boolean(value)}
          onValueChange={(isSelected) => onChange(field.id, isSelected)}
        >
          Enabled
        </Checkbox>
      </div>
    );
  }

  if (field.fieldType === "url") {
    const urlValue = typeof value === "string" ? value.trim() : "";

    return (
      <div className="flex gap-2">
        <Input
          {...commonProps}
          className="min-w-0 flex-1"
          placeholder={field.placeholder ?? field.label}
          type="url"
          value={String(value)}
          onValueChange={(nextValue) => onChange(field.id, nextValue)}
        />
        <Button
          isIconOnly
          aria-label={`Open ${field.label}`}
          isDisabled={!urlValue}
          radius="sm"
          variant="bordered"
          onPress={() => {
            if (!urlValue) {
              return;
            }

            window.open(
              normalizeExternalUrl(urlValue),
              "_blank",
              "noopener,noreferrer",
            );
          }}
        >
          <ExternalLink size={16} />
        </Button>
      </div>
    );
  }

  return (
    <Input
      {...commonProps}
      placeholder={field.placeholder ?? field.label}
      type={field.fieldType}
      value={String(value)}
      onValueChange={(nextValue) => onChange(field.id, nextValue)}
    />
  );
};

export const ClientFieldsForm = () => {
  const initialValues = useMemo(() => buildInitialValues(), []);
  const [values, setValues] =
    useState<Record<string, FieldValue>>(initialValues);
  const [openGroups, setOpenGroups] = useState<Set<string>>(
    () => new Set([fieldGroups[0]?.title ?? ""]),
  );
  const [searchQuery, setSearchQuery] = useState("");
  const normalizedSearchQuery = searchQuery.trim().toLowerCase();

  const visibleFieldGroups = useMemo(() => {
    if (!normalizedSearchQuery) {
      return fieldGroups;
    }

    return fieldGroups.reduce<FieldGroup[]>((groups, group) => {
      const fields = group.fields.filter((field) =>
        field.label.toLowerCase().includes(normalizedSearchQuery),
      );

      if (fields.length > 0) {
        groups.push({
          ...group,
          fields,
        });
      }

      return groups;
    }, []);
  }, [normalizedSearchQuery]);

  const visibleFieldCount = visibleFieldGroups.reduce(
    (count, group) => count + group.fields.length,
    0,
  );

  const handleChange = (fieldId: string, value: FieldValue) => {
    setValues((current) => ({
      ...current,
      [fieldId]: value,
    }));
  };

  const handleSubmit = () => {
    // Intentionally logs until this form is connected to the client fields API.
    // eslint-disable-next-line no-console
    console.log("Client custom fields", values);
  };

  const toggleGroup = (groupTitle: string) => {
    setOpenGroups((current) => {
      const next = new Set(current);

      if (next.has(groupTitle)) {
        if (next.size === 1) {
          return current;
        }

        next.delete(groupTitle);

        return next;
      }

      next.add(groupTitle);

      return next;
    });
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[#111827]">
            Client Fields
          </h1>
          <p className="mt-1 text-sm text-[#6B7280]">
            Manage custom operational fields for this client.
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center lg:w-auto">
          <Input
            aria-label="Search fields"
            className="w-full sm:w-80"
            placeholder="Search fields"
            radius="sm"
            startContent={<Search className="text-default-400" size={16} />}
            value={searchQuery}
            variant="bordered"
            onValueChange={setSearchQuery}
          />
          <Chip className="bg-[#EEF2FF] text-[#4F46E5]" radius="full" size="sm">
            {normalizedSearchQuery
              ? `${visibleFieldCount} fields`
              : `${fieldGroups.length} groups`}
          </Chip>
        </div>
      </div>

      <div className="space-y-4">
        {visibleFieldGroups.length > 0 ? (
          visibleFieldGroups.map((group) => {
            const isOpen =
              Boolean(normalizedSearchQuery) || openGroups.has(group.title);

            return (
              <Card
                key={group.title}
                className="border border-default-200 shadow-none"
              >
                <CardHeader className="px-4 py-3">
                  <button
                    className="flex w-full items-center justify-between gap-3 text-left"
                    type="button"
                    onClick={() => toggleGroup(group.title)}
                  >
                    <div className="min-w-0">
                      <h2 className="text-base font-semibold text-[#111827]">
                        {group.title}
                      </h2>
                      {group.description ? (
                        <p className="text-sm text-[#6B7280]">
                          {group.description}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-2">
                      <Chip
                        className="bg-default-100 text-default-600"
                        radius="full"
                        size="sm"
                      >
                        {group.fields.length} fields
                      </Chip>
                      <ChevronDown
                        className={`text-[#6B7280] transition-transform ${
                          isOpen ? "rotate-180" : ""
                        }`}
                        size={18}
                      />
                    </div>
                  </button>
                </CardHeader>
                {isOpen ? (
                  <>
                    <Divider />
                    <CardBody className="px-4 py-0">
                      <div className="divide-y divide-default-200">
                        {group.fields.map((field) => (
                          <div
                            key={field.id}
                            className="grid grid-cols-1 gap-2 py-3 md:grid-cols-[minmax(180px,240px)_1fr] md:items-center md:gap-4"
                          >
                            <label
                              className="text-sm font-medium text-[#374151]"
                              htmlFor={`client-field-${field.id}`}
                            >
                              {field.label}
                            </label>
                            <FieldRenderer
                              field={field}
                              value={values[field.id]}
                              onChange={handleChange}
                            />
                          </div>
                        ))}
                      </div>
                    </CardBody>
                  </>
                ) : null}
              </Card>
            );
          })
        ) : (
          <Card className="border border-dashed border-default-300 shadow-none">
            <CardBody className="py-8 text-center text-sm text-[#6B7280]">
              No fields found.
            </CardBody>
          </Card>
        )}
      </div>

      <div className="flex justify-end border-t border-default-200 pt-4">
        <Button className="bg-[#022279] text-white" onPress={handleSubmit}>
          Save Changes
        </Button>
      </div>
    </div>
  );
};
