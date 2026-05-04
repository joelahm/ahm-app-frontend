"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Accordion, AccordionItem } from "@heroui/accordion";
import { Button } from "@heroui/button";
import { Card, CardBody } from "@heroui/card";
import { Spinner } from "@heroui/spinner";
import { Switch } from "@heroui/switch";

import {
  notificationsApi,
  type NotificationChannels,
  type NotificationEventRow,
  type NotificationModule,
  type NotificationSettings,
} from "@/apis/notifications";
import { useAuth } from "@/components/auth/auth-context";
import { useNotifications } from "@/components/dashboard/notifications-provider";
import { useAppToast } from "@/hooks/use-app-toast";

type ChannelColumn = "inAppEnabled" | "emailEnabled" | "discordEnabled";

type ModulesState = Record<string, NotificationEventRow[]>;

// Master channel toggles are no longer user-editable from this page; the
// per-event-per-channel switches in each module section are the source of
// truth. We still keep the channels object in state so Discord routing
// config (defaultChannelId, useClientChannel) round-trips through save.
const DEFAULT_CHANNELS: NotificationChannels = {
  discord: {
    defaultChannelId: "",
    enabled: true,
    useClientChannel: true,
  },
  email: {
    enabled: true,
  },
  inApp: {
    enabled: true,
  },
};

const buildStateFromModules = (modules: NotificationModule[]): ModulesState =>
  Object.fromEntries(
    modules.map((module) => [module.key, module.rows]),
  ) as ModulesState;

const mergeModulesWithState = (
  modules: NotificationModule[],
  state: ModulesState,
): NotificationModule[] =>
  modules.map((module) => ({
    ...module,
    rows: state[module.key] ?? module.rows,
  }));

const renderModuleTable = (
  module: NotificationModule,
  rows: NotificationEventRow[],
  onToggle: (
    moduleKey: string,
    rowKey: string,
    column: ChannelColumn,
    nextValue: boolean,
  ) => void,
) => {
  const gridClassName =
    "grid grid-cols-[minmax(0,1.8fr)_112px_112px_112px] gap-x-4";

  return (
    <div className="overflow-hidden rounded-xl border border-default-200">
      <div
        className={`${gridClassName} border-b border-default-200 bg-default-50 px-4 py-3 text-sm font-medium text-[#111827]`}
      >
        <div>Event</div>
        <div className="text-center">In-app</div>
        <div className="text-center">Email</div>
        <div className="text-center">Discord</div>
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
          <div className="flex justify-center">
            <Switch
              isSelected={item.inAppEnabled}
              size="sm"
              onValueChange={(value) =>
                onToggle(module.key, item.key, "inAppEnabled", value)
              }
            />
          </div>
          <div className="flex justify-center">
            <Switch
              isSelected={item.emailEnabled}
              size="sm"
              onValueChange={(value) =>
                onToggle(module.key, item.key, "emailEnabled", value)
              }
            />
          </div>
          <div className="flex justify-center">
            <Switch
              isSelected={item.discordEnabled}
              size="sm"
              onValueChange={(value) =>
                onToggle(module.key, item.key, "discordEnabled", value)
              }
            />
          </div>
        </div>
      ))}
    </div>
  );
};

export const SettingsNotificationsContent = () => {
  const { getValidAccessToken, session } = useAuth();
  const { realtimeError, realtimeStatus } = useNotifications();
  const toast = useAppToast();
  const toastRef = useRef(toast);
  const previousRealtimeStatusRef = useRef(realtimeStatus);
  const [channels, setChannels] =
    useState<NotificationChannels>(DEFAULT_CHANNELS);
  const [modules, setModules] = useState<NotificationModule[]>([]);
  const [modulesState, setModulesState] = useState<ModulesState>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    toastRef.current = toast;
  }, [toast]);

  useEffect(() => {
    const wasRealtimeDown =
      previousRealtimeStatusRef.current === "disconnected";
    const isRealtimeDown = realtimeStatus === "disconnected";

    previousRealtimeStatusRef.current = realtimeStatus;

    if (!isRealtimeDown || wasRealtimeDown) {
      return;
    }

    toastRef.current.warning("Realtime notifications are not connected", {
      description:
        realtimeError ??
        "Live notifications are offline. Toasts and unread badges will not update until the connection is restored.",
      timeout: 5000,
    });
  }, [realtimeError, realtimeStatus]);

  const loadSettings = useCallback(async () => {
    if (!session?.accessToken) {
      setIsLoading(false);

      return;
    }

    try {
      setIsLoading(true);
      const accessToken = await getValidAccessToken();
      const response = await notificationsApi.getSettings(accessToken);
      const nextSettings = response.settings;
      const nextModules = nextSettings.modules ?? [];

      setChannels(nextSettings.channels ?? DEFAULT_CHANNELS);
      setModules(nextModules);
      setModulesState(buildStateFromModules(nextModules));
    } catch (loadError) {
      toastRef.current.danger("Failed to load notification settings.", {
        description:
          loadError instanceof Error ? loadError.message : "Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  }, [getValidAccessToken, session?.accessToken]);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  const toggleEvent = (
    moduleKey: string,
    rowKey: string,
    column: ChannelColumn,
    nextValue: boolean,
  ) => {
    setModulesState((current) => ({
      ...current,
      [moduleKey]: (current[moduleKey] ?? []).map((row) =>
        row.key === rowKey ? { ...row, [column]: nextValue } : row,
      ),
    }));
  };

  const handleSave = async () => {
    if (!session?.accessToken || !modules.length) {
      return;
    }

    const payload: NotificationSettings = {
      channels,
      modules: mergeModulesWithState(modules, modulesState),
    };

    try {
      setIsSaving(true);
      const accessToken = await getValidAccessToken();
      const response = await notificationsApi.updateSettings(
        accessToken,
        payload,
      );
      const nextSettings = response.settings;
      const nextModules = nextSettings.modules ?? payload.modules;

      setChannels(nextSettings.channels ?? channels);
      setModules(nextModules);
      setModulesState(buildStateFromModules(nextModules));
      toastRef.current.success("Notification settings updated.");
    } catch (saveError) {
      toastRef.current.danger("Failed to save notification settings.", {
        description:
          saveError instanceof Error ? saveError.message : "Please try again.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="border border-default-200 shadow-none">
        <CardBody className="gap-6 p-6">
          <div className="flex flex-col gap-4 border-b border-default-200 pb-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold">Notifications</h2>
              <p className="max-w-2xl text-sm text-default-500">
                Configure how the workspace delivers notifications across
                channels and per-event toggles.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3">
              <Button
                className="bg-[#022279] text-white"
                isDisabled={isLoading}
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

          {!isLoading && modules.length === 0 ? (
            <div className="rounded-2xl border border-default-200 px-4 py-8 text-center text-sm text-default-500">
              No notification modules available.
            </div>
          ) : null}

          {!isLoading && modules.length > 0 ? (
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
              {modules.map((module) => (
                <AccordionItem
                  key={module.key}
                  aria-label={module.title}
                  subtitle={
                    <span className="block pt-2 text-sm leading-6 text-default-500">
                      {module.description}
                    </span>
                  }
                  title={module.title}
                >
                  {renderModuleTable(
                    module,
                    modulesState[module.key] ?? module.rows,
                    toggleEvent,
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
