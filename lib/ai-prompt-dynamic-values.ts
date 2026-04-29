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
  source: "Client Details" | "Web Content" | "GBP Postings";
  token: string;
}

export const AI_PROMPT_DYNAMIC_VALUE_OPTIONS: AIPromptDynamicValueOption[] = [
  {
    label: "Client Title",
    postTypes: "all",
    source: "Client Details",
    token: "{{client_title}}",
  },
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
    label: "Personal Email Address",
    postTypes: "all",
    source: "Client Details",
    token: "{{client_personal_email}}",
  },
  {
    label: "Business Email Address",
    postTypes: "all",
    source: "Client Details",
    token: "{{client_business_email}}",
  },
  {
    label: "Personal Phone Number",
    postTypes: "all",
    source: "Client Details",
    token: "{{client_personal_phone}}",
  },
  {
    label: "Business Phone Number",
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
    label: "Practice Structure",
    postTypes: "all",
    source: "Client Details",
    token: "{{client_practice_structure}}",
  },
  {
    label: "Type of Practice",
    postTypes: "all",
    source: "Client Details",
    token: "{{client_type_of_practice}}",
  },
  {
    label: "GMC Registration Number",
    postTypes: "all",
    source: "Client Details",
    token: "{{client_gmc_registration_number}}",
  },
  {
    label: "Building Name",
    postTypes: "all",
    source: "Client Details",
    token: "{{client_building_name}}",
  },
  {
    label: "Unit Number",
    postTypes: "all",
    source: "Client Details",
    token: "{{client_unit_number}}",
  },
  {
    label: "Street Address",
    postTypes: "all",
    source: "Client Details",
    token: "{{client_street_address}}",
  },
  {
    label: "Region",
    postTypes: "all",
    source: "Client Details",
    token: "{{client_region}}",
  },
  {
    label: "Post Code",
    postTypes: "all",
    source: "Client Details",
    token: "{{client_post_code}}",
  },
  {
    label: "Country",
    postTypes: "all",
    source: "Client Details",
    token: "{{client_country}}",
  },
  {
    label: "Target Area",
    postTypes: "all",
    source: "Client Details",
    token: "{{client_target_area}}",
  },
  {
    label: "Nearby Areas Served",
    postTypes: "all",
    source: "Client Details",
    token: "{{client_nearby_areas_served}}",
  },
  {
    label: "Practice Hours",
    postTypes: "all",
    source: "Client Details",
    token: "{{client_practice_hours}}",
  },
  {
    label: "Credentials",
    postTypes: "all",
    source: "Client Details",
    token: "{{client_credentials}}",
  },
  {
    label: "Major Accomplishments",
    postTypes: "all",
    source: "Client Details",
    token: "{{client_major_accomplishments}}",
  },
  {
    label: "What makes your practice unique to competitors",
    postTypes: "all",
    source: "Client Details",
    token: "{{client_unique_to_competitors}}",
  },
  {
    label: "Top 3 Medical Specialties",
    postTypes: "all",
    source: "Client Details",
    token: "{{client_top_medical_specialties}}",
  },
  {
    label: "Sub-specialty",
    postTypes: "all",
    source: "Client Details",
    token: "{{client_sub_specialty}}",
  },
  {
    label: "Top 3 Treatments You Want To Be Visible For",
    postTypes: "all",
    source: "Client Details",
    token: "{{client_top_treatments}}",
  },
  {
    label: "Link to Google Business Profile",
    postTypes: "all",
    source: "Client Details",
    token: "{{client_gbp_link}}",
  },
  {
    label: "Discord Channel",
    postTypes: "all",
    source: "Client Details",
    token: "{{client_discord_channel}}",
  },
  {
    label: "Facebook",
    postTypes: "all",
    source: "Client Details",
    token: "{{client_facebook}}",
  },
  {
    label: "Instagram",
    postTypes: "all",
    source: "Client Details",
    token: "{{client_instagram}}",
  },
  {
    label: "LinkedIn",
    postTypes: "all",
    source: "Client Details",
    token: "{{client_linkedin}}",
  },
  {
    label: "List of treatments",
    postTypes: "all",
    source: "Client Details",
    token: "{{client_treatment_and_services}}",
  },
  {
    label: "List of Conditions",
    postTypes: "all",
    source: "Client Details",
    token: "{{client_conditions_treated}}",
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
    label: "Search Volume",
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
    token: "{{webcontent_search_volume}}",
  },
  {
    label: "Intent",
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
    token: "{{webcontent_intent}}",
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
    label: "Title",
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
    token: "{{webcontent_title}}",
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
