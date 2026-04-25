import axios from "axios";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

const clientsApiClient = axios.create({
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

export interface AddClientRequestBody {
  businessName: string;
  businessPhone: string;
  clientName: string;
  niche: string;
  personalEmail: string;
  personalPhone?: string;
  profession?: string;
  practiceEmail: string;
  website: string;
}

export interface AddClientProjectRequestBody {
  accountManagerId: number | string;
  clientSuccessManagerId: number | string;
  dueDate?: string | null;
  phase: string;
  progress: string;
  project: string;
  startDate?: string | null;
}

export interface UpdateClientProjectRequestBody {
  accountManagerId?: number | string;
  clientSuccessManagerId?: number | string;
  dueDate?: string | null;
  phase?: string;
  progress?: string;
  project?: string;
  startDate?: string | null;
}

export interface AddProjectTaskRequestBody {
  assigneeId: number | string;
  description: string;
  dueDate: string;
  parentTaskId?: number | string;
  projectId: number | string;
  startDate: string;
  status?: string;
  task?: string;
  taskName: string;
}

export interface AddClientCitationRequestBody {
  citationDatabaseEntryId?: string | null;
  directoryName: string;
  notes?: string;
  password?: string;
  profileUrl?: string;
  status?: string;
  username?: string;
  verificationStatus?: ClientCitationVerificationStatus | null;
}

export interface SyncGbpDetailsRequestBody {
  clientId: number;
  gl: string;
  hl: string;
  placeId: string;
}

export interface ClientGbpDetails {
  attributeGroups: Array<{
    items: string[];
    title: string;
  }>;
  bookingsLink: string | null;
  businessDescription: string | null;
  businessLocation: string | null;
  businessName: string | null;
  category: string | null;
  completionScore: string | null;
  email: string | null;
  gallery: Array<{
    id: string;
    imageUrl?: string | null;
    title: string;
  }>;
  openingDate: string | null;
  openingHours: Array<{
    closeTime: string | null;
    day: string;
    open: boolean;
    openTime: string | null;
  }>;
  phone: string | null;
  primaryCategory: string | null;
  rating: string | null;
  ratingSummary: ClientGbpRatingSummaryItem[];
  reviewCount: string | null;
  latitude: number | null;
  longitude: number | null;
  secondaryCategories: string[];
  serviceAreas: string[];
  socialProfiles: {
    facebook: string | null;
    instagram: string | null;
    twitterX: string | null;
  };
  specialHours: Array<{
    date: string;
    key: string;
    title: string;
  }>;
  website: string | null;
}

export interface ClientGbpRatingSummaryItem {
  amount: number;
  stars: number;
}

export interface ClientGbpReview {
  date: string | null;
  id: string;
  images: string[];
  likes: number;
  name: string;
  rating: number;
  reply: string | null;
  review: string;
  userAvatar: string | null;
}

export interface ClientGbpReviewDraft {
  clientId: number | string;
  createdAt: string | null;
  createdBy: number | string | null;
  id: number | string;
  rating: number | null;
  replyText: string;
  reviewId: string;
  reviewerName: string | null;
  reviewText: string | null;
  status: string;
  updatedAt: string | null;
  updatedBy: number | string | null;
}

export interface ClientGbpReviewsResponse {
  drafts: ClientGbpReviewDraft[];
  nextPageToken: string | null;
  reviews: ClientGbpReview[];
  total: number;
}

export interface SaveClientGbpReviewDraftRequestBody {
  rating?: number | null;
  replyText: string;
  reviewerName?: string | null;
  reviewText?: string | null;
}

export interface ClientGbpPosting {
  assignee: {
    avatar: string | null;
    email: string | null;
    id: number | string | null;
    name: string | null;
  } | null;
  assigneeId: number | string | null;
  audience: string | null;
  buttonType: string | null;
  clientId: number | string;
  contentType: string;
  createdAt: string | null;
  createdBy: number | string | null;
  creator: {
    avatar: string | null;
    email: string | null;
    id: number | string | null;
    name: string | null;
  } | null;
  description: string | null;
  id: number | string;
  images: string[];
  keyword: string;
  language: string;
  languageCode: string;
  liveLink: string | null;
  postContent: string | null;
  publishedAt: string | null;
  scheduledAt: string | null;
  status: string;
  updatedAt: string | null;
}

export interface ClientGbpPostingComment {
  author: {
    avatar: string | null;
    email: string | null;
    firstName: string | null;
    id: number | string | null;
    lastName: string | null;
  } | null;
  comment: string;
  createdAt: string | null;
  createdBy: number | string | null;
  id: number | string;
  postingId: number | string;
  updatedAt: string | null;
}

export interface ClientGbpPostingCommentsResponse {
  comments: ClientGbpPostingComment[];
  total: number;
}

export interface CreateClientGbpPostingsRequestBody {
  audience?: string | null;
  language: string;
  languageCode: string;
  items: Array<{
    contentType: string;
    keyword: string;
    numberOfPosts: number;
  }>;
}

export interface ClientGbpPostingsResponse {
  postings: ClientGbpPosting[];
  total: number;
}

export interface GenerateClientGbpPostingContentResponse {
  content: string;
  generation: {
    keyword: string;
    logId: number | string | null;
    postingId: number | string;
    promptId: string;
    promptType: string;
    provider: string;
    taskId: string | null;
  } | null;
}

export interface ProjectTask {
  assignedTo: {
    avatar: string | null;
    firstName: string | null;
    id: number | string | null;
    lastName: string | null;
  };
  assignedToId: number | string | null;
  createdAt: string | null;
  createdBy: number | string | null;
  description: string | null;
  dueDate: string | null;
  id: number | string;
  parentTaskId?: number | string | null;
  priority: string | null;
  projectId: number | string | null;
  projectType: string | null;
  startDate: string | null;
  status: string | null;
  task: string | null;
  taskName: string | null;
  updatedAt: string | null;
}

export interface ProjectTasksResponse {
  tasks: ProjectTask[];
}

export interface TaskComment {
  author: {
    avatar: string | null;
    firstName: string | null;
    id: number | string | null;
    lastName: string | null;
  } | null;
  comment: string;
  createdAt: string | null;
  createdBy: number | string | null;
  id: number | string;
  taskId: number | string | null;
  updatedAt: string | null;
}

export interface TaskCommentsResponse {
  comments: TaskComment[];
  total: number;
}

export interface ProjectComment {
  author: {
    avatar: string | null;
    firstName: string | null;
    id: number | string | null;
    lastName: string | null;
  } | null;
  comment: string;
  createdAt: string | null;
  createdBy: number | string | null;
  id: number | string;
  projectId: number | string | null;
  updatedAt: string | null;
}

export interface ProjectCommentsResponse {
  comments: ProjectComment[];
  total: number;
}

export interface ClientProject {
  accountManager: {
    avatar: string | null;
    firstName: string | null;
    id: number | string | null;
    lastName: string | null;
  };
  accountManagerId: number | string | null;
  clientId: number | string | null;
  clientSuccessManager: {
    avatar: string | null;
    firstName: string | null;
    id: number | string | null;
    lastName: string | null;
  };
  clientSuccessManagerId: number | string | null;
  createdAt: string | null;
  createdBy: number | string | null;
  dueDate: string | null;
  id: number | string;
  phase: string | null;
  progress: string | null;
  project: string | null;
  startDate: string | null;
  updatedAt: string | null;
}

export interface ClientCitation {
  citationDatabaseEntryId?: string | null;
  clientId: number | string;
  createdAt: string | null;
  createdBy: number | string | null;
  directoryName: string;
  id: number | string;
  notes: string | null;
  password: string | null;
  profileUrl: string | null;
  source?: string | null;
  status: string | null;
  type?: string | null;
  updatedAt: string | null;
  username: string | null;
  verificationStatus: ClientCitationVerificationStatus;
}

export type ClientCitationVerificationValue =
  | "Match"
  | "Incorrect"
  | "Not Synced";

export interface ClientCitationVerificationStatus {
  address: ClientCitationVerificationValue;
  businessName: ClientCitationVerificationValue;
  phone: ClientCitationVerificationValue;
  zipCode: ClientCitationVerificationValue;
}

export interface ClientCitationsResponse {
  citations: ClientCitation[];
  total: number;
}

export interface ClientProjectsResponse {
  pagination: {
    hasNext: boolean;
    hasPrev: boolean;
    limit: number;
    nextPage: number | null;
    page: number;
    prevPage: number | null;
    total: number;
    totalPages: number;
  };
  projects: ClientProject[];
}

export interface ClientApiItem {
  address?: string | null;
  assignedTo?: number | string | null;
  assignedToId?: number | string | null;
  assignedUserAvatar?: string | null;
  assignedUserEmail?: string | null;
  assignedUserName?: string | null;
  businessName?: string | null;
  clientName?: string | null;
  clientSuccessManagerAvatar?: string | null;
  clientSuccessManagerName?: string | null;
  createdAt?: string | null;
  dateJoined?: string | null;
  id: number | string;
  lastActivity?: string | null;
  niche?: string | null;
  projects?: string[] | null;
  status?: string | null;
  updatedAt?: string | null;
}

export interface ClientDetails {
  assignedTo: number | string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  buildingName: string | null;
  businessName: string | null;
  businessPhone: string | null;
  cityState: string | null;
  clientName: string | null;
  country: string | null;
  createdAt: string | null;
  createdBy: number | string | null;
  credentials: string | null;
  facebook: string | null;
  gbpLink: string | null;
  gmcRegistrationNumber: string | null;
  googleAnalytics: string | null;
  googleSearchConsole: string | null;
  highQualityHeadshot: string[];
  id: number | string;
  instagram: string | null;
  linkedin: string | null;
  niche: string | null;
  nearbyAreasServed: string | null;
  otherMedicalSpecialties: string[];
  otherImages: string[];
  postCode: string | null;
  personalEmail: string | null;
  personalPhone: string | null;
  profession: string | null;
  practiceStructure: string | null;
  practiceHours: Array<{
    day: string;
    enabled: boolean;
    endMeridiem: string;
    endTime: string;
    startMeridiem: string;
    startTime: string;
  }>;
  practiceIntroduction: string | null;
  practiceLocationExteriorPhoto: string[];
  practiceLocationInteriorPhoto: string[];
  practiceEmail: string | null;
  specialInterests: string[];
  subSpecialties: string[];
  topMedicalSpecialties: string[];
  topTreatments: string[];
  treatmentAndServices: string[];
  typeOfPractice: string | null;
  majorAccomplishments: string | null;
  region: string | null;
  streetAddress: string | null;
  unitNumber: string | null;
  updatedAt: string | null;
  uniqueToCompetitors: string | null;
  visibleArea: string | null;
  website: string | null;
  websiteLoginLink: string | null;
  websitePassword: string | null;
  websiteUsername: string | null;
  colorGuide: string[];
  conditionsTreated: string[];
  logo: string[];
  yourCv: string[];
}

export interface UpdateClientRequestBody {
  assignedTo?: number | string | null;
  addressLine1: string;
  addressLine2: string;
  businessName: string;
  businessPhone: string;
  buildingName: string;
  cityState: string;
  clientName: string;
  country: string;
  conditionsTreated: string[];
  facebook: string;
  gbpLink: string;
  googleAnalytics: string;
  googleSearchConsole: string;
  highQualityHeadshot: string[];
  gmcRegistrationNumber: string;
  credentials: string;
  instagram: string;
  linkedin: string;
  niche: string;
  otherMedicalSpecialties: string[];
  otherImages: string[];
  personalEmail: string;
  personalPhone: string;
  postCode: string;
  practiceEmail: string;
  practiceHours: Array<{
    day: string;
    enabled: boolean;
    endMeridiem: string;
    endTime: string;
    startMeridiem: string;
    startTime: string;
  }>;
  practiceIntroduction: string;
  practiceLocationExteriorPhoto: string[];
  practiceLocationInteriorPhoto: string[];
  profession: string;
  practiceStructure: string;
  nearbyAreasServed: string;
  specialInterests: string[];
  streetAddress: string;
  subSpecialties: string[];
  topMedicalSpecialties: string[];
  topTreatments: string[];
  treatmentAndServices: string[];
  typeOfPractice: string;
  majorAccomplishments: string;
  region: string;
  unitNumber: string;
  uniqueToCompetitors: string;
  visibleArea: string;
  website: string;
  websiteLoginLink: string;
  websitePassword: string;
  websiteUsername: string;
  colorGuide: string[];
  logo: string[];
  yourCv: string[];
}

const asObject = (value: unknown): Record<string, unknown> =>
  typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : {};

const asArray = (value: unknown): unknown[] =>
  Array.isArray(value) ? value : [];

const asString = (value: unknown) => (typeof value === "string" ? value : null);

const asNumber = (value: unknown) => {
  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);

    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
};

const asId = (value: unknown): number | string | null => {
  if (typeof value === "number" || typeof value === "string") {
    return value;
  }

  return null;
};

const asStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === "string");
};

