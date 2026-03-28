"use client";

import { useCallback, useEffect, useState } from "react";
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
  Plus,
  Search,
  SlidersHorizontal,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";

import { clientsApi } from "@/apis/clients";
import { usersApi } from "@/apis/users";
import { useAuth } from "@/components/auth/auth-context";
import {
  AddProjectFormValues,
  AddProjectModal,
} from "@/components/dashboard/client-details/add-project-modal";
import {
  DashboardDataTable,
  DashboardDataTableColumn,
} from "@/components/dashboard/dashboard-data-table";

type ClientProjectsRow = {
  id: string;
  project: string;
  progressPercent: number;
  clientSuccessManager: {
    avatar?: string;
    name: string;
  };
  accountManager: {
    avatar?: string;
    name: string;
  };
  status: string;
  phase: string;
  progress: string;
};

const thClassName = "text-xs font-medium text-[#111827] bg-[#F9FAFB]";

const buildColumns = ({
  onRemoveProject,
  onViewTaskLists,
}: {
  onRemoveProject: (projectId: string) => void;
  onViewTaskLists: (projectId: string) => void;
}): DashboardDataTableColumn<ClientProjectsRow>[] => [
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
              onViewTaskLists(item.id);
            }}
          >
            Vew Task Lists
          </DropdownItem>
          <DropdownItem
            key="remove"
            className="text-danger"
            color="danger"
            startContent={<Trash2 size={16} />}
            onPress={() => {
              onRemoveProject(item.id);
            }}
          >
            Remove
          </DropdownItem>
        </DropdownMenu>
      </Dropdown>
    ),
  },
];

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

