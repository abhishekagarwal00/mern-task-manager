# TaskFlow: Interview Guide

Everything you need to present, explain and defend this project in an interview.

> **Before any interview:** run it locally, deploy it to GCP, push it to GitHub, and read every file once.
> Your resume says "deployed on GCP" and "managed with Git/GitHub", so those must be true and demo-able.
> Interviewers dig 2-3 levels deep on resume projects. Understanding beats memorising.

---

## 1. Your pitch

### 30-second version
"I built TaskFlow, a full-stack task management app using the MERN stack. Users register and log in with JWT
authentication, then create, edit, filter and move tasks across a To do / In progress / Done board. The backend is a
REST API in Node and Express with MongoDB through Mongoose, and the frontend is a responsive React app. I containerised
it with Docker and deployed it on Google Cloud Run, with the code managed on GitHub."

### 2-minute version (add these points)
- **Why I built it:** to learn the complete flow of a real app: auth, data ownership, CRUD, deployment.
- **Architecture:** a layered backend (routes → controllers → models) and a React SPA that talks to it over JSON.
- **Security:** hashed passwords (bcrypt), stateless JWT, every task query scoped to the logged-in user, rate limiting, helmet.
- **UX details:** optimistic updates when moving a card, debounced search, loading/error/empty states.
- **Deployment:** a multi-stage Dockerfile builds React, then Express serves both the API and the static build from one service.

---

## 2. Architecture

```
Browser (React SPA)
   │  axios + JWT in Authorization header
   ▼
Express server ── helmet / cors / rate-limit / json parser
   │
   ├── /api/auth   → authController  → User model ─┐
   └── /api/tasks  → protect (JWT) → taskController → Task model ─┤
                                                               ▼
                                                    MongoDB (Atlas)
```

### Folder structure and responsibility
| Folder | Responsibility |
|---|---|
| `server/routes` | Maps URL + HTTP method to a controller. No logic. |
| `server/controllers` | Business logic: read request, call model, send response. |
| `server/models` | Mongoose schemas, validation, indexes, password hashing. |
| `server/middleware` | `protect` (JWT verification) and the central error handler. |
| `client/src/context` | `AuthContext`: global login state. |
| `client/src/pages` | Route-level screens: `Auth`, `Dashboard`. |
| `client/src/components` | Reusable UI: `TaskCard`, `TaskForm`, `ProtectedRoute`. |
| `client/src/api.js` | One axios instance with interceptors. |

**Why separate routes/controllers/models?** Separation of concerns. Each layer has one job, so it's easier to test,
read and change. It's a light version of MVC.

---

## 3. Key flows (be able to draw these on a whiteboard)

### 3.1 Registration and login
1. React `Auth` page posts `{name, email, password}` to `POST /api/auth/register`.
2. The `User` model's **pre-save hook** hashes the password with bcrypt (10 salt rounds).
3. The server signs a **JWT** containing the user id (`jwt.sign({id}, JWT_SECRET, {expiresIn:'7d'})`) and returns it with the user.
4. React stores the token in `localStorage` and the user in `AuthContext`.
5. On **login**, the server loads the user with `.select('+password')` (the password field is hidden by default),
   compares with `bcrypt.compare`, and returns a fresh token. A wrong email or a wrong password returns the **same** message,
   so attackers can't discover which emails exist.

### 3.2 Calling a protected route
1. The axios **request interceptor** adds `Authorization: Bearer <token>` to every request.
2. The `protect` middleware extracts the token, runs `jwt.verify`, loads the user and sets `req.user`.
3. The controller uses `req.user._id` to scope the query.
4. If verification fails, the server returns **401**. The axios **response interceptor** clears the token and redirects to `/login`.

### 3.3 Page refresh
`AuthContext` runs `GET /auth/me` on startup if a token exists. This restores the session, and a `loading` flag prevents
the UI from flashing the login page in the meantime.

### 3.4 Moving a task (optimistic update)
1. Update the card in local state **immediately**.
2. Send `PUT /tasks/:id` in the background.
3. If it fails, **roll back** to the previous state and show the error.

The UI feels instant even on a slow network.

---

## 4. Database design

**User:** `name`, `email` (unique index, lowercase), `password` (hashed, `select:false`), timestamps.

**Task:** `user` (ObjectId ref → User, indexed), `title` (required, max 120), `description`, `status` (enum:
todo / in-progress / done), `priority` (enum: low / medium / high), `dueDate`, timestamps.

