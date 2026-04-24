import axios from "axios";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

const projectsApiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

const parseError = (error: unknown) => {
  if (axios.isAxiosError(error)) {
    const message =
      (error.response?.data as { message?: string } | undefined)?.message ??
      error.message;

    return message || "Something went wrong.";
  }

  return "Something went wrong.";
};

export type ProjectsListGroupBy =
  | "projects"
  | "client"
  | "status"
  | "phase"
  | "progress";

export interface ProjectsListItem {
  clientAddress: string;
  clientId: number;
  clientName: string;
  csm: {
    avatar: string | null;
    id: number | null;
    name: string;
  };
  dueDateLabel: string;
  id: number;
  overdueCount: number;
  phase: string;
  progress: string;
  progressPercent: number;
  project: string;
  startDateLabel: string;
  status: string;
}

export interface ProjectsListGroup {
  count: number;
  items: ProjectsListItem[];
  key: string;
  label: string;
}

export interface ProjectsListResponse {
  groupBy: ProjectsListGroupBy;
  groups: ProjectsListGroup[];
  pagination: {
    limit: number;
    page: number;
    total: number;
    totalPages: number;
  };
}

export const projectsApi = {
  getProjectsList: async (
    accessToken: string,
    params?: {
      clientId?: string | number;
      groupBy?: ProjectsListGroupBy;
      limit?: number;
      page?: number;
      search?: string;
    },
  ) => {
    try {
      const response = await projectsApiClient.get<ProjectsListResponse>(
        "/api/v1/projects/list",
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          params,
        },
      );

      return response.data;
    } catch (error) {
      throw new Error(parseError(error));
    }
  },
};

