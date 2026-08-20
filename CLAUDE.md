# CLAUDE.md

Project working rules. Read this at the start of every
session.

## Source of truth

SPEC.md is the source of truth for this project. Read
it before starting any task. If something in SPEC.md
is ambiguous or conflicts with what you find in the
code, ask me rather than guessing.

## Ground rules

- Build one milestone at a time (see SPEC.md section
  10). Do not begin the next milestone until I
  explicitly say so.
- Present a plan and get my approval before writing
  code for a new milestone.
- Ask before adding any dependency not listed in
  SPEC.md.
- Never hardcode the app name. Import it from
  src/lib/brand.ts.
- Never hardcode a locale, region, or country. Locale
  is always a parameter.
- Category slugs are lowercase English and permanent.
  Display labels are localized separately.
- No API keys in client-side code. All model calls go
  through server route handlers.
- Use lucide-react for icons. Never use emoji as UI
  icons.

## Build log

After completing each task — not each file edit, each
completed unit of work — append an entry to
BUILDLOG.md at the repo root. Create the file if it
doesn't exist. Never rewrite or delete existing
entries; only append.

Entry format:

### [YYYY-MM-DD HH:MM] <short description of the task>
- **Milestone:** M0 / M1 / M2 / M3 / M4
- **Files:** created / modified / deleted
- **Decisions:** anything I chose that SPEC.md did not
  specify, and why
- **Deviations:** anything I did that contradicts
  SPEC.md, and why
- **Incomplete:** anything stubbed, mocked, hardcoded,
  or left as a TODO
- **Open questions:** anything a human should confirm

Be blunt in Deviations and Incomplete. A log that says
everything went fine is worthless. If you hardcoded a
value to get moving, say so. If you skipped error
handling, say so.

Commit BUILDLOG.md together with the work it
describes.
