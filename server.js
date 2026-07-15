const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, "public");
const DATA_DIR = path.join(__dirname, "data");
const DATA_FILE = path.join(DATA_DIR, "tasks.json");
const PACKAGE_FILE = path.join(__dirname, "package.json");
let DATA_VERSION = Date.now();
const CHANGE_STREAM_CLIENTS = new Set();
let APP_VERSION = "0.0.0";
let APP_ASSET_VERSION = Date.now().toString();
let APP_NAME = "Taskit";
let APP_TAGLINE = "Simple chores and tasks tracker";

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".ico": "image/x-icon"
};

function loadAppVersion() {
  try {
    const pkg = JSON.parse(fs.readFileSync(PACKAGE_FILE, "utf-8"));
    APP_VERSION = typeof pkg.version === "string" ? pkg.version : "0.0.0";
    APP_ASSET_VERSION = `${APP_VERSION}-${Date.now()}`;

    const branding = pkg && pkg.taskitBrand && typeof pkg.taskitBrand === "object"
      ? pkg.taskitBrand
      : {};

    APP_NAME = typeof branding.appName === "string" && branding.appName.trim()
      ? branding.appName.trim()
      : "Taskit";
    APP_TAGLINE = typeof branding.tagline === "string" && branding.tagline.trim()
      ? branding.tagline.trim()
      : "Simple chores and tasks tracker";
  } catch (err) {
    APP_VERSION = "0.0.0";
    APP_ASSET_VERSION = `0.0.0-${Date.now()}`;
    APP_NAME = "Taskit";
    APP_TAGLINE = "Simple chores and tasks tracker";
  }
}

loadAppVersion();

function ensureDataFile() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify({ tasks: [], groceries: [], completedGroceries: [], assignees: [] }, null, 2), "utf-8");
  }

  try {
    const stats = fs.statSync(DATA_FILE);
    const mtimeMs = Math.floor(stats.mtimeMs || Date.now());
    if (mtimeMs > DATA_VERSION) {
      DATA_VERSION = mtimeMs;
    }
  } catch (err) {
    DATA_VERSION = Date.now();
  }
}

function readTasks() {
  ensureDataFile();
  const raw = fs.readFileSync(DATA_FILE, "utf-8");
  const parsed = JSON.parse(raw);

  if (!parsed) {
    return { tasks: [], groceries: [], completedGroceries: [], assignees: [] };
  }

  if (!Array.isArray(parsed.tasks)) {
    parsed.tasks = [];
  }
  if (!Array.isArray(parsed.groceries)) {
    parsed.groceries = [];
  }
  if (!Array.isArray(parsed.assignees)) {
    parsed.assignees = [];
  }
  if (!Array.isArray(parsed.completedGroceries)) {
    parsed.completedGroceries = [];
  }

  parsed.assignees = parsed.assignees
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter((item, index, list) => item && list.indexOf(item) === index);

  parsed.tasks = parsed.tasks.map((task) => {
    if (!task || typeof task !== "object") {
      return task;
    }

    task.assignee = typeof task.assignee === "string" ? task.assignee.trim() : "";
    return task;
  });

  return parsed;
}

function writeTasks(data) {
  ensureDataFile();
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), "utf-8");
  DATA_VERSION = Date.now();
  broadcastTaskDataChanged();
}

function broadcastTaskDataChanged() {
  const payload = `data: ${JSON.stringify({ version: DATA_VERSION })}\n\n`;

  for (const client of CHANGE_STREAM_CLIENTS) {
    try {
      client.res.write(payload);
    } catch (err) {
      CHANGE_STREAM_CLIENTS.delete(client);
      if (client.pingTimer) {
        clearInterval(client.pingTimer);
      }
    }
  }
}

function sendJson(res, statusCode, payload) {
  const json = JSON.stringify(payload);
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(json)
  });
  res.end(json);
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";

    req.on("data", (chunk) => {
      body += chunk;

      if (body.length > 1_000_000) {
        reject(new Error("Payload too large"));
      }
    });

    req.on("end", () => {
      if (!body) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(body));
      } catch (err) {
        reject(new Error("Invalid JSON"));
      }
    });

    req.on("error", reject);
  });
}

