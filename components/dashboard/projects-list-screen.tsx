"use client";

import { useEffect, useMemo, useState } from "react";
import { Avatar } from "@heroui/avatar";
import { Button } from "@heroui/button";
import { Card, CardBody, CardHeader } from "@heroui/card";
import { Checkbox } from "@heroui/checkbox";
import { Chip } from "@heroui/chip";
import {
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownTrigger,
} from "@heroui/dropdown";
import { Input } from "@heroui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
} from "@heroui/table";
import {
  Columns3,
  EllipsisVertical,
  ListTodo,
  ListFilter,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import { useRouter } from "next/navigation";

import { clientsApi } from "@/apis/clients";
import { projectsApi, type ProjectsListGroupBy } from "@/apis/projects";
import { useAuth } from "@/components/auth/auth-context";
import { normalizeProjectStatus } from "@/lib/project-statuses";

type GroupByKey = ProjectsListGroupBy;
type ProjectColumnKey =
  | "action"
  | "clientName"
  | "csm"
  | "dueDate"
  | "overdue"
  | "progressPercent"
  | "project"
  | "startDate"
  | "status";

type ProjectListRow = {
  clientAddress: string;
  clientId: string;
  clientName: string;
  csmAvatar?: string;
  csmName: string;
  dueDateLabel: string;
  id: string;
  overdueCount: number;
  progress: string;
  progressPercent: number;
  project: string;
  startDateLabel: string;
  status: string;
};

const GROUP_BY_LABELS: Record<GroupByKey, string> = {
  client: "Client",
  phase: "Phase",
  progress: "Progress",
  projects: "Projects",
  status: "Status",
};

type ClientFilterOption = {
  key: string;
  label: string;
};

const projectColumnLabels: Record<ProjectColumnKey, string> = {
  action: "Action",
  clientName: "Client Name",
  csm: "CSM",
  dueDate: "Due Date",
  overdue: "Overdue",
  progressPercent: "Progress",
  project: "Projects",
  startDate: "Start Date",
  status: "Status",
};

const defaultProjectColumnKeys: ProjectColumnKey[] = [
  "clientName",
  "project",
  "progressPercent",
  "startDate",
  "dueDate",
  "overdue",
  "csm",
  "status",
  "action",
];

const toggleableProjectColumnKeys = defaultProjectColumnKeys.filter(
  (key) => key !== "action",
);

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

export const ProjectsListScreen = () => {
  const router = useRouter();
  const { getValidAccessToken, session } = useAuth();
  const [groups, setGroups] = useState<
    Array<{ label: string; items: ProjectListRow[] }>
  >([]);
  const [clients, setClients] = useState<
    Array<{ address?: string | null; id: string; name: string }>
  >([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [groupBy, setGroupBy] = useState<GroupByKey>("projects");
  const [clientFilter, setClientFilter] = useState("all");
  const [progressFilter, setProgressFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [visibleColumnKeys, setVisibleColumnKeys] = useState<Set<string>>(
    () => new Set(toggleableProjectColumnKeys),
  );

  useEffect(() => {
    if (!session) {
      setGroups([]);

      return;
    }

    let isActive = true;

    const loadProjects = async () => {
      setIsLoading(true);

      try {
        const accessToken = await getValidAccessToken();
        const response = await projectsApi.getProjectsList(accessToken, {
          clientId: clientFilter === "all" ? undefined : clientFilter,
          groupBy,
          limit: 200,
          page: 1,
          search: searchValue.trim() || undefined,
        });

        if (!isActive) {
          return;
        }

        const mappedGroups = response.groups.map((group) => ({
          items: group.items.map((item) => ({
            clientAddress: item.clientAddress || "-",
            clientId: String(item.clientId),
            clientName: item.clientName || "-",
            csmAvatar: resolveServerAssetUrl(item.csm.avatar ?? undefined),
            csmName: item.csm.name || "-",
            dueDateLabel: item.dueDateLabel || "-",
            id: String(item.id),
            overdueCount: item.overdueCount ?? 0,
            progress: normalizeProjectStatus(item.progress),
            progressPercent: item.progressPercent ?? 0,
            project: item.project || "-",
            startDateLabel: item.startDateLabel || "-",
            status: normalizeProjectStatus(item.status || item.progress),
          })),
          label: group.label,
        }));

        setGroups(mappedGroups);
      } catch {
        if (!isActive) {
          return;
        }

        setGroups([]);
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    };

    void loadProjects();

    return () => {
      isActive = false;
    };
  }, [clientFilter, getValidAccessToken, groupBy, searchValue, session]);

  useEffect(() => {
    if (!session) {
      setClients([]);

      return;
    }

    let isMounted = true;

    const hydrateOptions = async () => {
      const accessToken = await getValidAccessToken();
      const clientsResult = await clientsApi.getClients(accessToken);

      if (!isMounted) {
        return;
      }

      setClients(
        clientsResult.map((client) => ({
          address: client.address ?? null,
          id: String(client.id),
          name:
            client.clientName || client.businessName || `Client ${client.id}`,
        })),
      );
    };

    hydrateOptions().catch(() => {
      if (isMounted) {
        setClients([]);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [getValidAccessToken, session]);

  const clientOptions = useMemo(() => {
    const entries = [...clients]
      .map((client) => [client.id, client.name] as const)
      .sort((left, right) => left[1].localeCompare(right[1]));

    return [
      { key: "all", label: "All Clients" },
      ...entries.map(([id, name]) => ({ key: id, label: name })),
    ] satisfies ClientFilterOption[];
  }, [clients]);

  const progressOptions = useMemo(
    () =>
      Array.from(
        new Set(
          groups
            .flatMap((group) => group.items.map((item) => item.progress))
            .filter((value) => value && value !== "-"),
        ),
      ).sort((left, right) => left.localeCompare(right)),
    [groups],
  );

  const statusOptions = useMemo(
    () =>
      Array.from(
        new Set(
          groups
            .flatMap((group) => group.items.map((item) => item.status))
            .filter((value) => value && value !== "-"),
        ),
      ).sort((left, right) => left.localeCompare(right)),
    [groups],
  );

  const resetFilters = () => {
    setClientFilter("all");
    setProgressFilter("all");
    setStatusFilter("all");
  };

  const groupedRows = useMemo(
    () =>
      groups
        .map((group) => ({
          ...group,
          items: group.items.filter((item) => {
            if (statusFilter !== "all" && item.status !== statusFilter) {
              return false;
            }

            if (progressFilter !== "all" && item.progress !== progressFilter) {
              return false;
            }

            return true;
          }),
        }))
        .filter((group) => group.items.length > 0),
    [groups, progressFilter, statusFilter],
  );

  const visibleTableColumnKeys = useMemo(
    () =>
      defaultProjectColumnKeys.filter(
        (key) => key === "action" || visibleColumnKeys.has(key),
      ),
    [visibleColumnKeys],
  );

  const visibleColumnCount = visibleTableColumnKeys.length;
  const flattenedRows = useMemo(
    () =>
      groupedRows.flatMap((group) => [
        {
          key: `group-${group.label}`,
          label: group.label,
          type: "group" as const,
        },
        ...group.items.map((item) => ({
          item,
          key: `project-${item.id}`,
          type: "project" as const,
        })),
      ]),
    [groupedRows],
  );

  const renderProjectCell = (item: ProjectListRow, columnKey: string) => {
    if (columnKey === "clientName") {
      return (
        <TableCell key={`${item.id}-${columnKey}`}>
          <div className="flex flex-col">
            <span className="text-[#111827]">{item.clientName}</span>
            <span className="text-[#9CA3AF]">{item.clientAddress}</span>
          </div>
        </TableCell>
      );
    }

    if (columnKey === "project") {
      return (
        <TableCell key={`${item.id}-${columnKey}`}>{item.project}</TableCell>
      );
    }

    if (columnKey === "progressPercent") {
      return (
        <TableCell key={`${item.id}-${columnKey}`}>
          <div className="min-w-20">
            <p className="text-sm font-semibold text-[#111827]">
              {item.progressPercent}%
            </p>
            <div className="mt-1 h-2 rounded-full bg-default-200">
              <div
                className="h-2 rounded-full bg-[#4F46E5]"
                style={{
                  width: `${item.progressPercent}%`,
                }}
              />
            </div>
          </div>
        </TableCell>
      );
    }

    if (columnKey === "startDate") {
      return (
        <TableCell key={`${item.id}-${columnKey}`}>
          {item.startDateLabel}
        </TableCell>
      );
    }

    if (columnKey === "dueDate") {
      return (
        <TableCell key={`${item.id}-${columnKey}`}>
          {item.dueDateLabel}
        </TableCell>
      );
    }

    if (columnKey === "overdue") {
      return (
        <TableCell key={`${item.id}-${columnKey}`}>
          {item.overdueCount}
        </TableCell>
      );
    }

    if (columnKey === "csm") {
      return (
        <TableCell key={`${item.id}-${columnKey}`}>
          <div className="flex items-center gap-2">
            <Avatar
              className="h-8 w-8"
              name={item.csmName}
              src={item.csmAvatar}
            />
            <span>{item.csmName}</span>
          </div>
        </TableCell>
      );
    }

    if (columnKey === "status") {
      return (
        <TableCell key={`${item.id}-${columnKey}`}>
          <Chip
            className="bg-[#DCFCE7] text-[#059669]"
            radius="full"
            size="sm"
            variant="flat"
          >
            {item.status}
          </Chip>
        </TableCell>
      );
    }

    return (
      <TableCell key={`${item.id}-${columnKey}`}>
        <Dropdown placement="bottom-end">
          <DropdownTrigger>
            <Button isIconOnly radius="sm" size="sm" variant="bordered">
              <EllipsisVertical size={14} />
            </Button>
          </DropdownTrigger>
          <DropdownMenu aria-label={`Project actions ${item.id}`}>
            <DropdownItem
              key="view-task"
              startContent={<ListTodo size={16} />}
              onPress={() => {
                router.push(
                  `/dashboard/clients/${item.clientId}/projects?openProjectId=${item.id}`,
                );
              }}
            >
              View Task
            </DropdownItem>
          </DropdownMenu>
        </Dropdown>
      </TableCell>
    );
  };

  return (
    <Card className="border border-default-200 shadow-none">
      <CardHeader className="flex flex-col items-start gap-3 border-b border-default-200 px-4 py-3 md:flex-row md:items-center md:justify-between">
        <h2 className="text-lg font-semibold text-[#111827]">Projects</h2>
        <div className="flex w-full flex-wrap items-center justify-end gap-2 md:w-auto">
          <Dropdown closeOnSelect={false} placement="bottom-start">
            <DropdownTrigger>
              <Button
                startContent={<ListFilter size={14} />}
                variant="bordered"
              >
                Filter
              </Button>
            </DropdownTrigger>
            <DropdownMenu aria-label="Project filters" className="min-w-64">
              <DropdownItem key="client-filter" textValue="Client filter">
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-[#4B5563]">Client</p>
                  <select
                    className="w-full rounded-md border border-default-200 px-2 py-1 text-sm"
                    value={clientFilter}
                    onChange={(event) => setClientFilter(event.target.value)}
                  >
                    {clientOptions.map((option) => (
                      <option key={option.key} value={option.key}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </DropdownItem>
              <DropdownItem key="status-filter" textValue="Status filter">
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-[#4B5563]">Status</p>
                  <select
                    className="w-full rounded-md border border-default-200 px-2 py-1 text-sm"
                    value={statusFilter}
                    onChange={(event) => setStatusFilter(event.target.value)}
                  >
                    <option value="all">All statuses</option>
                    {statusOptions.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </div>
              </DropdownItem>
              <DropdownItem key="progress-filter" textValue="Progress filter">
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-[#4B5563]">
                    Progress
                  </p>
                  <select
                    className="w-full rounded-md border border-default-200 px-2 py-1 text-sm"
                    value={progressFilter}
                    onChange={(event) => setProgressFilter(event.target.value)}
                  >
                    <option value="all">All progress states</option>
                    {progressOptions.map((progress) => (
                      <option key={progress} value={progress}>
                        {progress}
                      </option>
                    ))}
                  </select>
                </div>
              </DropdownItem>
              <DropdownItem key="reset-filters" textValue="Reset filters">
                <Button
                  fullWidth
                  radius="sm"
                  variant="bordered"
                  onPress={resetFilters}
                >
                  Reset
                </Button>
              </DropdownItem>
            </DropdownMenu>
          </Dropdown>
          <Dropdown placement="bottom-start">
            <DropdownTrigger>
              <Button
                startContent={<SlidersHorizontal size={14} />}
                variant="bordered"
              >
                {`Group by: ${GROUP_BY_LABELS[groupBy]}`}
              </Button>
            </DropdownTrigger>
            <DropdownMenu
              aria-label="Group by"
              selectedKeys={new Set([groupBy])}
              selectionMode="single"
              onSelectionChange={(keys) => {
                const selected = Array.from(keys)[0];

                if (
                  selected === "projects" ||
                  selected === "client" ||
                  selected === "status" ||
                  selected === "phase" ||
                  selected === "progress"
                ) {
                  setGroupBy(selected);
                }
              }}
            >
              <DropdownItem key="projects">Projects</DropdownItem>
              <DropdownItem key="client">Client</DropdownItem>
              <DropdownItem key="status">Status</DropdownItem>
              <DropdownItem key="phase">Phase</DropdownItem>
              <DropdownItem key="progress">Progress</DropdownItem>
            </DropdownMenu>
          </Dropdown>
          <Dropdown closeOnSelect={false} placement="bottom-end">
            <DropdownTrigger>
              <Button startContent={<Columns3 size={14} />} variant="bordered">
                Columns
              </Button>
            </DropdownTrigger>
            <DropdownMenu aria-label="Visible project columns">
              {toggleableProjectColumnKeys.map((columnKey) => (
                <DropdownItem
                  key={columnKey}
                  textValue={projectColumnLabels[columnKey]}
                  onPress={() => {
                    setVisibleColumnKeys((current) => {
                      const next = new Set(current);

                      if (next.has(columnKey)) {
                        next.delete(columnKey);
                      } else {
                        next.add(columnKey);
                      }

                      return next;
                    });
                  }}
                >
                  <Checkbox
                    className="pointer-events-none"
                    isSelected={visibleColumnKeys.has(columnKey)}
                  >
                    {projectColumnLabels[columnKey]}
                  </Checkbox>
                </DropdownItem>
              ))}
            </DropdownMenu>
          </Dropdown>
          <Input
            className="w-full md:w-[220px]"
            placeholder="Search here"
            radius="sm"
            startContent={<Search className="text-default-400" size={16} />}
            value={searchValue}
            onValueChange={setSearchValue}
          />
        </div>
      </CardHeader>
      <CardBody className="p-0">
        <Table
          removeWrapper
          aria-label="Projects list table"
          classNames={{
            table: "border-collapse border-spacing-0",
            tbody:
              "[&_tr]:border-b [&_tr]:border-default-200 [&_tr:nth-child(even)]:bg-[#FCFCFD]",
            td: "px-3 py-3 text-sm text-[#111827]",
            th: "px-3 py-3 text-xs font-medium text-[#111827]",
          }}
        >
          <TableHeader>
            {visibleTableColumnKeys.map((columnKey) => (
              <TableColumn key={columnKey}>
                {projectColumnLabels[columnKey]}
              </TableColumn>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={visibleColumnCount}>
                  <div className="py-3 text-sm text-[#6B7280]">
                    Loading projects...
                  </div>
                </TableCell>
              </TableRow>
            ) : groupedRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={visibleColumnCount}>
                  <div className="py-3 text-sm text-[#6B7280]">
                    No projects found.
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              flattenedRows.map((row) =>
                row.type === "group" ? (
                  <TableRow key={row.key}>
                    <TableCell
                      className="bg-white px-3 py-2"
                      colSpan={visibleColumnCount}
                    >
                      <Chip
                        className="bg-[#EEF2FF] text-[#4F46E5]"
                        radius="full"
                        size="sm"
                      >
                        {row.label}
                      </Chip>
                    </TableCell>
                  </TableRow>
                ) : (
                  <TableRow key={row.key}>
                    {visibleTableColumnKeys.map((columnKey) =>
                      renderProjectCell(row.item, columnKey),
                    )}
                  </TableRow>
                ),
              )
            )}
          </TableBody>
        </Table>
      </CardBody>
    </Card>
  );
};
