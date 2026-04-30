"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@heroui/button";
import { Card, CardBody, CardHeader } from "@heroui/card";
import { Input } from "@heroui/input";
import { Switch } from "@heroui/switch";
import { Bell, Bot, Mail } from "lucide-react";

import {
  notificationsApi,
  type NotificationSettings,
} from "@/apis/notifications";
import { useAuth } from "@/components/auth/auth-context";
import { useAppToast } from "@/hooks/use-app-toast";

const DEFAULT_SETTINGS: NotificationSettings = {
  channels: {
    discord: {
      defaultChannelId: "",
      enabled: false,
      useClientChannel: true,
    },
    email: {
      enabled: false,
    },
    inApp: {
      enabled: true,
    },
  },
  taskEvents: {
    TASK_ASSIGNED: true,
    TASK_COMMENT_CREATED: true,
    TASK_COMPLETED: true,
    TASK_STATUS_CHANGED: true,
  },
};

export const SettingsNotificationsContent = () => {
  const { getValidAccessToken } = useAuth();
  const toast = useAppToast();
  const toastRef = useRef(toast);
  const [settings, setSettings] =
    useState<NotificationSettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    toastRef.current = toast;
  }, [toast]);

  useEffect(() => {
    let isMounted = true;

    const loadSettings = async () => {
      setIsLoading(true);
      try {
        const accessToken = await getValidAccessToken();
        const response = await notificationsApi.getSettings(accessToken);

        if (isMounted) {
          setSettings(response.settings);
        }
      } catch (error) {
        toastRef.current.danger("Failed to load notification settings.", {
          description: error instanceof Error ? error.message : undefined,
        });
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void loadSettings();

    return () => {
      isMounted = false;
    };
  }, [getValidAccessToken]);

  const patchSettings = (patch: Partial<NotificationSettings>) => {
    setSettings((current) => ({
      ...current,
      ...patch,
      channels: {
        ...current.channels,
        ...(patch.channels || {}),
      },
      taskEvents: {
        ...current.taskEvents,
        ...(patch.taskEvents || {}),
      },
    }));
  };

  const saveSettings = async () => {
    setIsSaving(true);
    try {
      const accessToken = await getValidAccessToken();
      const response = await notificationsApi.updateSettings(
        accessToken,
        settings,
      );

      setSettings(response.settings);
      toast.success("Notification settings saved.");
    } catch (error) {
      toast.danger("Failed to save notification settings.", {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="border border-default-200 shadow-none">
        <CardHeader className="border-b border-default-200 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-[#111827]">
              Notifications
            </h2>
            <p className="text-sm text-default-500">
              Configure channels and task events for application notifications.
            </p>
          </div>
        </CardHeader>
        <CardBody className="space-y-6 p-6">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-lg border border-default-200 p-4">
              <div className="mb-4 flex items-center gap-2">
                <Bell size={18} />
                <p className="font-semibold text-[#111827]">In-app</p>
              </div>
              <Switch
                isSelected={settings.channels.inApp.enabled}
                onValueChange={(enabled) => {
                  patchSettings({
                    channels: {
                      ...settings.channels,
                      inApp: { enabled },
                    },
                  });
                }}
              >
                Enabled
              </Switch>
            </div>

            <div className="rounded-lg border border-default-200 p-4">
              <div className="mb-4 flex items-center gap-2">
                <Mail size={18} />
                <p className="font-semibold text-[#111827]">Email</p>
              </div>
              <Switch
                isSelected={settings.channels.email.enabled}
                onValueChange={(enabled) => {
                  patchSettings({
                    channels: {
                      ...settings.channels,
                      email: { enabled },
                    },
                  });
                }}
              >
                Enabled
              </Switch>
            </div>

            <div className="rounded-lg border border-default-200 p-4">
              <div className="mb-4 flex items-center gap-2">
                <Bot size={18} />
                <p className="font-semibold text-[#111827]">Discord</p>
              </div>
              <div className="space-y-4">
                <Switch
                  isSelected={settings.channels.discord.enabled}
                  onValueChange={(enabled) => {
                    patchSettings({
                      channels: {
                        ...settings.channels,
                        discord: {
                          ...settings.channels.discord,
                          enabled,
                        },
                      },
                    });
                  }}
                >
                  Enabled
                </Switch>
                <Switch
                  isSelected={settings.channels.discord.useClientChannel}
                  onValueChange={(useClientChannel) => {
                    patchSettings({
                      channels: {
                        ...settings.channels,
                        discord: {
                          ...settings.channels.discord,
                          useClientChannel,
                        },
                      },
                    });
                  }}
                >
                  Prefer client Discord channel
                </Switch>
                <Input
                  label="Fallback channel ID"
                  labelPlacement="outside"
                  placeholder="Discord channel ID"
                  value={settings.channels.discord.defaultChannelId}
                  onValueChange={(defaultChannelId) => {
                    patchSettings({
                      channels: {
                        ...settings.channels,
                        discord: {
                          ...settings.channels.discord,
                          defaultChannelId,
                        },
                      },
                    });
                  }}
                />
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-default-200 p-4">
            <p className="mb-4 font-semibold text-[#111827]">Task events</p>
            <div className="grid gap-3 md:grid-cols-2">
              {Object.entries(settings.taskEvents).map(([eventKey, enabled]) => (
                <Switch
                  key={eventKey}
                  isSelected={enabled}
                  onValueChange={(nextEnabled) => {
                    patchSettings({
                      taskEvents: {
                        ...settings.taskEvents,
                        [eventKey]: nextEnabled,
                      },
                    });
                  }}
                >
                  {eventKey
                    .replace(/^TASK_/, "")
                    .toLowerCase()
                    .replace(/_/g, " ")}
                </Switch>
              ))}
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              className="bg-[#022279] text-white"
              isDisabled={isLoading}
              isLoading={isSaving}
              onPress={() => {
                void saveSettings();
              }}
            >
              Save settings
            </Button>
          </div>
        </CardBody>
      </Card>
    </div>
  );
};
