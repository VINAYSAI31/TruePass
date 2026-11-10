# Digital Identity Proofing Platform: Frontend

React + Vite frontend for the Spring Boot identity-proofing backend. It contains two separate portals:

- **Internal Operations Portal**: create applications, compare Vendor A and Vendor B, evaluate decisions, handle manual reviews, read audit logs.
- **Vendor Portal**: Vendor A and Vendor B each see the applications and submit their own verification result.

**Stack:** React 18, Vite, JavaScript, React Router DOM, Bootstrap 5, Bootstrap Icons, plain CSS. No TypeScript, Redux or other state libraries.

> **Demo-only login.** The backend login is a simulation (plain-text demo passwords, in-memory session id).
> This frontend only stores that session id and sends it in the `X-Demo-Session` header.
> It is **not** secure authentication. Do not use it for real data.

## Demo credentials

| Portal   | Username   | Password    | Role       |
|----------|------------|-------------|------------|
| Internal | `admin`    | `admin123`  | INTERNAL   |
| Vendor A | `vendor_a` | `vendor123` | VENDOR_A   |
| Vendor B | `vendor_b` | `vendor123` | VENDOR_B   |

The session is kept in `sessionStorage`, so each browser tab has its own login. You can keep Internal, Vendor A and Vendor B open in three tabs at once.

## Prerequisites

- Node.js 18 or newer
- The backend running at `http://localhost:8081` (see the backend README; `GET /actuator/health` should return `{"status":"UP"}`)

## Run locally

```bash
npm install
cp .env.example .env     # optional, only if the backend is not on http://localhost:8081
npm run dev              # http://localhost:5173
```

Production build:

```bash
npm run build            # output in dist/
npm run preview          # serve dist/ locally
```

### Configuration

| Variable            | Default                 | Purpose                    |
|---------------------|-------------------------|----------------------------|
| `VITE_API_BASE_URL` | `http://localhost:8081` | Backend base URL (no trailing slash) |

### CORS

The browser calls the backend directly. If the backend rejects requests from the frontend origin
(`http://localhost:5173` in dev, or wherever you host the build), the UI shows
"Cannot reach the backend… check CORS". Allow that origin in the backend (e.g. a `CorsConfiguration` / `WebMvcConfigurer` that allows the `X-Demo-Session` and `Content-Type` headers).

## Docker (Nginx)

```bash
docker build -t identity-proofing-frontend --build-arg VITE_API_BASE_URL=http://localhost:8081 .
docker run -p 3000:80 identity-proofing-frontend
# open http://localhost:3000
```

The backend URL is baked in at build time and is called from the user's browser, so it must be reachable from the browser, not just from the container. `nginx.conf` falls back to `index.html` so deep links such as `/internal/applications/3` work.

## Suggested demo walkthrough

1. Log in as **admin** → **Create Application**.
2. In another tab log in as **vendor_a** → open the application → **Submit verification** (e.g. VERIFIED / 92).
3. In a third tab log in as **vendor_b** → submit (e.g. FAIL / 0.80).
4. As admin open **Vendor Comparison**, select the application, click **Evaluate Decision**. The vendors disagree, so the backend returns `MANUAL_REVIEW`.
5. Open **Manual Review** → View → fill in the review form → Approve / Reject / Retry.
6. Check **Dashboard** and **Audit Logs**.

## Project structure

```
src/
  components/
    common/      Navbar, Sidebar, StatusBadge, SummaryCard, Loading (+ ErrorState, EmptyState),
                 ProtectedRoute, PageHeader, Pagination, LoginForm
    internal/    InternalLayout, VendorResponseCard
    vendor/      VendorLayout
  pages/
    LoginSelection.jsx, InternalLogin.jsx, VendorLogin.jsx
    internal/    Dashboard, Applications, CreateApplication, ApplicationDetails,
                 VendorComparison, ManualReview, ReviewDetails, AuditLogs
    vendor/      VendorDashboard, MyApplications, VendorApplicationDetails,
                 SubmitVerification, SubmissionHistory
  services/
    api.js       all backend calls (fetch), one central error type
    auth.js      demo session storage, route helpers, auth header
  hooks/useAsync.js   small loading / error / reload hook
  utils/format.js     dates, labels, status colours
  App.jsx             routes only
  main.jsx, App.css
```

## How it works

- **Backend decides everything.** The frontend never calculates a decision. *Evaluate Decision* calls `POST /api/decisions/evaluate/{id}` and shows the result and reason that come back.
- **Route guards.** `ProtectedRoute` sends signed-out users to the matching login and sends a signed-in user who opens the wrong portal back to their own dashboard. This is a convenience only; the backend enforces access (401 / 403).
- **Expired session.** If the backend restarts, the in-memory session is lost; any 401 clears the local session and returns to the start page.
- **Real data only.** Loading, empty and error states are shown instead of placeholder data.
- **Vendor privacy.** The Vendor Portal only calls `/api/vendor/**` endpoints, which return the logged-in vendor's own data. Each vendor sees only its own field format (Vendor A: result + score 0–100; Vendor B: status + confidence 0–1).
- **Duplicate submissions.** The submit button is disabled while sending, the form is locked after success, and applications with `alreadySubmitted: true` open a locked state. A `409` from the backend also locks the form.
- **Applications table.** The list endpoint has no vendor columns, so the Vendor A / Vendor B / Final Decision cells are loaded per visible row from `GET /api/applications/{id}/comparison` (10 rows per page).

## Moving to JWT later

All request headers are built in one function, `authHeaders()` in `src/services/auth.js`. To switch to JWT, store the token in the session object and return `{ Authorization: 'Bearer …' }` there; pages do not need to change.

## Known limits of the MVP

- Vendors cannot correct a submitted result in the UI (the backend supports `PUT /api/vendor/responses/{id}`; it is not wired up here).
- Manual-review reason codes in the dropdown are defined in the frontend (`ReviewDetails.jsx`); the backend accepts them as free text.
