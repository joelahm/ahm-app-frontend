import axios from "axios";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

const projectTemplatesApiClient = axios.create({
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

export interface ProjectTemplateTask {
  assigneeId?: string;
  assigneeName?: string;
  blockedTaskId?: string;
  dependency: string;
  dependencyType?: string;
  dueDateTrigger: string;
  enableDependency?: boolean;
  id: string;
  isExpanded?: boolean;
  isSelected?: boolean;
  labels: string[];
  level: number;
  parentTaskId?: string;
  status?: string;
  taskDescription: string;
  taskName: string;
  title?: string;
}

export interface ProjectTemplate {
  createdAt: string;
  createdBy: {
    email?: string;
    id: number;
    name: string;
  };
  description: string;
  id: string;
  projectName: string;
  status: string;
  tasks: ProjectTemplateTask[];
  totalTasks: number;
  updatedAt: string;
}

export interface CreateProjectTemplateRequestBody {
  description: string;
  projectName: string;
  status: string;
  tasks: ProjectTemplateTask[];
}

export interface ProjectTemplateStatusOptionsResponse {
  statusOptions: string[];
}

export const projectTemplatesApi = {
  createProjectTemplate: async (
    accessToken: string,
    payload: CreateProjectTemplateRequestBody,
  ) => {
    try {
      const response = await projectTemplatesApiClient.post<{
        projectTemplate: ProjectTemplate;
        success?: boolean;
      }>("/api/v1/project-templates", payload, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      return response.data;
    } catch (error) {
      throw new Error(parseError(error));
    }
  },
  updateProjectTemplate: async (
    accessToken: string,
    templateId: string,
    payload: CreateProjectTemplateRequestBody,
  ) => {
    try {
      const response = await projectTemplatesApiClient.patch<{
        projectTemplate: ProjectTemplate;
        success?: boolean;
      }>(`/api/v1/project-templates/${templateId}`, payload, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      return response.data;
    } catch (error) {
      throw new Error(parseError(error));
    }
  },
  listProjectTemplates: async (accessToken: string) => {
    try {
      const response = await projectTemplatesApiClient.get<{
        projectTemplates: ProjectTemplate[];
      }>("/api/v1/project-templates", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      return response.data;
    } catch (error) {
      throw new Error(parseError(error));
    }
  },
  listProjectTemplateStatusOptions: async (accessToken: string) => {
    try {
      const response =
        await projectTemplatesApiClient.get<ProjectTemplateStatusOptionsResponse>(
          "/api/v1/project-templates/status-options",
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          },
        );

      return response.data;
    } catch (error) {
      throw new Error(parseError(error));
    }
  },
  deleteProjectTemplate: async (accessToken: string, templateId: string) => {
    try {
      const response = await projectTemplatesApiClient.delete<{
        projectTemplate: { id: string };
        success?: boolean;
      }>(`/api/v1/project-templates/${templateId}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      return response.data;
    } catch (error) {
      throw new Error(parseError(error));
    }
  },
};
