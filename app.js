// ─────────────────────────────────────────────
//  TTBL Marketing — Supabase edition
//  Replace YOUR_SUPABASE_URL and YOUR_SUPABASE_ANON_KEY
//  with the values from Supabase → Settings → API
// ─────────────────────────────────────────────

const SUPABASE_URL  = "https://nbkuodfeivdqmgyezsba.supabase.co";
const SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ia3VvZGZlaXZkcW1neWV6c2JhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMzOTgxMzgsImV4cCI6MjA4ODk3NDEzOH0.tT1RLsBOaPNcmp10NmjvNMQycWXbBmeYCmMYuwAXTB0";

const ALLOWED_USERS = [
  "Norbert Vella",
  "Thomas Cuschieri",
  "Tony Micallef",
  "Humbert Mozzi"
];

// Only these Google email addresses can access the app
// Add or remove emails here to control access
const ALLOWED_EMAILS = [
  "thomas.cuschieri@gmail.com"
];

const DEFAULT_UPLOADER = "Marketing Team";
const DELETE_PASSWORD  = "DELETE";
const EDIT_PASSWORD    = "EDIT";

let supabase   = null;
let media      = [];
let currentUser = null;
let currentCalendarDate = new Date();

// ── DOM refs ──────────────────────────────────

const loginScreen   = document.getElementById("loginScreen");
const appShell      = document.getElementById("appShell");
const loginForm     = document.getElementById("loginForm");
const loginEmail    = document.getElementById("loginEmail");
const loginPassword = document.getElementById("loginPassword");
const loginError    = document.getElementById("loginError");
const loginBtn      = document.getElementById("loginBtn");
const logoutBtn     = document.getElementById("logoutBtn");
const userLabel     = document.getElementById("userLabel");

const tabButtons    = document.querySelectorAll(".nav-item");
const pageTitle     = document.getElementById("pageTitle");

const uploadForm        = document.getElementById("uploadForm");
const uploaderInput     = document.getElementById("uploader");
const publishDateInput  = document.getElementById("publishDate");
const publishTimeInput  = document.getElementById("publishTime");
const fileInput         = document.getElementById("fileUpload");
const notesInput        = document.getElementById("notes");
const uploadPreview     = document.getElementById("uploadPreview");

const brandDropdown       = document.getElementById("brandDropdown");
const brandDropdownToggle = document.getElementById("brandDropdownToggle");
const brandDropdownMenu   = document.getElementById("brandDropdownMenu");
const brandDropdownLabel  = document.getElementById("brandDropdownLabel");

const mediaList   = document.getElementById("mediaList");
const searchInput = document.getElementById("searchInput");
const statusFilter = document.getElementById("statusFilter");
const emptyState  = document.getElementById("emptyState");
const assetTemplate = document.getElementById("assetTemplate");

const calendarGrid        = document.getElementById("calendarGrid");
const calendarEmptyState  = document.getElementById("calendarEmptyState");
const calendarMonthTitle  = document.getElementById("calendarMonthTitle");
const calendarPrevBtn     = document.getElementById("calendarPrevBtn");
const calendarNextBtn     = document.getElementById("calendarNextBtn");

const libraryGrid      = document.getElementById("libraryGrid");
const libraryEmptyState = document.getElementById("libraryEmptyState");
const archiveGrid      = document.getElementById("archiveGrid");
const archiveEmptyState = document.getElementById("archiveEmptyState");

const statusBreakdown   = document.getElementById("statusBreakdown");
const approverBreakdown = document.getElementById("approverBreakdown");
const commentBreakdown  = document.getElementById("commentBreakdown");
const recentActivity    = document.getElementById("recentActivity");

const totalCount    = document.getElementById("totalCount");
const pendingCount  = document.getElementById("pendingCount");
const approvedCount = document.getElementById("approvedCount");
const changesCount  = document.getElementById("changesCount");

const calendarAssetModal         = document.getElementById("calendarAssetModal");
const calendarAssetModalBackdrop = document.getElementById("calendarAssetModalBackdrop");
const calendarAssetModalClose    = document.getElementById("calendarAssetModalClose");
const calendarAssetModalPreview  = document.getElementById("calendarAssetModalPreview");
const calendarAssetModalIcons    = document.getElementById("calendarAssetModalIcons");
const calendarAssetModalTitle    = document.getElementById("calendarAssetModalTitle");
const calendarAssetModalMeta     = document.getElementById("calendarAssetModalMeta");
const calendarAssetModalScheduled = document.getElementById("calendarAssetModalScheduled");
const calendarAssetModalStatus   = document.getElementById("calendarAssetModalStatus");
const calendarAssetModalApprovers = document.getElementById("calendarAssetModalApprovers");
const calendarAssetModalCreated  = document.getElementById("calendarAssetModalCreated");
const calendarAssetModalCaption  = document.getElementById("calendarAssetModalCaption");
const calendarAssetModalBrands   = document.getElementById("calendarAssetModalBrands");

// ── Brand options ─────────────────────────────

const BRAND_OPTIONS = [
  { brandName: "AV7 Events",            platform: "instagram" },
  { brandName: "AV7 Events",            platform: "linkedin"  },
  { brandName: "AV7 Events Malta",      platform: "facebook"  },
  { brandName: "Coffee Fellows Malta",  platform: "facebook"  },
  { brandName: "Coffee Fellows Malta",  platform: "instagram" },
  { brandName: "Coffee Fellows Malta",  platform: "linkedin"  },
  { brandName: "Panku Street Food",     platform: "linkedin"  },
  { brandName: "Panku Street Food Malta", platform: "facebook"  },
  { brandName: "Panku Street Food Malta", platform: "instagram" },
  { brandName: "TTBL Ltd",              platform: "linkedin"  }
].sort((a, b) => {
  const n = a.brandName.localeCompare(b.brandName);
  return n !== 0 ? n : getPlatformLabel(a.platform).localeCompare(getPlatformLabel(b.platform));
});

// ── Bootstrap ─────────────────────────────────

