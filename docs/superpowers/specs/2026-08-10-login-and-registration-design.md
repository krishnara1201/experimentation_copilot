# Login and registration fixes

Date: 2026-08-10

## Problem

Two known gaps, called out in `CLAUDE.md`'s "Known gaps / near-term backlog":

1. **Login only accepts username, not email.** `authenticate_user()` in `backend/app/api/routes/auth.py` looks up `User.username == username` only. `LoginPage.tsx` has a single "Username" field, so a user who only remembers their email can't log in.
2. **Registration only collects username/email/password.** `POST /api/auth/register` and `RegisterPage.tsx` capture only the three existing `User` columns — there's no other profile info to collect without a schema change, and no confirm-password safety check.

## Design

### 1. Login accepts username or email

- `authenticate_user()` (`backend/app/api/routes/auth.py`) changes its lookup to match either column:
  ```python
  result = await session.execute(
      select(User).where((User.username == identifier) | (User.email == identifier))
  )
  ```
- No change needed to `create_access_token`/`get_current_user`: `login_for_access_token` already builds the JWT `sub` claim from `user.username` (the resolved row), not from whatever the client typed, so a user who logs in via email still gets a token keyed on their username and `get_current_user`'s `User.username == username` lookup keeps working unmodified.
- `LoginPage.tsx`: relabel the field "Username" → "Username or email" (rename the local state var for clarity, e.g. `identifier`). The value is still submitted under the form key `username` — required by `OAuth2PasswordRequestForm` / the OAuth2 spec — so `api/auth.ts::login()` needs no change beyond a parameter rename.

### 2. Registration collects a full name, plus a confirm-password field

- `User` model (`backend/app/db/models/user_model.py`): add a required `full_name: str` column.
- New Alembic migration: add `full_name` (NOT NULL) to the `user` table.
- `UserRegister` and `UserReceived` schemas: add `full_name: str`.
- `POST /api/auth/register` handler (`create_user`): pass `full_name=payload.full_name` into the `User(...)` constructor.
- `RegisterPage.tsx`:
  - Add a required "Full name" text field.
  - Add a required "Confirm password" field, validated client-side (must match "Password") before calling `register()` — this is a UI-only safety check, no backend involvement.
- Frontend plumbing: `RegisterInput` (`frontend/src/api/auth.ts`), `AuthContext.register()` (`frontend/src/context/AuthContext.tsx`), and the `User` type (`frontend/src/types/api.ts`) all get `full_name` threaded through.

### Out of scope

- No first/last name split — single `full_name` field.
- No company/organization field.
- No UI changes to where names are displayed elsewhere (e.g. `Layout.tsx`'s nav avatar keeps using the username initial).
- No changes to `get_current_user`'s token-validation logic beyond what's noted above (none needed).

## Testing

- Backend: exercise via the `pgserver` + `ASGITransport` technique documented in `CLAUDE.md` — register a user, then log in once with username and once with email, confirming both succeed and both requests to `/api/experiments/` with the token work.
- Frontend: `npm run typecheck`; manually exercise the login (both identifier types) and registration (mismatched vs matching confirm-password) flows against a running `docker compose up --build` stack.