- **Reference, not embedding.** A user could have thousands of tasks, and MongoDB has a 16 MB document limit.
  Tasks are also queried and updated independently of the user.
- **Compound index** `{user, status, createdAt:-1}` supports the most common query (my tasks by status, newest first).
- **Aggregation** is used in `GET /tasks/stats` (`$match` + `$group`) to count tasks by status on the database side.

**Why MongoDB over SQL?** Flexible schema, JSON-like documents map directly to JavaScript objects, and it's fast to iterate on.
For heavily relational data with many joins and transactions (banking, for example) I'd choose SQL. The relationship
here (one user to many tasks) is simple.

---

## 5. REST API design

| Method | Endpoint | Success | Errors |
|---|---|---|---|
| POST | /api/auth/register | 201 | 400 validation, 409 duplicate email |
| POST | /api/auth/login | 200 | 400 missing fields, 401 bad credentials |
| GET | /api/tasks | 200 | 401 |
| POST | /api/tasks | 201 | 400, 401 |
| PUT | /api/tasks/:id | 200 | 400, 401, 404 |
| DELETE | /api/tasks/:id | 200 | 401, 404 |

- **REST principles used:** resources as nouns, HTTP verbs for actions, proper status codes, stateless requests.
- **Query params** handle filtering, sorting and pagination: `?status=done&priority=high&search=report&sort=dueDate&page=2&limit=20`.
- **Route order matters:** `/stats` is declared before `/:id`, otherwise Express would treat "stats" as an id.

---

## 6. Security (interviewers love this)

| Concern | What I did | Why |
|---|---|---|
| Password storage | bcrypt with salt (10 rounds) | A DB leak doesn't expose passwords. Bcrypt is deliberately slow, which resists brute force. |
| Authentication | JWT, signed with a secret and expiring in 7 days | Stateless: no session store, so it scales horizontally. |
| Authorisation | Every task query filters by `{_id, user: req.user._id}` | Prevents **IDOR**: user A can't read or edit user B's task by guessing an id. |
| Mass assignment | `pickFields()` whitelists allowed fields | A client can't send `user: someoneElse` in the body. |
| NoSQL injection / regex DoS | `escapeRegex()` on the search term, and `String()` casts on query params | Stops `?status[$ne]=x` style operators and malicious regex. |
| Brute force | `express-rate-limit` on `/api/auth` | Limits password-guessing attempts. |
| Headers | `helmet` | Sets secure HTTP headers. |
| Payload size | `express.json({limit:'10kb'})` | Blocks oversized-body abuse. |
| Secrets | `.env`, git-ignored, and Secret Manager in production | Never commit secrets. |
| Info leakage | Same error for wrong email or wrong password | Prevents user enumeration. |

### Honest trade-off: localStorage vs httpOnly cookie
I store the JWT in `localStorage`. It's simple, but it is readable by JavaScript, so an **XSS** attack could steal it
(React escapes output by default, which reduces that risk). A more secure option is an **httpOnly, Secure, SameSite
cookie**, which JS cannot read, but that requires **CSRF** protection. For production I'd consider short-lived access
tokens plus a refresh token in an httpOnly cookie.

---

## 7. Frontend concepts used

| Concept | Where | Explain it like this |
|---|---|---|
| `useState` | All components | Local component state (form values, tasks, errors). |
| `useEffect` | `Dashboard`, `AuthContext` | Side effects: fetching data, restoring the session, with cleanup. |
| `useCallback` | `Dashboard.load` | Stable function reference so the effect depends on `filters` only. |
| Context API | `AuthContext` | Avoids prop-drilling the user and login/logout functions across the app. |
| React Router v6 | `App.jsx` | Client-side routing. `ProtectedRoute` redirects unauthenticated users. |
| Controlled components | Forms | React state is the single source of truth for input values. |
| Debounce | Search/filter | `setTimeout` plus cleanup in the effect, so the API is hit 300 ms after the last change, not on every keystroke. |
| Optimistic UI | `move()` | Update first, rollback on failure. |
| Conditional rendering | Loading / error / empty states | Always handle all three states. |
| Axios interceptors | `api.js` | Central place to attach the token and handle 401. |
| Responsive design | CSS grid and media queries | 3 columns on desktop, 1 column below 860 px. |
| Accessibility | `aria-*`, labels, `:focus-visible`, reduced-motion | Usable with keyboard and screen readers. |