const titleCase = (value: string) =>
  value
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");

const getDisplayName = (firstName: unknown, lastName: unknown) => {
  const parts = [asString(firstName), asString(lastName)]
    .map((part) => part?.trim() ?? "")
    .filter(Boolean);

  return parts.length > 0 ? parts.join(" ") : null;
};

const parsePracticeHours = (
  value: unknown,
): Array<{
  day: string;
  enabled: boolean;
  endMeridiem: string;
  endTime: string;
  startMeridiem: string;
  startTime: string;
}> => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      const record = asObject(item);
      const day = asString(record.day);
      const startTime = asString(record.startTime);
      const startMeridiem = asString(record.startMeridiem);
      const endTime = asString(record.endTime);
      const endMeridiem = asString(record.endMeridiem);

      if (!day || !startTime || !startMeridiem || !endTime || !endMeridiem) {
        return null;
      }

      return {
        day,
        enabled: Boolean(record.enabled),
        endMeridiem,
        endTime,
        startMeridiem,
        startTime,
      };
    })
    .filter(
      (
        item,
      ): item is {
        day: string;
        enabled: boolean;
        endMeridiem: string;
        endTime: string;
        startMeridiem: string;
        startTime: string;
      } => item !== null,
    );
};

const parseClientsResponse = (value: unknown): ClientApiItem[] => {
  const root = asObject(value);
  const nested = asObject(root.data);
  const payload = Object.keys(nested).length > 0 ? nested : root;
  const rawClients =
    asArray(payload.clients).length > 0
      ? asArray(payload.clients)
      : asArray(payload.items).length > 0
        ? asArray(payload.items)
        : asArray(root.clients).length > 0
          ? asArray(root.clients)
          : asArray(root.items);
  const clients: ClientApiItem[] = [];

  for (const item of rawClients) {
    const record = asObject(item);
    const id = record.id;

    if (typeof id !== "number" && typeof id !== "string") {
      continue;
    }

    const explicitAddress = asString(record.address);
    const addressLine1 = asString(record.addressLine1) ?? "";
    const addressLine2 = asString(record.addressLine2) ?? "";
    const buildingName = asString(record.buildingName) ?? "";
    const cityState = asString(record.cityState) ?? "";
    const country = asString(record.country) ?? "";
    const postCode = asString(record.postCode) ?? "";
    const region = asString(record.region) ?? "";
    const streetAddress = asString(record.streetAddress) ?? "";
    const unitNumber = asString(record.unitNumber) ?? "";
    const assignedToRecord = asObject(record.assignedTo);
    const assignedToUser =
      Object.keys(assignedToRecord).length > 0
        ? assignedToRecord
        : asObject(record.assignedToUser);
    const assignedUserName =
      asString(record.assignedUserName) ??
      asString(record.assignedToName) ??
      asString(record.assignedToUserName) ??
      getDisplayName(assignedToUser.firstName, assignedToUser.lastName) ??
      asString(assignedToUser.name);
    const assignedUserAvatar =
      asString(record.assignedUserAvatar) ??
      asString(record.assignedToAvatar) ??
      asString(record.assignedToUserAvatar) ??
      asString(assignedToUser.avatar) ??
      asString(assignedToUser.avatarUrl);
    const assignedUserEmail =
      asString(record.assignedUserEmail) ??
      asString(record.assignedToEmail) ??
      asString(record.assignedToUserEmail) ??
      asString(assignedToUser.email);
    const assignedTo =
      (typeof record.assignedTo === "number" ||
      typeof record.assignedTo === "string"
        ? record.assignedTo
        : null) ??
      (typeof record.assignedToUserId === "number" ||
      typeof record.assignedToUserId === "string"
        ? record.assignedToUserId
        : null) ??
      (typeof assignedToUser.id === "number" ||
      typeof assignedToUser.id === "string"
        ? assignedToUser.id
        : null);
    const seenAddressParts = new Set<string>();
    const composedAddress = [
      buildingName,
      unitNumber,
      streetAddress || addressLine1,
      addressLine2,
      cityState || region,
      postCode,
      country,
    ]
      .map((part) => part.trim())
      .filter(Boolean)
      .filter((part) => {
        const normalizedPart = part.toLowerCase();

        if (seenAddressParts.has(normalizedPart)) {
          return false;
        }

        seenAddressParts.add(normalizedPart);

        return true;
      })
      .join(", ");

    clients.push({
      address: composedAddress || explicitAddress || null,
      assignedTo,
      assignedToId:
        (typeof record.assignedToId === "number" ||
        typeof record.assignedToId === "string"
          ? record.assignedToId
          : null) ?? assignedTo,
      assignedUserAvatar,
      assignedUserEmail,
      assignedUserName,
      businessName: asString(record.businessName),
      clientName: asString(record.clientName),
      clientSuccessManagerAvatar: asString(record.clientSuccessManagerAvatar),
      clientSuccessManagerName: asString(record.clientSuccessManagerName),
      createdAt: asString(record.createdAt),
      dateJoined: asString(record.dateJoined),
      id,
      lastActivity: asString(record.lastActivity),
      niche: asString(record.niche),
      projects: asStringArray(record.projects),
      status: asString(record.status),
      updatedAt: asString(record.updatedAt),
    });
  }

  return clients;
};

