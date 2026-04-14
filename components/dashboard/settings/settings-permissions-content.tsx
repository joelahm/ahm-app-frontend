"use client";

import { useCallback, useEffect, useState } from "react";
import { Alert } from "@heroui/alert";
import { Accordion, AccordionItem } from "@heroui/accordion";
import { Button } from "@heroui/button";
import { Card, CardBody } from "@heroui/card";
import { Spinner } from "@heroui/spinner";
import { Switch } from "@heroui/switch";

import {
  usersApi,
  type PermissionRowSetting,
  type PermissionSectionSetting,
} from "@/apis/users";
import { useAuth } from "@/components/auth/auth-context";

type PermissionColumn = "guestEnabled" | "memberEnabled" | "adminEnabled";

type PermissionState = Record<string, PermissionRowSetting[]>;

const buildStateFromSections = (sections: PermissionSectionSetting[]) =>
  Object.fromEntries(
    sections.map((section) => [section.key, section.rows]),
  ) as PermissionState;

const mergeSectionsWithState = (
  sections: PermissionSectionSetting[],
  state: PermissionState,
): PermissionSectionSetting[] =>
  sections.map((section) => ({
    ...section,
    rows: state[section.key] ?? section.rows,
  }));

const renderSectionTable = (
  section: PermissionSectionSetting,
  rows: PermissionRowSetting[],
  onToggle: (
    sectionKey: string,
    rowKey: string,
    column: PermissionColumn,
    nextValue: boolean,
  ) => void,
) => {
  const gridClassName = section.hasGuestColumn
    ? "grid grid-cols-[minmax(0,1.8fr)_112px_112px_112px] gap-x-4"
    : "grid grid-cols-[minmax(0,1.8fr)_140px_140px] gap-x-4";

  return (
    <div className="overflow-hidden rounded-xl border border-default-200">
      <div
        className={`${gridClassName} border-b border-default-200 bg-default-50 px-4 py-3 text-sm font-medium text-[#111827]`}
      >
        <div>Action</div>
        {section.hasGuestColumn ? (
          <div className="text-center">Guest</div>
        ) : null}
        <div className="text-center">Member</div>
        <div className="text-center">Admin</div>
      </div>
      {rows.map((item, index) => (
        <div
          key={item.key}
          className={`${gridClassName} items-center px-4 py-5 ${
            index !== rows.length - 1 ? "border-b border-default-200" : ""
          }`}
        >
          <div className="min-w-0 pr-4">
            <p className="text-base font-medium text-[#111827]">{item.title}</p>
            <p className="mt-1 text-sm text-default-500">{item.description}</p>
          </div>
          {section.hasGuestColumn ? (
            <div className="flex justify-center">
              <Switch
                isSelected={!!item.guestEnabled}
                size="sm"
                onValueChange={(value) =>
                  onToggle(section.key, item.key, "guestEnabled", value)
                }
              />
            </div>
          ) : null}
          <div className="flex justify-center">
            <Switch
              isSelected={item.memberEnabled}
              size="sm"
              onValueChange={(value) =>
                onToggle(section.key, item.key, "memberEnabled", value)
              }
            />
          </div>
          <div className="flex justify-center">
            <Switch isDisabled isSelected={item.adminEnabled} size="sm" />
          </div>
        </div>
      ))}
    </div>
  );
};

export const SettingsPermissionsContent = () => {
  const { session } = useAuth();
  const [sections, setSections] = useState<PermissionSectionSetting[]>([]);
  const [permissionsState, setPermissionsState] = useState<PermissionState>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!successMessage && !error) {
      return;
    }

    const timer = window.setTimeout(() => {
      setSuccessMessage(null);
      setError(null);
    }, 3500);

    return () => window.clearTimeout(timer);
  }, [error, successMessage]);

  const loadPermissions = useCallback(async () => {
    if (!session?.accessToken) {
      setIsLoading(false);

      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      setSuccessMessage(null);
      const response = await usersApi.getPermissionsSettings(
        session.accessToken,
      );
      const nextSections = response.sections ?? [];

      setSections(nextSections);
      setPermissionsState(buildStateFromSections(nextSections));
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Failed to load permissions settings.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [session?.accessToken]);

  useEffect(() => {
    void loadPermissions();
  }, [loadPermissions]);

  const togglePermission = (
    sectionKey: string,
    rowKey: string,
    column: PermissionColumn,
    nextValue: boolean,
  ) => {
    if (column === "adminEnabled") {
      return;
    }

    setPermissionsState((current) => ({
      ...current,
      [sectionKey]: (current[sectionKey] ?? []).map((row) =>
        row.key === rowKey ? { ...row, [column]: nextValue } : row,
      ),
    }));
    setSuccessMessage(null);
  };

  const handleSave = async () => {
    if (!session?.accessToken || !sections.length) {
      return;
    }

    const payload = {
      sections: mergeSectionsWithState(sections, permissionsState),
    };

    try {
      setIsSaving(true);
      setError(null);
      setSuccessMessage(null);
      const response = await usersApi.updatePermissionsSettings(
        session.accessToken,
        payload,
      );
      const nextSections = response.settings?.sections ?? payload.sections;

      setSections(nextSections);
      setPermissionsState(buildStateFromSections(nextSections));
      setSuccessMessage("Permissions updated successfully.");
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Failed to save permissions settings.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {successMessage ? (
        <Alert color="success" title={successMessage} variant="flat" />
      ) : null}

      {error ? <Alert color="danger" title={error} variant="flat" /> : null}

      <Card className="border border-default-200 shadow-none">
        <CardBody className="gap-6 p-6">
          <div className="flex flex-col gap-4 border-b border-default-200 pb-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold">Permissions</h2>
              <p className="max-w-2xl text-sm text-default-500">
                Configure which roles can access workspace tools and actions.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3">
              <Button
                className="bg-[#022279] text-white"
                isLoading={isSaving}
                radius="sm"
                onPress={handleSave}
              >
                Save
              </Button>
            </div>
          </div>

          {isLoading ? (
            <div className="flex min-h-40 items-center justify-center rounded-2xl border border-default-200">
              <Spinner color="primary" size="lg" />
            </div>
          ) : null}

          {!isLoading && sections.length === 0 ? (
            <div className="rounded-2xl border border-default-200 px-4 py-8 text-center text-sm text-default-500">
              No permissions settings available.
            </div>
          ) : null}

          {!isLoading && sections.length > 0 ? (
            <Accordion
              className="gap-4 px-0"
              itemClasses={{
                base: "rounded-2xl border border-default-200 bg-white px-0 shadow-none",
                content: "px-5 pb-5 pt-0",
                indicator: "text-default-400",
                title: "text-base font-semibold text-[#111827]",
                trigger: "px-5 py-4 data-[hover=true]:bg-transparent",
              }}
              selectionMode="multiple"
              variant="splitted"
            >
              {sections.map((section) => (
                <AccordionItem
                  key={section.key}
                  aria-label={section.title}
                  subtitle={
                    <span className="block pt-2 text-sm leading-6 text-default-500">
                      {section.description}
                    </span>
                  }
                  title={section.title}
                >
                  {renderSectionTable(
                    section,
                    permissionsState[section.key] ?? section.rows,
                    togglePermission,
                  )}
                </AccordionItem>
              ))}
            </Accordion>
          ) : null}
        </CardBody>
      </Card>
    </div>
  );
};
