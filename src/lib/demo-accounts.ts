export const DEMO_ACCOUNTS = [
  {
    role: "faculty",
    label: "Ms. Anita Sharma",
    desc: "Science Faculty · SCH-GJ-204 · Gujarat",
    email: "anita.sharma@pragyan.gov.in",
    pw: "demo123",
  },
  {
    role: "faculty",
    label: "Ravi Verma",
    desc: "Mathematics Faculty · SCH-MH-112 · Maharashtra",
    email: "ravi.verma@pragyan.gov.in",
    pw: "demo123",
  },
  {
    role: "student",
    label: "Aarav Patel",
    desc: "Class 8 Student · Shiksha Kendra, Rajkot",
    email: "aarav@student.in",
    pw: "demo123",
  },
  {
    role: "student",
    label: "Diya Mehta",
    desc: "Class 8 Student · KV, Ahmedabad · Rank #1",
    email: "diya@student.in",
    pw: "demo123",
  },
  {
    role: "student",
    label: "Arjun Thakur",
    desc: "Class 7 Student · Shiksha Kendra, Patna",
    email: "arjun@student.in",
    pw: "demo123",
  },
] as const;

// Preserve account IDs and existing content when adopting the Pragyan brand.
export const DEMO_EMAIL_ALIASES: Record<string, string> = {
  "anita.sharma@pragyan.gov.in": "anita.sharma@vidyasetu.gov.in",
  "ravi.verma@pragyan.gov.in": "ravi.verma@vidyasetu.gov.in",
};
