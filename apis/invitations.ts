import axios from "axios";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

const invitationsApiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

const parseError = (error: unknown) => {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as
      | {
          message?: string;
          error?: { message?: string };
        }
      | undefined;
    const message = data?.error?.message ?? data?.message ?? error.message;

    return message || "Something went wrong.";
  }

  return "Something went wrong.";
};

interface ValidateInvitationResponse {
  data?: unknown;
  email?: string;
  invitation?: {
    email?: string;
  };
  valid?: boolean;
}

interface CheckInvitationEmailResponse {
  alreadyInvited?: boolean;
  canInvite?: boolean;
  exists?: boolean;
  hasValidInvite?: boolean;
  invitationExists?: boolean;
  valid?: boolean;
  validInviteExists?: boolean;
}

export interface RegisterInvitationRequestBody {
  confirmPassword: string;
  country: string;
  department: string;
  email: string;
  firstName: string;
  lastName: string;
  password: string;
  phoneNumber: string;
  title: string;
  token: string;
}

const resolveAlreadyInvited = (data: CheckInvitationEmailResponse) => {
  const explicitAlreadyInvited =
    data.hasValidInvite ??
    data.validInviteExists ??
    data.invitationExists ??
    data.alreadyInvited ??
    data.exists ??
    data.valid;

  if (typeof explicitAlreadyInvited === "boolean") {
    return explicitAlreadyInvited;
  }

  if (typeof data.canInvite === "boolean") {
    return !data.canInvite;
  }

  return false;
};

const asObject = (value: unknown): Record<string, unknown> =>
  typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : {};

const asString = (value: unknown) =>
  typeof value === "string" ? value : undefined;

const resolvePayload = (value: unknown) => {
  const root = asObject(value);
  const nested = asObject(root.data);

  return Object.keys(nested).length > 0 ? nested : root;
};

const parseValidation = (value: unknown) => {
  const payload = resolvePayload(value);
  const invitation = asObject(payload.invitation);
  const email = asString(payload.email) ?? asString(invitation.email);
  const valid = payload.valid !== false;

  return { email, valid };
};

export const invitationsApi = {
  checkEmail: async (email: string) => {
    try {
      const response =
        await invitationsApiClient.post<CheckInvitationEmailResponse>(
          "/api/v1/auth/invitations/check-email",
          { email },
        );

      return resolveAlreadyInvited(response.data ?? {});
    } catch (error) {
      throw new Error(parseError(error));
    }
  },
  validateToken: async (token: string) => {
    try {
      const response =
        await invitationsApiClient.post<ValidateInvitationResponse>(
          "/api/v1/auth/invitations/validate",
          { token },
        );

      return parseValidation(response.data);
    } catch (error) {
      throw new Error(parseError(error));
    }
  },
  register: async (payload: RegisterInvitationRequestBody) => {
    try {
      const response = await invitationsApiClient.post(
        "/api/v1/auth/invitations/register",
        payload,
      );

      return response.data;
    } catch (error) {
      throw new Error(parseError(error));
    }
  },
};
