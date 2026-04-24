export type AIPromptPostType =
  | "GBP Update"
  | "GBP Offer"
  | "GBP Event"
  | "Service Page"
  | "Meta Title"
  | "Homepage"
  | "Treatment Page"
  | "Condition Page"
  | "Blog Page"
  | "Press Release"
  | "Guest Post";

export interface AIPromptDynamicValueOption {
  label: string;
  postTypes: AIPromptPostType[] | "all";
  source:
    | "Client Details"
    | "Keyword Research"
    | "Web Content"
    | "GBP Postings";
  token: string;
}

export const AI_PROMPT_DYNAMIC_VALUE_OPTIONS: AIPromptDynamicValueOption[] = [
  {
    label: "Client Name",
    postTypes: "all",
    source: "Client Details",
    token: "{{client_name}}",
  },
  {
    label: "Business Name",
    postTypes: "all",
    source: "Client Details",
    token: "{{client_business_name}}",
  },
  {
    label: "Niche",
    postTypes: "all",
    source: "Client Details",
    token: "{{client_niche}}",
  },
  {
    label: "Profession",
    postTypes: "all",
    source: "Client Details",
    token: "{{client_profession}}",
  },
  {
    label: "Type Of Practice",
    postTypes: "all",
    source: "Client Details",
    token: "{{client_type_of_practice}}",
  },
  {
    label: "Practice Introduction",
    postTypes: "all",
    source: "Client Details",
    token: "{{client_practice_introduction}}",
  },
  {
    label: "Business Phone",
    postTypes: "all",
    source: "Client Details",
    token: "{{client_business_phone}}",
  },
  {
    label: "Website",
    postTypes: "all",
    source: "Client Details",
    token: "{{client_website}}",
  },
  {
    label: "Country",
    postTypes: "all",
    source: "Client Details",
    token: "{{client_country}}",
  },
  {
    label: "City / State",
    postTypes: "all",
    source: "Client Details",
    token: "{{client_city_state}}",
  },
  {
    label: "Visible Area",
    postTypes: "all",
    source: "Client Details",
    token: "{{client_visible_area}}",
  },
  {
    label: "Top Treatments",
    postTypes: "all",
    source: "Client Details",
    token: "{{client_top_treatments}}",
  },
  {
    label: "Special Interests",
    postTypes: "all",
    source: "Client Details",
    token: "{{client_special_interests}}",
  },
  {
    label: "Keyword",
    postTypes: "all",
    source: "Keyword Research",
    token: "{{keyword}}",
  },
  {
    label: "Search Volume",
    postTypes: "all",
    source: "Keyword Research",
    token: "{{keyword_search_volume}}",
  },
  {
    label: "Keyword Intent",
    postTypes: "all",
    source: "Keyword Research",
    token: "{{keyword_intent}}",
  },
  {
    label: "Keyword Difficulty",
    postTypes: "all",
    source: "Keyword Research",
    token: "{{keyword_kd}}",
  },
  {
    label: "CPC",
    postTypes: "all",
    source: "Keyword Research",
    token: "{{keyword_cpc}}",
  },
  {
    label: "Content Keyword",
    postTypes: [
      "Homepage",
      "Treatment Page",
      "Condition Page",
      "Blog Page",
      "Press Release",
      "Guest Post",
      "Service Page",
      "Meta Title",
    ],
    source: "Web Content",
    token: "{{webcontent_keyword}}",
  },
  {
    label: "Content Type",
    postTypes: [
      "Homepage",
      "Treatment Page",
      "Condition Page",
      "Blog Page",
      "Press Release",
      "Guest Post",
      "Service Page",
      "Meta Title",
    ],
    source: "Web Content",
    token: "{{webcontent_content_type}}",
  },
  {
    label: "Content Length",
    postTypes: [
      "Homepage",
      "Treatment Page",
      "Condition Page",
      "Blog Page",
      "Press Release",
      "Guest Post",
      "Service Page",
      "Meta Title",
    ],
    source: "Web Content",
    token: "{{webcontent_content_length}}",
  },
  {
    label: "Content Audience",
    postTypes: [
      "Homepage",
      "Treatment Page",
      "Condition Page",
      "Blog Page",
      "Press Release",
      "Guest Post",
      "Service Page",
      "Meta Title",
    ],
    source: "Web Content",
    token: "{{webcontent_audience}}",
  },
  {
    label: "Content Topic",
    postTypes: [
      "Homepage",
      "Treatment Page",
      "Condition Page",
      "Blog Page",
      "Press Release",
      "Guest Post",
      "Service Page",
      "Meta Title",
    ],
    source: "Web Content",
    token: "{{webcontent_topic}}",
  },
  {
    label: "GBP Keyword",
    postTypes: ["GBP Update", "GBP Offer", "GBP Event"],
    source: "GBP Postings",
    token: "{{gbp_keyword}}",
  },
  {
    label: "GBP Post Type",
    postTypes: ["GBP Update", "GBP Offer", "GBP Event"],
    source: "GBP Postings",
    token: "{{gbp_post_type}}",
  },
  {
    label: "GBP Audience",
    postTypes: ["GBP Update", "GBP Offer", "GBP Event"],
    source: "GBP Postings",
    token: "{{gbp_audience}}",
  },
  {
    label: "GBP Language",
    postTypes: ["GBP Update", "GBP Offer", "GBP Event"],
    source: "GBP Postings",
    token: "{{gbp_language}}",
  },
  {
    label: "GBP Number of Posts",
    postTypes: ["GBP Update", "GBP Offer", "GBP Event"],
    source: "GBP Postings",
    token: "{{gbp_number_of_posts}}",
  },
  {
    label: "GBP Post Index",
    postTypes: ["GBP Update", "GBP Offer", "GBP Event"],
    source: "GBP Postings",
    token: "{{gbp_post_index}}",
  },
];

export const getDynamicPromptValuesByPostType = (
  postType?: string,
): AIPromptDynamicValueOption[] =>
  AI_PROMPT_DYNAMIC_VALUE_OPTIONS.filter(
    (option) =>
      option.postTypes === "all" ||
      option.postTypes.includes(postType as AIPromptPostType),
  );
