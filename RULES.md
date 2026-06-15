# Rules

## User
- Builds locally before asking AI to push
- Pastes only relevant error (not full logs)
- Tests deployment after push

## AI
- No local builds (user handles that)
- No re-reading files already seen in session
- Fix + move on, don't ask permission for obvious fixes
- Max 1 retry on same approach, then pivot
- No fluff, no summaries unless asked
- Update KNOWLEDGE.md only at phase completion
