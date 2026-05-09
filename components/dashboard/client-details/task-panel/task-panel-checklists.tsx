"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@heroui/button";
import { Checkbox } from "@heroui/checkbox";
import { ChevronDown, ChevronRight, Plus, Trash2 } from "lucide-react";

import {
  clientsApi,
  type TaskChecklist,
  type TaskChecklistItem,
} from "@/apis/clients";
import { useAuth } from "@/components/auth/auth-context";
import { useTaskActivityRefresh } from "@/components/dashboard/client-details/task-panel/task-activity/use-task-activity-refresh";
import { useAppToast } from "@/hooks/use-app-toast";

interface TaskPanelChecklistsProps {
  taskId: string | number;
}

export const TaskPanelChecklists = ({ taskId }: TaskPanelChecklistsProps) => {
  const { getValidAccessToken, session } = useAuth();
  const toast = useAppToast();
  const { bump: bumpActivity } = useTaskActivityRefresh();
  const [checklists, setChecklists] = useState<TaskChecklist[]>([]);
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [editingChecklistId, setEditingChecklistId] = useState<string | null>(
    null,
  );
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [draftText, setDraftText] = useState("");
  const [newItemTextByChecklistId, setNewItemTextByChecklistId] = useState<
    Record<string, string>
  >({});
  const [isLoading, setIsLoading] = useState(false);
  const [isCreatingChecklist, setIsCreatingChecklist] = useState(false);

  const checklistStats = useMemo(
    () =>
      checklists.reduce<Record<string, { complete: number; total: number }>>(
        (acc, checklist) => {
          const total = checklist.items.length;
          const complete = checklist.items.filter((item) => item.isComplete).length;

          acc[String(checklist.id)] = { complete, total };

          return acc;
        },
        {},
      ),
    [checklists],
  );

  const loadChecklists = async () => {
    if (!session?.accessToken) return;

    try {
      setIsLoading(true);
      const accessToken = await getValidAccessToken();
      const response = await clientsApi.listTaskChecklists(accessToken, taskId);

      setChecklists(response.checklists);
    } catch (error) {
      toast.danger("Failed to load checklists.", {
        description:
          error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const updateChecklistInState = (updated: TaskChecklist) => {
    setChecklists((current) =>
      current.map((checklist) =>
        String(checklist.id) === String(updated.id) ? updated : checklist,
      ),
    );
  };

  const updateItemInState = (
    checklistId: string | number,
    updated: TaskChecklistItem,
  ) => {
    setChecklists((current) =>
      current.map((checklist) =>
        String(checklist.id) === String(checklistId)
          ? {
              ...checklist,
              items: checklist.items.map((item) =>
                String(item.id) === String(updated.id) ? updated : item,
              ),
            }
          : checklist,
      ),
    );
  };

  const handleCreateChecklist = async () => {
    if (!session?.accessToken || isCreatingChecklist) return;

    try {
      setIsCreatingChecklist(true);
      const accessToken = await getValidAccessToken();
      const checklist = await clientsApi.createTaskChecklist(accessToken, taskId, {
        position: checklists.length,
        title: "Checklist",
      });

      setChecklists((current) => [...current, checklist]);
      bumpActivity();
    } catch (error) {
      toast.danger("Failed to add checklist.", {
        description:
          error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setIsCreatingChecklist(false);
    }
  };

  const saveChecklistTitle = async (checklist: TaskChecklist) => {
    const title = draftText.trim();

    setEditingChecklistId(null);
    if (!title || title === checklist.title || !session?.accessToken) return;

    try {
      const accessToken = await getValidAccessToken();
      const updated = await clientsApi.updateTaskChecklist(
        accessToken,
        checklist.id,
        { title },
      );

      updateChecklistInState(updated);
    } catch (error) {
      toast.danger("Failed to update checklist.", {
        description:
          error instanceof Error ? error.message : "Please try again.",
      });
    }
  };

  const deleteChecklist = async (checklistId: string | number) => {
    if (!session?.accessToken) return;

    try {
      const accessToken = await getValidAccessToken();

      await clientsApi.deleteTaskChecklist(accessToken, checklistId);
      setChecklists((current) =>
        current.filter((checklist) => String(checklist.id) !== String(checklistId)),
      );
      bumpActivity();
    } catch (error) {
      toast.danger("Failed to delete checklist.", {
        description:
          error instanceof Error ? error.message : "Please try again.",
      });
    }
  };

  const createItem = async (checklist: TaskChecklist) => {
    const checklistId = String(checklist.id);
    const text = (newItemTextByChecklistId[checklistId] ?? "").trim();

    if (!text || !session?.accessToken) return;

    try {
      const accessToken = await getValidAccessToken();
      const item = await clientsApi.createChecklistItem(
        accessToken,
        checklist.id,
        {
          position: checklist.items.length,
          text,
        },
      );

      setChecklists((current) =>
        current.map((currentChecklist) =>
          String(currentChecklist.id) === checklistId
            ? {
                ...currentChecklist,
                items: [...currentChecklist.items, item],
              }
            : currentChecklist,
        ),
      );
      setNewItemTextByChecklistId((current) => ({
        ...current,
        [checklistId]: "",
      }));
    } catch (error) {
      toast.danger("Failed to add item.", {
        description:
          error instanceof Error ? error.message : "Please try again.",
      });
    }
  };

  const toggleItem = async (
    checklist: TaskChecklist,
    item: TaskChecklistItem,
  ) => {
    if (!session?.accessToken) return;

    const previous = checklists;
    const optimistic = {
      ...item,
      isComplete: !item.isComplete,
    };

    updateItemInState(checklist.id, optimistic);

    try {
      const accessToken = await getValidAccessToken();
      const updated = await clientsApi.updateChecklistItem(accessToken, item.id, {
        isComplete: !item.isComplete,
      });

      updateItemInState(checklist.id, updated);
      bumpActivity();
    } catch (error) {
      setChecklists(previous);
      toast.danger("Failed to update item.", {
        description:
          error instanceof Error ? error.message : "Please try again.",
      });
    }
  };

  const saveItemText = async (
    checklist: TaskChecklist,
    item: TaskChecklistItem,
  ) => {
    const text = draftText.trim();

    setEditingItemId(null);
    if (!text || text === item.text || !session?.accessToken) return;

    try {
      const accessToken = await getValidAccessToken();
      const updated = await clientsApi.updateChecklistItem(accessToken, item.id, {
        text,
      });

      updateItemInState(checklist.id, updated);
    } catch (error) {
      toast.danger("Failed to update item.", {
        description:
          error instanceof Error ? error.message : "Please try again.",
      });
    }
  };

  const deleteItem = async (
    checklist: TaskChecklist,
    itemId: string | number,
  ) => {
    if (!session?.accessToken) return;

    try {
      const accessToken = await getValidAccessToken();

      await clientsApi.deleteChecklistItem(accessToken, itemId);
      setChecklists((current) =>
        current.map((currentChecklist) =>
          String(currentChecklist.id) === String(checklist.id)
            ? {
                ...currentChecklist,
                items: currentChecklist.items.filter(
                  (item) => String(item.id) !== String(itemId),
                ),
              }
            : currentChecklist,
        ),
      );
    } catch (error) {
      toast.danger("Failed to delete item.", {
        description:
          error instanceof Error ? error.message : "Please try again.",
      });
    }
  };

  useEffect(() => {
    void loadChecklists();
  }, [taskId]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-default-500">
          {isLoading ? "Loading checklists..." : `${checklists.length} lists`}
        </p>
        <Button
          className="bg-[#022279] text-white"
          isLoading={isCreatingChecklist}
          radius="sm"
          size="sm"
          startContent={<Plus size={14} />}
          onPress={() => {
            void handleCreateChecklist();
          }}
        >
          Add checklist
        </Button>
      </div>

      {checklists.length === 0 ? (
        <div className="rounded-lg border border-dashed border-default-200 px-4 py-8 text-center text-sm text-default-500">
          No checklists yet.
        </div>
      ) : null}

      {checklists.map((checklist) => {
        const checklistId = String(checklist.id);
        const isCollapsed = collapsedIds.has(checklistId);
        const stats = checklistStats[checklistId] ?? { complete: 0, total: 0 };

        return (
          <div
            key={checklistId}
            className="rounded-lg border border-default-200 bg-white"
          >
            <div className="flex items-center gap-2 border-b border-default-100 px-3 py-2">
              <button
                className="rounded p-1 text-default-500 hover:bg-default-100"
                type="button"
                onClick={() => {
                  setCollapsedIds((current) => {
                    const next = new Set(current);

                    if (next.has(checklistId)) {
                      next.delete(checklistId);
                    } else {
                      next.add(checklistId);
                    }

                    return next;
                  });
                }}
              >
                {isCollapsed ? (
                  <ChevronRight size={15} />
                ) : (
                  <ChevronDown size={15} />
                )}
              </button>
              {editingChecklistId === checklistId ? (
                <input
                  autoFocus
                  className="h-8 min-w-0 flex-1 rounded border border-default-200 px-2 text-sm font-semibold outline-none"
                  value={draftText}
                  onBlur={() => {
                    void saveChecklistTitle(checklist);
                  }}
                  onChange={(event) => setDraftText(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      void saveChecklistTitle(checklist);
                    }
                  }}
                />
              ) : (
                <button
                  className="min-w-0 flex-1 truncate text-left text-sm font-semibold text-default-900"
                  type="button"
                  onClick={() => {
                    setDraftText(checklist.title);
                    setEditingChecklistId(checklistId);
                  }}
                >
                  {checklist.title}
                </button>
              )}
              <span className="text-xs text-default-500">
                {stats.complete} of {stats.total}
              </span>
              <button
                className="rounded p-1 text-default-400 hover:bg-danger-50 hover:text-danger"
                type="button"
                onClick={() => {
                  void deleteChecklist(checklist.id);
                }}
              >
                <Trash2 size={14} />
              </button>
            </div>

            {!isCollapsed ? (
              <div className="divide-y divide-default-100">
                {checklist.items.map((item) => {
                  const itemId = String(item.id);

                  return (
                    <div
                      key={itemId}
                      className="group flex min-h-[44px] items-center gap-2 px-3 py-2"
                    >
                      <Checkbox
                        isSelected={item.isComplete}
                        onValueChange={() => {
                          void toggleItem(checklist, item);
                        }}
                      />
                      {editingItemId === itemId ? (
                        <input
                          autoFocus
                          className="h-8 min-w-0 flex-1 rounded border border-default-200 px-2 text-sm outline-none"
                          value={draftText}
                          onBlur={() => {
                            void saveItemText(checklist, item);
                          }}
                          onChange={(event) => setDraftText(event.target.value)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter") {
                              event.preventDefault();
                              void saveItemText(checklist, item);
                            }
                          }}
                        />
                      ) : (
                        <button
                          className={`min-w-0 flex-1 truncate text-left text-sm ${
                            item.isComplete
                              ? "text-default-400 line-through"
                              : "text-default-800"
                          }`}
                          type="button"
                          onClick={() => {
                            setDraftText(item.text);
                            setEditingItemId(itemId);
                          }}
                        >
                          {item.text}
                        </button>
                      )}
                      <button
                        className="hidden rounded p-1 text-default-400 hover:bg-danger-50 hover:text-danger group-hover:block"
                        type="button"
                        onClick={() => {
                          void deleteItem(checklist, item.id);
                        }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  );
                })}

                <div className="px-3 py-2">
                  <input
                    className="h-9 w-full rounded-lg border border-default-200 bg-white px-3 text-sm outline-none placeholder:text-default-400 focus:border-[#022279]"
                    placeholder="Add item and press Enter"
                    value={newItemTextByChecklistId[checklistId] ?? ""}
                    onChange={(event) =>
                      setNewItemTextByChecklistId((current) => ({
                        ...current,
                        [checklistId]: event.target.value,
                      }))
                    }
                    onKeyDown={(event) => {
                      if (event.key !== "Enter") return;
                      event.preventDefault();
                      void createItem(checklist);
                    }}
                  />
                </div>
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
};
