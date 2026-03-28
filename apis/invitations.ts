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
    const message =
      (error.response?.data as { message?: string } | undefined)?.message ??
      error.message;

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
  dateFormat: string;
  email: string;
  firstName: string;
  lastName: string;
  password: string;
  phoneNumber: string;
  timezone: string;
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
    const payload = { token };

    try {
      const response =
        await invitationsApiClient.post<ValidateInvitationResponse>(
          "/api/v1/auth/invitations/validate",
          payload,
        );

      return parseValidation(response.data);
    } catch (apiV1Error) {
      try {
        const response =
          await invitationsApiClient.post<ValidateInvitationResponse>(
            "/auth/invitations/validate",
            payload,
          );

        return parseValidation(response.data);
      } catch (error) {
        throw new Error(parseError(error ?? apiV1Error));
      }
    }
  },
  register: async (payload: RegisterInvitationRequestBody) => {
    try {
      const response = await invitationsApiClient.post(
        "/api/v1/auth/invitations/register",
        payload,
      );

      return response.data;
    } catch (apiV1Error) {
      try {
        const response = await invitationsApiClient.post(
          "/auth/invitations/register",
          payload,
        );

        return response.data;
      } catch (error) {
        throw new Error(parseError(error ?? apiV1Error));
      }
    }
  },
};
