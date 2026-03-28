"use client";

import { useEffect, useMemo, useState } from "react";
import { Avatar } from "@heroui/avatar";
import { Button } from "@heroui/button";
import { Chip } from "@heroui/chip";
import {
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownTrigger,
} from "@heroui/dropdown";
import { Input } from "@heroui/input";
import {
  Columns3,
  EllipsisVertical,
  List,
  ListTodo,
  Search,
} from "lucide-react";
import { useRouter } from "next/navigation";

import { clientsApi } from "@/apis/clients";
import { useAuth } from "@/components/auth/auth-context";
import {
  DashboardDataTable,
  type DashboardDataTableColumn,
} from "@/components/dashboard/dashboard-data-table";

type MyProjectRow = {
  accountManager: {
    avatar?: string;
    name: string;
  };
  clientId: string;
  clientName: string;
  clientSuccessManager: {
    avatar?: string;
    name: string;
  };
  id: string;
  phase: string;
  progress: string;
  progressPercent: number;
  project: string;
  status: string;
};

const thClassName = "text-xs font-medium text-[#111827] bg-[#F9FAFB]";

const getStoredAccessToken = () => {
  if (typeof window === "undefined") {
    return "";
  }

  try {
    const rawSession = window.localStorage.getItem("ahm-auth-session");

    if (!rawSession) {
      return "";
    }

    const parsed = JSON.parse(rawSession) as { accessToken?: unknown };

    return typeof parsed.accessToken === "string" ? parsed.accessToken : "";
  } catch {
    return "";
  }
};

const getFullName = (firstName?: string | null, lastName?: string | null) => {
  const parts = [firstName, lastName]
    .map((value) => value?.trim() ?? "")
    .filter(Boolean);

  return parts.join(" ");
};

const resolveServerAssetUrl = (value?: string | null) => {
  if (!value) {
    return undefined;
  }

  if (/^https?:\/\//i.test(value)) {
    return value;
  }

  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "");
  const normalizedPath = value.replace(/^\/+/, "");

  return baseUrl ? `${baseUrl}/${normalizedPath}` : value;
};

const calculateProjectProgressPercent = (
  projectId: string,
  tasks: Awaited<ReturnType<typeof clientsApi.getProjectTasks>>["tasks"],
) => {
  const projectTasks = tasks.filter(
    (task) => String(task.projectId) === projectId,
  );

  if (!projectTasks.length) {
    return 0;
  }

  const completedTasks = projectTasks.filter((task) => task.status === "DONE");

  return Math.round((completedTasks.length / projectTasks.length) * 100);
};

const columns = ({
  onViewTaskLists,
}: {
  onViewTaskLists: (clientId: string, projectId: string) => void;
}): DashboardDataTableColumn<MyProjectRow>[] => [
  {
    key: "clientName",
    label: "Client Name",
    className: thClassName,
    renderCell: (item) => (
      <span className="text-sm text-[#111827]">{item.clientName}</span>
    ),
  },
  {
    key: "project",
    label: "Projects",
    className: thClassName,
    renderCell: (item) => (
      <span className="text-sm text-[#111827]">{item.project}</span>
    ),
  },
  {
    key: "progressPercent",
    label: "Progress",
    className: thClassName,
    renderCell: (item) => (
      <div className="min-w-20">
        <p className="text-2sm font-semibold text-[#111827]">
          {item.progressPercent}%
        </p>
        <div className="mt-1 h-2 rounded-full bg-default-200">
          <div
            className="h-2 rounded-full bg-[#4F46E5]"
            style={{ width: `${item.progressPercent}%` }}
          />
        </div>
      </div>
    ),
  },
  {
    key: "clientSuccessManager",
    label: "Client Success Mana",
    className: thClassName,
    renderCell: (item) => (
      <div className="flex items-center gap-2">
        <Avatar
          name={item.clientSuccessManager.name}
          size="sm"
          src={item.clientSuccessManager.avatar}
        />
        <span className="text-sm text-[#374151]">
          {item.clientSuccessManager.name}
        </span>
      </div>
    ),
  },
  {
    key: "accountManager",
    label: "Account Manager",
    className: thClassName,
    renderCell: (item) => (
      <div className="flex items-center gap-2">
        <Avatar
          name={item.accountManager.name}
          size="sm"
          src={item.accountManager.avatar}
        />
        <span className="text-sm text-[#374151]">
          {item.accountManager.name}
        </span>
      </div>
    ),
  },
  {
    key: "status",
    label: "Status",
    className: thClassName,
    renderCell: (item) => (
      <Chip
        className="bg-[#DCFCE7] text-[#059669]"
        radius="full"
        size="sm"
        variant="flat"
      >
        {item.status}
      </Chip>
    ),
  },
  {
    key: "phase",
    label: "Phase",
    className: thClassName,
    renderCell: (item) => (
      <span className="text-sm text-[#374151]">{item.phase}</span>
    ),
  },
  {
    key: "progress",
    label: "Progress",
    className: thClassName,
    renderCell: (item) => (
      <span className="text-sm text-[#374151]">{item.progress}</span>
    ),
  },
  {
    key: "action",
    label: "Action",
    className: thClassName,
    renderCell: (item) => (
      <Dropdown placement="bottom-end">
        <DropdownTrigger>
          <Button isIconOnly radius="sm" size="sm" variant="bordered">
            <EllipsisVertical size={14} />
          </Button>
        </DropdownTrigger>
        <DropdownMenu aria-label={`Project actions ${item.id}`}>
          <DropdownItem
            key="view-task-lists"
            startContent={<ListTodo size={16} />}
            onPress={() => {
              onViewTaskLists(item.clientId, item.id);
            }}
          >
            View Task Lists
          </DropdownItem>
        </DropdownMenu>
      </Dropdown>
    ),
  },
];