**Why Vite instead of Create React App?** Much faster dev server (native ES modules) and builds, and CRA is deprecated.

**Why a dev proxy?** `vite.config.js` proxies `/api` to port 5000, so the browser sees one origin and there are no CORS issues in development.

---

## 8. Deployment on Google Cloud Platform

**What I used:** Docker, Cloud Build, Cloud Run, MongoDB Atlas, with Secret Manager for credentials.

**The Dockerfile (multi-stage):**
1. Stage 1 builds the React app (`npm run build` → `client/dist`).
2. Stage 2 installs only production server dependencies and copies in the built client.
3. In production Express serves `client/dist` statically and falls back to `index.html` for client-side routes.

**Why one service instead of two?** It's simpler and cheaper, there's no CORS configuration, and a single URL is easy to manage.
Trade-off: the frontend and backend can't be scaled or deployed independently. At larger scale I'd put static files on a
CDN (Cloud Storage plus Cloud CDN or Firebase Hosting) and keep the API separate.

**Why Cloud Run?** It's serverless containers: no servers to manage, auto-scaling (including to zero), HTTPS out of the box,
and pay-per-use. It sets the `PORT` env variable, which is why `server.js` reads `process.env.PORT`.

**Why Atlas rather than MongoDB in the container?** Containers are ephemeral and Cloud Run instances come and go, so the
database must be external and managed (backups, replication).

**Environment variables:** `MONGO_URI`, `JWT_SECRET`, `NODE_ENV=production`. They are never baked into the image.

**Command:** `gcloud run deploy taskflow --source . --region asia-south1 --allow-unauthenticated --set-env-vars ...`

---

## 9. Git and GitHub workflow

- `main` is always deployable. Work happens on `feature/*` branches and merges via pull request.
- Conventional commits: `feat: add task filters`, `fix: handle expired token`.
- `.gitignore` excludes `node_modules`, `dist` and `.env`.
- Be ready to explain: `git merge` vs `rebase`, resolving conflicts, `git stash`, `git revert` vs `reset`.

---

## 10. Design decisions

| Decision | Reasoning |
|---|---|
| JWT instead of sessions | Stateless, so the API scales easily and works with any client. Cost: tokens can't be revoked before expiry unless you add a blocklist. |
| Centralised error middleware | One place maps Mongoose errors (validation, cast, duplicate key) to clean 400/409 responses. Controllers just call `next(err)`. |
| `findOneAndUpdate({_id, user})` | Authorisation and the query in one atomic DB call. A missing or foreign task both return 404. |
| Server-side filtering and pagination | Don't send everything to the browser. The client asks for exactly what it needs. |
| `select:false` on password | Safe by default, so you can't leak the hash by accident. |
| Mongoose validation plus DB constraints | Validation gives friendly messages, and the unique index guarantees integrity under race conditions. |

---

## 11. Challenges and how to talk about them

Use the STAR format (Situation, Task, Action, Result). Pick real ones from your own experience. Strong examples that
fit this project:

1. **Refresh logs the user out.** The token was stored but the user state was lost on reload. I added a `/auth/me` check
   on startup and a `loading` state to prevent a flash of the login page.
2. **Stale UI / slow feel when moving tasks.** I switched to optimistic updates with rollback.
3. **API hammered while typing in search.** I added a debounce.
4. **Deployment failure.** The app worked locally, but the container needed to listen on Cloud Run's `PORT`,
   and the DB needed Atlas network access.
5. **Users reading each other's data (IDOR risk).** I scoped every query by `user`, so a foreign id returns 404.

---

## 12. Limitations and future improvements

Mention these proactively. It shows maturity.

- **Testing:** add Jest and Supertest for API tests, React Testing Library for UI.
- **Validation:** add `express-validator` or Zod for request schemas.
- **Auth:** refresh tokens and httpOnly cookies, email verification, password reset.
- **Features:** drag-and-drop (dnd-kit), labels, subtasks, due-date reminders (cron or Cloud Scheduler), team workspaces.
- **Performance:** cursor-based pagination, React Query for caching, `React.memo` for large lists.
- **DevOps:** CI/CD with GitHub Actions to Cloud Run, structured logging, monitoring with Cloud Logging.
- **Real-time:** Socket.IO or WebSockets so changes sync across devices.

---

## 13. Question bank with model answers

