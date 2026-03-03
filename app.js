// Vocab PWA - offline, localStorage-based spaced repetition

const $app = document.getElementById("app");

const Storage = {
  key: "vocab.words.v1",
  read() {
    try {
      const raw = localStorage.getItem(this.key);
      const parsed = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(parsed)) return [];
      return parsed.map(normalizeWord);
    } catch {
      return [];
    }
  },
  write(words) {
    localStorage.setItem(this.key, JSON.stringify(words));
  }
};

function uid() {
  return (crypto?.randomUUID?.() ?? `id_${Math.random().toString(16).slice(2)}_${Date.now()}`);
}

function nowISO() {
  return new Date().toISOString();
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function normalizeWord(w) {
  const word = { ...w };
  word.id = word.id ?? uid();
  word.term = (word.term ?? "").toString();
  word.definition = word.definition ?? "";
  word.example = word.example ?? "";
  word.tagsText = word.tagsText ?? "";

  word.createdAt = word.createdAt ?? nowISO();
  word.updatedAt = word.updatedAt ?? nowISO();

  word.dueAt = word.dueAt ?? nowISO();
  word.intervalDays = Number.isFinite(word.intervalDays) ? word.intervalDays : 0;
  word.easeFactor = Number.isFinite(word.easeFactor) ? word.easeFactor : 2.5;
  word.repetitions = Number.isFinite(word.repetitions) ? word.repetitions : 0;
  word.lapses = Number.isFinite(word.lapses) ? word.lapses : 0;
  return word;
}

function normalizedTerm(s) {
  return (s ?? "").toString().trim().toLowerCase();
}

const SRS = {
  minEase: 1.3,
  maxEase: 3.0,
  againDelayMs: 10 * 60 * 1000,
  addDays(date, days) {
    return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
  },
  apply(grade, word, now = new Date()) {
    const w = { ...word };
    const ease = (x) => clamp(x, this.minEase, this.maxEase);

    if (grade === "again") {
      w.lapses += 1;
      w.repetitions = 0;
      w.intervalDays = 0;
      w.easeFactor = ease(w.easeFactor - 0.2);
      w.dueAt = new Date(now.getTime() + this.againDelayMs).toISOString();
    } else if (grade === "hard") {
      w.repetitions += 1;
      w.easeFactor = ease(w.easeFactor - 0.15);
      const base = Math.max(1, w.intervalDays);
      w.intervalDays = Math.max(1, base * 1.2);
      w.dueAt = this.addDays(now, w.intervalDays).toISOString();
    } else if (grade === "good") {
      w.repetitions += 1;
      w.easeFactor = ease(w.easeFactor);
      if (w.intervalDays < 1) w.intervalDays = 1;
      else w.intervalDays = Math.max(1, w.intervalDays * w.easeFactor);
      w.dueAt = this.addDays(now, w.intervalDays).toISOString();
    } else if (grade === "easy") {
      w.repetitions += 1;
      w.easeFactor = ease(w.easeFactor + 0.15);
      if (w.intervalDays < 1) w.intervalDays = 2;
      else w.intervalDays = Math.max(2, w.intervalDays * w.easeFactor * 1.3);
      w.dueAt = this.addDays(now, w.intervalDays).toISOString();
    }

    w.updatedAt = nowISO();
    return normalizeWord(w);
  }
};

function dueCount(words, now = new Date()) {
  return words.filter((w) => new Date(w.dueAt) <= now).length;
}

function route() {
  const hash = (location.hash || "#home").replace("#", "");
  const [name, query] = hash.split("?");
  const params = new URLSearchParams(query || "");
  return { name, params };
}

function setActiveFooter(name) {
  document.querySelectorAll(".footer a").forEach((a) => {
    const h = (a.getAttribute("href") || "").replace("#", "");
    a.classList.toggle("active", h === name);
  });
}

function render() {
  const r = route();
  setActiveFooter(r.name);
  if (r.name === "home") return renderHome();
  if (r.name === "add") return renderEditor({ mode: "add" });
  if (r.name === "edit") return renderEditor({ mode: "edit", id: r.params.get("id") });
  if (r.name === "browse") return renderBrowse();
  if (r.name === "review") return renderReview();
  if (r.name === "settings") return renderSettings();
  if (r.name === "share") return renderShare();
  location.hash = "#home";
}

function el(html) {
  const t = document.createElement("template");
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}

function clearApp() {
  $app.innerHTML = "";
}

function renderHome() {
  const words = Storage.read();
  const due = dueCount(words);

  clearApp();
  const grid = el(`<div class="grid"></div>`);
  grid.appendChild(el(`
    <section class="card span6">
      <div class="row">
        <div>
          <h1 class="h1">Review</h1>
          <p class="p">${due} due right now</p>
        </div>
        <button class="btn btnPrimary" id="goReview" ${due === 0 ? "disabled" : ""}>Review now</button>
      </div>
    </section>
  `));
  grid.appendChild(el(`
    <section class="card span6">
      <div class="row">
        <div>
          <h2 class="h2">Add words</h2>
          <p class="p">Build your own list with meaning & examples.</p>
        </div>
        <a class="btn" href="#add">Add</a>
      </div>
    </section>
  `));
  grid.appendChild(el(`
    <section class="card">
      <div class="row">
        <div>
          <h2 class="h2">Browse</h2>
          <p class="p">Search, edit, reset or delete words.</p>
        </div>
        <a class="btn" href="#browse">Open</a>
      </div>
    </section>
  `));

  $app.appendChild(grid);
  const btn = document.getElementById("goReview");
  if (btn) btn.addEventListener("click", () => (location.hash = "#review"));
}

function renderBrowse() {
  clearApp();
  const words = Storage.read().sort((a, b) => a.term.localeCompare(b.term));

  const state = {
    query: "",
    filter: "all"
  };

  const root = el(`
    <section class="card">
      <div class="row">
        <div>
          <h1 class="h1">Browse</h1>
          <p class="p">Search by word, meaning, example, or tags.</p>
        </div>
        <a class="btn" href="#add">Add</a>
      </div>

      <div class="twoCol" style="margin-top:12px">
        <div>
          <label>Search</label>
          <input id="q" placeholder="e.g. improve, travel, workplace" />
        </div>
        <div>
          <label>Filter</label>
          <div class="seg" id="filterSeg">
            <button data-v="all" class="active">All</button>
            <button data-v="due">Due</button>
            <button data-v="learned">Learned</button>
          </div>
        </div>
      </div>

      <div id="list" class="list"></div>
    </section>
  `);

  const $q = root.querySelector("#q");
  const $list = root.querySelector("#list");
  const $seg = root.querySelector("#filterSeg");

  function compute() {
    const now = new Date();
    const q = state.query.trim().toLowerCase();
    let filtered = words.slice();
    if (q) {
      filtered = filtered.filter((w) =>
        w.term.toLowerCase().includes(q) ||
        (w.definition || "").toLowerCase().includes(q) ||
        (w.example || "").toLowerCase().includes(q) ||
        (w.tagsText || "").toLowerCase().includes(q)
      );
    }
    if (state.filter === "due") filtered = filtered.filter((w) => new Date(w.dueAt) <= now);
    if (state.filter === "learned") filtered = filtered.filter((w) => (w.intervalDays ?? 0) >= 60);
    return filtered;
  }

  function renderList() {
    const items = compute();
    $list.innerHTML = "";
    if (items.length === 0) {
      $list.appendChild(el(`<div class="item"><div class="term">No results</div><div class="meta">Try another search.</div></div>`));
      return;
    }
    const now = new Date();
    for (const w of items) {
      const due = new Date(w.dueAt) <= now ? "Due now" : `Due ${new Date(w.dueAt).toLocaleString()}`;
      const meta = w.definition?.trim() ? w.definition.trim() : due;
      const node = el(`
        <div class="item">
          <div class="term"></div>
          <div class="meta"></div>
          <div class="itemActions">
            <a class="btn" href="#edit?id=${encodeURIComponent(w.id)}">Edit</a>
            <button class="btn" data-act="reset">Reset</button>
            <button class="btn btnDanger" data-act="delete">Delete</button>
          </div>
        </div>
      `);
      node.querySelector(".term").textContent = w.term;
      node.querySelector(".meta").textContent = meta;
      node.querySelector('[data-act="reset"]').addEventListener("click", () => {
        const all = Storage.read();
        const idx = all.findIndex((x) => x.id === w.id);
        if (idx >= 0) {
          all[idx] = normalizeWord({
            ...all[idx],
            dueAt: nowISO(),
            intervalDays: 0,
            easeFactor: 2.5,
            repetitions: 0,
            lapses: 0,
            updatedAt: nowISO()
          });
          Storage.write(all);
          location.hash = "#browse";
        }
      });
      node.querySelector('[data-act="delete"]').addEventListener("click", () => {
        if (!confirm(`Delete "${w.term}"?`)) return;
        const all = Storage.read().filter((x) => x.id !== w.id);
        Storage.write(all);
        render();
      });
      $list.appendChild(node);
    }
  }

  $q.addEventListener("input", () => {
    state.query = $q.value;
    renderList();
  });

  $seg.querySelectorAll("button").forEach((b) => {
    b.addEventListener("click", () => {
      state.filter = b.dataset.v;
      $seg.querySelectorAll("button").forEach((x) => x.classList.toggle("active", x === b));
      renderList();
    });
  });

  $app.appendChild(root);
  renderList();
}

function renderEditor({ mode, id }) {
  clearApp();
  const all = Storage.read();
  const isEdit = mode === "edit";
  const existing = isEdit ? all.find((w) => w.id === id) : null;

  const root = el(`
    <section class="card">
      <div class="row">
        <div>
          <h1 class="h1">${isEdit ? "Edit word" : "Add word"}</h1>
          <p class="p">${isEdit ? "Update spelling, meaning, example, or tags." : "New words start due immediately so you can review right away."}</p>
        </div>
        <a class="btn" href="#browse">Browse</a>
      </div>

      <div style="margin-top: 12px">
        <label>Word</label>
        <input id="term" placeholder="e.g. improve" />

        <label>Meaning (optional)</label>
        <textarea id="def" placeholder="Write a short meaning in your own words"></textarea>

        <label>Example (optional)</label>
        <textarea id="ex" placeholder="e.g. I want to improve my English."></textarea>

        <label>Tags (optional)</label>
        <input id="tags" placeholder="comma-separated, e.g. work, travel" />

        <div class="row" style="margin-top:14px">
          <button class="btn" id="cancel">Cancel</button>
          <button class="btn btnPrimary" id="save">Save</button>
        </div>
      </div>
    </section>
  `);

  const $term = root.querySelector("#term");
  const $def = root.querySelector("#def");
  const $ex = root.querySelector("#ex");
  const $tags = root.querySelector("#tags");
  const $save = root.querySelector("#save");

  if (existing) {
    $term.value = existing.term ?? "";
    $def.value = existing.definition ?? "";
    $ex.value = existing.example ?? "";
    $tags.value = existing.tagsText ?? "";
  }

  root.querySelector("#cancel").addEventListener("click", () => history.back());

  $save.addEventListener("click", () => {
    const term = $term.value.trim();
    if (!term) {
      alert("Please enter a word.");
      return;
    }

    if (!isEdit) {
      const nt = normalizedTerm(term);
      const dup = all.some((w) => normalizedTerm(w.term) === nt);
      if (dup && !confirm("This word already exists. Add anyway?")) return;
    }

    const now = new Date();
    if (isEdit && existing) {
      const updated = normalizeWord({
        ...existing,
        term,
        definition: $def.value.trim(),
        example: $ex.value.trim(),
        tagsText: $tags.value.trim(),
        updatedAt: now.toISOString()
      });
      const idx = all.findIndex((w) => w.id === existing.id);
      all[idx] = updated;
      Storage.write(all);
      location.hash = "#browse";
      return;
    }

    const w = normalizeWord({
      id: uid(),
      term,
      definition: $def.value.trim(),
      example: $ex.value.trim(),
      tagsText: $tags.value.trim(),
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      dueAt: now.toISOString(),
      intervalDays: 0,
      easeFactor: 2.5,
      repetitions: 0,
      lapses: 0
    });
    Storage.write([w, ...all]);
    location.hash = "#review";
  });

  $app.appendChild(root);
}

function renderReview() {
  clearApp();
  const all = Storage.read();
  const now = new Date();
  const dueWords = all.filter((w) => new Date(w.dueAt) <= now).sort((a, b) => new Date(a.dueAt) - new Date(b.dueAt));

  const state = {
    size: "20",
    queue: [],
    reviewed: 0,
    reveal: false
  };

  function start() {
    state.reviewed = 0;
    state.reveal = false;
    const limit = state.size === "10" ? 10 : state.size === "20" ? 20 : null;
    const session = limit ? dueWords.slice(0, limit) : dueWords.slice();
    state.queue = session.map((w) => w.id);
  }

  const root = el(`
    <section class="card">
      <div class="row">
        <div>
          <h1 class="h1">Review</h1>
          <p class="p"><span id="dueN"></span> due right now</p>
        </div>
        <button class="btn" id="restart" ${dueWords.length ? "" : "disabled"}>Restart</button>
      </div>

      <div class="row" style="margin-top:12px">
        <div class="pill"><strong>Progress</strong> <span class="muted" id="progress"></span></div>
        <div class="seg" id="sizeSeg" style="max-width:320px">
          <button data-v="10">10</button>
          <button data-v="20" class="active">20</button>
          <button data-v="∞">∞</button>
        </div>
      </div>

      <div id="stage" style="margin-top:12px"></div>
    </section>
  `);

  const $dueN = root.querySelector("#dueN");
  const $progress = root.querySelector("#progress");
  const $stage = root.querySelector("#stage");

  $dueN.textContent = `${dueWords.length}`;

  root.querySelector("#restart").addEventListener("click", () => {
    start();
    draw();
  });

  root.querySelectorAll("#sizeSeg button").forEach((b) => {
    b.addEventListener("click", () => {
      if (state.queue.length) return;
      state.size = b.dataset.v;
      root.querySelectorAll("#sizeSeg button").forEach((x) => x.classList.toggle("active", x === b));
      start();
      draw();
    });
  });

  function currentWord() {
    const id = state.queue[0];
    return all.find((w) => w.id === id);
  }

  function grade(gradeName) {
    const w = currentWord();
    if (!w) return;
    const updated = SRS.apply(gradeName, w, new Date());

    const idx = all.findIndex((x) => x.id === w.id);
    all[idx] = updated;
    Storage.write(all);

    const currentID = state.queue.shift();
    state.reviewed += 1;
    state.reveal = false;
    if (gradeName === "again") state.queue.push(currentID);
    draw();
  }

  function draw() {
    const total = state.queue.length + state.reviewed;
    $progress.textContent = total ? `${state.reviewed}/${total}` : "—";
    $stage.innerHTML = "";

    if (state.queue.length === 0) {
      $stage.appendChild(el(`
        <div class="card" style="margin-top:12px; background: rgba(255,255,255,.03)">
          <div class="row">
            <div>
              <h2 class="h2">${dueWords.length ? "Session complete" : "Nothing due right now"}</h2>
              <p class="p">Add more words or come back later.</p>
            </div>
            <a class="btn btnPrimary" href="#add">Add</a>
          </div>
        </div>
      `));
      return;
    }

    const w = currentWord();
    if (!w) return;

    const card = el(`
      <div class="card reviewCard" style="margin-top:12px; background: rgba(255,255,255,.03)">
        <div class="reviewTerm"></div>
        <div id="body"></div>
      </div>
    `);
    card.querySelector(".reviewTerm").textContent = w.term;

    const body = card.querySelector("#body");
    if (!state.reveal) {
      body.appendChild(el(`<div class="hint">Tap to reveal</div>`));
    } else {
      const def = (w.definition || "").trim();
      const ex = (w.example || "").trim();
      if (def) body.appendChild(el(`<div style="font-size:18px; font-weight:850">${escapeHtml(def)}</div>`));
      if (ex) body.appendChild(el(`<div class="muted" style="margin-top:8px">${escapeHtml(ex)}</div>`));
      if (!def && !ex) body.appendChild(el(`<div class="muted">No meaning/example saved.</div>`));
    }

    card.addEventListener("click", () => {
      state.reveal = !state.reveal;
      draw();
    });

    const row = el(`
      <div class="gradeRow">
        <button class="grade again" data-g="again">Again</button>
        <button class="grade hard" data-g="hard">Hard</button>
        <button class="grade good" data-g="good">Good</button>
        <button class="grade easy" data-g="easy">Easy</button>
      </div>
    `);
    if (!state.reveal) {
      row.querySelectorAll("button").forEach((b) => (b.disabled = true));
    }
    row.querySelectorAll("button").forEach((b) => b.addEventListener("click", (e) => {
      e.stopPropagation();
      grade(b.dataset.g);
    }));

    $stage.appendChild(card);
    $stage.appendChild(row);
  }

  $app.appendChild(root);
  start();
  draw();
}

function renderSettings() {
  clearApp();
  const root = el(`
    <section class="card">
      <div class="row">
        <div>
          <h1 class="h1">Settings</h1>
          <p class="p">Everything is stored locally on your phone (offline).</p>
        </div>
        <a class="btn" href="#share">Show QR</a>
      </div>

      <div style="margin-top:12px" class="twoCol">
        <div class="card" style="background: rgba(255,255,255,.03); box-shadow:none">
          <h2 class="h2">Backup (export)</h2>
          <p class="p">Download a JSON backup file.</p>
          <div class="row" style="margin-top:12px">
            <button class="btn btnPrimary" id="export">Export JSON</button>
          </div>
        </div>
        <div class="card" style="background: rgba(255,255,255,.03); box-shadow:none">
          <h2 class="h2">Restore (import)</h2>
          <p class="p">Import a JSON backup. It merges by word spelling.</p>
          <div class="row" style="margin-top:12px">
            <input type="file" id="importFile" accept="application/json" />
          </div>
        </div>
      </div>

      <div class="card" style="margin-top:12px; background: rgba(255,255,255,.03); box-shadow:none">
        <h2 class="h2">About reminders</h2>
        <p class="p">On iPhone, websites cannot schedule reliable daily local notifications without a server. The simplest approach is to add this app to your Home Screen and set an iOS Reminder to open it daily.</p>
      </div>
    </section>
  `);

  root.querySelector("#export").addEventListener("click", () => {
    const words = Storage.read();
    const payload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      words
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "vocab-export.json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  });

  root.querySelector("#importFile").addEventListener("change", async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const payload = JSON.parse(text);
      if (!payload || !Array.isArray(payload.words)) throw new Error("Invalid file.");

      const current = Storage.read();
      const byTerm = new Map(current.map((w) => [normalizedTerm(w.term), w]));
      let inserted = 0, updated = 0;

      for (const raw of payload.words) {
        const w = normalizeWord(raw);
        const key = normalizedTerm(w.term);
        if (!key) continue;
        if (byTerm.has(key)) {
          const old = byTerm.get(key);
          byTerm.set(key, normalizeWord({ ...old, ...w, id: old.id }));
          updated += 1;
        } else {
          byTerm.set(key, w);
          inserted += 1;
        }
      }

      Storage.write(Array.from(byTerm.values()));
      alert(`Imported. Inserted ${inserted}, updated ${updated}.`);
      location.hash = "#browse";
    } catch (err) {
      alert(`Import failed: ${err?.message ?? err}`);
    } finally {
      e.target.value = "";
    }
  });

  $app.appendChild(root);
}

function renderShare() {
  clearApp();
  const url = location.href.split("#")[0] + "#home";
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(url)}`;

  const root = el(`
    <section class="card">
      <div class="row">
        <div>
          <h1 class="h1">QR code</h1>
          <p class="p">Scan with your iPhone camera to open the app.</p>
        </div>
        <a class="btn" href="#home">Back</a>
      </div>

      <div style="margin-top:12px" class="qrBox">
        <img alt="QR code" />
        <div class="muted" style="margin-top:12px; text-align:center; max-width:520px">
          Tip: after opening on iPhone Safari, tap Share → “Add to Home Screen” for an app-like experience (offline).
          <div style="margin-top:6px">Link encoded: <strong id="encoded"></strong></div>
        </div>
      </div>
    </section>
  `);

  root.querySelector("img").src = qrUrl;
  root.querySelector("#encoded").textContent = url;
  $app.appendChild(root);
}

function escapeHtml(s) {
  return (s ?? "").toString()
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

window.addEventListener("hashchange", render);
render();