export const MyProjectsTable = () => {
  const router = useRouter();
  const { session } = useAuth();
  const [rows, setRows] = useState<MyProjectRow[]>([]);
  const [searchValue, setSearchValue] = useState("");

  useEffect(() => {
    const accessToken = session?.accessToken || getStoredAccessToken();

    if (!accessToken) {
      setRows([]);

      return;
    }

    let isMounted = true;

    const loadProjects = async () => {
      try {
        const clientsResponse = await clientsApi.getClients(accessToken);
        const allClients = clientsResponse ?? [];
        const mappedProjects = await Promise.all(
          allClients.map(async (client) => {
            const currentClientId = client.id;

            if (currentClientId === undefined || currentClientId === null) {
              return [];
            }

            const [projectsResponse, tasksResponse] = await Promise.all([
              clientsApi.getClientProjects(accessToken, currentClientId, {
                limit: 100,
                page: 1,
              }),
              clientsApi.getProjectTasks(accessToken, currentClientId),
            ]);

            return projectsResponse.projects.map((project) => {
              const clientSuccessManagerName =
                getFullName(
                  project.clientSuccessManager.firstName,
                  project.clientSuccessManager.lastName,
                ) || "-";
              const accountManagerName =
                getFullName(
                  project.accountManager.firstName,
                  project.accountManager.lastName,
                ) || "-";

              return {
                accountManager: {
                  avatar: resolveServerAssetUrl(project.accountManager.avatar),
                  name: accountManagerName,
                },
                clientId: String(currentClientId),
                clientName:
                  client.clientName ??
                  client.businessName ??
                  `Client ${currentClientId}`,
                clientSuccessManager: {
                  avatar: resolveServerAssetUrl(
                    project.clientSuccessManager.avatar,
                  ),
                  name: clientSuccessManagerName,
                },
                id: String(project.id),
                phase: project.phase ?? "-",
                progress: project.progress ?? "-",
                progressPercent: calculateProjectProgressPercent(
                  String(project.id),
                  tasksResponse.tasks,
                ),
                project: project.project ?? "-",
                status: "Active",
              };
            });
          }),
        );

        if (!isMounted) {
          return;
        }

        setRows(
          mappedProjects
            .flat()
            .sort((left, right) => left.project.localeCompare(right.project)),
        );
      } catch {
        if (!isMounted) {
          return;
        }

        setRows([]);
      }
    };

    void loadProjects();

    return () => {
      isMounted = false;
    };
  }, [session?.accessToken]);

  const filteredRows = useMemo(() => {
    const query = searchValue.trim().toLowerCase();

    if (!query) {
      return rows;
    }

    return rows.filter((item) =>
      [
        item.clientName,
        item.project,
        item.accountManager.name,
        item.clientSuccessManager.name,
        item.phase,
        item.progress,
      ].some((value) => value.toLowerCase().includes(query)),
    );
  }, [rows, searchValue]);

  const handleViewTaskLists = (clientId: string, projectId: string) => {
    router.push(
      `/dashboard/clients/${clientId}/task-lists?projectId=${projectId}`,
    );
  };

  return (
    <DashboardDataTable
      showPagination
      ariaLabel="All projects"
      columns={columns({ onViewTaskLists: handleViewTaskLists })}
      getRowKey={(item) => item.id}
      headerRight={
        <div className="flex w-full flex-wrap items-center justify-end gap-2">
          <Button startContent={<List size={14} />} variant="bordered">
            Show 10
          </Button>
          <Button startContent={<Columns3 size={14} />} variant="bordered">
            Columns
          </Button>
          <Input
            className="max-w-[220px]"
            placeholder="Search here"
            startContent={<Search className="text-default-400" size={14} />}
            value={searchValue}
            onValueChange={setSearchValue}
          />
        </div>
      }
      rows={filteredRows}
      title="All Projects"
    />
  );
};