### MERN basics
**Q: What is the MERN stack and how do the parts talk to each other?**
MongoDB (database), Express (web framework for Node), React (UI), Node.js (JavaScript runtime). React calls Express REST
endpoints over HTTP with JSON, Express uses Mongoose to read and write MongoDB, and everything uses JavaScript.

**Q: What is Express middleware?**
A function `(req, res, next)` that runs between the request and the final handler. Mine include `express.json`, `helmet`,
`cors`, rate limiter, `protect`, and the error handler. Order matters because they run top to bottom.

**Q: How does the error-handling middleware differ?**
It has four parameters `(err, req, res, next)`. Express recognises it by that signature, and it must be registered last.

**Q: What is Mongoose and why use it?**
An ODM for MongoDB. It adds schemas, validation, middleware hooks (pre-save), population, and cleaner query APIs.

**Q: What does `async/await` do here, and how are errors handled?**
It makes asynchronous DB calls read sequentially. I wrap them in try/catch and call `next(err)`, so the central handler responds.

### Authentication
**Q: Explain JWT.**
Three base64url parts: header, payload, signature. The server signs the header and payload with a secret. On each request it
re-computes the signature, and if it matches and the token hasn't expired, the payload can be trusted. It is **signed, not
encrypted**, so don't put sensitive data in it. I only store the user id.

**Q: JWT vs session authentication?**
Sessions store state on the server (memory or Redis) and send a session id cookie. JWT is stateless, since the token carries the
identity. JWT scales without a shared store but is harder to revoke. Sessions are easy to revoke but need storage.

**Q: Why hash instead of encrypt passwords?**
Hashing is one-way. Even we can't recover the original. Encryption is reversible, so if the key leaks, every password leaks.

**Q: What's a salt?**
Random data added before hashing, so identical passwords get different hashes and rainbow tables don't work. bcrypt embeds
the salt in the hash string.

**Q: How would you log a user out everywhere or revoke a token?**
Keep a token blocklist or a `tokenVersion` on the user and embed it in the JWT. Or use short-lived access tokens plus revocable refresh tokens.

**Q: Authentication vs authorisation?**
Authentication is who you are (the JWT check). Authorisation is what you may do (a user can only access their own tasks).

### Database
**Q: What's an index and why did you add one?**
A data structure (B-tree) that lets the DB find documents without scanning the whole collection. I indexed `user` and
`{user, status, createdAt}` because every query filters by user. Trade-off: indexes use memory and slow writes slightly.

**Q: Embedding vs referencing?**
Embed when data is small, bounded and read together. Reference when it's unbounded, large, or queried on its own. Tasks are unbounded, so I referenced.

**Q: What is the aggregation pipeline?**
A multi-stage data-processing framework (`$match`, `$group`, `$sort`, `$project`). I use `$match` then `$group` to count tasks by status in the database.

**Q: How would you implement pagination at scale?**
Offset pagination (`skip/limit`) is what I built. It slows down on deep pages. For scale, use cursor-based pagination
keyed on `_id` or `createdAt`.

**Q: SQL vs NoSQL?**
SQL has fixed schemas, joins and ACID transactions, and suits relational data. NoSQL (document) is flexible, scales horizontally
and fits JSON-shaped data. It depends on the access patterns.

### React
**Q: What is the virtual DOM?**
An in-memory representation of the UI. On state change React builds a new tree, diffs it against the previous one, and
updates only the changed real DOM nodes.

**Q: Why do list items need a `key`?**
It lets React identify which items changed, moved or were removed, and prevents wrong re-use of state and DOM. I use the
Mongo `_id`, not the array index.

**Q: Controlled vs uncontrolled inputs?**
Controlled inputs have their value held in React state (`value` plus `onChange`). Uncontrolled inputs keep the value in the DOM, read via refs.

**Q: What's the dependency array in `useEffect`?**
It controls when the effect re-runs. `[]` runs once on mount. `[filters]` runs when filters change. The return function is cleanup, which I use to cancel the debounce timer.

**Q: Why Context instead of Redux?**
Auth state is small and changes rarely, so Context is enough. Redux or Zustand help when state is large, frequently
updated, or shared across many unrelated components.

**Q: How do you avoid unnecessary re-renders?**
`React.memo`, `useCallback`, `useMemo`, keeping state close to where it's used, and stable keys.

### Node and backend
**Q: Is Node single-threaded? How does it handle concurrency?**
The JS runs on one thread with an **event loop**. I/O (DB, network) is delegated to the OS or libuv thread pool and
callbacks or promises resume when it's done. CPU-heavy work blocks the loop, so use worker threads or a separate service.