const parseClientDetailsResponse = (value: unknown): ClientDetails => {
  const root = asObject(value);
  const nested = asObject(root.data);
  const payload = Object.keys(nested).length > 0 ? nested : root;
  const clientRecord = asObject(payload.client);
  const source =
    Object.keys(clientRecord).length > 0 ? clientRecord : asObject(payload);
  const id = source.id;
  const assignedToRecord = asObject(source.assignedTo);

  if (typeof id !== "number" && typeof id !== "string") {
    throw new Error("Invalid client details response.");
  }

  return {
    assignedTo:
      asId(source.assignedToId) ??
      asId(source.assignedToUserId) ??
      asId(assignedToRecord.id) ??
      asId(source.assignedTo),
    addressLine1: asString(source.addressLine1),
    addressLine2: asString(source.addressLine2),
    buildingName: asString(source.buildingName),
    businessName: asString(source.businessName),
    businessPhone: asString(source.businessPhone),
    cityState: asString(source.cityState),
    clientName: asString(source.clientName),
    country: asString(source.country),
    createdAt: asString(source.createdAt),
    createdBy:
      typeof source.createdBy === "number" ||
      typeof source.createdBy === "string"
        ? source.createdBy
        : null,
    credentials: asString(source.credentials),
    facebook: asString(source.facebook),
    gbpLink: asString(source.gbpLink),
    gmcRegistrationNumber: asString(source.gmcRegistrationNumber),
    googleAnalytics: asString(source.googleAnalytics),
    googleSearchConsole: asString(source.googleSearchConsole),
    highQualityHeadshot: asStringArray(source.highQualityHeadshot),
    id,
    instagram: asString(source.instagram),
    linkedin: asString(source.linkedin),
    majorAccomplishments: asString(source.majorAccomplishments),
    niche: asString(source.niche),
    nearbyAreasServed: asString(source.nearbyAreasServed),
    otherMedicalSpecialties: asStringArray(source.otherMedicalSpecialties),
    otherImages: asStringArray(source.otherImages),
    postCode: asString(source.postCode),
    personalEmail: asString(source.personalEmail),
    personalPhone: asString(source.personalPhone),
    profession: asString(source.profession),
    practiceStructure: asString(source.practiceStructure),
    practiceHours: parsePracticeHours(source.practiceHours),
    practiceIntroduction: asString(source.practiceIntroduction),
    practiceLocationExteriorPhoto: asStringArray(
      source.practiceLocationExteriorPhoto,
    ),
    practiceLocationInteriorPhoto: asStringArray(
      source.practiceLocationInteriorPhoto,
    ),
    practiceEmail: asString(source.practiceEmail),
    specialInterests: asStringArray(source.specialInterests),
    subSpecialties: asStringArray(source.subSpecialties),
    topMedicalSpecialties: asStringArray(source.topMedicalSpecialties),
    topTreatments: asStringArray(source.topTreatments),
    treatmentAndServices: asStringArray(source.treatmentAndServices),
    typeOfPractice: asString(source.typeOfPractice),
    region: asString(source.region),
    streetAddress: asString(source.streetAddress),
    unitNumber: asString(source.unitNumber),
    updatedAt: asString(source.updatedAt),
    uniqueToCompetitors: asString(source.uniqueToCompetitors),
    visibleArea: asString(source.visibleArea),
    website: asString(source.website),
    websiteLoginLink: asString(source.websiteLoginLink),
    websitePassword: asString(source.websitePassword),
    websiteUsername: asString(source.websiteUsername),
    colorGuide: asStringArray(source.colorGuide),
    conditionsTreated: asStringArray(source.conditionsTreated),
    logo: asStringArray(source.logo),
    yourCv: asStringArray(source.yourCv),
  };
};

const parseGbpGallery = (
  value: unknown,
): Array<{ id: string; imageUrl?: string | null; title: string }> => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item, index) => {
      if (typeof item === "string") {
        return {
          id: `gallery-${index}`,
          imageUrl: item,
          title: `Photo ${index + 1}`,
        };
      }

      const record = asObject(item);
      const imageUrl =
        asString(record.imageUrl) ??
        asString(record.url) ??
        asString(record.photoUrl) ??
        asString(record.src) ??
        asString(record.thumbnail) ??
        asString(record.serpapi_thumbnail);

      return {
        id: asString(record.id) ?? `gallery-${index}`,
        imageUrl,
        title:
          asString(record.title) ??
          asString(record.name) ??
          `Photo ${index + 1}`,
      };
    })
    .filter((item) => Boolean(item.id));
};

const parseOpeningHours = (
  value: unknown,
): Array<{
  closeTime: string | null;
  day: string;
  open: boolean;
  openTime: string | null;
}> => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      const record = asObject(item);
      const day = asString(record.day);

      if (day) {
        return {
          closeTime:
            asString(record.closeTime) ??
            asString(record.endTime) ??
            asString(record.closesAt),
          day,
          open:
            typeof record.open === "boolean"
              ? record.open
              : typeof record.enabled === "boolean"
                ? record.enabled
                : Boolean(record.isOpen),
          openTime:
            asString(record.openTime) ??
            asString(record.startTime) ??
            asString(record.opensAt),
        };
      }

      const [rawDay, rawHours] = Object.entries(record)[0] ?? [];

      if (typeof rawDay !== "string" || typeof rawHours !== "string") {
        return null;
      }

      const normalizedHours = rawHours.trim();
      const isClosed = normalizedHours.toLowerCase() === "closed";
      const [openTimeRaw, closeTimeRaw] = normalizedHours
        .split("–")
        .map((part) => part.trim());

      return {
        closeTime: isClosed ? null : (closeTimeRaw ?? null),
        day: titleCase(rawDay),
        open: !isClosed,
        openTime: isClosed ? null : (openTimeRaw ?? null),
      };
    })
    .filter(
      (
        item,
      ): item is {
        closeTime: string | null;
        day: string;
        open: boolean;
        openTime: string | null;
      } => item !== null,
    );
};

const parseSpecialHours = (
  value: unknown,
): Array<{ date: string; key: string; title: string }> => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item, index) => {
      const record = asObject(item);
      const title = asString(record.title) ?? asString(record.name);
      const date = asString(record.date);

      if (!title || !date) {
        return null;
      }

      return {
        date,
        key: asString(record.key) ?? `special-hour-${index}`,
        title,
      };
    })
    .filter(
      (
        item,
      ): item is {
        date: string;
        key: string;
        title: string;
      } => item !== null,
    );
};

const parseAttributeGroups = (
  value: unknown,
): Array<{ items: string[]; title: string }> => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      const record = asObject(item);
      const directTitle = asString(record.title);
      const directItems = asStringArray(record.items);

      if (directTitle) {
        return {
          items: directItems,
          title: directTitle,
        };
      }

      const [extensionTitle, extensionItems] = Object.entries(record)[0] ?? [];

      if (
        typeof extensionTitle !== "string" ||
        !Array.isArray(extensionItems)
      ) {
        return null;
      }

      if (extensionTitle === "service_options") {
        return null;
      }

      return {
        items: extensionItems.filter(
          (entry): entry is string => typeof entry === "string",
        ),
        title: titleCase(extensionTitle),
      };
    })
    .filter(
      (item): item is { items: string[]; title: string } => item !== null,
    );
};

