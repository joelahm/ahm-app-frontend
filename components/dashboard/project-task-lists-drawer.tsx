"use client";

import { useCallback, useEffect, useState } from "react";
import { Drawer, DrawerBody, DrawerContent } from "@heroui/drawer";

import {
  clientsApi,
  type ClientProject,
  type ProjectTask,
} from "@/apis/clients";
import { usersApi } from "@/apis/users";
import { useAuth } from "@/components/auth/auth-context";
import { ViewTaskListsPanelContent } from "@/components/dashboard/client-details/view-task-lists-panel-content";
import { useAppToast } from "@/hooks/use-app-toast";
import { resolveServerAssetUrl } from "@/lib/server-assets";

interface ProjectTaskListsDrawerProps {
  clientId: string;
  isOpen: boolean;
  projectId: string;
  onOpenChange: (isOpen: boolean) => void;
}

type PanelTask = {
  assigneeAvatar?: string;
  assigneeId?: string | null;
  assigneeName: string;
  blockedTaskId?: string | null;
  description?: string | null;
  descriptionJson?: Record<string, unknown> | null;
  dueDate: string;
  dueDateOffsetDays?: number;
  dueDateRuleType?: string | null;
  id: string;
  name: string;
  parentTaskId?: string | null;
  status: string;
};

const getFullName = (firstName?: string | null, lastName?: string | null) => {
  const parts = [firstName, lastName]
    .map((value) => value?.trim() ?? "")
    .filter(Boolean);

  return parts.join(" ");
};

const mapTaskToPanel = (task: ProjectTask): PanelTask => ({
  assigneeAvatar: resolveServerAssetUrl(task.assignedTo?.avatar ?? undefined),
  assigneeId: task.assignedToId ? String(task.assignedToId) : null,
  assigneeName:
    getFullName(
      task.assignedTo?.firstName ?? null,
      task.assignedTo?.lastName ?? null,
    ) || "-",
  description: task.description,
  descriptionJson:
    task.descriptionJson && typeof task.descriptionJson === "object"
      ? (task.descriptionJson as Record<string, unknown>)
      : null,
  blockedTaskId: task.blockedTaskId ? String(task.blockedTaskId) : null,
  dueDate: task.dueDate ?? "-",
  dueDateOffsetDays: task.dueDateOffsetDays,
  dueDateRuleType: task.dueDateRuleType ?? null,
  id: String(task.id),
  name: task.taskName ?? task.task ?? "-",
  parentTaskId: task.parentTaskId ? String(task.parentTaskId) : null,
  status: task.status ?? "Todo",
});

type UserOption = {
  avatar?: string | null;
  id: string;
  name: string;
  email?: string | null;
};

