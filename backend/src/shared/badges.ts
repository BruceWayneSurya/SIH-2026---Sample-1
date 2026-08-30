export const BADGES: Record<string, { name: string; desc: string }> = {
  first_steps: {
    name: "First Steps",
    desc: "Completed the first objective test",
  },
  quiz_whiz: {
    name: "Quiz Whiz",
    desc: "Scored 18+/20 on an objective test",
  },
  science_scholar: {
    name: "Science Scholar",
    desc: "Earned 15+ correct answers in Science tests",
  },
  top_contributor: {
    name: "Top Contributor",
    desc: "A community note reached 10+ upvotes",
  },
  multi_chapter: {
    name: "Consistent Learner",
    desc: "Practised 3+ different chapters",
  },
};

export function allBadges(earned: string[]) {
  return Object.entries(BADGES).map(([id, b]) => ({
    id,
    name: b.name,
    desc: b.desc,
    earned: earned.includes(id),
  }));
}