const parseRatingSummary = (value: unknown): ClientGbpRatingSummaryItem[] => {
  const counts = new Map<number, number>();
  const setCount = (stars: unknown, amount: unknown) => {
    const parsedStars = Number(stars);
    const parsedAmount = Number(amount);

    if (
      Number.isInteger(parsedStars) &&
      parsedStars >= 1 &&
      parsedStars <= 5 &&
      Number.isFinite(parsedAmount) &&
      parsedAmount >= 0
    ) {
      counts.set(parsedStars, parsedAmount);
    }
  };

  if (Array.isArray(value)) {
    value.forEach((item) => {
      const record = asObject(item);

      setCount(
        record.stars ?? record.rating ?? record.star,
        record.amount ?? record.count ?? record.reviews,
      );
    });
  } else {
    const record = asObject(value);

    Object.entries(record).forEach(([key, amount]) => {
      const keyMatch = key.match(/[1-5]/);

      if (keyMatch) {
        setCount(Number(keyMatch[0]), amount);
      }
    });
  }

  return [5, 4, 3, 2, 1].map((stars) => ({
    amount: counts.get(stars) ?? 0,
    stars,
  }));
};

const parseClientGbpDetailsResponse = (value: unknown): ClientGbpDetails => {
  const root = asObject(value);
  const nested = asObject(root.data);
  const payload = Object.keys(nested).length > 0 ? nested : root;
  const gbpDetailsRecord =
    asObject(payload.gbpDetails).id ||
    Object.keys(asObject(payload.gbpDetails)).length > 0
      ? asObject(payload.gbpDetails)
      : {};
  const gbpRecord =
    Object.keys(gbpDetailsRecord).length > 0
      ? gbpDetailsRecord
      : Object.keys(asObject(payload.gbp)).length > 0
        ? asObject(payload.gbp)
        : Object.keys(asObject(payload.details)).length > 0
          ? asObject(payload.details)
          : payload;
  const payloadCoordinates = asObject(payload.coordinates);
  const detailsRecord = asObject(payload.details);
  const detailsCoordinates = asObject(detailsRecord.coordinates);
  const gpsCoordinates = asObject(detailsRecord.gpsCoordinates);
  const geometry = asObject(gbpRecord.geometry);
  const geometryLocation = asObject(geometry.location);
  const directCoordinates = asObject(gbpRecord.coordinates);
  const directLocation = asObject(gbpRecord.location);
  const rawRecord = asObject(payload.raw);
  const placeResults = asObject(rawRecord.place_results);
  const parsedAttributeGroups = parseAttributeGroups(gbpRecord.attributeGroups);
  const parsedExtensions = parseAttributeGroups(placeResults.extensions);
  const parsedUnsupportedExtensions = parseAttributeGroups(
    placeResults.unsupported_extensions,
  );
  const placeTypes = asStringArray(placeResults.type);
  const explicitSecondaryCategories =
    asStringArray(gbpRecord.secondaryCategories).length > 0
      ? asStringArray(gbpRecord.secondaryCategories)
      : asStringArray(gbpRecord.categories);
  const resolvedPrimaryCategory =
    asString(gbpRecord.primaryCategory) ??
    asString(gbpRecord.primaryCategoryName) ??
    asString(gbpRecord.category) ??
    placeTypes[0] ??
    null;
  const resolvedSecondaryCategories =
    explicitSecondaryCategories.length > 0
      ? explicitSecondaryCategories
      : placeTypes.length > 1
        ? placeTypes.slice(1)
        : [];
  const reviewCountNumber =
    asNumber(gbpRecord.reviewCount) ??
    asNumber(gbpRecord.userRatingsTotal) ??
    asNumber(gbpRecord.totalReviews);

  return {
    attributeGroups:
      parsedAttributeGroups.length > 0
        ? parsedAttributeGroups
        : [...parsedExtensions, ...parsedUnsupportedExtensions],
    bookingsLink:
      asString(gbpRecord.bookingsLink) ?? asString(gbpRecord.bookingLink),
    businessDescription:
      asString(gbpRecord.businessDescription) ??
      asString(gbpRecord.description),
    businessLocation:
      asString(gbpRecord.businessLocation) ??
      asString(gbpRecord.formattedAddress) ??
      asString(gbpRecord.address),
    businessName:
      asString(gbpRecord.businessName) ??
      asString(gbpRecord.name) ??
      asString(gbpRecord.title) ??
      asString(detailsRecord.title),
    category:
      asString(gbpRecord.category) ??
      asString(gbpRecord.primaryCategory) ??
      asString(gbpRecord.primaryCategoryName) ??
      placeTypes[0] ??
      null,
    completionScore:
      asString(gbpRecord.completionScore) ??
      asString(gbpRecord.completenessScore) ??
      (asNumber(gbpRecord.completionScore) !== null
        ? String(asNumber(gbpRecord.completionScore))
        : asNumber(gbpRecord.completenessScore) !== null
          ? String(asNumber(gbpRecord.completenessScore))
          : null),
    email: asString(gbpRecord.email),
    gallery:
      parseGbpGallery(gbpRecord.gallery).length > 0
        ? parseGbpGallery(gbpRecord.gallery)
        : parseGbpGallery(gbpRecord.photos).length > 0
          ? parseGbpGallery(gbpRecord.photos)
          : parseGbpGallery(gbpRecord.images).length > 0
            ? parseGbpGallery(gbpRecord.images)
            : parseGbpGallery(placeResults.images).length > 0
              ? parseGbpGallery(placeResults.images)
              : parseGbpGallery(
                  placeResults.thumbnail ? [placeResults.thumbnail] : [],
                ),
    openingDate: asString(gbpRecord.openingDate),
    openingHours:
      parseOpeningHours(gbpRecord.openingHours).length > 0
        ? parseOpeningHours(gbpRecord.openingHours)
        : parseOpeningHours(gbpRecord.hours).length > 0
          ? parseOpeningHours(gbpRecord.hours)
          : parseOpeningHours(placeResults.hours),
    phone:
      asString(gbpRecord.phone) ??
      asString(gbpRecord.phoneNumber) ??
      asString(gbpRecord.formattedPhoneNumber),
    primaryCategory: resolvedPrimaryCategory,
    rating:
      asString(gbpRecord.rating) ??
      (asNumber(gbpRecord.rating) !== null
        ? String(asNumber(gbpRecord.rating))
        : null),
    ratingSummary: parseRatingSummary(
      placeResults.rating_summary ??
        rawRecord.rating_summary ??
        gbpRecord.ratingSummary ??
        gbpRecord.rating_summary,
    ),
    reviewCount:
      reviewCountNumber !== null ? `(${reviewCountNumber} reviews)` : null,
    secondaryCategories: resolvedSecondaryCategories,
    serviceAreas: asStringArray(gbpRecord.serviceAreas),
    socialProfiles: {
      facebook: asString(gbpRecord.facebook),
      instagram: asString(gbpRecord.instagram),
      twitterX:
        asString(gbpRecord.twitterX) ??
        asString(gbpRecord.twitter) ??
        asString(gbpRecord.x),
    },
    specialHours:
      parseSpecialHours(gbpRecord.specialHours).length > 0
        ? parseSpecialHours(gbpRecord.specialHours)
        : parseSpecialHours(gbpRecord.holidayHours),
    website: asString(gbpRecord.website),
    latitude:
      asNumber(gbpRecord.latitude) ??
      asNumber(gbpRecord.lat) ??
      asNumber(payloadCoordinates.latitude) ??
      asNumber(payloadCoordinates.lat) ??
      asNumber(detailsCoordinates.latitude) ??
      asNumber(detailsCoordinates.lat) ??
      asNumber(gpsCoordinates.latitude) ??
      asNumber(gpsCoordinates.lat) ??
      asNumber(directCoordinates.latitude) ??
      asNumber(directCoordinates.lat) ??
      asNumber(directLocation.latitude) ??
      asNumber(directLocation.lat) ??
      asNumber(geometryLocation.latitude) ??
      asNumber(geometryLocation.lat),
    longitude:
      asNumber(gbpRecord.longitude) ??
      asNumber(gbpRecord.lng) ??
      asNumber(gbpRecord.lon) ??
      asNumber(payloadCoordinates.longitude) ??
      asNumber(payloadCoordinates.lng) ??
      asNumber(payloadCoordinates.lon) ??
      asNumber(detailsCoordinates.longitude) ??
      asNumber(detailsCoordinates.lng) ??
      asNumber(detailsCoordinates.lon) ??
      asNumber(gpsCoordinates.longitude) ??
      asNumber(gpsCoordinates.lng) ??
      asNumber(gpsCoordinates.lon) ??
      asNumber(directCoordinates.longitude) ??
      asNumber(directCoordinates.lng) ??
      asNumber(directCoordinates.lon) ??
      asNumber(directLocation.longitude) ??
      asNumber(directLocation.lng) ??
      asNumber(directLocation.lon) ??
      asNumber(geometryLocation.longitude) ??
      asNumber(geometryLocation.lng) ??
      asNumber(geometryLocation.lon),
  };
};