export const ProjectTaskListsDrawer = ({
  clientId,
  isOpen,
  projectId,
  onOpenChange,
}: ProjectTaskListsDrawerProps) => {
  const { getValidAccessToken, session } = useAuth();
  const toast = useAppToast();
  const [project, setProject] = useState<ClientProject | null>(null);
  const [tasks, setTasks] = useState<PanelTask[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [clientName, setClientName] = useState("");
  const [clientAddress, setClientAddress] = useState("-");
  const [isLoading, setIsLoading] = useState(false);

  const loadData = useCallback(async () => {
    if (!session || !clientId || !projectId) {
      return;
    }

    setIsLoading(true);

    try {
      const accessToken = await getValidAccessToken();
      const [projectsResult, tasksResult, clientResult, usersResult] =
        await Promise.allSettled([
          clientsApi.getClientProjects(accessToken, clientId, { limit: 100 }),
          clientsApi.getProjectTasks(accessToken, clientId),
          clientsApi.getClientById(accessToken, clientId),
          usersApi.getUsers(accessToken, { limit: 100, page: 1 }),
        ]);

      if (projectsResult.status === "rejected") {
        throw projectsResult.reason;
      }

      if (tasksResult.status === "rejected") {
        throw tasksResult.reason;
      }

      if (clientResult.status === "rejected") {
        throw clientResult.reason;
      }

      const projectsResponse = projectsResult.value;
      const tasksResponse = tasksResult.value;
      const client = clientResult.value;
      const matchedProject =
        projectsResponse.projects.find(
          (item) => String(item.id) === String(projectId),
        ) ?? null;

      setProject(matchedProject);
      setTasks(
        tasksResponse.tasks
          .filter((task) => String(task.projectId) === String(projectId))
          .map(mapTaskToPanel),
      );
      setClientName(
        client.clientName?.trim() || client.businessName?.trim() || "Client",
      );
      setClientAddress(
        [
          client.addressLine1,
          client.addressLine2,
          client.cityState,
          client.postCode,
          client.country,
        ]
          .map((value) => value?.trim() ?? "")
          .filter(Boolean)
          .join(", ") || "-",
      );

      // Non-admins can't list users; fall back to an empty array so the
      // panel still renders (assignee dropdown will simply be empty).
      if (usersResult.status === "fulfilled") {
        setUsers(
          usersResult.value.users.map((user) => {
            const fullName = getFullName(user.firstName, user.lastName);

            return {
              avatar: user.avatarUrl,
              email: user.email,
              id: String(user.id),
              name: fullName || user.email,
            };
          }),
        );
      } else {
        setUsers([]);
      }
    } catch (error) {
      toast.danger("Failed to load project details.", {
        description:
          error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  }, [clientId, getValidAccessToken, projectId, session, toast]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    void loadData();
  }, [isOpen, loadData]);

  const handleProjectMetaChange = async (payload: {
    accountManagerId?: string;
    csmId?: string;
    description?: string | null;
    descriptionJson?: Record<string, unknown> | null;
    dueDate?: string | null;
    startDate?: string | null;
    status?: string;
  }) => {
    if (!project) {
      return;
    }

    const accessToken = await getValidAccessToken();
    const apiPayload: Record<string, unknown> = {
      accountManagerId:
        payload.accountManagerId !== undefined
          ? payload.accountManagerId
          : project.accountManagerId,
      clientSuccessManagerId:
        payload.csmId !== undefined
          ? payload.csmId
          : project.clientSuccessManagerId,
      dueDate:
        payload.dueDate !== undefined ? payload.dueDate : project.dueDate,
      progress: payload.status ?? project.progress,
      startDate:
        payload.startDate !== undefined ? payload.startDate : project.startDate,
    };

    if (payload.description !== undefined) {
      apiPayload.description = payload.description;
    }

    if (payload.descriptionJson !== undefined) {
      apiPayload.descriptionJson = payload.descriptionJson;
    }

    const updatedProject = await clientsApi.updateClientProject(
      accessToken,
      clientId,
      project.id,
      apiPayload,
    );

    setProject({ ...project, ...updatedProject });
  };

  const handleTaskDueDateChange = async (taskId: string, dueDate: string) => {
    const accessToken = await getValidAccessToken();

    await clientsApi.updateProjectTask(accessToken, taskId, { dueDate });
    await loadData();
  };

  const handleTaskChange = async (
    taskId: string,
    payload: {
      assigneeId?: string;
      dueDate?: string;
      status?: string;
    },
  ) => {
    const accessToken = await getValidAccessToken();

    await clientsApi.updateProjectTask(accessToken, taskId, payload);
    await loadData();
  };

  const accountManagerName = project
    ? getFullName(
        project.accountManager?.firstName,
        project.accountManager?.lastName,
      ) || "-"
    : "-";
  const csmName = project
    ? getFullName(
        project.clientSuccessManager?.firstName,
        project.clientSuccessManager?.lastName,
      ) || "-"
    : "-";

  return (
    <Drawer
      hideCloseButton
      classNames={{
        backdrop: "bg-black/20",
        base: "w-full max-w-4xl",
        wrapper: "justify-end",
      }}
      isDismissable={false}
      isOpen={isOpen}
      placement="right"
      scrollBehavior="inside"
      onOpenChange={onOpenChange}
    >
      <DrawerContent className="h-screen max-h-screen rounded-none">
        <DrawerBody className="p-5">
          {isLoading && !project ? (
            <div className="flex h-full items-center justify-center text-sm text-[#6B7280]">
              Loading project…
            </div>
          ) : project ? (
            <ViewTaskListsPanelContent
              accountManagerAvatar={resolveServerAssetUrl(
                project.accountManager?.avatar ?? undefined,
              )}
              accountManagerId={
                project.accountManagerId ? String(project.accountManagerId) : ""
              }
              accountManagerName={accountManagerName}
              address={clientAddress}
              clientName={clientName}
              csmAvatar={resolveServerAssetUrl(
                project.clientSuccessManager?.avatar ?? undefined,
              )}
              csmId={
                project.clientSuccessManagerId
                  ? String(project.clientSuccessManagerId)
                  : ""
              }
              csmName={csmName}
              description={project.description ?? ""}
              descriptionJson={project.descriptionJson ?? null}
              projectDueDate={project.dueDate ?? null}
              projectId={String(project.id)}
              projectName={project.project ?? "-"}
              projectStartDate={project.startDate ?? null}
              status={project.progress ?? "Draft"}
              tasks={tasks}
              users={users}
              onClose={() => onOpenChange(false)}
              onProjectMetaChange={handleProjectMetaChange}
              onTaskChange={handleTaskChange}
              onTaskDueDateChange={handleTaskDueDateChange}
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-[#6B7280]">
              Project not found.
            </div>
          )}
        </DrawerBody>
      </DrawerContent>
    </Drawer>
  );
};