function safeJoinStatic(baseDir, requestPath) {
  const normalized = path.normalize(requestPath).replace(/^([.][.][/\\])+/, "");
  return path.join(baseDir, normalized);
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderHtmlTemplate(input) {
  return String(input)
    .replace(/\{\{APP_NAME\}\}/g, escapeHtml(APP_NAME))
    .replace(/\{\{APP_TAGLINE\}\}/g, escapeHtml(APP_TAGLINE))
    .replace(/\{\{APP_VERSION\}\}/g, escapeHtml(APP_VERSION))
    .replace(/\{\{APP_ASSET_VERSION\}\}/g, escapeHtml(APP_ASSET_VERSION));
}

function serveStatic(req, res) {
  let requestPath = req.url === "/" ? "/index.html" : req.url;
  requestPath = requestPath.split("?")[0];

  const filePath = safeJoinStatic(PUBLIC_DIR, requestPath);

  if (!filePath.startsWith(PUBLIC_DIR)) {
    sendJson(res, 400, { error: "Bad request" });
    return;
  }

  fs.stat(filePath, (statErr, stats) => {
    if (statErr || !stats.isFile()) {
      sendJson(res, 404, { error: "Not found" });
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || "application/octet-stream";

    if (ext === ".html") {
      fs.readFile(filePath, "utf-8", (readErr, content) => {
        if (readErr) {
          sendJson(res, 500, { error: "Failed to read file" });
          return;
        }

        const rendered = renderHtmlTemplate(content);
        res.writeHead(200, {
          "Content-Type": contentType,
          "Content-Length": Buffer.byteLength(rendered)
        });
        res.end(rendered);
      });
      return;
    }

    res.writeHead(200, { "Content-Type": contentType });
    fs.createReadStream(filePath).pipe(res);
  });
}

function validateTaskInput(input) {
  if (!input || typeof input !== "object") {
    return "Task payload is required";
  }

  if (typeof input.title !== "string" || !input.title.trim()) {
    return "Task title is required";
  }

  if (input.assignee !== undefined && (typeof input.assignee !== "string" || input.assignee.trim().length > 60)) {
    return "Assignee must be 60 characters or fewer";
  }

  if (!input.schedule || typeof input.schedule !== "object") {
    return "Task schedule is required";
  }

  const schedule = input.schedule;
  const validTypes = ["oneTime", "daily", "everyOtherDay", "weekly", "multiWeekly", "monthly", "yearly"];

  if (!validTypes.includes(schedule.type)) {
    return "Invalid schedule type";
  }

  if ((schedule.type === "weekly" || schedule.type === "multiWeekly") && !Array.isArray(schedule.daysOfWeek)) {
    return "daysOfWeek is required for weekly schedules";
  }

  if ((schedule.type === "weekly" || schedule.type === "multiWeekly") && schedule.daysOfWeek.length === 0) {
    return "At least one day must be selected";
  }

  if (
    schedule.type === "monthly" &&
    schedule.dayOfMonth !== undefined &&
    (typeof schedule.dayOfMonth !== "number" || schedule.dayOfMonth < 1 || schedule.dayOfMonth > 31)
  ) {
    return "dayOfMonth must be between 1 and 31";
  }

  if (
    schedule.type === "yearly" &&
    (typeof schedule.month !== "number" || schedule.month < 1 || schedule.month > 12 || typeof schedule.day !== "number" || schedule.day < 1 || schedule.day > 31)
  ) {
    return "Valid month/day is required for yearly schedule";
  }

  return null;
}

function normalizeAssigneeName(value) {
  return typeof value === "string" ? value.trim() : "";
}

function validateAssigneeName(name) {
  if (!name) {
    return "Assignee name is required";
  }

  if (name.length > 60) {
    return "Assignee must be 60 characters or fewer";
  }

  return null;
}

function findAssigneeIndex(assignees, name) {
  const normalized = String(name).toLowerCase();
  return assignees.findIndex((item) => String(item).toLowerCase() === normalized);
}

function handleApi(req, res) {
  const url = req.url.split("?")[0];

  if (req.method === "GET" && url === "/api/tasks") {
    const db = readTasks();
    sendJson(res, 200, {
      tasks: db.tasks,
      groceries: db.groceries,
      completedGroceries: db.completedGroceries,
      assignees: db.assignees,
      version: DATA_VERSION
    });
    return;
  }

  if (req.method === "POST" && url === "/api/assignees") {
    parseBody(req)
      .then((body) => {
        const db = readTasks();
        const name = normalizeAssigneeName(body && body.name);
        const validationError = validateAssigneeName(name);

        if (validationError) {
          sendJson(res, 400, { error: validationError });
          return;
        }

        if (findAssigneeIndex(db.assignees, name) !== -1) {
          sendJson(res, 400, { error: "Assignee already exists" });
          return;
        }

        db.assignees.push(name);
        db.assignees.sort((a, b) => a.localeCompare(b));
        writeTasks(db);

        sendJson(res, 201, { assignees: db.assignees });
      })
      .catch((err) => {
        sendJson(res, 400, { error: err.message || "Bad request" });
      });
    return;
  }

  if (req.method === "DELETE" && url.startsWith("/api/assignees/")) {
    const name = normalizeAssigneeName(decodeURIComponent(url.split("/")[3] || ""));
    const db = readTasks();
    const index = findAssigneeIndex(db.assignees, name);

    if (index === -1) {
      sendJson(res, 404, { error: "Assignee not found" });
      return;
    }

    const deletedName = db.assignees[index];
    db.assignees.splice(index, 1);
    db.tasks.forEach((task) => {
      if (task && task.assignee === deletedName) {
        task.assignee = "";
        task.updatedAt = new Date().toISOString();
      }
    });
    writeTasks(db);

    sendJson(res, 200, { assignees: db.assignees });
    return;
  }

  if (req.method === "GET" && url === "/api/tasks/version") {
    res.writeHead(200, {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store, no-cache, must-revalidate",
      Pragma: "no-cache"
    });
    res.end(JSON.stringify({ version: DATA_VERSION }));
    return;
  }

  if (req.method === "GET" && url === "/api/app-version") {
    sendJson(res, 200, {
      version: APP_VERSION
    });
    return;
  }

  if (req.method === "GET" && url === "/api/tasks/changes") {
    res.writeHead(200, {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-store, no-cache, must-revalidate",
      Connection: "keep-alive"
    });

    const client = {
      res,
      pingTimer: setInterval(() => {
        try {
          res.write(": ping\n\n");
        } catch (err) {
        }
      }, 25000)
    };

    CHANGE_STREAM_CLIENTS.add(client);
    res.write(`data: ${JSON.stringify({ version: DATA_VERSION })}\n\n`);

    req.on("close", () => {
      CHANGE_STREAM_CLIENTS.delete(client);
      if (client.pingTimer) {
        clearInterval(client.pingTimer);
      }
    });

    return;
  }

  if (req.method === "POST" && url === "/api/tasks") {
    parseBody(req)
      .then((body) => {
        const validationError = validateTaskInput(body);

        if (validationError) {
          sendJson(res, 400, { error: validationError });
          return;
        }

        const db = readTasks();
        const assignee = normalizeAssigneeName(body.assignee);

        if (assignee && findAssigneeIndex(db.assignees, assignee) === -1) {
          sendJson(res, 400, { error: "Choose an assignee from Settings" });
          return;
        }

        const now = new Date().toISOString();
        const task = {
          id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
          title: body.title.trim(),
          assignee: assignee,
          schedule: body.schedule,
          startDate: body.startDate || now.slice(0, 10),
          completions: {},
          createdAt: now,
          updatedAt: now
        };

        db.tasks.push(task);
        writeTasks(db);

        sendJson(res, 201, task);
      })
      .catch((err) => {
        sendJson(res, 400, { error: err.message || "Bad request" });
      });
    return;
  }

  if (req.method === "PATCH" && url.startsWith("/api/tasks/") && url.endsWith("/completion")) {
    parseBody(req)
      .then((body) => {
        const parts = url.split("/");
        const taskId = parts[3];

        if (typeof body.date !== "string" || !body.date) {
          sendJson(res, 400, { error: "date is required" });
          return;
        }

        const db = readTasks();
        const assignee = normalizeAssigneeName(body.assignee);
        const task = db.tasks.find((item) => item.id === taskId);

        if (!task) {
          sendJson(res, 404, { error: "Task not found" });
          return;
        }

        if (assignee && findAssigneeIndex(db.assignees, assignee) === -1) {
          sendJson(res, 400, { error: "Choose an assignee from Settings" });
          return;
        }

        if (body.completed === true) {
          task.completions[body.date] = true;
        } else {
          delete task.completions[body.date];
        }

        task.updatedAt = new Date().toISOString();
        writeTasks(db);

        sendJson(res, 200, task);
      })
      .catch((err) => {
        sendJson(res, 400, { error: err.message || "Bad request" });
      });
    return;
  }

  if (req.method === "PATCH" && url.startsWith("/api/tasks/") && !url.endsWith("/completion")) {
    parseBody(req)
      .then((body) => {
        const validationError = validateTaskInput(body);

        if (validationError) {
          sendJson(res, 400, { error: validationError });
          return;
        }

        const parts = url.split("/");
        const taskId = parts[3];
        const db = readTasks();
        const task = db.tasks.find((item) => item.id === taskId);
        const assignee = normalizeAssigneeName(body.assignee);

        if (!task) {
          sendJson(res, 404, { error: "Task not found" });
          return;
        }

        if (assignee && findAssigneeIndex(db.assignees, assignee) === -1) {
          sendJson(res, 400, { error: "Choose an assignee from Settings" });
          return;
        }

        const existingSchedule = JSON.stringify(task.schedule || {});
        const nextSchedule = JSON.stringify(body.schedule || {});
        const scheduleChanged = existingSchedule !== nextSchedule;

        task.title = body.title.trim();
        task.assignee = assignee;
        task.schedule = body.schedule;

        if (scheduleChanged) {
          task.startDate = body.startDate || new Date().toISOString().slice(0, 10);
          task.completions = {};
        }

        task.updatedAt = new Date().toISOString();
        writeTasks(db);

        sendJson(res, 200, task);
      })
      .catch((err) => {
        sendJson(res, 400, { error: err.message || "Bad request" });
      });
    return;
  }

  if (req.method === "DELETE" && url.startsWith("/api/tasks/")) {
    const parts = url.split("/");
    const taskId = parts[3];
    const db = readTasks();
    const nextTasks = db.tasks.filter((task) => task.id !== taskId);

    if (nextTasks.length === db.tasks.length) {
      sendJson(res, 404, { error: "Task not found" });
      return;
    }

    db.tasks = nextTasks;
    writeTasks(db);

    sendJson(res, 200, { ok: true });
    return;
  }

  if (req.method === "POST" && url === "/api/groceries") {
    parseBody(req)
      .then((body) => {
        if (!body || typeof body !== "object") {
          sendJson(res, 400, { error: "Invalid request" });
          return;
        }

        if (typeof body.title !== "string" || !body.title.trim()) {
          sendJson(res, 400, { error: "Grocery title is required" });
          return;
        }

        const category = ["Costco", "Grocery Store", "Other"].includes(body.category)
          ? body.category
          : "Grocery Store";

        const db = readTasks();
        const now = new Date().toISOString();
        const grocery = {
          id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
          title: body.title.trim(),
          category: category,
          createdAt: now
        };

        db.groceries.push(grocery);
        writeTasks(db);

        sendJson(res, 201, grocery);
      })
      .catch((err) => {
        sendJson(res, 400, { error: err.message || "Bad request" });
      });
    return;
  }

  if (req.method === "PATCH" && url.startsWith("/api/groceries/") && url.endsWith("/completion")) {
    parseBody(req)
      .then((body) => {
        const parts = url.split("/");
        const groceryId = parts[3];
        const db = readTasks();
        const completed = body && body.completed === true;

        if (completed) {
          const index = db.groceries.findIndex((item) => item.id === groceryId);
          if (index === -1) {
            sendJson(res, 404, { error: "Grocery item not found" });
            return;
          }

          const grocery = db.groceries[index];
          db.groceries.splice(index, 1);
          db.completedGroceries.push({
            id: grocery.id,
            title: grocery.title,
            category: grocery.category,
            createdAt: grocery.createdAt,
            completedAt: typeof body.completedAt === "string" && body.completedAt ? body.completedAt : new Date().toISOString()
          });
          writeTasks(db);
          sendJson(res, 200, { ok: true });
          return;
        }

        const doneIndex = db.completedGroceries.findIndex((item) => item.id === groceryId);
        if (doneIndex === -1) {
          sendJson(res, 404, { error: "Completed grocery item not found" });
          return;
        }

        const completedItem = db.completedGroceries[doneIndex];
        db.completedGroceries.splice(doneIndex, 1);
        db.groceries.push({
          id: completedItem.id,
          title: completedItem.title,
          category: completedItem.category,
          createdAt: completedItem.createdAt || new Date().toISOString()
        });
        writeTasks(db);
        sendJson(res, 200, { ok: true });
      })
      .catch((err) => {
        sendJson(res, 400, { error: err.message || "Bad request" });
      });
    return;
  }

  if (req.method === "DELETE" && url.startsWith("/api/groceries/")) {
    const parts = url.split("/");
    const groceryId = parts[3];
    const db = readTasks();
    const nextGroceries = db.groceries.filter((item) => item.id !== groceryId);
    const nextCompletedGroceries = db.completedGroceries.filter((item) => item.id !== groceryId);

    if (nextGroceries.length === db.groceries.length && nextCompletedGroceries.length === db.completedGroceries.length) {
      sendJson(res, 404, { error: "Grocery item not found" });
      return;
    }

    db.groceries = nextGroceries;
    db.completedGroceries = nextCompletedGroceries;
    writeTasks(db);

    sendJson(res, 200, { ok: true });
    return;
  }

  sendJson(res, 404, { error: "API endpoint not found" });
}

const server = http.createServer((req, res) => {
  if (req.url.startsWith("/api/")) {
    handleApi(req, res);
    return;
  }

  serveStatic(req, res);
});

server.listen(PORT, () => {
  console.log(`Taskit app running at http://localhost:${PORT}`);
});