const parseReviewText = (value: unknown) => {
  const direct = asString(value);

  if (direct !== null) {
    return direct;
  }

  const record = asObject(value);

  return asString(record.original) ?? asString(record.value) ?? null;
};

const parseReviewImages = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      const record = asObject(item);

      return (
        asString(item) ??
        asString(record.thumbnail) ??
        asString(record.link) ??
        asString(record.image) ??
        asString(record.url)
      );
    })
    .filter((item): item is string => Boolean(item));
};

const parseClientGbpReviewsResponse = (
  value: unknown,
): ClientGbpReviewsResponse => {
  const root = asObject(value);
  const nested = asObject(root.data);
  const payload = Object.keys(nested).length > 0 ? nested : root;
  const raw = asObject(payload.raw);
  const pagination = asObject(raw.serpapi_pagination);
  const drafts = asArray(payload.drafts).map((item) => {
    const record = asObject(item);

    return {
      clientId: asId(record.clientId) ?? "",
      createdAt: asString(record.createdAt),
      createdBy: asId(record.createdBy),
      id: asId(record.id) ?? "",
      rating: asNumber(record.rating),
      replyText: asString(record.replyText) ?? "",
      reviewId: asString(record.reviewId) ?? "",
      reviewerName: asString(record.reviewerName),
      reviewText: asString(record.reviewText),
      status: asString(record.status) ?? "DRAFT",
      updatedAt: asString(record.updatedAt),
      updatedBy: asId(record.updatedBy),
    };
  });
  const reviews = asArray(raw.reviews).map((item, index) => {
    const record = asObject(item);
    const user = asObject(record.user);
    const response = asObject(record.response);
    const rating = asNumber(record.rating);

    return {
      date:
        asString(record.iso_date) ??
        asString(record.date) ??
        asString(record.relative_time_description),
      id:
        asString(record.review_id) ??
        asString(record.id) ??
        `review-${index + 1}`,
      images: parseReviewImages(record.images),
      likes: asNumber(record.likes) ?? 0,
      name: asString(user.name) ?? asString(record.name) ?? "Google User",
      rating: rating ?? 0,
      reply:
        asString(response.snippet) ??
        parseReviewText(response.extracted_snippet) ??
        null,
      review:
        asString(record.snippet) ??
        parseReviewText(record.extracted_snippet) ??
        "-",
      userAvatar:
        asString(user.thumbnail) ??
        asString(user.avatar) ??
        asString(record.user_thumbnail),
    };
  });

  return {
    drafts,
    nextPageToken: asString(pagination.next_page_token),
    reviews,
    total: reviews.length,
  };
};

const parseClientGbpReviewDraftResponse = (
  value: unknown,
): ClientGbpReviewDraft => {
  const root = asObject(value);
  const nested = asObject(root.data);
  const payload = Object.keys(nested).length > 0 ? nested : root;
  const draft = asObject(payload.draft);
  const source = Object.keys(draft).length > 0 ? draft : payload;

  return {
    clientId: asId(source.clientId) ?? "",
    createdAt: asString(source.createdAt),
    createdBy: asId(source.createdBy),
    id: asId(source.id) ?? "",
    rating: asNumber(source.rating),
    replyText: asString(source.replyText) ?? "",
    reviewId: asString(source.reviewId) ?? "",
    reviewerName: asString(source.reviewerName),
    reviewText: asString(source.reviewText),
    status: asString(source.status) ?? "DRAFT",
    updatedAt: asString(source.updatedAt),
    updatedBy: asId(source.updatedBy),
  };
};

const parseClientGbpPosting = (value: unknown): ClientGbpPosting | null => {
  const record = asObject(value);
  const id = asId(record.id);
  const creator = asObject(record.creator);
  const assignee = asObject(record.assignee);

  if (id === null) {
    return null;
  }

  return {
    assignee:
      Object.keys(assignee).length > 0
        ? {
            avatar: asString(assignee.avatar),
            email: asString(assignee.email),
            id: asId(assignee.id),
            name: asString(assignee.name),
          }
        : null,
    assigneeId: asId(record.assigneeId),
    audience: asString(record.audience),
    buttonType: asString(record.buttonType),
    clientId: asId(record.clientId) ?? "",
    contentType: asString(record.contentType) ?? "Update",
    createdAt: asString(record.createdAt),
    createdBy: asId(record.createdBy),
    creator:
      Object.keys(creator).length > 0
        ? {
            avatar: asString(creator.avatar),
            email: asString(creator.email),
            id: asId(creator.id),
            name: asString(creator.name),
          }
        : null,
    description: asString(record.description),
    id,
    images: asStringArray(record.images),
    keyword: asString(record.keyword) ?? "",
    language: asString(record.language) ?? "English",
    languageCode: asString(record.languageCode) ?? "en",
    liveLink: asString(record.liveLink),
    postContent: asString(record.postContent),
    publishedAt: asString(record.publishedAt),
    scheduledAt: asString(record.scheduledAt),
    status: asString(record.status) ?? "Draft",
    updatedAt: asString(record.updatedAt),
  };
};

const parseClientGbpPostingComment = (
  value: unknown,
): ClientGbpPostingComment | null => {
  const record = asObject(value);
  const id = asId(record.id);
  const author = asObject(record.author);

  if (id === null) {
    return null;
  }

  return {
    author:
      Object.keys(author).length > 0
        ? {
            avatar: asString(author.avatar),
            email: asString(author.email),
            firstName: asString(author.firstName),
            id: asId(author.id),
            lastName: asString(author.lastName),
          }
        : null,
    comment: asString(record.comment) ?? "",
    createdAt: asString(record.createdAt),
    createdBy: asId(record.createdBy),
    id,
    postingId: asId(record.postingId) ?? "",
    updatedAt: asString(record.updatedAt),
  };
};

const parseClientGbpPostingCommentsResponse = (
  value: unknown,
): ClientGbpPostingCommentsResponse => {
  const root = asObject(value);
  const nested = asObject(root.data);
  const payload = Object.keys(nested).length > 0 ? nested : root;
  const comments = asArray(payload.comments)
    .map(parseClientGbpPostingComment)
    .filter((comment): comment is ClientGbpPostingComment => comment !== null);

  return {
    comments,
    total: asNumber(payload.total) ?? comments.length,
  };
};

const parseClientGbpPostingCommentResponse = (
  value: unknown,
): ClientGbpPostingComment => {
  const root = asObject(value);
  const nested = asObject(root.data);
  const payload = Object.keys(nested).length > 0 ? nested : root;
  const comment = parseClientGbpPostingComment(
    Object.keys(asObject(payload.comment)).length > 0
      ? payload.comment
      : payload,
  );

  if (!comment) {
    throw new Error("Invalid GBP posting comment response.");
  }

  return comment;
};

const parseClientGbpPostingsResponse = (
  value: unknown,
): ClientGbpPostingsResponse => {
  const root = asObject(value);
  const nested = asObject(root.data);
  const payload = Object.keys(nested).length > 0 ? nested : root;
  const postings = asArray(payload.postings)
    .map(parseClientGbpPosting)
    .filter((posting): posting is ClientGbpPosting => posting !== null);

  return {
    postings,
    total: asNumber(payload.total) ?? postings.length,
  };
};

const parseGenerateClientGbpPostingContentResponse = (
  value: unknown,
): GenerateClientGbpPostingContentResponse => {
  const root = asObject(value);
  const nested = asObject(root.data);
  const payload = Object.keys(nested).length > 0 ? nested : root;
  const generation = asObject(payload.generation);

  return {
    content: asString(payload.content) ?? "",
    generation:
      Object.keys(generation).length > 0
        ? {
            keyword: asString(generation.keyword) ?? "",
            logId: asId(generation.logId),
            postingId: asId(generation.postingId) ?? "",
            promptId: asString(generation.promptId) ?? "",
            promptType: asString(generation.promptType) ?? "",
            provider: asString(generation.provider) ?? "",
            taskId: asString(generation.taskId),
          }
        : null,
  };
};

