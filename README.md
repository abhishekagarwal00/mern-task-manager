# TaskFlow — MERN Task Management App

A full-stack task manager: register/login with JWT, then create, edit, move and delete tasks on a
three-column board (To do / In progress / Done) with search, priority filter and sorting.

**Stack:** MongoDB (Mongoose) · Express.js · React 18 (Vite) · Node.js · JWT · bcrypt · Docker · Google Cloud Run

## Project structure
```
taskflow/
├── server/                 # Express REST API
│   ├── config/db.js        # MongoDB connection
│   ├── models/             # User, Task (Mongoose schemas)
│   ├── controllers/        # business logic (auth, tasks)
│   ├── routes/             # URL -> controller mapping
│   ├── middleware/         # JWT protect, error handler
│   └── server.js           # app entry
├── client/                 # React SPA (Vite)
│   └── src/ (pages, components, context, api.js)
├── Dockerfile              # multi-stage build for GCP
└── INTERVIEW_GUIDE.md
```

## Run locally
Prerequisites: Node 18+, and MongoDB running locally **or** a free MongoDB Atlas cluster.

```bash
npm run install:all
cp server/.env.example server/.env      # then edit MONGO_URI and JWT_SECRET
npm run dev:server                       # terminal 1 -> http://localhost:5000
npm run dev:client                       # terminal 2 -> http://localhost:5173
```

## API
| Method | Endpoint | Auth | Purpose |
|---|---|---|---|
| POST | /api/auth/register | – | create account, returns JWT |
| POST | /api/auth/login | – | log in, returns JWT |
| GET | /api/auth/me | ✔ | current user |
| GET | /api/tasks | ✔ | list (query: status, priority, search, sort, page, limit) |
| GET | /api/tasks/stats | ✔ | counts per status |
| POST | /api/tasks | ✔ | create task |
| PUT | /api/tasks/:id | ✔ | update task |
| DELETE | /api/tasks/:id | ✔ | delete task |

Test quickly with Postman or curl:
```bash
curl -X POST localhost:5000/api/auth/register -H "Content-Type: application/json" \
  -d '{"name":"Abhishek","email":"a@test.com","password":"secret1"}'
```

## Deploy to Google Cloud Run
1. Create a free **MongoDB Atlas** cluster, add a database user, and allow network access
   (for Cloud Run use `0.0.0.0/0` while learning; tighten later). Copy the connection string.
2. Install the gcloud CLI, then:
```bash
gcloud auth login
gcloud config set project YOUR_PROJECT_ID
gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com

# builds the Dockerfile with Cloud Build and deploys it
gcloud run deploy taskflow \
  --source . \
  --region asia-south1 \
  --allow-unauthenticated \
  --set-env-vars "NODE_ENV=production,MONGO_URI=<atlas-uri>,JWT_SECRET=<long-random-string>"
```
3. Cloud Run prints a public HTTPS URL — that's your live app.
4. Better practice: store secrets in **Secret Manager** and use `--set-secrets` instead of `--set-env-vars`.

## Git workflow
```bash
git init && git add . && git commit -m "feat: initial MERN task manager"
git branch -M main
git remote add origin https://github.com/<you>/taskflow.git && git push -u origin main
```
Use feature branches (`feature/task-filters`) and conventional commit messages (`feat:`, `fix:`, `docs:`).
