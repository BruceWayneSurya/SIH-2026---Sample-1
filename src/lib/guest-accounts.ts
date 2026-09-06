// Both names occur in existing SQLite databases. Reuse guest IDs and votes
// rather than replacing accounts when adopting the Pragyan interface.
export const GUEST_EMAILS = {
  student: ["guest.student@vidyasetu.gov.in", "guest.student@pragyan.gov.in"],
  faculty: ["guest.faculty@vidyasetu.gov.in", "guest.faculty@pragyan.gov.in"],
} as const;
