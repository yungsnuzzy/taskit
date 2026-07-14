# Taskit

Dead simple chores and task tracker with:

- Today view with live day/date/time
- Add task flow with recurrence options
- Rolling 7-day view in sidebar
- Month calendar view of due tasks
- Local file storage (no login, no cloud)

<img width="1125" height="2066" alt="68A8AD5B-572E-4A31-A186-6E1A82AD3958" src="https://github.com/user-attachments/assets/9490ea46-d7f4-4d1c-89f9-56fd9c5a26c3" />


## Run

1. Install Node.js 16+
2. In this folder run:

   npm start

3. Open: http://localhost:3000

Task data is stored in `data/tasks.json`.

## Docker Timezone (TZ)

When running with Docker Compose, you can set a standard timezone ID using `TZ` (for example, `America/New_York`, `Europe/London`, `Asia/Tokyo`).

Option 1: set it inline when starting:

```powershell
$env:TZ="America/New_York"; docker compose up -d --build
```

Option 2: add it to a local `.env` file in the project root:

```dotenv
TZ=America/New_York
```

Then run:

```powershell
docker compose up -d --build
```
