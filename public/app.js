(function () {
  var state = {
    tasks: [],
    groceries: [],
    completedGroceries: [],
    assignees: [],
    currentDate: new Date(),
    calendarYear: new Date().getFullYear(),
    calendarMonth: new Date().getMonth(),
    editingTaskId: null,
    dataVersion: null,
    autoRefreshStarted: false,
    liveReloadMode: "off",
    disableConfetti: false,
    simpleCheckboxMode: false,
    preIOS10Mode: false,
    themeHydrated: false,
    openSwipeDeleteRow: null,
    calendarExpandedDateKey: null,
    completedView: "tasks",
    pendingTaskUndo: null,
    undoToastIntervalId: null,
    debug: {
      enabled: false,
      loader: "init",
      status: "-",
      taskCount: 0,
      visibleToday: 0,
      lastError: "none",
      lastUpdated: "-"
    }
  };

  var WEEKDAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  var MONTH_NAMES = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December"
  ];

  var EMOJI_RULES = [
    { emoji: "🧹", words: ["clean", "sweep", "mop", "vacuum", "dust", "tidy"] },
    { emoji: "🧺", words: ["laundry", "wash clothes", "fold clothes"] },
    { emoji: "🗑️", words: ["trash", "garbage", "bin", "recycling"] },
    { emoji: "🍽️", words: ["dish", "kitchen", "cook", "meal", "food"] },
    { emoji: "🛒", words: ["grocery", "shop", "shopping", "market"] },
    { emoji: "🚿", words: ["shower", "bath", "toilet", "bathroom"] },
    { emoji: "🧼", words: ["sanitize", "soap", "wipe", "disinfect"] },
    { emoji: "🐶", words: ["dog", "walk dog", "feed dog", "pet"] },
    { emoji: "🐱", words: ["cat", "litter", "feed cat"] },
    { emoji: "🌱", words: ["water", "plant", "garden", "yard", "lawn"] },
    { emoji: "🚗", words: ["car", "drive", "gas", "fuel", "wash car"] },
    { emoji: "💊", words: ["medicine", "meds", "pill", "vitamin"] },
    { emoji: "🏋️", words: ["workout", "exercise", "gym", "run"] },
    { emoji: "📚", words: ["study", "read", "homework", "class"] },
    { emoji: "💼", words: ["work", "email", "meeting", "project"] },
    { emoji: "💰", words: ["bill", "budget", "finance", "bank", "pay"] }
  ];

  var elements = {
    leftSidebar: document.getElementById("left-sidebar"),
    sidebarToggle: document.getElementById("sidebar-toggle"),
    appVersion: document.getElementById("app-version"),
    textSmaller: document.getElementById("text-smaller"),
    textReset: document.getElementById("text-reset"),
    textBigger: document.getElementById("text-bigger"),
    toggleDebug: document.getElementById("toggle-debug"),
    themeBright: document.getElementById("theme-bright"),
    themeDark: document.getElementById("theme-dark"),
    testConfetti: document.getElementById("test-confetti"),
    weekday: document.getElementById("weekday"),
    date: document.getElementById("date"),
    time: document.getElementById("time"),
    openTaskModal: document.getElementById("open-task-modal"),
    taskModal: document.getElementById("task-modal"),
    taskModalBackdrop: document.getElementById("task-modal-backdrop"),
    closeTaskModal: document.getElementById("close-task-modal"),
    taskModalTitle: document.getElementById("task-modal-title"),
    taskForm: document.getElementById("task-form"),
    taskFormSubmit: document.querySelector("#task-form button[type='submit']"),
    taskTitle: document.getElementById("task-title"),
    taskAssignee: document.getElementById("task-assignee"),
    frequency: document.getElementById("frequency"),
    frequencyHint: document.getElementById("frequency-hint"),
    weeklyDaysGroup: document.getElementById("weekly-days-group"),
    weekdayGrid: document.getElementById("weekday-grid"),
    monthlyGroup: document.getElementById("monthly-group"),
    yearlyGroup: document.getElementById("yearly-group"),
    dayOfMonth: document.getElementById("day-of-month"),
    yearMonth: document.getElementById("year-month"),
    yearDay: document.getElementById("year-day"),
    yearlyHint: document.getElementById("yearly-hint"),
    formError: document.getElementById("form-error"),
    todayCount: document.getElementById("today-count"),
    todayList: document.getElementById("today-list"),
    completedCount: document.getElementById("completed-count"),
    completedList: document.getElementById("completed-list"),
    completedTasksTab: document.getElementById("completed-tab-tasks"),
    completedGroceriesTab: document.getElementById("completed-tab-groceries"),
    manageCount: document.getElementById("manage-count"),
    manageList: document.getElementById("manage-list"),
    rollingView: document.getElementById("rolling-view"),
    rollingGlance: document.getElementById("rolling-glance"),
    calendarTitle: document.getElementById("calendar-title"),
    calendarWeekdays: document.getElementById("calendar-weekdays"),
    calendarGrid: document.getElementById("calendar-grid"),
    prevMonth: document.getElementById("prev-month"),
    nextMonth: document.getElementById("next-month"),
    openGroceryModal: document.getElementById("open-grocery-modal"),
    groceryModal: document.getElementById("grocery-modal"),
    groceryModalBackdrop: document.getElementById("grocery-modal-backdrop"),
    closeGroceryModal: document.getElementById("close-grocery-modal"),
    groceryForm: document.getElementById("grocery-form"),
    groceryTitle: document.getElementById("grocery-title"),
    groceryCategory: document.getElementById("grocery-category"),
    groceriesCount: document.getElementById("groceries-count"),
    groceriesList: document.getElementById("groceries-list"),
    groceryFormError: document.getElementById("grocery-form-error"),
    settingsTaskTab: document.getElementById("settings-tab-tasks"),
    settingsAssigneesTab: document.getElementById("settings-tab-assignees"),
    settingsTasksPanel: document.getElementById("settings-panel-tasks"),
    settingsAssigneesPanel: document.getElementById("settings-panel-assignees"),
    assigneeForm: document.getElementById("assignee-form"),
    assigneeName: document.getElementById("assignee-name"),
    assigneeCount: document.getElementById("assignee-count"),
    assigneeList: document.getElementById("assignee-list"),
    assigneeFormError: document.getElementById("assignee-form-error"),
    debugPanel: null
  };

  function ensureSidebarVersionElement() {
    if (elements.appVersion) {
      return;
    }

    if (!elements.leftSidebar) {
      return;
    }

    var sidebarTools = elements.leftSidebar.querySelector(".sidebar-tools");
    if (!sidebarTools) {
      return;
    }

    var versionLine = document.createElement("p");
    versionLine.className = "sidebar-version";
    versionLine.innerHTML = "Version <span id='app-version'>-</span>";
    sidebarTools.appendChild(versionLine);

    elements.appVersion = document.getElementById("app-version");
  }

  function setSidebarVersionLabel(label) {
    ensureSidebarVersionElement();
    if (!elements.appVersion) {
      return;
    }

    elements.appVersion.textContent = label;
  }

  function fetchAndRenderAppVersion() {
    requestJson("GET", "/api/app-version?_t=" + Date.now())
      .then(function (data) {
        var versionLabel = data && data.version ? data.version : "-";
        setSidebarVersionLabel(versionLabel);
      })
      .catch(function () {
      });
  }

  function queryHasFlag(flagName) {
    var query = String(window.location && window.location.search ? window.location.search : "");
    if (!query) {
      return false;
    }

    query = query.replace(/^\?/, "");
    var parts = query.split("&");
    for (var i = 0; i < parts.length; i += 1) {
      var part = parts[i].split("=")[0] || "";
      if (decodeURIComponent(part) === flagName) {
        return true;
      }
    }

    return false;
  }

  function getIOSMajorVersion() {
    var ua = String(window.navigator && window.navigator.userAgent ? window.navigator.userAgent : "");
    var isIOSDevice = /iP(hone|od|ad)/.test(ua);
    if (!isIOSDevice) {
      return null;
    }

    var match = ua.match(/OS\s(\d+)_/);
    if (!match) {
      return null;
    }

    var major = Number(match[1]);
    return major > 0 ? major : null;
  }

  function getAndroidMajorVersion() {
    var ua = String(window.navigator && window.navigator.userAgent ? window.navigator.userAgent : "");
    var match = ua.match(/Android\s(\d+)/i);
    if (!match) {
      return null;
    }

    var major = Number(match[1]);
    return major > 0 ? major : null;
  }

  function supportsConfettiAnimation() {
    if (typeof window.requestAnimationFrame !== "function") {
      return false;
    }

    if (!window.CSS || typeof window.CSS.supports !== "function") {
      return false;
    }

    var supportsCustomProperties =
      window.CSS.supports("--confetti-x: 0") || window.CSS.supports("(--confetti-x: 0)");
    if (!supportsCustomProperties) {
      return false;
    }

    if (!window.CSS.supports("animation-name", "confetti-fall")) {
      return false;
    }

    if (!window.CSS.supports("transform", "translate3d(0,0,0)")) {
      return false;
    }

    return true;
  }

  function syncConfettiControls() {
    if (!elements.testConfetti) {
      return;
    }

    if (state.disableConfetti) {
      if (elements.testConfetti.parentNode) {
        elements.testConfetti.parentNode.removeChild(elements.testConfetti);
      }
      elements.testConfetti = null;
      return;
    }

    elements.testConfetti.hidden = false;
    elements.testConfetti.disabled = false;
  }

  function applyCompatibilityFlags() {
    var iosMajor = getIOSMajorVersion();
    var androidMajor = getAndroidMajorVersion();
    var isPreIOS10 = typeof iosMajor === "number" && iosMajor < 10;
    var isOldIOS = typeof iosMajor === "number" && iosMajor < 13;
    var isOldAndroid = typeof androidMajor === "number" && androidMajor < 8;
    var isLegacyDevice = isOldIOS || isOldAndroid;
    var confettiSupported = supportsConfettiAnimation();

    state.preIOS10Mode = isPreIOS10;
    state.disableConfetti = isOldIOS || isOldAndroid || !confettiSupported;
    state.simpleCheckboxMode = false;
    syncConfettiControls();

    if (document.body) {
      document.body.classList.toggle("pre-ios10", isPreIOS10);
      document.body.classList.toggle("legacy-device", isLegacyDevice);
    }

    if (isPreIOS10) {
      setDebugField("status", "pre-iOS-10 mode enabled (iOS " + iosMajor + ")");
      return;
    }

    if (isOldIOS) {
      setDebugField("status", "legacy iOS mode enabled (iOS " + iosMajor + ")");
      return;
    }

    if (isOldAndroid) {
      setDebugField("status", "legacy Android mode enabled (Android " + androidMajor + ")");
      return;
    }

    if (!confettiSupported) {
      setDebugField("status", "confetti disabled (missing browser animation features)");
    }
  }

  function formatDebugTime(date) {
    return pad2(date.getHours()) + ":" + pad2(date.getMinutes()) + ":" + pad2(date.getSeconds());
  }

  function renderDebugPanel() {
    if (!state.debug.enabled || !elements.debugPanel) {
      return;
    }

    var ua = String(window.navigator && window.navigator.userAgent ? window.navigator.userAgent : "unknown");
    if (ua.length > 90) {
      ua = ua.slice(0, 90) + "...";
    }

    var lines = [
      "Taskit Debug",
      "path: " + window.location.pathname,
      "loader: " + state.debug.loader,
      "reload mode: " + state.liveReloadMode,
      "status: " + state.debug.status,
      "tasks parsed: " + state.debug.taskCount,
      "today visible: " + state.debug.visibleToday,
      "last error: " + state.debug.lastError,
      "updated: " + state.debug.lastUpdated,
      "ua: " + ua
    ];

    elements.debugPanel.textContent = lines.join("\n");
  }

  function setDebugField(key, value) {
    state.debug[key] = String(value);
    state.debug.lastUpdated = formatDebugTime(new Date());
    renderDebugPanel();
  }

  function setUserError(message) {
    if (elements.formError) {
      elements.formError.textContent = message;
    }
    setDebugField("lastError", message);
  }

  function syncDebugToggleButtonLabel() {
    if (!elements.toggleDebug) {
      return;
    }

    elements.toggleDebug.textContent = state.debug.enabled ? "Debug: On" : "Debug: Off";
  }

  function toggleDebugPanelSetting() {
    state.debug.enabled = !state.debug.enabled;
    if (state.debug.enabled) {
      window.localStorage.setItem("taskit.debug", "1");
    } else {
      window.localStorage.removeItem("taskit.debug");
    }

    syncDebugToggleButtonLabel();
    window.location.reload();
  }

  function initDebugPanel() {
    var debugStored = window.localStorage.getItem("taskit.debug") === "1";
    var forceOff = queryHasFlag("nodebug");
    state.debug.enabled = !forceOff && (debugStored || queryHasFlag("debug"));

    syncDebugToggleButtonLabel();

    if (!state.debug.enabled) {
      return;
    }

    window.localStorage.setItem("taskit.debug", "1");

    var panel = document.createElement("pre");
    panel.className = "taskit-debug-panel";
    document.body.appendChild(panel);
    elements.debugPanel = panel;

    window.onerror = function (message, source, line, column) {
      var details = String(message || "Unknown runtime error") + " @" + String(line || "?") + ":" + String(column || "?");
      setDebugField("lastError", details);
    };

    setDebugField("status", "debug enabled");
    setDebugField("loader", "startup");
  }

  function isoDate(date) {
    return date.toISOString().slice(0, 10);
  }

  function parseLocalIsoDate(iso) {
    var parts = iso.split("-");
    return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  }

  function diffInDays(fromDate, toDate) {
    var start = new Date(fromDate.getFullYear(), fromDate.getMonth(), fromDate.getDate());
    var end = new Date(toDate.getFullYear(), toDate.getMonth(), toDate.getDate());
    var ms = end.getTime() - start.getTime();
    return Math.floor(ms / 86400000);
  }

  function startOfDay(date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }

  function isSameDate(a, b) {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  }

  function monthKey(date) {
    return "M:" + date.getFullYear() + "-" + pad2(date.getMonth() + 1);
  }

  function hasAnyCompletion(task) {
    var completions = task.completions || {};
    return Object.keys(completions).some(function (key) {
      return Boolean(completions[key]);
    });
  }

  function isWeeklySchedule(task) {
    var type = task.schedule && task.schedule.type;
    return type === "weekly" || type === "multiWeekly";
  }

  function isMonthlyCompletedInCurrentMonth(task, date) {
    var completions = task.completions || {};
    return Boolean(completions[monthKey(date)]);
  }

  function isDueOn(task, date) {
    var schedule = task.schedule;
    var start = parseLocalIsoDate(task.startDate);
    var check = startOfDay(date);

    if (check < start) {
      return false;
    }

    if (schedule.type === "daily") {
      return true;
    }

    if (schedule.type === "everyOtherDay") {
      var diff = diffInDays(start, check);
      return diff % 2 === 0;
    }

    if (schedule.type === "oneTime") {
      var today = startOfDay(state.currentDate);
      return isSameDate(check, today) && !hasAnyCompletion(task);
    }

    if (schedule.type === "weekly" || schedule.type === "multiWeekly") {
      return schedule.daysOfWeek.indexOf(check.getDay()) !== -1;
    }

    if (schedule.type === "monthly") {
      if (typeof schedule.dayOfMonth !== "number") {
        return start.getFullYear() === check.getFullYear() && start.getMonth() === check.getMonth();
      }

      return true;
    }

    if (schedule.type === "yearly") {
      var yearlyDay = Math.min(schedule.day, daysInMonth(check.getFullYear(), schedule.month - 1));
      return check.getMonth() === schedule.month - 1 && check.getDate() === yearlyDay;
    }

    return false;
  }

  function taskIsCompletedOn(task, date) {
    if (task.schedule && task.schedule.type === "monthly") {
      return isMonthlyCompletedInCurrentMonth(task, date);
    }

    if (task.schedule && task.schedule.type === "oneTime") {
      return hasAnyCompletion(task);
    }

    var key = isoDate(date);
    return Boolean(task.completions && task.completions[key]);
  }

  function getMissedWeeklyDates(task, today) {
    if (!isWeeklySchedule(task)) {
      return [];
    }

    var dates = [];
    var start = parseLocalIsoDate(task.startDate);
    var cursor = startOfDay(start);
    var dayBeforeToday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);

    while (cursor <= dayBeforeToday) {
      if (isDueOn(task, cursor) && !taskIsCompletedOn(task, cursor)) {
        dates.push(isoDate(cursor));
      }
      cursor = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() + 1);
    }

    return dates;
  }

  function getLatestMissedWeeklyDate(task, today) {
    var missedDates = getMissedWeeklyDates(task, today);
    if (missedDates.length === 0) {
      return null;
    }

    return missedDates[missedDates.length - 1];
  }

  function dueTasksForDate(date, options) {
    var includeMonthly = !options || options.includeMonthly !== false;

    return state.tasks.filter(function (task) {
      if (!includeMonthly && task.schedule && task.schedule.type === "monthly") {
        return false;
      }

      return isDueOn(task, date);
    });
  }

  function formatDateLong(date) {
    return MONTH_NAMES[date.getMonth()] + " " + date.getDate() + ", " + date.getFullYear();
  }

  function formatTime(date) {
    var hours = date.getHours();
    var minutes = date.getMinutes();
    var seconds = date.getSeconds();
    var ampm = hours >= 12 ? "PM" : "AM";
    var normalizedHour = hours % 12;
    if (normalizedHour === 0) {
      normalizedHour = 12;
    }
    return normalizedHour + ":" + pad2(minutes) + ":" + pad2(seconds) + " " + ampm;
  }

  function pad2(value) {
    return value < 10 ? "0" + value : String(value);
  }

  function daysInMonth(year, monthIndex) {
    return new Date(year, monthIndex + 1, 0).getDate();
  }

  function forEachNode(nodeList, iteratee) {
    Array.prototype.forEach.call(nodeList || [], iteratee);
  }

  function safeIsNaN(value) {
    if (typeof Number.isNaN === "function") {
      return Number.isNaN(value);
    }
    return typeof value === "number" && isNaN(value);
  }

  function closeSwipeDeleteRow(row, immediate) {
    if (!row) {
      return;
    }

    var swipeMain = row._swipeMain;
    if (!swipeMain) {
      return;
    }

    if (immediate) {
      swipeMain.style.transition = "none";
    }

    swipeMain.style.transform = "translateX(0px)";
    row.classList.remove("swipe-open");
    row.setAttribute("data-swipe-open", "0");

    if (state.openSwipeDeleteRow === row) {
      state.openSwipeDeleteRow = null;
    }

    if (row._swipeAutoCloseTimer) {
      clearTimeout(row._swipeAutoCloseTimer);
      row._swipeAutoCloseTimer = null;
    }

    if (immediate) {
      window.setTimeout(function () {
        if (swipeMain) {
          swipeMain.style.transition = "";
        }
      }, 0);
    }
  }

  function openSwipeDeleteRow(row, revealWidth) {
    if (!row || !row._swipeMain) {
      return;
    }

    if (state.openSwipeDeleteRow && state.openSwipeDeleteRow !== row) {
      closeSwipeDeleteRow(state.openSwipeDeleteRow);
    }

    row._swipeMain.style.transform = "translateX(-" + revealWidth + "px)";
    row.classList.add("swipe-open");
    row.setAttribute("data-swipe-open", "1");
    state.openSwipeDeleteRow = row;

    if (row._swipeAutoCloseTimer) {
      clearTimeout(row._swipeAutoCloseTimer);
    }

    row._swipeAutoCloseTimer = window.setTimeout(function () {
      if (row.classList.contains("swipe-open")) {
        closeSwipeDeleteRow(row);
      }
    }, 2600);
  }

  function attachSwipeDeleteControl(row, options) {
    if (!row || !options || typeof options.onDelete !== "function") {
      return;
    }

    var revealWidth = 92;
    var buttonText = options.buttonText || "Delete";
    var buttonLabel = options.buttonLabel || "Delete item";

    var swipeMain = document.createElement("div");
    swipeMain.className = "swipe-main";

    while (row.firstChild) {
      swipeMain.appendChild(row.firstChild);
    }

    var deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "swipe-delete-btn";
    deleteButton.textContent = buttonText;
    deleteButton.setAttribute("aria-label", buttonLabel);
    deleteButton.addEventListener("click", function (event) {
      event.stopPropagation();
      options.onDelete();
    });

    row.classList.add("swipe-delete-item");
    row.setAttribute("data-swipe-open", "0");
    row.appendChild(swipeMain);
    row.appendChild(deleteButton);
    row._swipeMain = swipeMain;

    var startX = 0;
    var startY = 0;
    var startOffset = 0;
    var dragging = false;
    var moved = false;

    row.addEventListener("touchstart", function (event) {
      if (!event.touches || event.touches.length !== 1) {
        return;
      }

      var touch = event.touches[0];
      startX = touch.clientX;
      startY = touch.clientY;
      dragging = false;
      moved = false;
      startOffset = row.classList.contains("swipe-open") ? -revealWidth : 0;

      if (state.openSwipeDeleteRow && state.openSwipeDeleteRow !== row) {
        closeSwipeDeleteRow(state.openSwipeDeleteRow);
      }
    }, { passive: true });

    row.addEventListener("touchmove", function (event) {
      if (!event.touches || event.touches.length !== 1) {
        return;
      }

      var touch = event.touches[0];
      var deltaX = touch.clientX - startX;
      var deltaY = touch.clientY - startY;

      if (!dragging) {
        if (Math.abs(deltaX) < 10) {
          return;
        }

        if (Math.abs(deltaX) <= Math.abs(deltaY) + 6) {
          return;
        }

        dragging = true;
      }

      event.preventDefault();
      moved = true;

      var offset = startOffset + deltaX;
      if (offset > 0) {
        offset = 0;
      }
      if (offset < -revealWidth) {
        offset = -revealWidth;
      }

      swipeMain.style.transition = "none";
      swipeMain.style.transform = "translateX(" + offset + "px)";
    }, { passive: false });

    row.addEventListener("touchend", function () {
      if (!dragging) {
        return;
      }

      swipeMain.style.transition = "";
      dragging = false;

      var transformValue = swipeMain.style.transform || "";
      var match = transformValue.match(/-?\d+/);
      var offset = match ? Number(match[0]) : 0;

      if (offset <= -52) {
        openSwipeDeleteRow(row, revealWidth);
      } else {
        closeSwipeDeleteRow(row);
      }

      if (moved) {
        row._swipeSuppressTapUntil = Date.now() + 350;
      }
    });
  }

  function shouldIgnoreRowToggleForSwipe(row) {
    if (!row) {
      return false;
    }

    var suppressUntil = row._swipeSuppressTapUntil || 0;
    if (suppressUntil && Date.now() < suppressUntil) {
      return true;
    }

    if (row.classList.contains("swipe-open")) {
      closeSwipeDeleteRow(row);
      return true;
    }

    return false;
  }

  function showFrequencyOptions() {
    if (!elements.frequency) {
      return;
    }

    var value = elements.frequency.value;
    var isWeekly = value === "weekly";
    var isMonthly = value === "monthly";
    var isYearly = value === "yearly";

    elements.weeklyDaysGroup.classList.toggle("hidden", !isWeekly);
    elements.monthlyGroup.classList.toggle("hidden", !isMonthly);
    elements.yearlyGroup.classList.toggle("hidden", !isYearly);

    setGroupInputsEnabled(elements.weeklyDaysGroup, isWeekly);
    setGroupInputsEnabled(elements.monthlyGroup, isMonthly);
    setGroupInputsEnabled(elements.yearlyGroup, isYearly);

    if (elements.yearlyHint) {
      elements.yearlyHint.classList.toggle("hidden", !isYearly);
    }

    updateFrequencyHint(value);
  }

  function setGroupInputsEnabled(groupElement, isEnabled) {
    if (!groupElement) {
      return;
    }

    var controls = groupElement.querySelectorAll("input, select");
    forEachNode(controls, function (control) {
      control.disabled = !isEnabled;
    });
  }

  function updateFrequencyHint(value) {
    if (!elements.frequencyHint) {
      return;
    }

    var hint = "";

    if (value === "oneTime") {
      hint = "Shows until checked once.";
    } else if (value === "daily") {
      hint = "Runs every day.";
    } else if (value === "everyOtherDay") {
      hint = "Runs every 2 days from the start date.";
    } else if (value === "weekly") {
      hint = "Choose one or more weekdays.";
    } else if (value === "monthly") {
      hint = "Shows through the month until completed. Day is optional.";
    } else if (value === "yearly") {
      hint = "Pick month and day for this yearly task.";
    }

    elements.frequencyHint.textContent = hint;
  }

  function createWeekdayCheckboxes() {
    if (!elements.weekdayGrid) {
      return;
    }

    elements.weekdayGrid.innerHTML = "";

    for (var i = 0; i < WEEKDAY_NAMES.length; i += 1) {
      var label = document.createElement("label");
      label.className = "weekday-check";

      var input = document.createElement("input");
      input.type = "checkbox";
      input.value = String(i);

      var span = document.createElement("span");
      span.textContent = WEEKDAY_NAMES[i].slice(0, 3);

      label.appendChild(input);
      label.appendChild(span);
      elements.weekdayGrid.appendChild(label);
    }
  }

  function createMonthOptions() {
    if (!elements.yearMonth || !elements.yearDay) {
      return;
    }

    elements.yearMonth.innerHTML = "";

    for (var i = 0; i < MONTH_NAMES.length; i += 1) {
      var option = document.createElement("option");
      option.value = String(i + 1);
      option.textContent = MONTH_NAMES[i];
      elements.yearMonth.appendChild(option);
    }

    var now = new Date();
    elements.yearMonth.value = String(now.getMonth() + 1);
    elements.yearDay.value = String(now.getDate());
  }

  function selectedWeekdays() {
    if (!elements.weekdayGrid) {
      return [];
    }

    var checks = elements.weekdayGrid.querySelectorAll("input[type='checkbox']");
    var days = [];

    forEachNode(checks, function (checkbox) {
      if (checkbox.checked) {
        days.push(Number(checkbox.value));
      }
    });

    return days.sort(function (a, b) {
      return a - b;
    });
  }

  function titleToEmoji(title) {
    var normalized = String(title || "").toLowerCase();

    for (var i = 0; i < EMOJI_RULES.length; i += 1) {
      var rule = EMOJI_RULES[i];
      var hasMatch = rule.words.some(function (word) {
        return normalized.indexOf(word) !== -1;
      });

      if (hasMatch) {
        return rule.emoji;
      }
    }

    return "✅";
  }

  function formatTaskTitle(task) {
    return titleToEmoji(task.title) + " " + task.title;
  }

  function isOneTimeTask(task) {
    return Boolean(task && task.schedule && task.schedule.type === "oneTime");
  }

  function setTaskTitleContent(titleElement, task) {
    if (!titleElement || !task) {
      return;
    }

    titleElement.textContent = formatTaskTitle(task);

    if (!isOneTimeTask(task)) {
      return;
    }

    var marker = document.createElement("span");
    marker.className = "task-one-time-label";
    marker.textContent = " (one-time)";
    titleElement.appendChild(marker);
  }

  function taskAssigneeName(task) {
    return task && task.assignee ? task.assignee : "";
  }

  function appendAssigneeDetail(container, task) {
    var assigneeName = taskAssigneeName(task);
    if (!container || !assigneeName) {
      return;
    }

    var assigneeInfo = document.createElement("span");
    assigneeInfo.className = "task-detail task-assignee";

    var assigneePrefix = document.createElement("span");
    assigneePrefix.textContent = "Assigned to ";

    var assigneeValue = document.createElement("span");
    assigneeValue.className = "task-assignee-name";
    assigneeValue.textContent = assigneeName;

    assigneeInfo.appendChild(assigneePrefix);
    assigneeInfo.appendChild(assigneeValue);
    container.appendChild(assigneeInfo);
  }

  function renderAssigneeOptions(selectedAssignee) {
    if (!elements.taskAssignee) {
      return;
    }

    var assignee = typeof selectedAssignee === "string" ? selectedAssignee : "";
    var known = false;

    elements.taskAssignee.innerHTML = "";

    function appendOption(value, label) {
      var option = document.createElement("option");
      option.value = value;
      option.textContent = label;
      if (value === assignee) {
        option.selected = true;
      }
      elements.taskAssignee.appendChild(option);
    }

    appendOption("", "Unassigned");

    state.assignees.forEach(function (item) {
      appendOption(item, item);
      if (item === assignee) {
        known = true;
      }
    });

    if (assignee && !known) {
      appendOption(assignee, assignee + " (not in Settings)");
    }

    elements.taskAssignee.value = assignee;
  }

  function runConfetti(originElement) {
    if (state.disableConfetti) {
      return;
    }

    var layer = document.createElement("div");
    layer.className = "confetti-layer";
    document.body.appendChild(layer);

    var originX = window.innerWidth * 0.5;
    var originY = window.innerHeight * 0.45;

    if (originElement && typeof originElement.getBoundingClientRect === "function") {
      var rect = originElement.getBoundingClientRect();
      originX = rect.left + rect.width / 2;
      originY = rect.top + rect.height / 2;
    }

    var colors = ["#ff6b6b", "#ffd93d", "#6bcB77", "#4d96ff", "#d66efd", "#ff922b"];
    var pieceCount = 140;

    for (var i = 0; i < pieceCount; i += 1) {
      var piece = document.createElement("div");
      piece.className = "confetti-piece";

      var angle = Math.random() * Math.PI * 2;
      var blast = 140 + Math.random() * 260;
      var burstX = Math.cos(angle) * blast;
      var burstY = Math.sin(angle) * blast - 120;
      var gravity = 580 + Math.random() * 260;
      var spinValue = Math.random() * 1080 - 540;
      var spin = spinValue.toFixed(0) + "deg";
      var spinMid = (spinValue * 0.35).toFixed(0) + "deg";
      var duration = 1200 + Math.random() * 900;
      var delay = Math.random() * 120;
      var size = 12 + Math.random() * 10;

      piece.style.left = originX.toFixed(0) + "px";
      piece.style.top = originY.toFixed(0) + "px";
      piece.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
      piece.style.width = size.toFixed(0) + "px";
      piece.style.height = (size * 1.35).toFixed(0) + "px";
      piece.style.animationDuration = duration.toFixed(0) + "ms";
      piece.style.animationDelay = delay.toFixed(0) + "ms";
      piece.style.setProperty("--burst-x", burstX.toFixed(0) + "px");
      piece.style.setProperty("--burst-y", burstY.toFixed(0) + "px");
      piece.style.setProperty("--burst-x-mid", (burstX * 0.45).toFixed(0) + "px");
      piece.style.setProperty("--burst-y-mid", (burstY * 0.45).toFixed(0) + "px");
      piece.style.setProperty("--gravity-y", gravity.toFixed(0) + "px");
      piece.style.setProperty("--spin-mid", spinMid);
      piece.style.setProperty("--spin-end", spin);

      layer.appendChild(piece);
    }

    window.setTimeout(function () {
      if (layer.parentNode) {
        layer.parentNode.removeChild(layer);
      }
    }, 2500);
  }

  function buildScheduleFromForm() {
    if (!elements.frequency) {
      throw new Error("Task form is not available.");
    }

    var value = elements.frequency.value;

    if (value === "oneTime") {
      return { type: "oneTime" };
    }

    if (value === "daily") {
      return { type: "daily" };
    }

    if (value === "everyOtherDay") {
      return { type: "everyOtherDay" };
    }

    if (value === "weekly") {
      var weeklyDays = selectedWeekdays();
      if (weeklyDays.length < 1) {
        throw new Error("Please select at least one weekday for weekly tasks.");
      }

      if (weeklyDays.length === 1) {
        return { type: "weekly", daysOfWeek: weeklyDays };
      }

      return { type: "multiWeekly", daysOfWeek: weeklyDays };
    }

    if (value === "monthly") {
      var monthlyRaw = elements.dayOfMonth.value.trim();
      if (!monthlyRaw) {
        return { type: "monthly" };
      }

      var monthly = Number(monthlyRaw);
      if (!monthly || monthly < 1 || monthly > 31) {
        throw new Error("If provided, day of month must be between 1 and 31.");
      }
      return { type: "monthly", dayOfMonth: monthly };
    }

    if (value === "yearly") {
      var month = Number(elements.yearMonth.value);
      var day = Number(elements.yearDay.value);
      if (!month || month < 1 || month > 12 || !day || day < 1 || day > 31) {
        throw new Error("Please provide a valid month and day for yearly tasks.");
      }
      return { type: "yearly", month: month, day: day };
    }

    throw new Error("Unsupported frequency selection");
  }

  function setTaskModalMode(isEditing) {
    if (elements.taskModalTitle) {
      elements.taskModalTitle.textContent = isEditing ? "Edit Task" : "Add Task";
    }

    if (elements.taskFormSubmit) {
      elements.taskFormSubmit.textContent = isEditing ? "Save changes" : "Add task";
    }
  }

  function setWeekdayChecks(days) {
    if (!elements.weekdayGrid) {
      return;
    }

    var daySet = {};
    (days || []).forEach(function (day) {
      daySet[String(day)] = true;
    });

    var checks = elements.weekdayGrid.querySelectorAll("input[type='checkbox']");
    forEachNode(checks, function (checkbox) {
      checkbox.checked = Boolean(daySet[checkbox.value]);
    });
  }

  function fillFormFromTask(task) {
    if (!task || !task.schedule) {
      return;
    }

    elements.taskTitle.value = task.title || "";
    renderAssigneeOptions(task.assignee || "");

    var schedule = task.schedule;
    if (schedule.type === "weekly" || schedule.type === "multiWeekly") {
      elements.frequency.value = "weekly";
      showFrequencyOptions();
      setWeekdayChecks(schedule.daysOfWeek || []);
      return;
    }

    if (schedule.type === "monthly") {
      elements.frequency.value = "monthly";
      showFrequencyOptions();
      elements.dayOfMonth.value = typeof schedule.dayOfMonth === "number" ? String(schedule.dayOfMonth) : "";
      return;
    }

    if (schedule.type === "yearly") {
      elements.frequency.value = "yearly";
      showFrequencyOptions();
      elements.yearMonth.value = String(schedule.month);
      elements.yearDay.value = String(schedule.day);
      return;
    }

    elements.frequency.value = schedule.type;
    showFrequencyOptions();
  }

  function openTaskModal(task) {
    if (!elements.taskModal) {
      return;
    }

    var isEditing = Boolean(task && task.id);
    state.editingTaskId = isEditing ? task.id : null;
    setTaskModalMode(isEditing);

    clearForm();
    if (isEditing) {
      fillFormFromTask(task);
    }

    elements.taskModal.classList.remove("hidden");
    if (elements.formError) {
      elements.formError.textContent = "";
    }
    window.setTimeout(function () {
      if (elements.taskTitle) {
        elements.taskTitle.focus();
      }
    }, 0);
  }

  function closeTaskModal() {
    if (!elements.taskModal) {
      return;
    }

    elements.taskModal.classList.add("hidden");
    state.editingTaskId = null;
    setTaskModalMode(false);
    if (elements.formError) {
      elements.formError.textContent = "";
    }
  }

  function isSidebarOpen() {
    if (!elements.leftSidebar) {
      return false;
    }
    return !elements.leftSidebar.classList.contains("hidden-left");
  }

  function openSidebar() {
    if (!elements.leftSidebar || !elements.sidebarToggle) {
      return;
    }

    elements.leftSidebar.classList.remove("hidden-left");
    document.body.classList.add("sidebar-open");
    elements.sidebarToggle.textContent = "✕";
    elements.sidebarToggle.setAttribute("aria-label", "Close menu");
  }

  function closeSidebar() {
    if (!elements.leftSidebar || !elements.sidebarToggle) {
      return;
    }

    elements.leftSidebar.classList.add("hidden-left");
    document.body.classList.remove("sidebar-open");
    elements.sidebarToggle.textContent = "☰";
    elements.sidebarToggle.setAttribute("aria-label", "Open menu");
  }

  function toggleSidebar() {
    if (isSidebarOpen()) {
      closeSidebar();
      return;
    }

    openSidebar();
  }

  function ensureUndoToastElements() {
    if (elements.undoToast && elements.undoToastButton && elements.undoToastText) {
      return;
    }

    var toast = document.createElement("div");
    toast.className = "undo-toast";
    toast.setAttribute("aria-live", "polite");
    toast.setAttribute("role", "status");

    var text = document.createElement("span");
    text.className = "undo-toast-text";
    text.textContent = "Task cleared.";

    var button = document.createElement("button");
    button.type = "button";
    button.className = "undo-toast-btn";
    button.textContent = "Undo";

    toast.appendChild(text);
    toast.appendChild(button);
    document.body.appendChild(toast);

    elements.undoToast = toast;
    elements.undoToastText = text;
    elements.undoToastButton = button;

    button.addEventListener("click", undoPendingTaskClear);
  }

  function clearUndoToastCountdown() {
    if (state.undoToastIntervalId) {
      window.clearInterval(state.undoToastIntervalId);
      state.undoToastIntervalId = null;
    }
  }

  function showUndoToast(message) {
    ensureUndoToastElements();
    elements.undoToastText.textContent = message;
    elements.undoToast.classList.add("visible");
  }

  function showUndoToastWithCountdown(secondsRemaining) {
    var safeSeconds = Math.max(0, Number(secondsRemaining) || 0);
    var label = "Task cleared. Undo (" + safeSeconds + "s)";
    showUndoToast(label);
  }

  function hideUndoToast() {
    if (!elements.undoToast) {
      return;
    }

    clearUndoToastCountdown();
    elements.undoToast.classList.remove("visible");
  }

  function collectCompletionKeys(task, dateIso, today) {
    if (task.schedule && task.schedule.type === "monthly") {
      return [monthKey(today)];
    }

    if (isWeeklySchedule(task)) {
      var keys = {};
      var result = [];
      var missedDates = getMissedWeeklyDates(task, today);

      missedDates.forEach(function (missedDate) {
        if (!keys[missedDate]) {
          keys[missedDate] = true;
          result.push(missedDate);
        }
      });

      if (!keys[dateIso]) {
        keys[dateIso] = true;
        result.push(dateIso);
      }

      return result;
    }

    return [dateIso];
  }

  function undoPendingTaskClear() {
    var pending = state.pendingTaskUndo;
    if (!pending) {
      return;
    }

    window.clearTimeout(pending.timerId);
    clearUndoToastCountdown();

    if (pending.checkbox) {
      pending.checkbox.checked = false;
      pending.checkbox.disabled = false;
    }

    if (pending.listItem) {
      pending.listItem.classList.remove("task-clearing");
    }

    state.pendingTaskUndo = null;
    hideUndoToast();
  }

  function commitPendingTaskClear(skipFetch) {
    var pending = state.pendingTaskUndo;
    if (!pending) {
      return;
    }

    clearUndoToastCountdown();
    state.pendingTaskUndo = null;
    hideUndoToast();

    var commitPromise = Promise.all(
      pending.completionKeys.map(function (key) {
        return setCompletionRaw(pending.taskId, key, true);
      })
    );

    if (!skipFetch) {
      commitPromise = commitPromise.then(function () {
        return fetchTasks();
      });
    }

    commitPromise
      .catch(function (err) {
        if (elements.formError) {
          elements.formError.textContent = err.message;
        }

        return fetchTasks();
      });
  }

  function startTaskClearWithUndo(task, dateIso, sourceElement, checkbox) {
    var today = startOfDay(state.currentDate);
    var completionKeys = collectCompletionKeys(task, dateIso, today);

    if (state.pendingTaskUndo) {
      commitPendingTaskClear(true);
    }

    if (checkbox) {
      checkbox.checked = true;
      checkbox.disabled = true;
    }

    if (sourceElement) {
      sourceElement.classList.add("task-clearing");
    }

    runConfetti(sourceElement || checkbox);

    clearUndoToastCountdown();
    var countdownSeconds = 5;

    state.pendingTaskUndo = {
      taskId: task.id,
      completionKeys: completionKeys,
      listItem: sourceElement || null,
      checkbox: checkbox || null,
      timerId: window.setTimeout(function () {
        commitPendingTaskClear();
      }, 5000)
    };

    showUndoToastWithCountdown(countdownSeconds);

    state.undoToastIntervalId = window.setInterval(function () {
      countdownSeconds -= 1;

      if (countdownSeconds <= 0) {
        clearUndoToastCountdown();
        return;
      }

      showUndoToastWithCountdown(countdownSeconds);
    }, 1000);
  }

  function clearForm() {
    if (!elements.taskForm) {
      return;
    }

    elements.taskForm.reset();
    createMonthOptions();
    renderAssigneeOptions("");
    showFrequencyOptions();
    var checks = elements.weekdayGrid.querySelectorAll("input[type='checkbox']");
    forEachNode(checks, function (checkbox) {
      checkbox.checked = false;
    });
  }

  function setTextScale(scale) {
    var clamped = Math.max(0.85, Math.min(1.4, scale));
    document.documentElement.style.setProperty("--text-scale", clamped.toFixed(2));
    window.localStorage.setItem("taskit.textScale", String(clamped));
  }

  function applySavedTextScale() {
    var stored = window.localStorage.getItem("taskit.textScale");
    var parsed = stored ? Number(stored) : 1;
    if (!parsed || safeIsNaN(parsed)) {
      parsed = 1;
    }
    setTextScale(parsed);
  }

  function changeTextScale(delta) {
    var current = Number(getComputedStyle(document.documentElement).getPropertyValue("--text-scale")) || 1;
    setTextScale(current + delta);
  }

  function setTheme(theme, options) {
    var previousTheme = document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "bright";
    var nextTheme = theme === "dark" ? "dark" : "bright";

    if (theme === "dark") {
      document.documentElement.setAttribute("data-theme", "dark");
      window.localStorage.setItem("taskit.theme", "dark");
    } else {
      document.documentElement.removeAttribute("data-theme");
      window.localStorage.setItem("taskit.theme", "bright");
    }

    var skipLegacyReload = Boolean(options && options.skipLegacyReload);
    var isLegacy = Boolean(document.body && document.body.classList.contains("legacy-device"));
    if (!skipLegacyReload && state.themeHydrated && isLegacy && previousTheme !== nextTheme) {
      window.location.reload();
    }
  }

  function applySavedTheme() {
    var storedTheme = window.localStorage.getItem("taskit.theme");
    setTheme(storedTheme === "dark" ? "dark" : "bright", { skipLegacyReload: true });
    state.themeHydrated = true;
  }

  function renderClock() {
    if (!elements.weekday || !elements.date || !elements.time) {
      return;
    }

    var now = new Date();
    state.currentDate = now;

    elements.weekday.textContent = WEEKDAY_NAMES[now.getDay()];
    elements.date.textContent = formatDateLong(now);
    elements.time.textContent = formatTime(now);
  }

  function renderToday() {
    if (!elements.todayList || !elements.todayCount) {
      return;
    }

    var today = startOfDay(state.currentDate);
    var regularItems = [];
    var missedItems = [];
    var monthlyItems = [];

    state.tasks.forEach(function (task) {
      if (task.schedule && task.schedule.type === "monthly" && isDueOn(task, today)) {
        monthlyItems.push({ task: task, dateIso: monthKey(today), kind: "monthly" });
        return;
      }

      if (isDueOn(task, today)) {
        regularItems.push({ task: task, dateIso: isoDate(today), kind: "today" });
      }

      var latestMissed = getLatestMissedWeeklyDate(task, today);
      if (latestMissed) {
        missedItems.push({ task: task, dateIso: latestMissed, kind: "missed" });
      }
    });

    var totalVisible = regularItems.length + missedItems.length + monthlyItems.length;
    setDebugField("visibleToday", totalVisible);
    elements.todayCount.textContent = totalVisible + (totalVisible === 1 ? " task" : " tasks");
    elements.todayList.innerHTML = "";

    if (totalVisible === 0) {
      var empty = document.createElement("p");
      empty.className = "empty-text";
      empty.textContent = "No tasks due today.";
      elements.todayList.appendChild(empty);
      return;
    }

    function appendTaskItem(entry) {
      var task = entry.task;
      var dateValue = entry.dateIso;

      var li = document.createElement("li");
      li.className = "task-item";

      if (entry.kind === "missed") {
        li.classList.add("missed-item");
      }

      var completed = task.completions && task.completions[dateValue];
      if (completed) {
        li.classList.add("completed");
      }

      var checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = completed;
      checkbox.setAttribute("aria-label", "Mark task complete");
      checkbox.addEventListener("click", function (event) {
        event.stopPropagation();
      });
      checkbox.addEventListener("touchstart", function (event) {
        event.stopPropagation();
      });
      checkbox.addEventListener("change", function () {
        applyTaskCheck(task, dateValue, checkbox.checked, li);
      });

      var titleWrap = document.createElement("div");
      titleWrap.className = "task-meta";

      var title = document.createElement("span");
      title.className = "task-title";
      setTaskTitleContent(title, task);

      titleWrap.appendChild(title);

      if (entry.kind === "missed") {
        var missedInfo = document.createElement("span");
        missedInfo.className = "task-detail missed-label";
        missedInfo.textContent = "Missed: " + entry.dateIso;
        titleWrap.appendChild(missedInfo);
      }

      appendAssigneeDetail(titleWrap, task);

      li.appendChild(checkbox);
      li.appendChild(titleWrap);

      attachSwipeDeleteControl(li, {
        buttonText: "Delete",
        buttonLabel: "Delete task permanently",
        onDelete: function () {
          deleteTask(task.id);
        }
      });

      li.setAttribute("tabindex", "0");
      li.setAttribute("role", "button");
      li.setAttribute("aria-label", "Toggle completion for " + task.title);
      li.addEventListener("click", function (event) {
        if (shouldIgnoreRowToggleForSwipe(li)) {
          return;
        }

        if (event.target === checkbox) {
          return;
        }

        checkbox.checked = !checkbox.checked;
        applyTaskCheck(task, dateValue, checkbox.checked, li);
      });
      li.addEventListener("keydown", function (event) {
        if (event.key !== "Enter" && event.key !== " ") {
          return;
        }
        event.preventDefault();
        checkbox.checked = !checkbox.checked;
        applyTaskCheck(task, dateValue, checkbox.checked, li);
      });

      elements.todayList.appendChild(li);
    }

    regularItems.forEach(appendTaskItem);
    missedItems.forEach(appendTaskItem);

    if (monthlyItems.length > 0) {
      var divider = document.createElement("li");
      divider.className = "today-divider";
      divider.innerHTML = "<span>Monthly Tasks</span>";
      elements.todayList.appendChild(divider);
      monthlyItems.forEach(appendTaskItem);
    }
  }

  function completionKeySortValue(key) {
    if (typeof key !== "string") {
      return 0;
    }

    if (key.indexOf("M:") === 0) {
      var monthParts = key.slice(2).split("-");
      if (monthParts.length !== 2) {
        return 0;
      }

      var year = Number(monthParts[0]);
      var month = Number(monthParts[1]);
      if (safeIsNaN(year) || safeIsNaN(month)) {
        return 0;
      }

      return new Date(year, month - 1, 1).getTime();
    }

    var parsed = parseLocalIsoDate(key);
    if (!parsed || safeIsNaN(parsed.getTime())) {
      return 0;
    }

    return parsed.getTime();
  }

  function completionLabelForKey(key) {
    if (typeof key !== "string") {
      return "Completed";
    }

    if (key.indexOf("M:") === 0) {
      var monthParts = key.slice(2).split("-");
      if (monthParts.length === 2) {
        var year = Number(monthParts[0]);
        var month = Number(monthParts[1]);
        if (!safeIsNaN(year) && !safeIsNaN(month) && month >= 1 && month <= 12) {
          return "Completed in " + MONTH_NAMES[month - 1] + " " + year;
        }
      }

      return "Completed";
    }

    var date = parseLocalIsoDate(key);
    if (!date || safeIsNaN(date.getTime())) {
      return "Completed";
    }

    return "Completed on " + formatDateLong(date);
  }

  function completionGroupLabelForKey(key) {
    if (typeof key !== "string") {
      return "Unknown completion date";
    }

    if (key.indexOf("M:") === 0) {
      var monthParts = key.slice(2).split("-");
      if (monthParts.length === 2) {
        var year = Number(monthParts[0]);
        var month = Number(monthParts[1]);
        if (!safeIsNaN(year) && !safeIsNaN(month) && month >= 1 && month <= 12) {
          return MONTH_NAMES[month - 1] + " " + year;
        }
      }

      return "Monthly completions";
    }

    var date = parseLocalIsoDate(key);
    if (!date || safeIsNaN(date.getTime())) {
      return "Unknown completion date";
    }

    return WEEKDAY_NAMES[date.getDay()] + ", " + formatDateLong(date);
  }

  function renderCompleted() {
    if (!elements.completedList || !elements.completedCount) {
      return;
    }

    var showGroceries = state.completedView === "groceries";

    if (elements.completedTasksTab) {
      elements.completedTasksTab.classList.toggle("active", !showGroceries);
      elements.completedTasksTab.setAttribute("aria-selected", showGroceries ? "false" : "true");
    }

    if (elements.completedGroceriesTab) {
      elements.completedGroceriesTab.classList.toggle("active", showGroceries);
      elements.completedGroceriesTab.setAttribute("aria-selected", showGroceries ? "true" : "false");
    }

    if (showGroceries) {
      renderCompletedGroceries();
      return;
    }

    renderCompletedTasks();
  }

  function renderCompletedTasks() {
    if (!elements.completedList || !elements.completedCount) {
      return;
    }

    var completedEntries = [];

    state.tasks.forEach(function (task) {
      var completions = task.completions || {};
      Object.keys(completions).forEach(function (key) {
        if (!completions[key]) {
          return;
        }

        completedEntries.push({
          task: task,
          completionKey: key,
          sortValue: completionKeySortValue(key)
        });
      });
    });

    completedEntries.sort(function (a, b) {
      if (b.sortValue !== a.sortValue) {
        return b.sortValue - a.sortValue;
      }

      return a.task.title.localeCompare(b.task.title);
    });

    elements.completedCount.textContent = completedEntries.length + (completedEntries.length === 1 ? " item" : " items");
    elements.completedList.innerHTML = "";

    if (completedEntries.length === 0) {
      var empty = document.createElement("p");
      empty.className = "empty-text";
      empty.textContent = "No completed tasks yet.";
      elements.completedList.appendChild(empty);
      return;
    }

    var currentGroupKey = "";

    completedEntries.forEach(function (entry) {
      if (entry.completionKey !== currentGroupKey) {
        currentGroupKey = entry.completionKey;

        var groupHeading = document.createElement("li");
        groupHeading.className = "today-divider";
        groupHeading.textContent = completionGroupLabelForKey(entry.completionKey);
        elements.completedList.appendChild(groupHeading);
      }

      var li = document.createElement("li");
      li.className = "task-item completed";

      var checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = true;
      checkbox.setAttribute("aria-label", "Mark task as not completed");
      checkbox.addEventListener("click", function (event) {
        event.stopPropagation();
      });

      if (isOneTimeTask(entry.task)) {
        checkbox.disabled = true;
        checkbox.setAttribute("aria-label", "One-time completed tasks stay archived");
      } else {
        checkbox.addEventListener("change", function () {
          updateCompletion(entry.task.id, entry.completionKey, false);
        });
      }

      var titleWrap = document.createElement("div");
      titleWrap.className = "task-meta";

      var title = document.createElement("span");
      title.className = "task-title";
      setTaskTitleContent(title, entry.task);

      var detail = document.createElement("span");
      detail.className = "task-detail";
      detail.textContent = isOneTimeTask(entry.task) ? "Archived one-time task" : completionLabelForKey(entry.completionKey);

      titleWrap.appendChild(title);
      titleWrap.appendChild(detail);
      appendAssigneeDetail(titleWrap, entry.task);

      li.appendChild(checkbox);
      li.appendChild(titleWrap);

      elements.completedList.appendChild(li);
    });
  }

  function renderCompletedGroceries() {
    if (!elements.completedList || !elements.completedCount) {
      return;
    }

    var completedEntries = state.completedGroceries.map(function (item) {
      var completedAt = typeof item.completedAt === "string" && item.completedAt ? item.completedAt : item.createdAt;
      var date = completedAt ? new Date(completedAt) : new Date();
      if (safeIsNaN(date.getTime())) {
        date = new Date();
      }

      var key = isoDate(new Date(date.getFullYear(), date.getMonth(), date.getDate()));

      return {
        item: item,
        completionKey: key,
        sortValue: new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
      };
    });

    completedEntries.sort(function (a, b) {
      if (b.sortValue !== a.sortValue) {
        return b.sortValue - a.sortValue;
      }

      return String(a.item.title || "").localeCompare(String(b.item.title || ""));
    });

    elements.completedCount.textContent = completedEntries.length + (completedEntries.length === 1 ? " item" : " items");
    elements.completedList.innerHTML = "";

    if (completedEntries.length === 0) {
      var empty = document.createElement("p");
      empty.className = "empty-text";
      empty.textContent = "No completed grocery items yet.";
      elements.completedList.appendChild(empty);
      return;
    }

    var currentGroupKey = "";

    completedEntries.forEach(function (entry) {
      if (entry.completionKey !== currentGroupKey) {
        currentGroupKey = entry.completionKey;

        var groupHeading = document.createElement("li");
        groupHeading.className = "today-divider";
        groupHeading.textContent = completionGroupLabelForKey(entry.completionKey);
        elements.completedList.appendChild(groupHeading);
      }

      var li = document.createElement("li");
      li.className = "task-item completed";

      var checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = true;
      checkbox.setAttribute("aria-label", "Mark grocery item as not completed");
      checkbox.addEventListener("click", function (event) {
        event.stopPropagation();
      });
      checkbox.addEventListener("change", function () {
        updateGroceryCompletion(entry.item.id, false);
      });

      var titleWrap = document.createElement("div");
      titleWrap.className = "task-meta";

      var title = document.createElement("span");
      title.className = "task-title";
      title.textContent = "🛒 " + entry.item.title;

      var detail = document.createElement("span");
      detail.className = "task-detail";
      detail.textContent = "Category: " + (entry.item.category || "Other");

      titleWrap.appendChild(title);
      titleWrap.appendChild(detail);

      li.appendChild(checkbox);
      li.appendChild(titleWrap);

      elements.completedList.appendChild(li);
    });
  }

  function scheduleText(task) {
    var schedule = task.schedule || {};

    if (schedule.type === "daily") {
      return "Every day";
    }

    if (schedule.type === "everyOtherDay") {
      return "Every other day";
    }

    if (schedule.type === "weekly" || schedule.type === "multiWeekly") {
      var labels = (schedule.daysOfWeek || []).map(function (dayNumber) {
        return WEEKDAY_NAMES[dayNumber].slice(0, 3);
      });
      return "Weekly: " + labels.join(", ");
    }

    if (schedule.type === "monthly") {
      return typeof schedule.dayOfMonth === "number" ? "Monthly: target day " + schedule.dayOfMonth : "Monthly: no fixed day";
    }

    if (schedule.type === "oneTime") {
      return "One time";
    }

    if (schedule.type === "yearly") {
      return "Yearly: " + MONTH_NAMES[schedule.month - 1] + " " + schedule.day;
    }

    return "Custom schedule";
  }

  function renderManagement() {
    if (!elements.manageList || !elements.manageCount) {
      return;
    }

    var frequencyOrder = {
      oneTime: 0,
      daily: 1,
      everyOtherDay: 2,
      weekly: 3,
      multiWeekly: 3,
      monthly: 4,
      yearly: 5,
      custom: 6
    };

    function frequencyGroupType(task) {
      var type = task && task.schedule && task.schedule.type ? task.schedule.type : "custom";
      if (type === "multiWeekly") {
        return "weekly";
      }
      return frequencyOrder.hasOwnProperty(type) ? type : "custom";
    }

    function frequencyGroupLabel(type) {
      if (type === "oneTime") {
        return "One Time";
      }
      if (type === "daily") {
        return "Daily";
      }
      if (type === "everyOtherDay") {
        return "Every Other Day";
      }
      if (type === "weekly") {
        return "Weekly";
      }
      if (type === "monthly") {
        return "Monthly";
      }
      if (type === "yearly") {
        return "Yearly";
      }
      return "Custom";
    }

    var allTasks = state.tasks.filter(function (task) {
      if (!isOneTimeTask(task)) {
        return true;
      }

      var completions = task.completions || {};
      var keys = Object.keys(completions);
      for (var i = 0; i < keys.length; i += 1) {
        if (completions[keys[i]]) {
          return false;
        }
      }

      return true;
    }).sort(function (a, b) {
      var typeA = frequencyGroupType(a);
      var typeB = frequencyGroupType(b);
      var orderA = frequencyOrder[typeA];
      var orderB = frequencyOrder[typeB];

      if (orderA !== orderB) {
        return orderA - orderB;
      }

      return a.title.localeCompare(b.title);
    });

    elements.manageCount.textContent = allTasks.length + (allTasks.length === 1 ? " task" : " tasks");
    elements.manageList.innerHTML = "";

    if (allTasks.length === 0) {
      var empty = document.createElement("p");
      empty.className = "empty-text";
      empty.textContent = "No tasks to manage.";
      elements.manageList.appendChild(empty);
      return;
    }

    var currentGroupType = "";

    allTasks.forEach(function (task) {
      var groupType = frequencyGroupType(task);
      if (groupType !== currentGroupType) {
        currentGroupType = groupType;

        var groupHeading = document.createElement("li");
        groupHeading.className = "today-divider";
        groupHeading.textContent = frequencyGroupLabel(groupType);
        elements.manageList.appendChild(groupHeading);
      }

      var li = document.createElement("li");
      li.className = "task-item management-item";

      var textBlock = document.createElement("div");
      textBlock.className = "task-meta";

      var title = document.createElement("span");
      title.className = "task-title";
      setTaskTitleContent(title, task);

      var detail = document.createElement("span");
      detail.className = "task-detail";
      detail.textContent = scheduleText(task) + " | Starts " + task.startDate;

      textBlock.appendChild(title);
      textBlock.appendChild(detail);

      appendAssigneeDetail(textBlock, task);

      var remove = document.createElement("button");
      var edit = document.createElement("button");
      edit.type = "button";
      edit.className = "edit-btn";
      edit.textContent = "Edit";
      edit.addEventListener("click", function () {
        openTaskModal(task);
      });

      var actions = document.createElement("div");
      actions.className = "management-actions";

      remove.type = "button";
      remove.className = "delete-btn";
      remove.textContent = "Delete";
      remove.addEventListener("click", function () {
        var shouldDelete = window.confirm("Delete task: " + task.title + "? This cannot be undone.");
        if (!shouldDelete) {
          return;
        }
        deleteTask(task.id);
      });

      actions.appendChild(edit);
      actions.appendChild(remove);

      li.appendChild(textBlock);
      li.appendChild(actions);
      elements.manageList.appendChild(li);
    });
  }

  function renderRolling() {
    if (!elements.rollingView) {
      return;
    }

    var today = startOfDay(state.currentDate);
    var thisWeekStart = new Date(today.getFullYear(), today.getMonth(), today.getDate() - today.getDay());
    var thisWeekEnd = new Date(thisWeekStart.getFullYear(), thisWeekStart.getMonth(), thisWeekStart.getDate() + 6);
    var root = elements.rollingView;
    var glanceRoot = elements.rollingGlance;
    root.innerHTML = "";

    if (glanceRoot) {
      glanceRoot.innerHTML = "";

      var glanceHeader = document.createElement("div");
      glanceHeader.className = "rolling-glance-header";

      var glanceTitle = document.createElement("h3");
      glanceTitle.textContent = "This Week at a Glance";

      var glanceRange = document.createElement("p");
      glanceRange.className = "hint";
      glanceRange.textContent = (thisWeekStart.getMonth() + 1) + "/" + thisWeekStart.getDate() + " - " + (thisWeekEnd.getMonth() + 1) + "/" + thisWeekEnd.getDate();

      glanceHeader.appendChild(glanceTitle);
      glanceHeader.appendChild(glanceRange);
      glanceRoot.appendChild(glanceHeader);

      var glanceGrid = document.createElement("div");
      glanceGrid.className = "rolling-glance-grid";
      var weeklyTotal = 0;

      for (var glanceOffset = 0; glanceOffset < 7; glanceOffset += 1) {
        var glanceDate = new Date(thisWeekStart.getFullYear(), thisWeekStart.getMonth(), thisWeekStart.getDate() + glanceOffset);
        var glanceDue = dueTasksForDate(glanceDate, { includeMonthly: false });
        weeklyTotal += glanceDue.length;

        var dayCard = document.createElement("article");
        dayCard.className = "glance-day";
        if (isSameDate(glanceDate, today)) {
          dayCard.classList.add("today");
        }

        var dayName = document.createElement("p");
        dayName.className = "glance-name";
        dayName.textContent = WEEKDAY_NAMES[glanceDate.getDay()].slice(0, 3);

        var dayDate = document.createElement("p");
        dayDate.className = "glance-date";
        dayDate.textContent = (glanceDate.getMonth() + 1) + "/" + glanceDate.getDate();

        var dayCount = document.createElement("p");
        dayCount.className = "glance-count";
        dayCount.textContent = glanceDue.length === 0 ? "No tasks" : glanceDue.length + (glanceDue.length === 1 ? " task" : " tasks");

        dayCard.appendChild(dayName);
        dayCard.appendChild(dayDate);
        dayCard.appendChild(dayCount);
        glanceGrid.appendChild(dayCard);
      }

      glanceRoot.appendChild(glanceGrid);

      var weeklyTotalText = document.createElement("p");
      weeklyTotalText.className = "rolling-week-total";
      weeklyTotalText.textContent = weeklyTotal + (weeklyTotal === 1 ? " item scheduled this week" : " items scheduled this week");
      glanceRoot.appendChild(weeklyTotalText);
    }

    for (var weekOffset = 0; weekOffset < 13; weekOffset += 1) {
      var weekStart = new Date(thisWeekStart.getFullYear(), thisWeekStart.getMonth(), thisWeekStart.getDate() + weekOffset * 7);
      var weekEnd = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + 6);
      var weekDays = [];
      var weekTaskCount = 0;

      for (var dayOffset = 0; dayOffset < 7; dayOffset += 1) {
        var date = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + dayOffset);
        if (date < today) {
          continue;
        }

        var due = dueTasksForDate(date, { includeMonthly: false });
        if (due.length > 0) {
          weekTaskCount += due.length;
          weekDays.push({ date: date, due: due });
        }
      }

      var weekCard = document.createElement("section");
      weekCard.className = "rolling-week";

      var weekHeading = document.createElement("div");
      weekHeading.className = "rolling-week-header";

      var weekTitle = document.createElement("h3");
      weekTitle.textContent = weekOffset === 0 ? "This Week" : "Week of " + MONTH_NAMES[weekStart.getMonth()].slice(0, 3) + " " + weekStart.getDate();

      var weekHint = document.createElement("p");
      weekHint.className = "hint";
      weekHint.textContent = (weekStart.getMonth() + 1) + "/" + weekStart.getDate() + " - " + (weekEnd.getMonth() + 1) + "/" + weekEnd.getDate() + " | " + weekTaskCount + (weekTaskCount === 1 ? " task" : " tasks");

      weekHeading.appendChild(weekTitle);
      weekHeading.appendChild(weekHint);
      weekCard.appendChild(weekHeading);

      if (weekDays.length === 0) {
        var empty = document.createElement("p");
        empty.className = "empty-text";
        empty.textContent = "No scheduled items this week.";
        weekCard.appendChild(empty);
      } else {
        weekDays.forEach(function (entry) {
          var dayGroup = document.createElement("div");
          dayGroup.className = "rolling-week-day";

          var dayTitle = document.createElement("h4");
          dayTitle.textContent = WEEKDAY_NAMES[entry.date.getDay()] + " " + (entry.date.getMonth() + 1) + "/" + entry.date.getDate();
          dayGroup.appendChild(dayTitle);

          var list = document.createElement("ul");
          entry.due.forEach(function (task) {
            var item = document.createElement("li");
            item.textContent = formatTaskTitle(task);
            list.appendChild(item);
          });
          dayGroup.appendChild(list);

          weekCard.appendChild(dayGroup);
        });
      }

      root.appendChild(weekCard);
    }
  }

  function renderCalendarWeekdays() {
    if (!elements.calendarWeekdays) {
      return;
    }

    if (document.body && document.body.classList.contains("legacy-device")) {
      elements.calendarWeekdays.innerHTML = "";
      return;
    }

    elements.calendarWeekdays.innerHTML = "";
    for (var i = 0; i < 7; i += 1) {
      var cell = document.createElement("div");
      cell.textContent = WEEKDAY_NAMES[i].slice(0, 3);
      elements.calendarWeekdays.appendChild(cell);
    }
  }

  function renderCalendarDayPopover(container, date, due) {
    var popover = document.createElement("div");
    popover.className = "calendar-day-popover";

    var heading = document.createElement("p");
    heading.className = "calendar-popover-heading";
    heading.textContent = WEEKDAY_NAMES[date.getDay()] + ", " + formatDateLong(date);
    popover.appendChild(heading);

    if (!due || due.length === 0) {
      var empty = document.createElement("p");
      empty.className = "calendar-popover-empty";
      empty.textContent = "No tasks due.";
      popover.appendChild(empty);
      container.appendChild(popover);
      return;
    }

    var list = document.createElement("ul");
    list.className = "calendar-popover-list";
    due.forEach(function (task) {
      var item = document.createElement("li");
      item.textContent = formatTaskTitle(task);
      list.appendChild(item);
    });
    popover.appendChild(list);
    container.appendChild(popover);
  }

  function isCalendarDateExpanded(date) {
    var key = isoDate(startOfDay(date));
    return state.calendarExpandedDateKey === key;
  }

  function toggleCalendarDateExpanded(date) {
    var key = isoDate(startOfDay(date));
    state.calendarExpandedDateKey = state.calendarExpandedDateKey === key ? null : key;
    renderCalendar();
  }

  function renderLegacyCalendarTable(year, month, firstWeekday, daysThisMonth, daysPrevMonth, today) {
    if (!elements.calendarGrid) {
      return;
    }

    var table = document.createElement("table");
    table.className = "legacy-calendar-table";

    var thead = document.createElement("thead");
    var headRow = document.createElement("tr");
    for (var h = 0; h < 7; h += 1) {
      var th = document.createElement("th");
      th.textContent = WEEKDAY_NAMES[h].slice(0, 3);
      headRow.appendChild(th);
    }
    thead.appendChild(headRow);
    table.appendChild(thead);

    var tbody = document.createElement("tbody");

    for (var week = 0; week < 6; week += 1) {
      var row = document.createElement("tr");

      for (var day = 0; day < 7; day += 1) {
        var index = week * 7 + day;
        var date;
        var muted = false;

        if (index < firstWeekday) {
          var dayPrev = daysPrevMonth - firstWeekday + index + 1;
          date = new Date(year, month - 1, dayPrev);
          muted = true;
        } else if (index >= firstWeekday + daysThisMonth) {
          var dayNext = index - (firstWeekday + daysThisMonth) + 1;
          date = new Date(year, month + 1, dayNext);
          muted = true;
        } else {
          var dayCurrent = index - firstWeekday + 1;
          date = new Date(year, month, dayCurrent);
        }

        var due = dueTasksForDate(date, { includeMonthly: false });
        var td = document.createElement("td");
        if (muted) {
          td.className = "muted";
        }
        if (isSameDate(today, date)) {
          td.className = td.className ? td.className + " today" : "today";
        }

        var number = document.createElement("div");
        number.className = "legacy-day-number";
        number.textContent = String(date.getDate());
        td.appendChild(number);

        if (due.length > 0) {
          var dueText = document.createElement("div");
          dueText.className = "legacy-due-pill";
          dueText.textContent = due.length + " due";
          td.appendChild(dueText);
        }

        td.setAttribute("tabindex", "0");
        td.setAttribute("role", "button");
        td.setAttribute("aria-label", "View tasks for " + formatDateLong(date));
        td.addEventListener("click", function (selectedDate) {
          return function () {
            toggleCalendarDateExpanded(selectedDate);
          };
        }(date));
        td.addEventListener("keydown", function (selectedDate) {
          return function (event) {
            if (event.key !== "Enter" && event.key !== " ") {
              return;
            }
            event.preventDefault();
            toggleCalendarDateExpanded(selectedDate);
          };
        }(date));

        if (isCalendarDateExpanded(date)) {
          td.className = td.className ? td.className + " expanded" : "expanded";
          renderCalendarDayPopover(td, date, due);
        }

        row.appendChild(td);
      }

      tbody.appendChild(row);
    }

    table.appendChild(tbody);
    elements.calendarGrid.appendChild(table);
  }

  function renderCalendar() {
    if (!elements.calendarTitle || !elements.calendarGrid) {
      return;
    }

    var year = state.calendarYear;
    var month = state.calendarMonth;

    elements.calendarTitle.textContent = MONTH_NAMES[month] + " " + year;
    elements.calendarGrid.innerHTML = "";

    var first = new Date(year, month, 1);
    var firstWeekday = first.getDay();
    var daysThisMonth = daysInMonth(year, month);
    var daysPrevMonth = daysInMonth(year, month === 0 ? 11 : month - 1);
    var today = startOfDay(state.currentDate);
    var legacyCalendar = Boolean(document.body && document.body.classList.contains("legacy-device"));

    elements.calendarGrid.classList.toggle("legacy-calendar-grid", legacyCalendar);

    if (legacyCalendar) {
      renderLegacyCalendarTable(year, month, firstWeekday, daysThisMonth, daysPrevMonth, today);
      return;
    }

    for (var index = 0; index < 42; index += 1) {
      var date;
      var muted = false;

      if (index < firstWeekday) {
        var dayPrev = daysPrevMonth - firstWeekday + index + 1;
        date = new Date(year, month - 1, dayPrev);
        muted = true;
      } else if (index >= firstWeekday + daysThisMonth) {
        var dayNext = index - (firstWeekday + daysThisMonth) + 1;
        date = new Date(year, month + 1, dayNext);
        muted = true;
      } else {
        var dayCurrent = index - firstWeekday + 1;
        date = new Date(year, month, dayCurrent);
      }

      var due = dueTasksForDate(date, { includeMonthly: false });

      var cell = document.createElement("div");
      cell.className = "calendar-cell";
      if (muted) {
        cell.classList.add("muted");
      }
      if (isSameDate(today, date)) {
        cell.classList.add("today");
      }

      var dayNumber = document.createElement("div");
      dayNumber.className = "day-number";
      dayNumber.textContent = String(date.getDate());
      cell.appendChild(dayNumber);

      if (due.length > 0) {
        var pill = document.createElement("div");
        pill.className = "due-pill";
        pill.textContent = due.length + " due";
        cell.appendChild(pill);
      }

      cell.setAttribute("tabindex", "0");
      cell.setAttribute("role", "button");
      cell.setAttribute("aria-label", "View tasks for " + formatDateLong(date));
      cell.addEventListener("click", function (selectedDate) {
        return function () {
          toggleCalendarDateExpanded(selectedDate);
        };
      }(date));
      cell.addEventListener("keydown", function (selectedDate) {
        return function (event) {
          if (event.key !== "Enter" && event.key !== " ") {
            return;
          }
          event.preventDefault();
          toggleCalendarDateExpanded(selectedDate);
        };
      }(date));

      if (isCalendarDateExpanded(date)) {
        cell.classList.add("expanded");
        renderCalendarDayPopover(cell, date, due);
      }

      elements.calendarGrid.appendChild(cell);
    }
  }

  function renderAll() {
    renderToday();
    renderCompleted();
    renderManagement();
    renderAssignees();
    renderAssigneeOptions(elements.taskAssignee ? elements.taskAssignee.value : "");
    renderRolling();
    renderCalendar();
    renderGroceries();
  }

  function setSettingsTab(tabName) {
    if (!elements.settingsTaskTab || !elements.settingsAssigneesTab || !elements.settingsTasksPanel || !elements.settingsAssigneesPanel) {
      return;
    }

    var showAssignees = tabName === "assignees";
    elements.settingsTaskTab.classList.toggle("active", !showAssignees);
    elements.settingsAssigneesTab.classList.toggle("active", showAssignees);
    elements.settingsTaskTab.setAttribute("aria-selected", showAssignees ? "false" : "true");
    elements.settingsAssigneesTab.setAttribute("aria-selected", showAssignees ? "true" : "false");
    elements.settingsTasksPanel.classList.toggle("hidden", showAssignees);
    elements.settingsAssigneesPanel.classList.toggle("hidden", !showAssignees);
  }

  function renderAssignees() {
    if (!elements.assigneeList || !elements.assigneeCount) {
      return;
    }

    var allAssignees = state.assignees.slice();
    elements.assigneeCount.textContent = allAssignees.length + (allAssignees.length === 1 ? " person" : " people");
    elements.assigneeList.innerHTML = "";

    if (allAssignees.length === 0) {
      var empty = document.createElement("p");
      empty.className = "empty-text";
      empty.textContent = "No assignees configured yet.";
      elements.assigneeList.appendChild(empty);
      return;
    }

    allAssignees.forEach(function (name) {
      var li = document.createElement("li");
      li.className = "task-item management-item";

      var textBlock = document.createElement("div");
      textBlock.className = "task-meta";

      var title = document.createElement("span");
      title.className = "task-title";
      title.textContent = name;

      var detail = document.createElement("span");
      detail.className = "task-detail";

      var tasksForAssignee = state.tasks.filter(function (task) {
        return task.assignee === name;
      });

      var taskCount = tasksForAssignee.length;
      var completedTaskCount = tasksForAssignee.filter(function (task) {
        return isOneTimeTask(task) && hasAnyCompletion(task);
      }).length;
      var activeTaskCount = taskCount - completedTaskCount;

      var completedDetail = document.createElement("span");
      completedDetail.className = "task-detail";

      detail.textContent = activeTaskCount + (activeTaskCount === 1 ? " task active" : " tasks active");
      completedDetail.textContent = completedTaskCount + (completedTaskCount === 1 ? " task completed" : " tasks completed");

      textBlock.appendChild(title);
      textBlock.appendChild(detail);
      textBlock.appendChild(completedDetail);

      var remove = document.createElement("button");
      remove.type = "button";
      remove.className = "delete-btn";
      remove.textContent = "Delete";
      remove.addEventListener("click", function () {
        var inUse = taskCount > 0;
        var message = inUse
          ? "Delete assignee: " + name + "? Tasks assigned to this person will become unassigned."
          : "Delete assignee: " + name + "?";

        if (!window.confirm(message)) {
          return;
        }

        deleteAssigneeOption(name)
          .then(function () {
            return fetchTasks();
          })
          .catch(function (err) {
            if (elements.assigneeFormError) {
              elements.assigneeFormError.textContent = err.message;
            }
          });
      });

      li.appendChild(textBlock);
      li.appendChild(remove);
      elements.assigneeList.appendChild(li);
    });
  }

  function maybeReloadForVersion(nextVersion) {
    var numeric = Number(nextVersion);
    if (!numeric || safeIsNaN(numeric)) {
      return;
    }

    if (state.dataVersion === null) {
      state.dataVersion = numeric;
      return;
    }

    if (numeric !== state.dataVersion) {
      state.dataVersion = numeric;
      setDebugField("status", "database changed; refreshing");
      fetchTasks();
    }
  }

  function startAutoRefreshMonitor() {
    if (state.autoRefreshStarted) {
      return;
    }
    state.autoRefreshStarted = true;

    function startVersionPolling() {
      if (state.liveReloadMode === "poll") {
        return;
      }

      state.liveReloadMode = "poll";
      setDebugField("status", "live reload polling enabled");

      setInterval(function () {
        requestJsonViaXhr("GET", "/api/tasks/version?_t=" + Date.now())
          .then(function (payload) {
            if (!payload || payload.version === undefined) {
              return;
            }
            maybeReloadForVersion(payload.version);
          })
          .catch(function () {
          });
      }, 4000);
    }

    if (typeof window.EventSource === "function") {
      try {
        var stream = new window.EventSource("/api/tasks/changes");
        state.liveReloadMode = "sse";
        setDebugField("status", "live reload stream connected");

        stream.onmessage = function (event) {
          try {
            var payload = JSON.parse(event.data || "{}");
            if (payload && payload.version !== undefined) {
              maybeReloadForVersion(payload.version);
            }
          } catch (err) {
          }
        };

        stream.onerror = function () {
          startVersionPolling();
        };

        return;
      } catch (err) {
      }
    }

    startVersionPolling();
  }

  function fetchTasksViaXhr() {
    setDebugField("loader", "xhr");
    setDebugField("status", "request started");

    var XhrCtor = window.XMLHttpRequest;
    var request = null;

    if (!XhrCtor && typeof window.ActiveXObject !== "undefined") {
      try {
        request = new window.ActiveXObject("Microsoft.XMLHTTP");
      } catch (legacyErr) {
        request = null;
      }
    }

    if (!request && XhrCtor) {
      try {
        request = new XhrCtor();
      } catch (ctorErr) {
        request = null;
      }
    }

    if (!request) {
      setDebugField("status", "xhr unavailable");
      setUserError("XHR is unavailable on this browser.");
      return;
    }

    request.open("GET", "/api/tasks?_t=" + Date.now(), true);
    request.onreadystatechange = function () {
      if (request.readyState !== 4) {
        return;
      }

      var hasResponse = typeof request.responseText === "string" && request.responseText.length > 0;
      var isSuccessStatus = (request.status >= 200 && request.status < 300) || (request.status === 0 && hasResponse);

      if (!isSuccessStatus) {
        setDebugField("status", "failed status " + request.status);
        setUserError("Failed to load tasks");
        return;
      }

      try {
        var payload = JSON.parse(request.responseText || "{}");
        state.tasks = payload.tasks || [];
        state.groceries = payload.groceries || [];
        state.completedGroceries = payload.completedGroceries || [];
        state.assignees = payload.assignees || [];
        state.dataVersion = Number(payload.version) || state.dataVersion;
        setDebugField("status", "success " + request.status);
        setDebugField("taskCount", state.tasks.length);
        renderAll();
      } catch (err) {
        setDebugField("status", "invalid json");
        setUserError("Failed to read task data");
      }
    };
    request.send();
  }

  function fetchTasks() {
    if (typeof window.fetch !== "function") {
      setDebugField("loader", "fetch unavailable");
      fetchTasksViaXhr();
      return;
    }

    setDebugField("loader", "fetch");
    setDebugField("status", "request started");

    return fetch("/api/tasks?_t=" + Date.now())
      .then(function (response) {
        if (!response.ok) {
          throw new Error("Failed to load tasks");
        }
        setDebugField("status", "success " + response.status);
        return response.json();
      })
      .then(function (payload) {
        state.tasks = payload.tasks || [];
        state.groceries = payload.groceries || [];
        state.completedGroceries = payload.completedGroceries || [];
        state.assignees = payload.assignees || [];
        state.dataVersion = Number(payload.version) || state.dataVersion;
        setDebugField("taskCount", state.tasks.length);
        renderAll();
      })
      .catch(function (err) {
        setDebugField("status", "fetch failed; falling back to xhr");
        setDebugField("lastError", err && err.message ? err.message : "fetch error");
        fetchTasksViaXhr();
      });
  }

  function createLegacyXhr() {
    var XhrCtor = window.XMLHttpRequest;

    if (XhrCtor) {
      try {
        return new XhrCtor();
      } catch (ctorErr) {
      }
    }

    if (typeof window.ActiveXObject !== "undefined") {
      try {
        return new window.ActiveXObject("Microsoft.XMLHTTP");
      } catch (legacyErr) {
      }
    }

    return null;
  }

  function requestJsonViaXhr(method, url, body) {
    return new Promise(function (resolve, reject) {
      var request = createLegacyXhr();
      if (!request) {
        reject(new Error("XHR is unavailable on this browser."));
        return;
      }

      request.open(method, url, true);
      request.onreadystatechange = function () {
        if (request.readyState !== 4) {
          return;
        }

        var hasResponse = typeof request.responseText === "string" && request.responseText.length > 0;
        var isSuccessStatus = (request.status >= 200 && request.status < 300) || (request.status === 0 && hasResponse);

        if (!isSuccessStatus) {
          reject(new Error("Request failed (" + request.status + ")"));
          return;
        }

        if (!hasResponse) {
          resolve({});
          return;
        }

        try {
          resolve(JSON.parse(request.responseText));
        } catch (jsonErr) {
          reject(new Error("Invalid JSON response"));
        }
      };

      if (body !== undefined) {
        request.setRequestHeader("Content-Type", "application/json");
        request.send(JSON.stringify(body));
        return;
      }

      request.send();
    });
  }

  function requestJson(method, url, body) {
    if (typeof window.fetch !== "function") {
      return requestJsonViaXhr(method, url, body);
    }

    return fetch(url, {
      method: method,
      headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined
    })
      .then(function (response) {
        if (!response.ok) {
          return response.json()
            .then(function (data) {
              throw new Error(data.error || "Request failed");
            })
            .catch(function () {
              throw new Error("Request failed");
            });
        }

        return response.json().catch(function () {
          return {};
        });
      })
      .catch(function () {
        return requestJsonViaXhr(method, url, body);
      });
  }

  function addTask(taskInput) {
    return requestJson("POST", "/api/tasks", taskInput);
  }

  function addAssigneeOption(name) {
    return requestJson("POST", "/api/assignees", { name: name });
  }

  function updateTask(taskId, taskInput) {
    return requestJson("PATCH", "/api/tasks/" + encodeURIComponent(taskId), taskInput);
  }

  function setCompletionRaw(taskId, dateIso, completed) {
    return requestJson("PATCH", "/api/tasks/" + encodeURIComponent(taskId) + "/completion", { date: dateIso, completed: completed });
  }

  function updateCompletion(taskId, dateIso, completed) {
    return setCompletionRaw(taskId, dateIso, completed)
      .then(function () {
        return fetchTasks();
      })
      .catch(function (err) {
        if (elements.formError) {
          elements.formError.textContent = err.message;
        }
      });
  }

  function setGroceryCompletionRaw(groceryId, completed) {
    return requestJson("PATCH", "/api/groceries/" + encodeURIComponent(groceryId) + "/completion", {
      completed: completed,
      completedAt: new Date().toISOString()
    });
  }

  function updateGroceryCompletion(groceryId, completed) {
    return setGroceryCompletionRaw(groceryId, completed)
      .then(function () {
        return fetchTasks();
      })
      .catch(function (err) {
        if (elements.groceryFormError) {
          elements.groceryFormError.textContent = err.message;
        }
      });
  }

  function applyTaskCheck(task, dateIso, completed, sourceElement) {
    if (!completed) {
      updateCompletion(task.id, dateIso, false);
      return;
    }

    if (isOneTimeTask(task)) {
      startTaskClearWithUndo(task, dateIso, sourceElement, sourceElement ? sourceElement.querySelector("input[type='checkbox']") : null);
      return;
    }

    runConfetti(sourceElement);
    updateCompletion(task.id, dateIso, true);
  }

  function deleteTask(taskId) {
    requestJson("DELETE", "/api/tasks/" + encodeURIComponent(taskId))
      .then(function (response) {
        return response;
      })
      .then(function () {
        return fetchTasks();
      })
      .catch(function (err) {
        if (elements.formError) {
          elements.formError.textContent = err.message;
        }
      });
  }

  function deleteAssigneeOption(name) {
    return requestJson("DELETE", "/api/assignees/" + encodeURIComponent(name));
  }

  function addGrocery(groceryInput) {
    return requestJson("POST", "/api/groceries", groceryInput);
  }

  function deleteGrocery(groceryId) {
    requestJson("DELETE", "/api/groceries/" + encodeURIComponent(groceryId))
      .then(function (response) {
        return response;
      })
      .then(function () {
        return fetchTasks();
      })
      .catch(function (err) {
        if (elements.groceryFormError) {
          elements.groceryFormError.textContent = err.message;
        }
      });
  }

  function openGroceryModal() {
    if (!elements.groceryModal) {
      return;
    }

    elements.groceryModal.classList.remove("hidden");
    if (elements.groceryFormError) {
      elements.groceryFormError.textContent = "";
    }
    window.setTimeout(function () {
      if (elements.groceryTitle) {
        elements.groceryTitle.focus();
      }
    }, 0);
  }

  function closeGroceryModal() {
    if (!elements.groceryModal) {
      return;
    }

    elements.groceryModal.classList.add("hidden");
    if (elements.groceryFormError) {
      elements.groceryFormError.textContent = "";
    }
  }

  function clearGroceryForm() {
    if (!elements.groceryForm) {
      return;
    }

    elements.groceryForm.reset();
    if (elements.groceryCategory) {
      elements.groceryCategory.value = "Grocery Store";
    }
  }

  function renderGroceries() {
    if (!elements.groceriesList || !elements.groceriesCount) {
      return;
    }

    var categoryColors = {
      "Grocery Store": "#b8c5b3",
      "Costco": "#a8b3ff",
      "Other": "#ffc9a8"
    };

    elements.groceriesList.innerHTML = "";

    forEachNode(state.groceries, function (item) {
      var li = document.createElement("li");
      li.className = "task-item grocery-item";
      li.setAttribute("data-grocery-id", item.id);

      var checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.className = "task-check";

      checkbox.addEventListener("click", function (event) {
        event.stopPropagation();
      });
      checkbox.addEventListener("change", function () {
        updateGroceryCompletion(item.id, checkbox.checked);
      });

      var label = document.createElement("label");
      label.className = "task-label";

      var categoryBadge = document.createElement("span");
      categoryBadge.className = "category-badge";
      categoryBadge.textContent = item.category;
      categoryBadge.style.backgroundColor = categoryColors[item.category] || categoryColors["Other"];

      var title = document.createElement("span");
      title.textContent = item.title;

      label.appendChild(checkbox);
      label.appendChild(categoryBadge);
      label.appendChild(title);

      li.appendChild(label);

      attachSwipeDeleteControl(li, {
        buttonText: "Delete",
        buttonLabel: "Delete grocery item permanently",
        onDelete: function () {
          deleteGrocery(item.id);
        }
      });

      elements.groceriesList.appendChild(li);
    });

    var countText = state.groceries.length + " " + (state.groceries.length === 1 ? "item" : "items");
    elements.groceriesCount.textContent = countText;
  }

  function onGroceryFormSubmit(event) {
    event.preventDefault();
    if (!elements.groceryFormError || !elements.groceryTitle) {
      return;
    }

    elements.groceryFormError.textContent = "";

    var title = elements.groceryTitle.value.trim();
    if (!title) {
      elements.groceryFormError.textContent = "Item name is required.";
      return;
    }

    var category = (elements.groceryCategory && elements.groceryCategory.value) || "Grocery Store";

    var groceryInput = {
      title: title,
      category: category
    };

    addGrocery(groceryInput)
      .then(function () {
        clearGroceryForm();
        closeGroceryModal();
        return fetchTasks();
      })
      .catch(function (err) {
        elements.groceryFormError.textContent = err.message;
      });
  }

  function onFormSubmit(event) {
    event.preventDefault();
    if (!elements.formError || !elements.taskTitle) {
      return;
    }

    elements.formError.textContent = "";

    var title = elements.taskTitle.value.trim();
    if (!title) {
      elements.formError.textContent = "Task title is required.";
      return;
    }

    var schedule;
    try {
      schedule = buildScheduleFromForm();
    } catch (err) {
      elements.formError.textContent = err.message;
      return;
    }

    var taskInput = {
      title: title,
      assignee: elements.taskAssignee ? elements.taskAssignee.value : "",
      schedule: schedule,
      startDate: isoDate(startOfDay(state.currentDate))
    };

    var savePromise = state.editingTaskId ? updateTask(state.editingTaskId, taskInput) : addTask(taskInput);

    savePromise
      .then(function () {
        clearForm();
        closeTaskModal();
        return fetchTasks();
      })
      .catch(function (err) {
        elements.formError.textContent = err.message;
      });
  }

  function bindEvents() {
    if (elements.sidebarToggle) {
      elements.sidebarToggle.addEventListener("click", toggleSidebar);
    }

    if (elements.textSmaller) {
      elements.textSmaller.addEventListener("click", function () {
        changeTextScale(-0.08);
      });
    }

    if (elements.textReset) {
      elements.textReset.addEventListener("click", function () {
        setTextScale(1);
      });
    }

    if (elements.textBigger) {
      elements.textBigger.addEventListener("click", function () {
        changeTextScale(0.08);
      });
    }

    if (elements.themeBright) {
      elements.themeBright.addEventListener("click", function () {
        setTheme("bright");
      });
    }

    if (elements.themeDark) {
      elements.themeDark.addEventListener("click", function () {
        setTheme("dark");
      });
    }

    if (elements.toggleDebug) {
      elements.toggleDebug.addEventListener("click", function () {
        toggleDebugPanelSetting();
      });
    }

    if (elements.testConfetti) {
      elements.testConfetti.addEventListener("click", function () {
        runConfetti(elements.testConfetti);
      });
    }

    if (elements.openTaskModal) {
      elements.openTaskModal.addEventListener("click", function () {
        openTaskModal(null);
      });
    }

    if (elements.closeTaskModal) {
      elements.closeTaskModal.addEventListener("click", closeTaskModal);
    }

    if (elements.taskModalBackdrop) {
      elements.taskModalBackdrop.addEventListener("click", closeTaskModal);
    }

    document.addEventListener("click", function (event) {
      var openRow = state.openSwipeDeleteRow;
      if (!openRow) {
        return;
      }

      var node = event.target;
      while (node) {
        if (node === openRow) {
          return;
        }
        node = node.parentNode;
      }

      closeSwipeDeleteRow(openRow);
    }, true);

    document.addEventListener("keydown", function (event) {
      if (event.key !== "Escape") {
        return;
      }

      if (elements.taskModal && !elements.taskModal.classList.contains("hidden")) {
        closeTaskModal();
      }

      if (elements.groceryModal && !elements.groceryModal.classList.contains("hidden")) {
        closeGroceryModal();
      }

      if (isSidebarOpen()) {
        closeSidebar();
      }
    });

    var maybeCloseSidebarFromOutsidePress = function (event) {
      if (!isSidebarOpen()) {
        return;
      }

      var target = event.target;
      if (elements.leftSidebar && elements.leftSidebar.contains(target)) {
        return;
      }

      if (elements.sidebarToggle && elements.sidebarToggle.contains(target)) {
        return;
      }

      closeSidebar();
    };

    document.addEventListener("click", maybeCloseSidebarFromOutsidePress);

    if (state.preIOS10Mode) {
      document.addEventListener("touchstart", maybeCloseSidebarFromOutsidePress, true);
    }

    if (elements.frequency) {
      elements.frequency.addEventListener("change", showFrequencyOptions);
    }

    if (elements.taskForm) {
      elements.taskForm.addEventListener("submit", onFormSubmit);
    }

    if (elements.settingsTaskTab) {
      elements.settingsTaskTab.addEventListener("click", function () {
        setSettingsTab("tasks");
      });
    }

    if (elements.settingsAssigneesTab) {
      elements.settingsAssigneesTab.addEventListener("click", function () {
        setSettingsTab("assignees");
      });
    }

    if (elements.completedTasksTab) {
      elements.completedTasksTab.addEventListener("click", function () {
        state.completedView = "tasks";
        renderCompleted();
      });
    }

    if (elements.completedGroceriesTab) {
      elements.completedGroceriesTab.addEventListener("click", function () {
        state.completedView = "groceries";
        renderCompleted();
      });
    }

    if (elements.assigneeForm) {
      elements.assigneeForm.addEventListener("submit", function (event) {
        event.preventDefault();

        if (!elements.assigneeName || !elements.assigneeFormError) {
          return;
        }

        elements.assigneeFormError.textContent = "";

        var name = elements.assigneeName.value.trim();
        if (!name) {
          elements.assigneeFormError.textContent = "Assignee name is required.";
          return;
        }

        addAssigneeOption(name)
          .then(function () {
            elements.assigneeName.value = "";
            return fetchTasks();
          })
          .catch(function (err) {
            elements.assigneeFormError.textContent = err.message;
          });
      });
    }

    if (elements.openGroceryModal) {
      elements.openGroceryModal.addEventListener("click", openGroceryModal);
    }

    if (elements.closeGroceryModal) {
      elements.closeGroceryModal.addEventListener("click", closeGroceryModal);
    }

    if (elements.groceryModalBackdrop) {
      elements.groceryModalBackdrop.addEventListener("click", closeGroceryModal);
    }

    if (elements.groceryForm) {
      elements.groceryForm.addEventListener("submit", onGroceryFormSubmit);
    }

    if (elements.prevMonth) {
      elements.prevMonth.addEventListener("click", function () {
        state.calendarMonth -= 1;
        if (state.calendarMonth < 0) {
          state.calendarMonth = 11;
          state.calendarYear -= 1;
        }
        renderCalendar();
      });
    }

    if (elements.nextMonth) {
      elements.nextMonth.addEventListener("click", function () {
        state.calendarMonth += 1;
        if (state.calendarMonth > 11) {
          state.calendarMonth = 0;
          state.calendarYear += 1;
        }
        renderCalendar();
      });
    }
  }

  function init() {
    initDebugPanel();
    applyCompatibilityFlags();
    applySavedTheme();
    applySavedTextScale();
    createWeekdayCheckboxes();
    createMonthOptions();
    renderAssigneeOptions("");
    renderCalendarWeekdays();
    showFrequencyOptions();
    setSettingsTab("tasks");
    bindEvents();
    fetchAndRenderAppVersion();
    closeSidebar();
    renderClock();
    setInterval(function () {
      renderClock();
    }, 1000);
    setInterval(function () {
      renderAll();
    }, 60000);
    startAutoRefreshMonitor();
    fetchTasks();
  }

  init();
})();