const parseClientProjectResponse = (value: unknown): ClientProject => {
  const root = asObject(value);
  const nested = asObject(root.data);
  const payload = Object.keys(nested).length > 0 ? nested : root;
  const projectRecord = asObject(payload.project);
  const source =
    Object.keys(projectRecord).length > 0 ? projectRecord : asObject(payload);
  const id = source.id;

  if (typeof id !== "number" && typeof id !== "string") {
    throw new Error("Invalid client project response.");
  }

  const clientSuccessManager = asObject(source.clientSuccessManager);
  const accountManager = asObject(source.accountManager);

  return {
    accountManager: {
      avatar:
        asString(accountManager.avatar) ?? asString(accountManager.avatarUrl),
      firstName: asString(accountManager.firstName),
      id: asId(accountManager.id),
      lastName: asString(accountManager.lastName),
    },
    accountManagerId: asId(source.accountManagerId),
    clientId: asId(source.clientId),
    clientSuccessManager: {
      avatar:
        asString(clientSuccessManager.avatar) ??
        asString(clientSuccessManager.avatarUrl),
      firstName: asString(clientSuccessManager.firstName),
      id: asId(clientSuccessManager.id),
      lastName: asString(clientSuccessManager.lastName),
    },
    clientSuccessManagerId: asId(source.clientSuccessManagerId),
    createdAt: asString(source.createdAt),
    createdBy: asId(source.createdBy),
    dueDate: asString(source.dueDate),
    id,
    phase: asString(source.phase),
    progress: asString(source.progress),
    project: asString(source.project),
    startDate: asString(source.startDate),
    updatedAt: asString(source.updatedAt),
  };
};

const parseProjectTaskResponse = (value: unknown): ProjectTask => {
  const root = asObject(value);
  const nested = asObject(root.data);
  const payload = Object.keys(nested).length > 0 ? nested : root;
  const taskRecord = asObject(payload.task);
  const source =
    Object.keys(taskRecord).length > 0 ? taskRecord : asObject(payload);
  const id = source.id;

  if (typeof id !== "number" && typeof id !== "string") {
    throw new Error("Invalid task response.");
  }

  const assignedToRecord = asObject(source.assignedTo);

  return {
    assignedTo: {
      avatar:
        asString(assignedToRecord.avatar) ??
        asString(assignedToRecord.avatarUrl),
      firstName: asString(assignedToRecord.firstName),
      id: asId(assignedToRecord.id),
      lastName: asString(assignedToRecord.lastName),
    },
    assignedToId: asId(source.assignedToId),
    createdAt: asString(source.createdAt),
    createdBy: asId(source.createdBy),
    description: asString(source.description),
    dueDate: asString(source.dueDate),
    id,
    parentTaskId:
      asId(source.parentTaskId) ??
      asId(source.parentTaskID) ??
      asId(source.parent_task_id) ??
      asId(source.parentId),
    priority: asString(source.priority),
    projectId: asId(source.projectId),
    projectType: asString(source.projectType),
    startDate: asString(source.startDate),
    status: asString(source.status),
    task: asString(source.task),
    taskName: asString(source.taskName),
    updatedAt: asString(source.updatedAt),
  };
};

const parseProjectTasksResponse = (value: unknown): ProjectTasksResponse => {
  const root = asObject(value);
  const nested = asObject(root.data);
  const payload = Object.keys(nested).length > 0 ? nested : root;
  const rawTasks =
    asArray(payload.tasks).length > 0
      ? asArray(payload.tasks)
      : asArray(payload.items).length > 0
        ? asArray(payload.items)
        : asArray(root.tasks).length > 0
          ? asArray(root.tasks)
          : asArray(root.items);
  const rawProjects =
    asArray(payload.projects).length > 0
      ? asArray(payload.projects)
      : asArray(root.projects);
  const flattenedProjectTasks = rawProjects.flatMap((projectItem) => {
    const project = asObject(projectItem);
    const projectTasks = asArray(project.tasks);
    const projectId = asId(project.projectId) ?? asId(project.id);
    const projectName = asString(project.projectName);

    return projectTasks.map((taskItem) => {
      const task = asObject(taskItem);

      return {
        ...task,
        projectId: asId(task.projectId) ?? projectId,
        projectType: asString(task.projectType) ?? projectName,
      };
    });
  });
  const sourceTasks = rawTasks.length > 0 ? rawTasks : flattenedProjectTasks;

  const tasks = sourceTasks
    .map((item) => {
      try {
        return parseProjectTaskResponse({ task: item });
      } catch {
        return null;
      }
    })
    .filter((item): item is ProjectTask => item !== null);

  return { tasks };
};

const parseTaskCommentResponse = (value: unknown): TaskComment => {
  const root = asObject(value);
  const nested = asObject(root.data);
  const payload = Object.keys(nested).length > 0 ? nested : root;
  const commentRecord = asObject(payload.comment);
  const source =
    Object.keys(commentRecord).length > 0 ? commentRecord : asObject(payload);
  const id = source.id;

  if (typeof id !== "number" && typeof id !== "string") {
    throw new Error("Invalid task comment response.");
  }

  const authorRecord = asObject(source.author);

  return {
    author:
      Object.keys(authorRecord).length > 0
        ? {
            avatar:
              asString(authorRecord.avatar) ?? asString(authorRecord.avatarUrl),
            firstName: asString(authorRecord.firstName),
            id: asId(authorRecord.id),
            lastName: asString(authorRecord.lastName),
          }
        : null,
    comment: asString(source.comment) ?? "",
    createdAt: asString(source.createdAt),
    createdBy: asId(source.createdBy),
    id,
    taskId: asId(source.taskId),
    updatedAt: asString(source.updatedAt),
  };
};

const parseTaskCommentsResponse = (value: unknown): TaskCommentsResponse => {
  const root = asObject(value);
  const nested = asObject(root.data);
  const payload = Object.keys(nested).length > 0 ? nested : root;
  const rawComments =
    asArray(payload.comments).length > 0
      ? asArray(payload.comments)
      : asArray(root.comments);

  return {
    comments: rawComments
      .map((item) => {
        try {
          return parseTaskCommentResponse({ comment: item });
        } catch {
          return null;
        }
      })
      .filter((item): item is TaskComment => item !== null),
    total:
      asNumber(payload.total) ?? asNumber(root.total) ?? rawComments.length,
  };
};

const parseProjectCommentResponse = (value: unknown): ProjectComment => {
  const root = asObject(value);
  const nested = asObject(root.data);
  const payload = Object.keys(nested).length > 0 ? nested : root;
  const commentRecord = asObject(payload.comment);
  const source =
    Object.keys(commentRecord).length > 0 ? commentRecord : asObject(payload);
  const id = source.id;

  if (typeof id !== "number" && typeof id !== "string") {
    throw new Error("Invalid project comment response.");
  }

  const authorRecord = asObject(source.author);

  return {
    author:
      Object.keys(authorRecord).length > 0
        ? {
            avatar:
              asString(authorRecord.avatar) ?? asString(authorRecord.avatarUrl),
            firstName: asString(authorRecord.firstName),
            id: asId(authorRecord.id),
            lastName: asString(authorRecord.lastName),
          }
        : null,
    comment: asString(source.comment) ?? "",
    createdAt: asString(source.createdAt),
    createdBy: asId(source.createdBy),
    id,
    projectId: asId(source.projectId),
    updatedAt: asString(source.updatedAt),
  };
};

const parseProjectCommentsResponse = (
  value: unknown,
): ProjectCommentsResponse => {
  const root = asObject(value);
  const nested = asObject(root.data);
  const payload = Object.keys(nested).length > 0 ? nested : root;
  const rawComments =
    asArray(payload.comments).length > 0
      ? asArray(payload.comments)
      : asArray(root.comments);

  return {
    comments: rawComments
      .map((item) => {
        try {
          return parseProjectCommentResponse({ comment: item });
        } catch {
          return null;
        }
      })
      .filter((item): item is ProjectComment => item !== null),
    total:
      asNumber(payload.total) ?? asNumber(root.total) ?? rawComments.length,
  };
};

const parseClientCitationResponse = (value: unknown): ClientCitation => {
  const root = asObject(value);
  const nested = asObject(root.data);
  const payload = Object.keys(nested).length > 0 ? nested : root;
  const citationRecord = asObject(payload.citation);
  const source =
    Object.keys(citationRecord).length > 0 ? citationRecord : asObject(payload);
  const id = source.id;

  if (typeof id !== "number" && typeof id !== "string") {
    throw new Error("Invalid citation response.");
  }

  return {
    citationDatabaseEntryId: asString(source.citationDatabaseEntryId),
    clientId: asId(source.clientId) ?? "",
    createdAt: asString(source.createdAt),
    createdBy: asId(source.createdBy),
    directoryName: asString(source.directoryName) ?? "",
    id,
    notes: asString(source.notes),
    password: asString(source.password),
    profileUrl: asString(source.profileUrl),
    source: asString(source.source),
    status: asString(source.status),
    type: asString(source.type),
    updatedAt: asString(source.updatedAt),
    username: asString(source.username),
    verificationStatus: parseClientCitationVerificationStatus(
      source.verificationStatus,
    ),
  };
};

const isClientCitationVerificationValue = (
  value: string | null,
): value is ClientCitationVerificationValue =>
  value === "Match" || value === "Incorrect" || value === "Not Synced";