export const ClientProjectsTable = ({ clientId }: { clientId: string }) => {
  const router = useRouter();
  const { session } = useAuth();
  const [isAddProjectOpen, setIsAddProjectOpen] = useState(false);
  const [clientAddress, setClientAddress] = useState("-");
  const [clientName, setClientName] = useState(clientId);
  const [rows, setRows] = useState<ClientProjectsRow[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [users, setUsers] = useState<
    Array<{ avatar?: string | null; id: string; name: string }>
  >([]);

  useEffect(() => {
    const accessToken = session?.accessToken || getStoredAccessToken();

    if (!accessToken) {
      setClientName(clientId);
      setClientAddress("-");

      return;
    }

    let isMounted = true;

    const hydrateClient = async () => {
      try {
        const client = await clientsApi.getClientById(accessToken, clientId);

        if (!isMounted) {
          return;
        }

        const composedAddress = [
          client.addressLine1,
          client.addressLine2,
          client.cityState,
          client.postCode,
          client.country,
        ]
          .map((part) => part?.trim() ?? "")
          .filter(Boolean)
          .join(", ");

        setClientName(client.clientName ?? client.businessName ?? clientId);
        setClientAddress(composedAddress || "-");
      } catch {
        if (!isMounted) {
          return;
        }

        setClientName(clientId);
        setClientAddress("-");
      }
    };

    void hydrateClient();

    return () => {
      isMounted = false;
    };
  }, [clientId, session?.accessToken]);

  useEffect(() => {
    const accessToken = session?.accessToken || getStoredAccessToken();

    if (!accessToken) {
      setUsers([]);

      return;
    }

    let isMounted = true;

    const hydrateUsers = async () => {
      try {
        const allUsers: Array<{
          avatarUrl?: string | null;
          email: string;
          firstName: string | null;
          id: number;
          lastName: string | null;
        }> = [];
        let page = 1;
        let hasNext = true;

        while (hasNext) {
          const response = await usersApi.getUsers(accessToken, {
            limit: 100,
            page,
          });

          allUsers.push(...response.users);
          hasNext = Boolean(response.pagination?.hasNext);
          page += 1;
        }

        if (!isMounted) {
          return;
        }

        setUsers(
          allUsers.map((user) => {
            const fullName = [user.firstName, user.lastName]
              .map((value) => value?.trim() ?? "")
              .filter(Boolean)
              .join(" ");

            return {
              avatar: user.avatarUrl,
              id: String(user.id),
              name: fullName || user.email,
            };
          }),
        );
      } catch {
        if (!isMounted) {
          return;
        }

        setUsers([]);
      }
    };

    void hydrateUsers();

    return () => {
      isMounted = false;
    };
  }, [session?.accessToken]);

  const loadProjects = useCallback(
    async (page: number) => {
      const accessToken = session?.accessToken || getStoredAccessToken();

      if (!accessToken) {
        setRows([]);
        setTotalPages(1);

        return;
      }

      const [response, tasksResponse] = await Promise.all([
        clientsApi.getClientProjects(accessToken, clientId, {
          limit: 10,
          page,
        }),
        clientsApi.getProjectTasks(accessToken, clientId),
      ]);

      setRows(
        response.projects.map((project) => {
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
            id: String(project.id),
            project: project.project ?? "-",
            progress: project.progress ?? "-",
            progressPercent: calculateProjectProgressPercent(
              String(project.id),
              tasksResponse.tasks,
            ),
            phase: project.phase ?? "-",
            status: "Active",
            accountManager: {
              avatar: resolveServerAssetUrl(project.accountManager.avatar),
              name: accountManagerName,
            },
            clientSuccessManager: {
              avatar: resolveServerAssetUrl(
                project.clientSuccessManager.avatar,
              ),
              name: clientSuccessManagerName,
            },
          };
        }),
      );
      setCurrentPage(response.pagination.page || page);
      setTotalPages(Math.max(1, response.pagination.totalPages || 1));
    },
    [clientId, session?.accessToken],
  );

  useEffect(() => {
    void loadProjects(currentPage);
  }, [currentPage, loadProjects]);

  const handleAddProject = async (payload: AddProjectFormValues) => {
    const accessToken = session?.accessToken || getStoredAccessToken();

    if (!accessToken) {
      throw new Error("Your session has expired. Please login again.");
    }

    const createdProject = await clientsApi.createClientProject(
      accessToken,
      clientId,
      {
        accountManagerId: payload.accountManagerId,
        clientSuccessManagerId: payload.clientSuccessManagerId,
        phase: payload.phase,
        progress: payload.progress,
        project: payload.project,
      },
    );

    void createdProject;
    await loadProjects(currentPage);
  };

  const handleViewTaskLists = (projectId: string) => {
    router.push(
      `/dashboard/clients/${clientId}/task-lists?projectId=${projectId}`,
    );
  };

  const handleRemoveProject = (projectId: string) => {
    void projectId;
  };

  const columns = buildColumns({
    onRemoveProject: handleRemoveProject,
    onViewTaskLists: handleViewTaskLists,
  });

  return (
    <>
      <DashboardDataTable
        serverPagination
        showPagination
        ariaLabel="Client projects"
        columns={columns}
        currentPage={currentPage}
        getRowKey={(item) => item.id}
        headerRight={
          <div className="flex w-full flex-wrap items-center justify-end gap-2">
            <Button
              startContent={<SlidersHorizontal size={14} />}
              variant="bordered"
            >
              Filter
            </Button>
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
            />
            <Button
              className="bg-[#022279] text-white"
              startContent={<Plus size={14} />}
              onPress={() => {
                setIsAddProjectOpen(true);
              }}
            >
              Add Project
            </Button>
          </div>
        }
        rows={rows}
        title="Projects"
        totalPages={totalPages}
        onPageChange={(page) => {
          setCurrentPage(page);
        }}
      />
      <AddProjectModal
        clientAddress={clientAddress}
        clientName={clientName}
        isOpen={isAddProjectOpen}
        users={users}
        onOpenChange={setIsAddProjectOpen}
        onSubmit={handleAddProject}
      />
    </>
  );
};