async function boot() {
  supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON);

  buildBrandDropdown();
  setupEventListeners();

  // Handle password reset / invite links (tokens in URL hash)
  const hash = window.location.hash;
  if (hash.includes("type=recovery") || hash.includes("type=invite") || hash.includes("type=signup")) {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      showResetPassword();
      return;
    }
  }

  // Check if already logged in
  const { data: { session } } = await supabase.auth.getSession();
  if (session) {
    currentUser = session.user;
    showApp();
  } else {
    showLogin();
  }

  // Listen for auth state changes
  supabase.auth.onAuthStateChange((event, session) => {
    if (event === "PASSWORD_RECOVERY") {
      showResetPassword();
    } else if (session) {
      currentUser = session.user;
      // Only show app if not on reset screen
      if (!document.getElementById("resetScreen") || document.getElementById("resetScreen").classList.contains("hidden")) {
        showApp();
      }
    } else {
      currentUser = null;
      showLogin();
    }
  });
}

function showLogin() {
  loginScreen.classList.remove("hidden");
  appShell.classList.add("hidden");
  const resetScreen = document.getElementById("resetScreen");
  if (resetScreen) resetScreen.classList.add("hidden");
}

function showResetPassword() {
  loginScreen.classList.add("hidden");
  appShell.classList.add("hidden");

  let resetScreen = document.getElementById("resetScreen");
  if (!resetScreen) {
    resetScreen = document.createElement("div");
    resetScreen.id = "resetScreen";
    resetScreen.className = "login-screen";
    resetScreen.innerHTML = `
      <div class="login-card">
        <div class="login-logo">
          <div class="brand-logo">T</div>
          <div>
            <h1>TTBL Marketing</h1>
            <p>Set your new password</p>
          </div>
        </div>
        <form id="resetForm" class="login-form">
          <div class="field">
            <label for="newPassword">New password</label>
            <input type="password" id="newPassword" placeholder="Min. 8 characters" required minlength="8" />
          </div>
          <div class="field">
            <label for="confirmPassword">Confirm password</label>
            <input type="password" id="confirmPassword" placeholder="Repeat password" required minlength="8" />
          </div>
          <p id="resetError" class="login-error"></p>
          <button type="submit" id="resetBtn" class="primary-btn login-submit-btn">Set password</button>
        </form>
      </div>`;
    document.body.appendChild(resetScreen);

    document.getElementById("resetForm").addEventListener("submit", async (e) => {
      e.preventDefault();
      const newPass  = document.getElementById("newPassword").value;
      const confirm  = document.getElementById("confirmPassword").value;
      const errorEl  = document.getElementById("resetError");
      const btn      = document.getElementById("resetBtn");

      if (newPass !== confirm) { errorEl.textContent = "Passwords do not match."; return; }

      btn.disabled = true;
      btn.textContent = "Saving…";
      errorEl.textContent = "";

      const { error } = await supabase.auth.updateUser({ password: newPass });
      if (error) {
        errorEl.textContent = error.message;
        btn.disabled = false;
        btn.textContent = "Set password";
      } else {
        // Password set — go straight into the app
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          currentUser = session.user;
          resetScreen.classList.add("hidden");
          window.location.hash = "";
          showApp();
        }
      }
    });
  }

  resetScreen.classList.remove("hidden");
}

async function showApp() {
  // Block anyone not on the approved email list
  if (!ALLOWED_EMAILS.includes(currentUser.email.toLowerCase())) {
    await supabase.auth.signOut();
    loginScreen.classList.remove("hidden");
    appShell.classList.add("hidden");
    document.getElementById("loginError").textContent = "Access denied. Your account is not authorised to use this portal.";
    return;
  }

  loginScreen.classList.add("hidden");
  appShell.classList.remove("hidden");
  userLabel.textContent = currentUser.email;
  uploaderInput.value = DEFAULT_UPLOADER;
  updateDropdownLabel();
  await loadAndRender();
  setInterval(loadAndRender, 60000);

  // Real-time subscription — reload when any change happens in DB
  supabase
    .channel("media_changes")
    .on("postgres_changes", { event: "*", schema: "public", table: "media_assets" }, () => {
      loadAndRender();
    })
    .subscribe();
}

// ── Auth ──────────────────────────────────────

async function handleLogin(e) {
  e.preventDefault();
  loginBtn.disabled = true;
  loginBtn.textContent = "Redirecting to Google…";
  loginError.textContent = "";

  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: "https://ttblmarketing.github.io/ttbl-marketing"
    }
  });

  if (error) {
    loginError.textContent = "Could not connect to Google. Please try again.";
    loginBtn.disabled = false;
    loginBtn.textContent = "Sign in with Google";
  }
}

async function handleLogout() {
  await supabase.auth.signOut();
}

// ── Supabase data helpers ─────────────────────

async function loadMedia() {
  const { data, error } = await supabase
    .from("media_assets")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) { console.error("Load error:", error); return []; }

  return (data || []).map(normalizeMediaItem).filter(Boolean);
}

function normalizeMediaItem(row) {
  if (!row || typeof row !== "object") return null;
  return {
    id:          row.id,
    uploader:    row.uploader    || DEFAULT_UPLOADER,
    brands:      Array.isArray(row.brands)    ? row.brands    : [],
    approvers:   Array.isArray(row.approvers) ? row.approvers : [],
    publishDate: row.publish_date || "",
    publishTime: row.publish_time || "",
    notes:       row.notes  || "",
    status:      row.status === "Approved" ? "Approved" : "Pending",
    createdAt:   row.created_at || new Date().toISOString(),
    comments:    Array.isArray(row.comments) ? row.comments : [],
    fileUrls:    Array.isArray(row.file_urls) ? row.file_urls : [],
    fileTypes:   Array.isArray(row.file_types) ? row.file_types : [],
    fileNames:   Array.isArray(row.file_names) ? row.file_names : [],
    editing:     false,
    // Build items array from stored public URLs
    items: (row.file_urls || []).map((url, i) => ({
      name: (row.file_names || [])[i] || `file_${i}`,
      type: (row.file_types || [])[i] || "image/jpeg",
      data: url
    }))
  };
}

async function persistItem(item) {
  const { error } = await supabase
    .from("media_assets")
    .upsert({
      id:           item.id,
      uploader:     item.uploader,
      brands:       item.brands,
      approvers:    item.approvers,
      publish_date: item.publishDate,
      publish_time: item.publishTime,
      notes:        item.notes,
      status:       item.status,
      created_at:   item.createdAt,
      comments:     item.comments,
      file_urls:    item.fileUrls  || [],
      file_types:   item.fileTypes || [],
      file_names:   item.fileNames || []
    });
  if (error) console.error("Persist error:", error);
}