const parseClientCitationVerificationValue = (
  value: unknown,
): ClientCitationVerificationValue => {
  const stringValue = asString(value);

  return isClientCitationVerificationValue(stringValue)
    ? stringValue
    : "Not Synced";
};

const parseClientCitationVerificationStatus = (
  value: unknown,
): ClientCitationVerificationStatus => {
  const source = asObject(value);

  return {
    address: parseClientCitationVerificationValue(source.address),
    businessName: parseClientCitationVerificationValue(source.businessName),
    phone: parseClientCitationVerificationValue(source.phone),
    zipCode: parseClientCitationVerificationValue(source.zipCode),
  };
};

const parseClientCitationsResponse = (
  value: unknown,
): ClientCitationsResponse => {
  const root = asObject(value);
  const nested = asObject(root.data);
  const payload = Object.keys(nested).length > 0 ? nested : root;
  const rawCitations =
    asArray(payload.citations).length > 0
      ? asArray(payload.citations)
      : asArray(root.citations);

  return {
    citations: rawCitations.map((item) =>
      parseClientCitationResponse({ citation: item }),
    ),
    total:
      asNumber(payload.total) ?? asNumber(root.total) ?? rawCitations.length,
  };
};

const parseClientProjectsResponse = (
  value: unknown,
): ClientProjectsResponse => {
  const root = asObject(value);
  const nested = asObject(root.data);
  const payload = Object.keys(nested).length > 0 ? nested : root;
  const paginationRecord = asObject(payload.pagination);
  const rawProjects = asArray(payload.projects);

  const projects = rawProjects
    .map((item) => {
      try {
        return parseClientProjectResponse({ project: item });
      } catch {
        return null;
      }
    })
    .filter((item): item is ClientProject => item !== null);

  const page =
    typeof paginationRecord.page === "number" ? paginationRecord.page : 1;
  const limit =
    typeof paginationRecord.limit === "number" ? paginationRecord.limit : 10;
  const total =
    typeof paginationRecord.total === "number" ? paginationRecord.total : 0;
  const totalPages =
    typeof paginationRecord.totalPages === "number"
      ? paginationRecord.totalPages
      : 1;

  return {
    pagination: {
      hasNext: Boolean(paginationRecord.hasNext),
      hasPrev: Boolean(paginationRecord.hasPrev),
      limit,
      nextPage:
        typeof paginationRecord.nextPage === "number"
          ? paginationRecord.nextPage
          : null,
      page,
      prevPage:
        typeof paginationRecord.prevPage === "number"
          ? paginationRecord.prevPage
          : null,
      total,
      totalPages,
    },
    projects,
  };
};

