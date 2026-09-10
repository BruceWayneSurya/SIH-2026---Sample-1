# Build plan — from quiz marks to a mastery map, grounded tutor, offline packs

Seven ideas arrived in one message. They are not seven products: they are two
loops that share one spine.

```
                     ┌────────────────────────────────────────┐
   teacher  ───────► │  LEARNING-OUTCOME GRAPH (NCERT LO ids) │ ◄────── faculty
   curates           └────────────────────────────────────────┘         uploads
                                        │
                     ┌──────────────────┴──────────────────┐
                     ▼                                     ▼
        quiz answers → per-student mastery      sources → RAG index (chunks
        → teacher heatmap ("31 of 45")            tagged by page/para)
                     │                                     │
                     ▼                                     ▼
        concept tree with mastery colours       every AI answer carries a
        + reteach plan with citations           "NCERT p. 62, para 3" chip
                     │                                     │
                     └──────────────┬──────────────────────┘
                                    ▼
                    offline chapter pack (notes, LOs, MCQs,
                    revision sheet) → quiz offline → sync XP
```

| # | Idea | Where it lives |
| - | ---- | -------------- |
| 1 | Concept-mastery map + teacher heatmap | `src/lib/outcomes/*`, `/teacher`, `/api/mastery/*` |
| 2 | Photo-to-help + Socratic hints | `/api/ai/tutor` (mode `photo`), `src/lib/tutor/*` |
| 3 | Genuine offline-first | `public/sw.js`, `public/offline/offline-app.html`, `/api/offline/*` |
| 4 | Teacher content pipeline | `/faculty/studio`, `/api/faculty/studio` |
| 5 | AI answer grounding (RAG + refusal) | `src/lib/rag/*`, `src/lib/tutor/scope.ts` |
| 6 | Concept tree + infographic revision sheet | `src/lib/revision/*`, `/class/.../revision` |
| 7 | Class notebooks (curated source set) | `class_notebooks` table, chapter "Learn" tab |

Rules followed throughout: nothing is fabricated at read time (mastery is
recomputed from stored answers), every citation points at a chunk that exists in
`source_chunks`, and every AI feature degrades to a deterministic local path
when `GROQ_API_KEY` is absent so the whole loop is demoable without a key.