async function loadAndRender() {
  media = await loadMedia();
  render();
}

// ── Upload ────────────────────────────────────

async function handleUpload(event) {
  event.preventDefault();

  const files      = Array.from(fileInput.files || []);
  const notes      = notesInput.value.trim();
  const brands     = getSelectedBrands();
  const publishDate = publishDateInput.value;
  const publishTime = publishTimeInput.value;

  if (!files.length)       { alert("Please select media file(s)."); return; }
  if (!brands.length)      { alert("Please select at least one outlet."); return; }
  if (!publishDate)        { alert("Please enter the date."); return; }
  if (!publishTime)        { alert("Please enter the time."); return; }

  const allImages = files.every(f => f.type.startsWith("image/"));
  const allVideos = files.every(f => f.type.startsWith("video/"));

  if (!allImages && !allVideos) { alert("Please upload either image(s) only or one video only."); return; }
  if (allVideos && files.length > 1) { alert("Please upload only one video at a time."); return; }

  const submitBtn = uploadForm.querySelector(".primary-btn");
  submitBtn.disabled = true;
  submitBtn.textContent = "Uploading…";

  try {
    const id = Date.now();
    const fileUrls  = [];
    const fileTypes = [];
    const fileNames = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const ext  = file.name.split(".").pop();
      const path = `${id}/${i}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("media")
        .upload(path, file, { cacheControl: "3600", upsert: false });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("media").getPublicUrl(path);
      fileUrls.push(urlData.publicUrl);
      fileTypes.push(file.type);
      fileNames.push(file.name);
    }

    const newEntry = {
      id,
      uploader:    DEFAULT_UPLOADER,
      brands,
      approvers:   [],
      publishDate,
      publishTime,
      notes,
      status:      "Pending",
      createdAt:   new Date().toISOString(),
      comments:    [],
      fileUrls,
      fileTypes,
      fileNames,
      editing:     false,
      items: fileUrls.map((url, i) => ({
        name: fileNames[i],
        type: fileTypes[i],
        data: url
      }))
    };

    await persistItem(newEntry);
    media.unshift(newEntry);

    uploadForm.reset();
    uploaderInput.value = DEFAULT_UPLOADER;
    clearSelectedBrands();
    closeBrandDropdown();
    uploadPreview.className = "upload-preview empty";
    uploadPreview.innerHTML = "<span>No file selected</span>";
    render();

  } catch (err) {
    console.error("Upload failed:", err);
    alert("Upload failed. Please try again.");
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Upload asset";
  }
}

// ── CRUD actions ──────────────────────────────

async function setApprovers(id, approvers) {
  const item = media.find(e => e.id === id);
  if (!item) return;
  item.approvers = approvers.filter(n => ALLOWED_USERS.includes(n));
  if (!item.approvers.length) item.status = "Pending";
  await persistItem(item);
  render();
}

async function toggleApproval(id) {
  const item = media.find(e => e.id === id);
  if (!item) return;
  if (!item.approvers.length) { alert("Please select at least one approver first."); return; }
  item.status = item.status === "Approved" ? "Pending" : "Approved";
  await persistItem(item);
  render();
}

async function deleteAsset(id) {
  const password = window.prompt("Enter delete password:");
  if (password === null) return;
  if (password !== DELETE_PASSWORD) { alert("Incorrect password."); return; }

  const item = media.find(m => m.id === id);
  if (item && item.fileUrls) {
    // Remove files from storage
    const paths = item.fileUrls.map(url => {
      const parts = url.split("/media/");
      return parts[1] ? decodeURIComponent(parts[1]) : null;
    }).filter(Boolean);
    if (paths.length) {
      await supabase.storage.from("media").remove(paths);
    }
  }

  await supabase.from("media_assets").delete().eq("id", id);
  media = media.filter(m => m.id !== id);
  closeCalendarAssetModal();
  render();
}

async function addComment(id, user, text) {
  const item = media.find(e => e.id === id);
  if (!item) return;
  if (!ALLOWED_USERS.includes(user)) { alert("Please choose a valid username from the list."); return; }
  if (!text.trim()) { alert("Please write a comment."); return; }

  item.comments.unshift({ id: Date.now(), user, text: text.trim(), createdAt: new Date().toISOString() });
  await persistItem(item);
  render();
}

function openEditPanel(id) {
  if (!requestEditPassword()) return;
  media.forEach(item => { item.editing = item.id === id; });
  render();
}

function cancelEditPanel(id) {
  const item = media.find(e => e.id === id);
  if (!item) return;
  item.editing = false;
  render();
}

async function saveAssetEdit(id, newCaption, newDate, newTime) {
  const item = media.find(e => e.id === id);
  if (!item) return;
  if (!newDate.trim()) { alert("Please enter the scheduled date."); return; }
  if (!newTime.trim()) { alert("Please enter the scheduled time."); return; }
  item.notes       = newCaption.trim();
  item.publishDate = newDate.trim();
  item.publishTime = newTime.trim();
  item.editing     = false;
  await persistItem(item);
  render();
}

// ── Event listeners ───────────────────────────

function setupEventListeners() {
  loginForm.addEventListener("submit", handleLogin);
  logoutBtn.addEventListener("click", handleLogout);
  uploadForm.addEventListener("submit", handleUpload);
  fileInput.addEventListener("change", handleUploadPreview);
  searchInput.addEventListener("input", renderWorkspace);
  statusFilter.addEventListener("change", renderWorkspace);
  brandDropdownToggle.addEventListener("click", toggleBrandDropdown);

  calendarPrevBtn.addEventListener("click", () => {
    currentCalendarDate = new Date(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth() - 1, 1);
    renderCalendar();
  });
  calendarNextBtn.addEventListener("click", () => {
    currentCalendarDate = new Date(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth() + 1, 1);
    renderCalendar();
  });

  if (calendarAssetModalBackdrop) calendarAssetModalBackdrop.addEventListener("click", closeCalendarAssetModal);
  if (calendarAssetModalClose)    calendarAssetModalClose.addEventListener("click", closeCalendarAssetModal);

  document.addEventListener("keydown", e => { if (e.key === "Escape") closeCalendarAssetModal(); });

  document.addEventListener("click", (e) => {
    if (brandDropdown && !brandDropdown.contains(e.target)) closeBrandDropdown();
    document.querySelectorAll(".approver-dropdown").forEach(dd => {
      if (!dd.contains(e.target)) {
        const m = dd.querySelector(".approver-dropdown-menu");
        if (m) m.classList.add("hidden");
      }
    });
  });

  tabButtons.forEach(btn => btn.addEventListener("click", () => switchTab(btn.dataset.tab)));
}

// ── Brand dropdown ────────────────────────────

function buildBrandDropdown() {
  const checklist = document.getElementById("brandChecklist");
  if (!checklist) return;
  checklist.innerHTML = BRAND_OPTIONS.map(option => `
    <label class="brand-option">
      <input type="checkbox" name="brandOption" value="${escapeHtml(option.brandName)}|||${escapeHtml(option.platform)}">
      ${getPlatformIconMarkup(option.platform)}
      <span class="brand-option-text">${escapeHtml(option.brandName)}</span>
    </label>
  `).join("");
  checklist.querySelectorAll('input[name="brandOption"]').forEach(cb => cb.addEventListener("change", updateDropdownLabel));
}

function toggleBrandDropdown() { brandDropdownMenu.classList.toggle("hidden"); }
function closeBrandDropdown()  { brandDropdownMenu.classList.add("hidden"); }

function getBrandCheckboxes() { return document.querySelectorAll('input[name="brandOption"]'); }

function getSelectedBrands() {
  return Array.from(getBrandCheckboxes()).filter(cb => cb.checked).map(cb => {
    const [brandName, platform] = cb.value.split("|||");
    return { brandName: brandName.trim(), platform: platform.trim() };
  });
}

function clearSelectedBrands() {
  getBrandCheckboxes().forEach(cb => { cb.checked = false; });
  updateDropdownLabel();
}

function updateDropdownLabel() {
  brandDropdownLabel.innerHTML = getSelectionPillsMarkup(getSelectedBrands());
}

// ── Tab switching ─────────────────────────────

function switchTab(tab) {
  tabButtons.forEach(btn => btn.classList.toggle("active", btn.dataset.tab === tab));
  document.querySelectorAll(".tab-panel").forEach(p => p.classList.remove("active"));
  const titles = { workspace: "Content Approval Board", calendar: "Content Calendar", library: "Media Library", analytics: "Workflow Analytics" };
  pageTitle.textContent = titles[tab] || "Content Approval Board";
  document.getElementById(`${tab}Panel`).classList.add("active");
  render();
}

// ── Helpers ───────────────────────────────────

function getPlatformLabel(platform) {
  return { instagram: "Instagram", facebook: "Facebook", linkedin: "LinkedIn" }[platform] || platform;
}

function escapeHtml(value) {
  return String(value).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");
}

function getPlatformIconMarkup(platform) {
  if (platform === "instagram") {
    const gradId = `ig-rg-${Math.random().toString(36).slice(2, 8)}`;
    return `
      <span class="platform-badge" title="Instagram" aria-label="Instagram">
        <svg class="platform-icon instagram" viewBox="0 0 24 24" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <radialGradient id="${gradId}" gradientUnits="userSpaceOnUse" cx="2" cy="22" r="29">
              <stop offset="0%" stop-color="#ffd676"/>
              <stop offset="25%" stop-color="#f9a844"/>
              <stop offset="45%" stop-color="#f26122"/>
              <stop offset="60%" stop-color="#e2175d"/>
              <stop offset="80%" stop-color="#a51494"/>
              <stop offset="100%" stop-color="#4d49c8"/>
            </radialGradient>
          </defs>
          <rect x="0" y="0" width="24" height="24" rx="6" fill="url(#${gradId})"/>
          <rect x="4" y="4" width="16" height="16" rx="4.5" fill="none" stroke="#fff" stroke-width="1.8"/>
          <circle cx="12" cy="12" r="3.8" fill="none" stroke="#fff" stroke-width="1.8"/>
          <circle cx="17" cy="7" r="1.1" fill="#fff"/>
        </svg>
      </span>`;
  }
  if (platform === "facebook") {
    return `
      <span class="platform-badge" title="Facebook" aria-label="Facebook">
        <svg class="platform-icon facebook" viewBox="0 0 24 24" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
          <rect width="24" height="24" rx="5.5" fill="#1877F2"/>
          <path fill="#fff" d="M15.12 12.5H13v7h-2.9v-7H8.5V9.8h1.6V8.37C10.1 6.4 11.2 5 13.43 5c.96 0 1.97.14 1.97.14v2.13h-1.11c-1.09 0-1.29.53-1.29 1.19V9.8h2.34l-.22 2.7z"/>
        </svg>
      </span>`;
  }
  if (platform === "linkedin") {
    return `
      <span class="platform-badge" title="LinkedIn" aria-label="LinkedIn">
        <svg class="platform-icon linkedin" viewBox="0 0 24 24" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
          <rect width="24" height="24" rx="4" fill="#0A66C2"/>
          <path fill="#fff" d="M7.1 9.5h2.6v8.4H7.1zm1.3-4a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3zm3.1 4h2.5v1.15h.03c.35-.66 1.2-1.35 2.47-1.35 2.64 0 3.13 1.74 3.13 4v4.6H17V13.8c0-.97-.02-2.22-1.35-2.22-1.36 0-1.57 1.06-1.57 2.15v4.17h-2.6V9.5z"/>
        </svg>
      </span>`;
  }
  return `<span>${escapeHtml(getPlatformLabel(platform))}</span>`;
}

function getSelectionPillsMarkup(brands) {
  if (!brands.length) return "Select one or more outlets";
  return brands.map(item => `
    <span class="selection-pill">
      ${getPlatformIconMarkup(item.platform)}
      <span>${escapeHtml(item.brandName)}</span>
    </span>`).join("");
}

function formatBrandList(brands) {
  if (!Array.isArray(brands) || !brands.length) return "No brand selected";
  return brands.map(b => `${b.brandName} - ${getPlatformLabel(b.platform)}`).join(" • ");
}

function getBrandPillsMarkup(brands) {
  if (!Array.isArray(brands) || !brands.length) return "";
  return brands.map(b => `
    <span class="brand-pill">
      ${getPlatformIconMarkup(b.platform)}
      <span class="brand-pill-name">${escapeHtml(b.brandName)}</span>
    </span>`).join("");
}

function getBrandIconsMarkup(brands) {
  if (!Array.isArray(brands) || !brands.length) return "";
  return brands.map(b => getPlatformIconMarkup(b.platform)).join("");
}

function getAssetTitle() { return ""; }

function requestEditPassword() {
  const p = window.prompt("Enter edit password:");
  if (p === null) return false;
  if (p !== EDIT_PASSWORD) { alert("Incorrect password."); return false; }
  return true;
}

function formatDateTime(dateValue, timeValue) {
  if (!dateValue || !timeValue) return "No scheduled time";
  const date = new Date(`${dateValue}T${timeValue}`);
  if (Number.isNaN(date.getTime())) return `${dateValue} ${timeValue}`;
  return date.toLocaleString([], { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function formatTimeOnly(timeValue) {
  if (!timeValue) return "";
  const date = new Date(`2000-01-01T${timeValue}`);
  if (Number.isNaN(date.getTime())) return timeValue;
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDate(isoString) {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return isoString;
  return date.toLocaleString();
}

function getScheduledDateObject(item) {
  if (!item.publishDate || !item.publishTime) return null;
  const date = new Date(`${item.publishDate}T${item.publishTime}`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function isArchived(item) {
  const d = getScheduledDateObject(item);
  return d ? Date.now() >= d.getTime() : false;
}

function getActiveMedia()   { return media.filter(item => !isArchived(item)); }
function getArchivedMedia() { return media.filter(item =>  isArchived(item)); }

function getFilteredMedia() {
  const searchTerm     = searchInput.value.trim().toLowerCase();
  const selectedStatus = statusFilter.value;

  return getActiveMedia().filter(item => {
    const brandText    = (item.brands  || []).map(b => `${b.brandName} ${b.platform}`).join(" ");
    const approverText = (item.approvers || []).join(" ");
    const searchable   = [brandText, approverText, item.publishDate, item.publishTime, item.notes,
      ...(item.comments || []).map(c => `${c.user} ${c.text}`)].join(" ").toLowerCase();

    return (selectedStatus === "All" || item.status === selectedStatus) &&
           (!searchTerm || searchable.includes(searchTerm));
  });
}

// ── Upload preview ────────────────────────────

function handleUploadPreview() {
  const files = Array.from(fileInput.files || []);
  if (!files.length) {
    uploadPreview.className = "upload-preview empty";
    uploadPreview.innerHTML = "<span>No file selected</span>";
    return;
  }
  const allImages = files.every(f => f.type.startsWith("image/"));
  const allVideos = files.every(f => f.type.startsWith("video/"));

  if (!allImages && !allVideos) {
    uploadPreview.className = "upload-preview empty";
    uploadPreview.innerHTML = "<span>Please upload either image(s) only or one video only</span>";
    return;
  }
  if (allVideos && files.length > 1) {
    uploadPreview.className = "upload-preview empty";
    uploadPreview.innerHTML = "<span>Please upload only one video at a time</span>";
    return;
  }
  if (allImages) {
    uploadPreview.className = "upload-preview";
    uploadPreview.innerHTML = `<div class="upload-preview-stack"></div>`;
    const stack = uploadPreview.querySelector(".upload-preview-stack");
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = e => {
        const thumb = document.createElement("div");
        thumb.className = "upload-preview-thumb";
        thumb.innerHTML = `<img src="${e.target.result}" alt="Upload preview">`;
        stack.appendChild(thumb);
      };
      reader.readAsDataURL(file);
    });
    return;
  }
  const url = URL.createObjectURL(files[0]);
  uploadPreview.className = "upload-preview";
  uploadPreview.innerHTML = `<video src="${url}" controls preload="metadata"></video>`;
}

// ── Stats ─────────────────────────────────────

function updateStats() {
  const active = getActiveMedia();
  totalCount.textContent    = active.length;
  pendingCount.textContent  = active.filter(i => i.status === "Pending").length;
  approvedCount.textContent = active.filter(i => i.status === "Approved").length;
  changesCount.textContent  = active.reduce((s, i) => s + i.comments.length, 0);
}

// ── Media element creation ────────────────────

function createSingleMediaElement(item, fit = "contain") {
  if (item.type.startsWith("image/")) {
    const img = document.createElement("img");
    img.src = item.data;
    img.alt = item.name || "Media";
    img.style.objectFit = fit;
    return img;
  }
  if (item.type.startsWith("video/")) {
    const video = document.createElement("video");
    video.src = item.data;
    video.controls = true;
    video.preload = "metadata";
    video.style.objectFit = fit;
    return video;
  }
  const fallback = document.createElement("div");
  fallback.className = "preview-placeholder";
  fallback.textContent = "Preview not available";
  return fallback;
}

function createMediaPreview(items, className = "media-preview", options = {}) {
  const wrapper  = document.createElement("div");
  wrapper.className = className;
  const isLibrary = className === "library-preview";
  const mediaFit  = options.fit || (isLibrary ? "cover" : "contain");

  if (!items || !items.length) {
    const inner = document.createElement("div");
    inner.className = `${className}-inner`;
    inner.innerHTML = `<div class="preview-placeholder">Preview not available</div>`;
    wrapper.appendChild(inner);
    return wrapper;
  }

  if (items.length === 1) {
    const inner = document.createElement("div");
    inner.className = `${className}-inner`;
    inner.appendChild(createSingleMediaElement(items[0], mediaFit));
    wrapper.appendChild(inner);
    return wrapper;
  }

  const carousel = document.createElement("div");
  carousel.className = "carousel";
  const track   = document.createElement("div");
  track.className = "carousel-track";
  const dots    = document.createElement("div");
  dots.className = "carousel-dots";
  const prevBtn = document.createElement("button");
  prevBtn.type = "button"; prevBtn.className = "carousel-arrow prev"; prevBtn.innerHTML = "‹";
  const nextBtn = document.createElement("button");
  nextBtn.type = "button"; nextBtn.className = "carousel-arrow next"; nextBtn.innerHTML = "›";

  let currentIndex = 0;
  const slides = [], dotButtons = [];

  items.forEach((item, index) => {
    const slide = document.createElement("div");
    slide.className = `carousel-slide${index === 0 ? " active" : ""}`;
    slide.appendChild(createSingleMediaElement(item, mediaFit));
    track.appendChild(slide);
    slides.push(slide);

    const dot = document.createElement("button");
    dot.type = "button";
    dot.className = `carousel-dot${index === 0 ? " active" : ""}`;
    dot.setAttribute("aria-label", `Go to slide ${index + 1}`);
    dot.addEventListener("click", () => updateCarousel(index));
    dots.appendChild(dot);
    dotButtons.push(dot);
  });

  function updateCarousel(newIndex) {
    currentIndex = newIndex;
    slides.forEach((s, i)     => s.classList.toggle("active", i === currentIndex));
    dotButtons.forEach((d, i) => d.classList.toggle("active", i === currentIndex));
  }

  prevBtn.addEventListener("click", e => { e.stopPropagation(); updateCarousel(currentIndex === 0 ? items.length - 1 : currentIndex - 1); });
  nextBtn.addEventListener("click", e => { e.stopPropagation(); updateCarousel(currentIndex === items.length - 1 ? 0 : currentIndex + 1); });

  updateCarousel(0);
  carousel.appendChild(prevBtn);
  carousel.appendChild(track);
  carousel.appendChild(nextBtn);
  carousel.appendChild(dots);
  wrapper.appendChild(carousel);
  return wrapper;
}

// ── Asset card ────────────────────────────────

function createCommentItem(comment) {
  const el = document.createElement("div");
  el.className = "comment-item";
  el.innerHTML = `
    <div class="comment-item-header">
      <span class="comment-author">${escapeHtml(comment.user)}</span>
      <span class="comment-date">${escapeHtml(formatDate(comment.createdAt))}</span>
    </div>
    <div class="comment-text-body">${escapeHtml(comment.text)}</div>`;
  return el;
}

function createEditPanel(item) {
  const panel = document.createElement("div");
  panel.className = "edit-panel";
  panel.innerHTML = `
    <h5 class="edit-panel-title">Edit asset</h5>
    <div class="edit-grid">
      <div class="edit-field"><label>Caption</label><textarea class="edit-caption">${escapeHtml(item.notes || "")}</textarea></div>
      <div class="edit-field"><label>Scheduled date</label><input class="edit-date" type="date" value="${escapeHtml(item.publishDate || "")}"></div>
      <div class="edit-field"><label>Scheduled time</label><input class="edit-time" type="time" value="${escapeHtml(item.publishTime || "")}"></div>
    </div>
    <div class="edit-actions">
      <button class="edit-save-btn" type="button">Save</button>
      <button class="edit-cancel-btn" type="button">Cancel</button>
    </div>`;
  panel.querySelector(".edit-save-btn").addEventListener("click", () => {
    saveAssetEdit(item.id, panel.querySelector(".edit-caption").value, panel.querySelector(".edit-date").value, panel.querySelector(".edit-time").value);
  });
  panel.querySelector(".edit-cancel-btn").addEventListener("click", () => cancelEditPanel(item.id));
  return panel;
}

function createApproverSelector(item) {
  const wrapper  = document.createElement("div");
  wrapper.className = "approver-block";
  const dropdown = document.createElement("div");
  dropdown.className = "approver-dropdown";
  const toggle   = document.createElement("button");
  toggle.type = "button"; toggle.className = "approver-dropdown-toggle";
  const label    = document.createElement("span");
  label.className = "approver-dropdown-label";
  const chevron  = document.createElement("span");
  chevron.className = "dropdown-chevron"; chevron.textContent = "⌄";
  toggle.appendChild(label); toggle.appendChild(chevron);

  const menu      = document.createElement("div");
  menu.className = "approver-dropdown-menu hidden";
  const checklist = document.createElement("div");
  checklist.className = "approver-checklist";

  ALLOWED_USERS.forEach(user => {
    const row = document.createElement("label");
    row.className = "approver-option";
    const isChecked = Array.isArray(item.approvers) && item.approvers.includes(user);
    row.innerHTML = `<input type="checkbox" value="${escapeHtml(user)}" ${isChecked ? "checked" : ""}><span class="approver-option-text">${escapeHtml(user)}</span>`;
    checklist.appendChild(row);
  });

  function updateApproverUI() {
    const selected = Array.from(checklist.querySelectorAll('input[type="checkbox"]:checked')).map(el => el.value);
    label.textContent = selected.length ? `${selected.length} approver${selected.length === 1 ? "" : "s"} selected` : "Select approver(s)";
  }

  toggle.addEventListener("click", e => {
    e.stopPropagation();
    document.querySelectorAll(".approver-dropdown-menu").forEach(p => { if (p !== menu) p.classList.add("hidden"); });
    menu.classList.toggle("hidden");
  });

  checklist.querySelectorAll('input[type="checkbox"]').forEach(cb => {
    cb.addEventListener("change", () => {
      const selected = Array.from(checklist.querySelectorAll('input[type="checkbox"]:checked')).map(el => el.value);
      updateApproverUI();
      setApprovers(item.id, selected);
    });
  });

  updateApproverUI();
  menu.appendChild(checklist);
  dropdown.appendChild(toggle);
  dropdown.appendChild(menu);
  wrapper.appendChild(dropdown);
  return wrapper;
}

function createMediaCard(item) {
  const fragment = assetTemplate.content.cloneNode(true);

  const bannerScheduled = fragment.querySelector(".banner-scheduled");
  const brandsPanelList = fragment.querySelector(".brands-panel-list");
  const previewHolder   = fragment.querySelector(".media-preview");
  const assetTitleIcons = fragment.querySelector(".asset-title-icons");
  const assetName       = fragment.querySelector(".asset-name");
  const assetMeta       = fragment.querySelector(".asset-meta");
  const scheduledValue  = fragment.querySelector(".scheduled-value");
  const assetNotes      = fragment.querySelector(".asset-notes");
  const oldApproverSelect = fragment.querySelector(".asset-approver");
  const mediaTopActions = fragment.querySelector(".media-top-actions");
  const approveIconBtn  = fragment.querySelector(".approve-icon-btn");
  const deleteBtn       = fragment.querySelector(".delete-asset-btn");
  const tickIcon        = fragment.querySelector(".tick-icon");
  const commentsList    = fragment.querySelector(".comments-list");
  const commentCount    = fragment.querySelector(".comment-count");
  const commentUser     = fragment.querySelector(".comment-user");
  const commentText     = fragment.querySelector(".comment-text");
  const commentBtn      = fragment.querySelector(".comment-btn");
  const createdValue    = fragment.querySelector(".created-value");
  const editBtn         = fragment.querySelector(".edit-asset-btn");
  const mediaBody       = fragment.querySelector(".media-body");

  brandsPanelList.innerHTML = getBrandPillsMarkup(item.brands);
  bannerScheduled.textContent = `Scheduled: ${formatDateTime(item.publishDate, item.publishTime)}`;
  previewHolder.replaceWith(createMediaPreview(item.items, "media-preview", { fit: "contain" }));

  assetTitleIcons.innerHTML = getBrandIconsMarkup(item.brands);
  assetName.textContent     = getAssetTitle(item);
  assetMeta.textContent     = item.approvers.length ? `Approved by: ${item.approvers.join(", ")}` : "";
  scheduledValue.textContent = formatDateTime(item.publishDate, item.publishTime);
  assetNotes.textContent    = item.notes || "No caption added.";
  createdValue.textContent  = formatDate(item.createdAt);

  if (item.editing) mediaBody.appendChild(createEditPanel(item));

  const approverSelector = createApproverSelector(item);
  if (oldApproverSelect) {
    oldApproverSelect.replaceWith(approverSelector);
  } else {
    mediaTopActions.prepend(approverSelector);
  }

  if (item.status === "Approved") {
    approveIconBtn.classList.add("approved");
    tickIcon.textContent = "✔";
  } else {
    approveIconBtn.classList.remove("approved");
    tickIcon.textContent = "✕";
  }

  approveIconBtn.addEventListener("click", () => toggleApproval(item.id));
  editBtn.addEventListener("click",        () => openEditPanel(item.id));
  deleteBtn.addEventListener("click",      () => deleteAsset(item.id));

  if (!item.comments.length) {
    const empty = document.createElement("div");
    empty.className = "comment-item";
    empty.innerHTML = `<div class="comment-text-body">No comments yet.</div>`;
    commentsList.appendChild(empty);
  } else {
    item.comments.forEach(c => commentsList.appendChild(createCommentItem(c)));
  }

  commentCount.textContent = `${item.comments.length} comment${item.comments.length === 1 ? "" : "s"}`;
  commentBtn.addEventListener("click", () => addComment(item.id, commentUser.value, commentText.value));

  return fragment;
}

// ── Calendar card ─────────────────────────────

function createCalendarAssetCard(item) {
  const card   = document.createElement("div");
  card.className = "calendar-asset-card";

  const header = document.createElement("div");
  header.className = "calendar-card-header";
  const headerLeft = document.createElement("div");
  headerLeft.className = "calendar-card-header-left";

  const iconsWrap = document.createElement("div");
  iconsWrap.className = "calendar-card-header-icons";
  iconsWrap.innerHTML = getBrandIconsMarkup(item.brands);
  headerLeft.appendChild(iconsWrap);

  const uniqueNames = [...new Set((item.brands || []).map(b => b.brandName))];
  const brandLabel  = document.createElement("span");
  brandLabel.className = "calendar-card-brand-name";
  brandLabel.textContent = uniqueNames.length ? uniqueNames.join(", ") : "No brand";
  headerLeft.appendChild(brandLabel);

  const time = document.createElement("span");
  time.className = "calendar-card-time";
  time.textContent = formatTimeOnly(item.publishTime);

  header.appendChild(headerLeft);
  header.appendChild(time);

  const thumb = document.createElement("div");
  thumb.className = "calendar-asset-thumb";
  const firstItem = item.items && item.items[0] ? item.items[0] : null;
  if (firstItem) {
    thumb.appendChild(createSingleMediaElement(firstItem, "cover"));
  } else {
    thumb.innerHTML = `<div class="preview-placeholder">No preview</div>`;
  }

  const caption = document.createElement("div");
  caption.className = "calendar-asset-caption";
  caption.textContent = item.notes || "No caption added.";

  const footer = document.createElement("div");
  footer.className = "calendar-asset-footer";

  const commentCount = item.comments ? item.comments.length : 0;
  const commentMeta  = document.createElement("div");
  commentMeta.className = "calendar-card-comment-meta";
  commentMeta.innerHTML = `
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
    <span>${commentCount}</span>`;

  const viewBtn = document.createElement("button");
  viewBtn.type = "button"; viewBtn.className = "calendar-card-view-btn"; viewBtn.textContent = "View";
  viewBtn.addEventListener("click", e => { e.stopPropagation(); openCalendarAssetModal(item.id); });

  const deleteBtn = document.createElement("button");
  deleteBtn.type = "button"; deleteBtn.className = "calendar-delete-btn"; deleteBtn.textContent = "Delete";
  deleteBtn.addEventListener("click", e => { e.stopPropagation(); deleteAsset(item.id); });

  footer.appendChild(commentMeta);
  footer.appendChild(viewBtn);
  footer.appendChild(deleteBtn);

  card.appendChild(header);
  card.appendChild(thumb);
  card.appendChild(caption);
  card.appendChild(footer);
  card.addEventListener("click", () => openCalendarAssetModal(item.id));

  return card;
}

// ── Modal ─────────────────────────────────────

function openCalendarAssetModal(id) {
  const item = media.find(e => e.id === id);
  if (!item || !calendarAssetModal) return;

  calendarAssetModalPreview.innerHTML = "";
  calendarAssetModalPreview.appendChild(createMediaPreview(item.items, "media-preview", { fit: "contain" }));
  calendarAssetModalIcons.innerHTML  = getBrandIconsMarkup(item.brands);
  calendarAssetModalTitle.textContent = getAssetTitle(item);
  calendarAssetModalMeta.textContent  = formatBrandList(item.brands);
  calendarAssetModalScheduled.textContent = formatDateTime(item.publishDate, item.publishTime);
  calendarAssetModalStatus.textContent    = item.status === "Approved" ? "Approved" : "Pending";
  calendarAssetModalApprovers.textContent = item.approvers.length ? item.approvers.join(", ") : "No approvers selected";
  calendarAssetModalCreated.textContent   = formatDate(item.createdAt);
  calendarAssetModalCaption.textContent   = item.notes || "No caption added.";
  calendarAssetModalBrands.innerHTML      = getBrandPillsMarkup(item.brands);

  calendarAssetModal.classList.remove("hidden");
  document.body.style.overflow = "hidden";
}

function closeCalendarAssetModal() {
  if (!calendarAssetModal) return;
  calendarAssetModal.classList.add("hidden");
  document.body.style.overflow = "";
}

// ── Render functions ──────────────────────────

function renderWorkspace() {
  updateStats();
  const filtered = getFilteredMedia();
  mediaList.innerHTML = "";
  emptyState.classList.toggle("hidden", filtered.length > 0);
  filtered.forEach(item => mediaList.appendChild(createMediaCard(item)));
}

function renderCalendar() {
  calendarGrid.innerHTML = "";
  if (!media.length) { calendarEmptyState.classList.remove("hidden"); return; }
  calendarEmptyState.classList.add("hidden");

  const year  = currentCalendarDate.getFullYear();
  const month = currentCalendarDate.getMonth();

  calendarMonthTitle.textContent = currentCalendarDate.toLocaleDateString([], { month: "short", year: "numeric" });

  ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].forEach(day => {
    const h = document.createElement("div");
    h.className = "calendar-weekday"; h.textContent = day;
    calendarGrid.appendChild(h);
  });

  const firstDay    = new Date(year, month, 1);
  let startOffset   = firstDay.getDay() - 1;
  if (startOffset < 0) startOffset = 6;
  const startDate   = new Date(year, month, 1 - startOffset);
  const scheduledMap = media.reduce((map, item) => {
    if (!item.publishDate) return map;
    if (!map[item.publishDate]) map[item.publishDate] = [];
    map[item.publishDate].push(item);
    return map;
  }, {});

  for (let i = 0; i < 42; i++) {
    const cellDate = new Date(startDate);
    cellDate.setDate(startDate.getDate() + i);

    const cell = document.createElement("div");
    cell.className = "calendar-day-cell";
    if (cellDate.getMonth() !== month) cell.classList.add("muted");

    const today = new Date();
    if (cellDate.getFullYear() === today.getFullYear() && cellDate.getMonth() === today.getMonth() && cellDate.getDate() === today.getDate()) {
      cell.classList.add("today");
    }

    const dayNumber = document.createElement("div");
    dayNumber.className = "calendar-day-number";
    dayNumber.textContent = cellDate.getDate();
    cell.appendChild(dayNumber);

    const key   = cellDate.toISOString().split("T")[0];
    const items = (scheduledMap[key] || []).sort((a, b) => (a.publishTime || "").localeCompare(b.publishTime || ""));

    items.slice(0, 3).forEach(item => cell.appendChild(createCalendarAssetCard(item)));
    if (items.length > 3) {
      const more = document.createElement("div");
      more.className = "calendar-more";
      more.textContent = `+${items.length - 3} more`;
      cell.appendChild(more);
    }
    calendarGrid.appendChild(cell);
  }
}

function createLibraryCard(item, archived = false) {
  const card = document.createElement("div");
  card.className = "library-card";
  card.innerHTML = `
    <div class="library-preview-wrap"></div>
    <div class="library-body">
      <h4 class="library-brand-line"></h4>
      ${archived ? '<p class="library-meta">Archived</p>' : ""}
      <div class="library-detail-block">
        <span class="library-detail-label">Approved by:</span>
        <span class="library-detail-value">${escapeHtml((item.approvers || []).join(", ") || "No approvers")}</span>
      </div>
      <div class="library-detail-block">
        <span class="library-detail-label">Scheduled Date:</span>
        <span class="library-detail-value">${escapeHtml(formatDateTime(item.publishDate, item.publishTime))}</span>
      </div>
      <p>${escapeHtml(item.notes || "No caption added.")}</p>
    </div>`;

  card.querySelector(".library-preview-wrap").replaceWith(createMediaPreview(item.items, "library-preview", { fit: "cover" }));
  card.querySelector(".library-brand-line").innerHTML = getBrandPillsMarkup(item.brands);
  return card;
}

function renderLibrary() {
  libraryGrid.innerHTML  = "";
  archiveGrid.innerHTML  = "";
  const current  = getActiveMedia();
  const archived = getArchivedMedia();

  libraryEmptyState.classList.toggle("hidden", current.length > 0);
  current.forEach(item => libraryGrid.appendChild(createLibraryCard(item, false)));

  archiveEmptyState.classList.toggle("hidden", archived.length > 0);
  archived.forEach(item => archiveGrid.appendChild(createLibraryCard(item, true)));
}

function createAnalyticsRow(label, value) {
  const row = document.createElement("div");
  row.className = "analytics-row";
  row.innerHTML = `<span>${escapeHtml(String(label))}</span><strong>${escapeHtml(String(value))}</strong>`;
  return row;
}

function renderAnalytics() {
  statusBreakdown.innerHTML   = "";
  approverBreakdown.innerHTML = "";
  commentBreakdown.innerHTML  = "";
  recentActivity.innerHTML    = "";

  const active   = getActiveMedia();
  const archived = getArchivedMedia();

  statusBreakdown.appendChild(createAnalyticsRow("Pending",  active.filter(m => m.status === "Pending").length));
  statusBreakdown.appendChild(createAnalyticsRow("Approved", active.filter(m => m.status === "Approved").length));
  statusBreakdown.appendChild(createAnalyticsRow("Archived", archived.length));

  ALLOWED_USERS.forEach(user => {
    const count = media.filter(m => Array.isArray(m.approvers) && m.approvers.includes(user)).length;
    approverBreakdown.appendChild(createAnalyticsRow(user, count));
  });

  const totalComments    = media.reduce((s, i) => s + i.comments.length, 0);
  const commentedAssets  = media.filter(i => i.comments.length > 0).length;
  commentBreakdown.appendChild(createAnalyticsRow("Total comments",          totalComments));
  commentBreakdown.appendChild(createAnalyticsRow("Assets with comments",    commentedAssets));
  commentBreakdown.appendChild(createAnalyticsRow("Assets without comments", media.length - commentedAssets));

  const recent = [...media].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5);
  if (!recent.length) {
    recentActivity.appendChild(createAnalyticsRow("No activity yet", "-"));
  } else {
    recent.forEach(item => recentActivity.appendChild(createAnalyticsRow(formatBrandList(item.brands), isArchived(item) ? "Archived" : item.status)));
  }
}

function render() {
  renderWorkspace();
  renderCalendar();
  renderLibrary();
  renderAnalytics();
}

// ── Start ─────────────────────────────────────
boot();