export const clientsApi = {
  deleteClient: async (accessToken: string, clientId: string | number) => {
    try {
      const response = await clientsApiClient.delete(
        `/api/v1/clients/${clientId}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        try {
          const response = await clientsApiClient.patch(
            `/api/v1/clients/${clientId}/status`,
            {
              status: "Deleted",
            },
            {
              headers: {
                Authorization: `Bearer ${accessToken}`,
              },
            },
          );

          return {
            ...response.data,
            softDeleted: true,
          };
        } catch (statusError) {
          if (
            axios.isAxiosError(statusError) &&
            statusError.response?.status === 404
          ) {
            const fallbackResponse = await clientsApiClient.patch(
              `/api/v1/clients/${clientId}`,
              {
                status: "Deleted",
              },
              {
                headers: {
                  Authorization: `Bearer ${accessToken}`,
                },
              },
            );

            return {
              ...fallbackResponse.data,
              softDeleted: true,
            };
          }

          throw new Error(parseError(statusError));
        }
      }

      throw new Error(parseError(error));
    }
  },
  updateClientStatus: async (
    accessToken: string,
    clientId: string | number,
    status: "Active" | "Inactive",
  ) => {
    try {
      const response = await clientsApiClient.patch(
        `/api/v1/clients/${clientId}/status`,
        {
          status,
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        try {
          const fallbackResponse = await clientsApiClient.patch(
            `/api/v1/clients/${clientId}`,
            {
              status,
            },
            {
              headers: {
                Authorization: `Bearer ${accessToken}`,
              },
            },
          );

          return fallbackResponse.data;
        } catch (fallbackError) {
          throw new Error(parseError(fallbackError));
        }
      }

      throw new Error(parseError(error));
    }
  },
  getClientGbpDetails: async (
    accessToken: string,
    clientId: string | number,
  ) => {
    try {
      const response = await clientsApiClient.get<unknown>(
        `/api/v1/clients/${clientId}/gbp-details`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      return parseClientGbpDetailsResponse(response.data);
    } catch (error) {
      throw new Error(parseError(error));
    }
  },
  getClientGbpReviews: async (
    accessToken: string,
    clientId: string | number,
    params?: {
      nextPageToken?: string | null;
      sortBy?: string | null;
    },
  ) => {
    try {
      const response = await clientsApiClient.get<unknown>(
        `/api/v1/clients/${clientId}/reviews`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          params: {
            nextPageToken: params?.nextPageToken || undefined,
            sortBy: params?.sortBy || undefined,
          },
        },
      );

      return parseClientGbpReviewsResponse(response.data);
    } catch (error) {
      throw new Error(parseError(error));
    }
  },
  saveClientGbpReviewDraft: async (
    accessToken: string,
    clientId: string | number,
    reviewId: string,
    payload: SaveClientGbpReviewDraftRequestBody,
  ) => {
    try {
      const response = await clientsApiClient.put<unknown>(
        `/api/v1/clients/${clientId}/reviews/${encodeURIComponent(reviewId)}/draft`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      return parseClientGbpReviewDraftResponse(response.data);
    } catch (error) {
      throw new Error(parseError(error));
    }
  },
  listClientGbpPostings: async (
    accessToken: string,
    clientId: string | number,
  ) => {
    try {
      const response = await clientsApiClient.get<unknown>(
        `/api/v1/clients/${clientId}/gbp-postings`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      return parseClientGbpPostingsResponse(response.data);
    } catch (error) {
      throw new Error(parseError(error));
    }
  },
  createClientGbpPostings: async (
    accessToken: string,
    clientId: string | number,
    payload: CreateClientGbpPostingsRequestBody,
  ) => {
    try {
      const response = await clientsApiClient.post<unknown>(
        `/api/v1/clients/${clientId}/gbp-postings`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      return parseClientGbpPostingsResponse(response.data);
    } catch (error) {
      throw new Error(parseError(error));
    }
  },
  generateClientGbpPostings: async (
    accessToken: string,
    clientId: string | number,
    payload: CreateClientGbpPostingsRequestBody,
  ) => {
    try {
      const response = await clientsApiClient.post<unknown>(
        `/api/v1/clients/${clientId}/gbp-postings/generate-from-keywords`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      return parseClientGbpPostingsResponse(response.data);
    } catch (error) {
      throw new Error(parseError(error));
    }
  },
  generateClientGbpPostingContent: async (
    accessToken: string,
    clientId: string | number,
    postingId: string | number,
    payload: Partial<{
      audience: string | null;
      contentType: string;
      keyword: string;
      language: string;
      languageCode: string;
    }>,
  ) => {
    try {
      const response = await clientsApiClient.post<unknown>(
        `/api/v1/clients/${clientId}/gbp-postings/${postingId}/generate-content`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      return parseGenerateClientGbpPostingContentResponse(response.data);
    } catch (error) {
      throw new Error(parseError(error));
    }
  },
  updateClientGbpPosting: async (
    accessToken: string,
    clientId: string | number,
    postingId: string | number,
    payload: Partial<{
      assigneeId: number | string | null;
      buttonType: string | null;
      contentType: string;
      description: string | null;
      images: string[];
      liveLink: string | null;
      postContent: string | null;
      status: string;
    }>,
  ) => {
    try {
      const response = await clientsApiClient.patch<unknown>(
        `/api/v1/clients/${clientId}/gbp-postings/${postingId}`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );
      const root = asObject(response.data);
      const nested = asObject(root.data);
      const payloadRecord = Object.keys(nested).length > 0 ? nested : root;
      const posting = parseClientGbpPosting(payloadRecord.posting);

      if (!posting) {
        throw new Error("Invalid GBP posting response.");
      }

      return posting;
    } catch (error) {
      throw new Error(parseError(error));
    }
  },
  deleteClientGbpPosting: async (
    accessToken: string,
    clientId: string | number,
    postingId: string | number,
  ) => {
    try {
      await clientsApiClient.delete(
        `/api/v1/clients/${clientId}/gbp-postings/${postingId}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );
    } catch (error) {
      throw new Error(parseError(error));
    }
  },
  getClientGbpPostingComments: async (
    accessToken: string,
    clientId: string | number,
    postingId: string | number,
  ) => {
    try {
      const response = await clientsApiClient.get<unknown>(
        `/api/v1/clients/${clientId}/gbp-postings/${postingId}/comments`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      return parseClientGbpPostingCommentsResponse(response.data);
    } catch (error) {
      throw new Error(parseError(error));
    }
  },
  createClientGbpPostingComment: async (
    accessToken: string,
    clientId: string | number,
    postingId: string | number,
    payload: { comment: string },
  ) => {
    try {
      const response = await clientsApiClient.post<unknown>(
        `/api/v1/clients/${clientId}/gbp-postings/${postingId}/comments`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      return parseClientGbpPostingCommentResponse(response.data);
    } catch (error) {
      throw new Error(parseError(error));
    }
  },
  deleteClientGbpPostingComment: async (
    accessToken: string,
    clientId: string | number,
    postingId: string | number,
    commentId: string | number,
  ) => {
    try {
      await clientsApiClient.delete(
        `/api/v1/clients/${clientId}/gbp-postings/${postingId}/comments/${commentId}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );
    } catch (error) {
      throw new Error(parseError(error));
    }
  },
  syncGbpDetails: async (
    accessToken: string,
    payload: SyncGbpDetailsRequestBody,
  ) => {
    try {
      const response = await clientsApiClient.post(
        "/api/v1/integrations/serpapi/gbp-details",
        payload,
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
  deleteProjectTask: async (accessToken: string, taskId: string | number) => {
    try {
      const response = await clientsApiClient.delete(
        `/api/v1/projects/tasks/${taskId}`,
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
  getProjectTasks: async (accessToken: string, clientId: string | number) => {
    try {
      const response = await clientsApiClient.get<unknown>(
        "/api/v1/projects/tasks",
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          params: {
            clientId,
          },
        },
      );

      return parseProjectTasksResponse(response.data);
    } catch (error) {
      throw new Error(parseError(error));
    }
  },
  createProjectTask: async (
    accessToken: string,
    projectId: string | number,
    payload: AddProjectTaskRequestBody,
  ) => {
    try {
      const response = await clientsApiClient.post(
        `/api/v1/projects/${projectId}/tasks`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      return parseProjectTaskResponse(response.data);
    } catch (error) {
      throw new Error(parseError(error));
    }
  },
  updateProjectTask: async (
    accessToken: string,
    taskId: string | number,
    payload: Partial<AddProjectTaskRequestBody>,
  ) => {
    try {
      const response = await clientsApiClient.patch(
        `/api/v1/projects/tasks/${taskId}`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      return parseProjectTaskResponse(response.data);
    } catch (error) {
      throw new Error(parseError(error));
    }
  },
  getTaskComments: async (accessToken: string, taskId: string | number) => {
    try {
      const response = await clientsApiClient.get<unknown>(
        `/api/v1/projects/tasks/${taskId}/comments`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      return parseTaskCommentsResponse(response.data);
    } catch (error) {
      throw new Error(parseError(error));
    }
  },
  createTaskComment: async (
    accessToken: string,
    taskId: string | number,
    payload: { comment: string },
  ) => {
    try {
      const response = await clientsApiClient.post(
        `/api/v1/projects/tasks/${taskId}/comments`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      return parseTaskCommentResponse(response.data);
    } catch (error) {
      throw new Error(parseError(error));
    }
  },
  deleteTaskComment: async (
    accessToken: string,
    commentId: string | number,
  ) => {
    try {
      const response = await clientsApiClient.delete(
        `/api/v1/projects/tasks/comments/${commentId}`,
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
  getProjectComments: async (
    accessToken: string,
    projectId: string | number,
  ) => {
    try {
      const response = await clientsApiClient.get<unknown>(
        `/api/v1/projects/${projectId}/comments`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      return parseProjectCommentsResponse(response.data);
    } catch (error) {
      throw new Error(parseError(error));
    }
  },
  createProjectComment: async (
    accessToken: string,
    projectId: string | number,
    payload: { comment: string },
  ) => {
    try {
      const response = await clientsApiClient.post(
        `/api/v1/projects/${projectId}/comments`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      return parseProjectCommentResponse(response.data);
    } catch (error) {
      throw new Error(parseError(error));
    }
  },
  deleteProjectComment: async (
    accessToken: string,
    commentId: string | number,
  ) => {
    try {
      const response = await clientsApiClient.delete(
        `/api/v1/projects/comments/${commentId}`,
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
  getClientCitations: async (
    accessToken: string,
    clientId: string | number,
  ) => {
    try {
      const response = await clientsApiClient.get<unknown>(
        `/api/v1/clients/${clientId}/citations`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      return parseClientCitationsResponse(response.data);
    } catch (error) {
      throw new Error(parseError(error));
    }
  },
  createClientCitation: async (
    accessToken: string,
    clientId: string | number,
    payload: AddClientCitationRequestBody,
  ) => {
    try {
      const response = await clientsApiClient.post(
        `/api/v1/clients/${clientId}/citations`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      return parseClientCitationResponse(response.data);
    } catch (error) {
      throw new Error(parseError(error));
    }
  },
  updateClientCitation: async (
    accessToken: string,
    clientId: string | number,
    citationId: string | number,
    payload: Partial<AddClientCitationRequestBody>,
  ) => {
    try {
      const response = await clientsApiClient.patch(
        `/api/v1/clients/${clientId}/citations/${citationId}`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      return parseClientCitationResponse(response.data);
    } catch (error) {
      throw new Error(parseError(error));
    }
  },
  deleteClientCitation: async (
    accessToken: string,
    clientId: string | number,
    citationId: string | number,
  ) => {
    try {
      const response = await clientsApiClient.delete(
        `/api/v1/clients/${clientId}/citations/${citationId}`,
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
  getClientProjects: async (
    accessToken: string,
    clientId: string | number,
    options?: { limit?: number; page?: number },
  ) => {
    try {
      const response = await clientsApiClient.get<unknown>(
        `/api/v1/clients/${clientId}/projects`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          params: {
            limit: options?.limit,
            page: options?.page,
          },
        },
      );

      return parseClientProjectsResponse(response.data);
    } catch (error) {
      throw new Error(parseError(error));
    }
  },
  createClientProject: async (
    accessToken: string,
    clientId: string | number,
    payload: AddClientProjectRequestBody,
  ) => {
    try {
      const response = await clientsApiClient.post(
        `/api/v1/clients/${clientId}/projects`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      return parseClientProjectResponse(response.data);
    } catch (error) {
      throw new Error(parseError(error));
    }
  },
  updateClientProject: async (
    accessToken: string,
    clientId: string | number,
    projectId: string | number,
    payload: UpdateClientProjectRequestBody,
  ) => {
    try {
      const response = await clientsApiClient.patch(
        `/api/v1/clients/${clientId}/projects/${projectId}`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      return parseClientProjectResponse(response.data);
    } catch (error) {
      throw new Error(parseError(error));
    }
  },
  deleteClientProject: async (
    accessToken: string,
    clientId: string | number,
    projectId: string | number,
  ) => {
    try {
      const response = await clientsApiClient.delete(
        `/api/v1/clients/${clientId}/projects/${projectId}`,
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
  updateClientById: async (
    accessToken: string,
    clientId: string | number,
    payload: FormData | UpdateClientRequestBody,
  ) => {
    try {
      const isFormData =
        typeof FormData !== "undefined" && payload instanceof FormData;
      const response = await clientsApiClient.patch(
        `/api/v1/clients/${clientId}`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            ...(isFormData ? { "Content-Type": "multipart/form-data" } : {}),
          },
        },
      );

      return parseClientDetailsResponse(response.data);
    } catch (error) {
      throw new Error(parseError(error));
    }
  },
  getClientById: async (accessToken: string, clientId: string | number) => {
    try {
      const response = await clientsApiClient.get<unknown>(
        `/api/v1/clients/${clientId}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      return parseClientDetailsResponse(response.data);
    } catch (error) {
      throw new Error(parseError(error));
    }
  },
  getClients: async (accessToken: string) => {
    try {
      const response = await clientsApiClient.get<unknown>("/api/v1/clients", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const clients = parseClientsResponse(response.data);

      return clients.filter((client) => {
        const normalizedStatus = (client.status ?? "").trim().toLowerCase();

        return normalizedStatus === "active" || normalizedStatus === "inactive";
      });
    } catch (error) {
      throw new Error(parseError(error));
    }
  },
  createClient: async (accessToken: string, payload: AddClientRequestBody) => {
    try {
      const response = await clientsApiClient.post("/api/v1/clients", payload, {
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
