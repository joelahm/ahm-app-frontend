export const departmentOptions = [
  "CSM",
  "SEO",
  "Designer",
  "Web Development",
  "Operations",
  "Management",
] as const;

export type DepartmentOption = (typeof departmentOptions)[number];