**Q: What is CORS and why did you need it?**
A browser security rule that blocks cross-origin requests unless the server allows them via headers. In dev I avoid it
with Vite's proxy, and in production the frontend and API share one origin. The `cors` middleware is configured for other cases.

**Q: What are the HTTP status codes you use?**
200 OK, 201 Created, 400 Bad Request, 401 Unauthorized (not authenticated), 403 Forbidden (not allowed), 404 Not Found,
409 Conflict (duplicate email), 500 Server Error.

**Q: PUT vs PATCH?**
PUT replaces a resource, PATCH partially updates. My `PUT` really behaves like PATCH because it only updates the fields sent.
Strictly, `PATCH` would be more correct, and I'd change it.

**Q: How would you scale this backend?**
It's stateless, so run multiple instances (Cloud Run does this automatically) behind a load balancer. Add Atlas replica
sets or sharding, caching with Redis, and move static assets to a CDN.

### Deployment and DevOps
**Q: What is Docker and why use it?**
It packages the app and its dependencies into an image that runs the same everywhere, which removes "works on my machine".

**Q: What's a multi-stage build?**
Several `FROM` stages in one Dockerfile. I build React in the first stage and copy only the output into a slim final image, so build tools aren't shipped.

**Q: Cloud Run vs Compute Engine vs App Engine?**
Compute Engine is VMs (full control, you manage everything). App Engine is a PaaS where you deploy code. Cloud Run is serverless containers (portable, scale to zero).

**Q: How do you manage secrets?**
Environment variables locally via `.env` (git-ignored), and Secret Manager in GCP, injected with `--set-secrets`. Never hard-coded or committed.

### Behavioural / project
**Q: What would you do differently?**
Add automated tests and CI/CD first, use TypeScript, request validation with Zod, httpOnly-cookie refresh tokens, and drag-and-drop on the board.

**Q: What are you most proud of?**
Pick one: the ownership-scoped queries that make cross-user access impossible, or the optimistic UI.

**Q: How did you test it?**
Postman for every endpoint (success and failure cases) and manual browser testing. Next step is Jest and Supertest.
Be honest about what you did.

---

## 14. Tricky follow-ups

- **"What if two users register with the same email at the same time?"**
  The unique index guarantees only one succeeds, and the other gets a duplicate-key error (code 11000), which I map to HTTP 409.
- **"What if I send `?status[$ne]=done`?"**
  Express's query parser can turn that into an object. I wrap it in `String()` so it's treated as a plain value and can't be used as an operator.
- **"Where could this app be attacked?"**
  XSS stealing the localStorage token, brute-forcing login (mitigated by rate limiting), NoSQL injection (mitigated by casting and whitelisting), and leaked env secrets.
- **"What happens if the JWT secret leaks?"**
  Anyone can forge tokens. Rotate the secret, which invalidates all tokens and forces re-login.
- **"What if a user has 100,000 tasks?"**
  The server paginates (`limit` capped at 100) and indexes keep queries fast. The UI would need virtualised lists or infinite scroll.
- **"How does the app behave if the DB goes down?"**
  `connectDB` failure at startup exits the process so Cloud Run restarts it. Mid-run, queries reject and the error handler returns 500 with a generic message.

---

## 15. Resume bullet to talking points

| Resume bullet | Be ready to explain |
|---|---|
| "supporting user authentication and CRUD operations" | Section 3 (flows), Section 6 (security), Section 5 (API) |
| "responsive React frontend and RESTful Node.js/Express backend with MongoDB" | Section 2, Section 4, Section 7 |
| "Deployed on Google Cloud Platform" | Section 8: Docker, Cloud Run, Atlas, env vars |
| "Git and GitHub with a structured workflow" | Section 9: branches, PRs, commit conventions |

---

## 16. Interview-day checklist

- [ ] Project runs locally with no errors and has sample data
- [ ] Live URL works, and you can show the deployment in the GCP console
- [ ] GitHub repo has a clear README and a sensible commit history
- [ ] You can draw the architecture and the auth flow from memory
- [ ] You can open any file and explain every line
- [ ] You have 2-3 real challenges prepared in STAR format
- [ ] You know the limitations and the improvements you'd make
- [ ] Revise the core concepts: closures, promises, the event loop, `this`, hoisting, REST, indexing, HTTP
