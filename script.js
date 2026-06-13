/* =========================================================================
   Agreste Academy LMS — script.js
   Front-end pur (HTML/CSS/JS + AJAX) connecté à Supabase.
   Rôles : student (étudiant) · teacher (enseignant) · promoter (promoteur)
   ========================================================================= */

(function () {
  "use strict";

  const CFG = window.AGRESTE_CONFIG || {};
  const CONFIGURED =
    CFG.SUPABASE_URL &&
    CFG.SUPABASE_ANON_KEY &&
    !CFG.SUPABASE_URL.includes("VOTRE_") &&
    !CFG.SUPABASE_ANON_KEY.includes("VOTRE_");

  let sb = null;
  if (CONFIGURED && window.supabase) {
    sb = window.supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_ANON_KEY);
  }

  /* ----------------------------- State ---------------------------------- */
  const state = {
    user: null,        // auth user
    profile: null,     // { id, full_name, role }
    route: "dashboard",
    params: {},
  };

  const ROLE_LABEL = { student: "Étudiant", teacher: "Enseignant", promoter: "Promoteur" };

  /* ----------------------------- Helpers -------------------------------- */
  const $ = (sel, root = document) => root.querySelector(sel);
  const el = (html) => {
    const t = document.createElement("template");
    t.innerHTML = html.trim();
    return t.content.firstElementChild;
  };
  const esc = (s) =>
    String(s == null ? "" : s).replace(/[&<>"']/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
    );
  const fmtDate = (d) =>
    new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });

  function toast(msg, isErr) {
    const t = $("#toast");
    t.textContent = msg;
    t.className = "toast show" + (isErr ? " err" : "");
    setTimeout(() => (t.className = "toast"), 2800);
  }

  const ICON = {
    home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/></svg>',
    book: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h7v16H4z"/><path d="M13 4h7v16h-7z"/></svg>',
    layers: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2l9 5-9 5-9-5 9-5z"/><path d="M3 12l9 5 9-5"/></svg>',
    award: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="6"/><path d="M9 13l-1 8 4-2 4 2-1-8"/></svg>',
    users: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="8" r="3"/><path d="M3 20c0-3 3-5 6-5s6 2 6 5"/><circle cx="17" cy="9" r="2.5"/><path d="M16 14c3 0 5 2 5 5"/></svg>',
    plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>',
    logout: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><path d="M16 17l5-5-5-5M21 12H9"/></svg>',
    play: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="6 4 20 12 6 20"/></svg>',
    empty: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 7l9-4 9 4-9 4-9-4z"/><path d="M3 7v10l9 4 9-4V7"/></svg>',
  };

  /* ----------------------- Auth screen ---------------------------------- */
  function renderAuth(mode = "login") {
    const root = $("#app");
    root.innerHTML = "";
    const warn = !CONFIGURED
      ? `<div class="config-warn">Supabase n'est pas encore configuré. Ouvre <code>config.js</code> et renseigne <code>SUPABASE_URL</code> et <code>SUPABASE_ANON_KEY</code>.</div>`
      : "";

    const card = el(`
      <div class="auth">
        <div class="auth__card">
          <div class="auth__brand">
            <img src="public/logo.jpg" alt="Logo Agreste Academy" />
            <h1>Agreste Academy</h1>
            <p>Plateforme d'apprentissage en ligne</p>
          </div>
          ${warn}
          <div class="auth__tabs">
            <button data-tab="login" class="${mode === "login" ? "active" : ""}">Connexion</button>
            <button data-tab="signup" class="${mode === "signup" ? "active" : ""}">Inscription</button>
          </div>
          <form id="auth-form">
            <div id="signup-only" class="${mode === "signup" ? "" : "hidden"}">
              <label class="field"><span>Nom complet</span>
                <input class="input" name="full_name" placeholder="Votre nom" /></label>
              <span class="field" style="display:block;font-size:13px;font-weight:600;margin-bottom:6px;">Je m'inscris en tant que</span>
              <div class="role-pick">
                <input type="radio" id="r-student" name="role" value="student" checked>
                <label for="r-student">Étudiant</label>
                <input type="radio" id="r-teacher" name="role" value="teacher">
                <label for="r-teacher">Enseignant</label>
                <input type="radio" id="r-promoter" name="role" value="promoter">
                <label for="r-promoter">Promoteur</label>
              </div>
            </div>
            <label class="field"><span>Adresse e-mail</span>
              <input class="input" type="email" name="email" required placeholder="vous@exemple.com" /></label>
            <label class="field"><span>Mot de passe</span>
              <input class="input" type="password" name="password" required minlength="6" placeholder="••••••••" /></label>
            <button class="btn btn--block" type="submit" ${!CONFIGURED ? "disabled" : ""}>
              ${mode === "login" ? "Se connecter" : "Créer mon compte"}
            </button>
            <div class="auth__msg" id="auth-msg"></div>
          </form>
        </div>
      </div>
    `);

    card.querySelectorAll(".auth__tabs button").forEach((b) =>
      b.addEventListener("click", () => renderAuth(b.dataset.tab))
    );
    card.querySelector("#auth-form").addEventListener("submit", (e) =>
      handleAuth(e, mode)
    );
    root.appendChild(card);
  }

  async function handleAuth(e, mode) {
    e.preventDefault();
    const f = e.target;
    const msg = $("#auth-msg");
    const btn = f.querySelector("button[type=submit]");
    const email = f.email.value.trim();
    const password = f.password.value;
    msg.className = "auth__msg";
    msg.textContent = "";
    btn.disabled = true;
    btn.textContent = "Veuillez patienter…";

    try {
      if (mode === "signup") {
        const full_name = f.full_name.value.trim();
        const role = f.role.value;
        if (!full_name) throw new Error("Le nom complet est requis.");
        const { data, error } = await sb.auth.signUp({
          email,
          password,
          options: { data: { full_name, role } },
        });
      if (error) throw error;
  // Le profil est créé automatiquement par le trigger SQL.
  // On ne tente l'upsert côté client que si une session existe (sinon RLS bloque).
  if (data.session && data.user) {
  await sb.from("profiles").upsert({ id: data.user.id, full_name, role });
  }
  if (!data.session) {
  msg.className = "auth__msg ok";
  msg.textContent = "Compte créé ! Si la confirmation d'e-mail est activée dans Supabase, clique sur le lien reçu par e-mail, puis connecte-toi ici. Sinon, connecte-toi directement.";
  btn.disabled = false;
  btn.textContent = "Créer mon compte";
  return;
  }
      } else {
        const { error } = await sb.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      await boot();
    } catch (err) {
      msg.className = "auth__msg error";
      msg.textContent = traduireErreur(err.message);
      btn.disabled = false;
      btn.textContent = mode === "login" ? "Se connecter" : "Créer mon compte";
    }
  }

  function traduireErreur(m) {
    if (/invalid login credentials/i.test(m)) return "E-mail ou mot de passe incorrect.";
    if (/already registered/i.test(m)) return "Cet e-mail est déjà utilisé.";
    if (/email not confirmed/i.test(m)) return "E-mail non confirmé. Vérifie ta boîte mail.";
    return m;
  }

  /* ----------------------- App shell ------------------------------------ */
  function navItems() {
    const role = state.profile.role;
    if (role === "student")
      return [
        { id: "dashboard", label: "Tableau de bord", icon: "home" },
        { id: "catalog", label: "Catalogue", icon: "book" },
        { id: "my-modules", label: "Modules", icon: "layers" },
        { id: "certificates", label: "Mes certificats", icon: "award" },
      ];
    if (role === "teacher")
      return [
        { id: "dashboard", label: "Tableau de bord", icon: "home" },
        { id: "my-courses", label: "Mes cours", icon: "book" },
      ];
    // promoter
    return [
      { id: "dashboard", label: "Tableau de bord", icon: "home" },
      { id: "modules-admin", label: "Modules", icon: "layers" },
      { id: "courses-admin", label: "Cours", icon: "book" },
      { id: "certs-admin", label: "Certificats", icon: "award" },
      { id: "users-admin", label: "Utilisateurs", icon: "users" },
    ];
  }

  function renderShell() {
    const root = $("#app");
    root.innerHTML = "";
    const items = navItems();
    const nav = items
      .map(
        (i) =>
          `<button class="navlink ${i.id === state.route ? "active" : ""}" data-route="${i.id}">${ICON[i.icon]}<span>${i.label}</span></button>`
      )
      .join("");

    const shell = el(`
      <div class="app">
        <aside class="sidebar" id="sidebar">
          <div class="sidebar__brand">
            <img src="public/logo.jpg" alt="" />
            <div><b>Agreste</b><small>ACADEMY</small></div>
          </div>
          <nav style="display:flex;flex-direction:column;gap:6px;">${nav}</nav>
          <div class="sidebar__spacer"></div>
          <div class="sidebar__user">
            <div class="name">${esc(state.profile.full_name)}</div>
            <div class="role">${ROLE_LABEL[state.profile.role]}</div>
            <button class="navlink" id="logout" style="margin-top:10px;">${ICON.logout}<span>Déconnexion</span></button>
          </div>
        </aside>
        <main class="main">
          <div class="mobile-bar">
            <button id="menu-toggle" aria-label="Menu">☰</button>
            <b style="font-family:var(--font-serif);color:var(--green);">Agreste Academy</b>
          </div>
          <div id="view"><div class="center-load"><div class="spinner"></div></div></div>
        </main>
      </div>
    `);

    shell.querySelectorAll(".navlink[data-route]").forEach((b) =>
      b.addEventListener("click", () => go(b.dataset.route))
    );
    shell.querySelector("#logout").addEventListener("click", logout);
    const sidebar = shell.querySelector("#sidebar");
    shell.querySelector("#menu-toggle").addEventListener("click", () =>
      sidebar.classList.toggle("open")
    );
    root.appendChild(shell);
    renderRoute();
  }

  function go(route, params = {}) {
    state.route = route;
    state.params = params;
    // update active nav
    document.querySelectorAll(".navlink[data-route]").forEach((b) =>
      b.classList.toggle("active", b.dataset.route === route)
    );
    const sb_ = $("#sidebar");
    if (sb_) sb_.classList.remove("open");
    renderRoute();
  }

  function setView(node) {
    const v = $("#view");
    v.innerHTML = "";
    if (typeof node === "string") v.innerHTML = node;
    else v.appendChild(node);
  }
  const loading = () => setView('<div class="center-load"><div class="spinner"></div></div>');
  const header = (title, sub, right = "") =>
    `<div class="topbar"><div><h2>${esc(title)}</h2>${sub ? `<p>${esc(sub)}</p>` : ""}</div><div>${right}</div></div>`;
  const empty = (txt) => `<div class="empty">${ICON.empty}<p>${esc(txt)}</p></div>`;

  function renderRoute() {
    const r = state.route;
    const role = state.profile.role;
    if (role === "student") {
      if (r === "dashboard") return studentDashboard();
      if (r === "catalog") return studentCatalog();
      if (r === "course") return studentCourse(state.params.id);
      if (r === "lesson") return studentLesson(state.params.id);
      if (r === "my-modules") return studentModules();
      if (r === "certificates") return studentCertificates();
    } else if (role === "teacher") {
      if (r === "dashboard") return teacherDashboard();
      if (r === "my-courses") return teacherCourses();
      if (r === "course-edit") return teacherCourseEdit(state.params.id);
    } else if (role === "promoter") {
      if (r === "dashboard") return promoterDashboard();
      if (r === "modules-admin") return promoterModules();
      if (r === "courses-admin") return promoterCourses();
      if (r === "certs-admin") return promoterCerts();
      if (r === "users-admin") return promoterUsers();
    }
    setView(empty("Page introuvable."));
  }

  /* =======================================================================
     DATA ACCESS
     ===================================================================== */
  async function getCourses(filter = {}) {
    let q = sb.from("courses").select("*, modules(title), lessons(id)").order("created_at", { ascending: false });
    if (filter.created_by) q = q.eq("created_by", filter.created_by);
    if (filter.module_id) q = q.eq("module_id", filter.module_id);
    const { data, error } = await q;
    if (error) throw error;
    return data || [];
  }
  async function getCourse(id) {
    const { data, error } = await sb
      .from("courses")
      .select("*, modules(id,title), lessons(*, evaluations(id,title,pass_score))")
      .eq("id", id)
      .single();
    if (error) throw error;
    data.lessons = (data.lessons || []).sort((a, b) => a.position - b.position);
    return data;
  }
  async function getMyAttempts() {
    const { data, error } = await sb
      .from("attempts")
      .select("*")
      .eq("user_id", state.user.id);
    if (error) throw error;
    return data || [];
  }
  async function getModules() {
    const { data, error } = await sb
      .from("modules")
      .select("*, courses(id,title)")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data || [];
  }

  // Progression d'un cours pour l'étudiant courant (moyenne des meilleures notes / nb leçons évaluées)
  function courseProgress(course, attempts) {
    const evals = (course.lessons || []).map((l) => (l.evaluations || [])[0]).filter(Boolean);
    if (!evals.length) return { pct: 0, evaluated: 0, total: course.lessons?.length || 0, done: 0 };
    let sum = 0, done = 0;
    evals.forEach((ev) => {
      const best = attempts.filter((a) => a.evaluation_id === ev.id).reduce((m, a) => Math.max(m, a.score), -1);
      if (best >= 0) { sum += best; if (best >= ev.pass_score) done++; }
    });
    const pct = Math.round(sum / evals.length);
    return { pct, evaluated: evals.length, total: course.lessons.length, done };
  }

  /* =======================================================================
     STUDENT
     ===================================================================== */
  async function studentDashboard() {
    loading();
    try {
      const [courses, attempts, certs] = await Promise.all([
        getCourses(),
        getMyAttempts(),
        sb.from("certificates").select("id").eq("user_id", state.user.id),
      ]);
      const started = courses.filter((c) =>
        (c.lessons || []).some((l) => attempts.some((a) => a.evaluation_id))
      );
      const avg =
        attempts.length
          ? Math.round(attempts.reduce((s, a) => s + a.score, 0) / attempts.length)
          : 0;
      const wrap = el(`<div>
        ${header("Bonjour, " + state.profile.full_name.split(" ")[0], "Continue ton apprentissage")}
        <div class="grid grid--stats">
          <div class="stat"><div class="num">${courses.length}</div><div class="lab">Cours disponibles</div></div>
          <div class="stat"><div class="num">${attempts.length}</div><div class="lab">Évaluations passées</div></div>
          <div class="stat"><div class="num">${avg}%</div><div class="lab">Moyenne générale</div></div>
          <div class="stat"><div class="num">${(certs.data || []).length}</div><div class="lab">Certificats obtenus</div></div>
        </div>
        <div class="section-title">Reprendre un cours</div>
        <div class="grid grid--cards" id="cards"></div>
      </div>`);
      const cards = wrap.querySelector("#cards");
      const list = courses.slice(0, 6);
      if (!list.length) cards.innerHTML = empty("Aucun cours pour le moment.");
      list.forEach((c) => cards.appendChild(courseCard(c, attempts)));
      setView(wrap);
    } catch (e) { setView(errorBox(e)); }
  }

  function courseCard(c, attempts) {
    const p = courseProgress(c, attempts);
    const node = el(`<div class="card" role="button" tabindex="0">
      <div class="card__cover"><span class="badge badge--gold">${(c.lessons || []).length} leçon(s)</span></div>
      <div class="card__body">
        <h3>${esc(c.title)}</h3>
        <p class="desc">${esc((c.description || "").slice(0, 90) || "Sans description")}</p>
        <div class="progress-label"><span>Progression</span><span>${p.pct}%</span></div>
        <div class="progress"><i style="width:${p.pct}%"></i></div>
        <div class="card__meta" style="margin-top:12px;">
          <span>${c.modules ? esc(c.modules.title) : "Cours libre"}</span>
          <span class="btn btn--sm">Ouvrir</span>
        </div>
      </div>
    </div>`);
    node.addEventListener("click", () => go("course", { id: c.id }));
    return node;
  }

  async function studentCatalog() {
    loading();
    try {
      const [courses, attempts] = await Promise.all([getCourses(), getMyAttempts()]);
      const wrap = el(`<div>
        ${header("Catalogue des cours", "Découvre et suis les cours disponibles")}
        <div class="grid grid--cards" id="cards"></div>
      </div>`);
      const cards = wrap.querySelector("#cards");
      if (!courses.length) cards.innerHTML = empty("Aucun cours publié pour l'instant.");
      courses.forEach((c) => cards.appendChild(courseCard(c, attempts)));
      setView(wrap);
    } catch (e) { setView(errorBox(e)); }
  }

  async function studentCourse(id) {
    loading();
    try {
      const [course, attempts] = await Promise.all([getCourse(id), getMyAttempts()]);
      const p = courseProgress(course, attempts);
      const wrap = el(`<div>
        <button class="btn btn--ghost btn--sm" id="back">← Retour</button>
        ${header(course.title, course.modules ? "Module : " + course.modules.title : "Cours libre")}
        <p class="desc" style="color:var(--muted);margin-bottom:18px;">${esc(course.description || "")}</p>
        <div class="card"><div class="card__body">
          <div class="progress-label"><span>Ta progression dans ce cours</span><span>${p.pct}%</span></div>
          <div class="progress"><i style="width:${p.pct}%"></i></div>
          <p style="font-size:13px;color:var(--muted);margin-top:8px;">${p.done}/${p.evaluated} évaluation(s) validée(s)</p>
        </div></div>
        <div class="section-title">Leçons</div>
        <div id="lessons"></div>
      </div>`);
      wrap.querySelector("#back").addEventListener("click", () => go("catalog"));
      const cont = wrap.querySelector("#lessons");
      if (!course.lessons.length) cont.innerHTML = empty("Ce cours n'a pas encore de leçon.");
      course.lessons.forEach((l, i) => {
        const ev = (l.evaluations || [])[0];
        const best = ev ? attempts.filter((a) => a.evaluation_id === ev.id).reduce((m, a) => Math.max(m, a.score), -1) : -1;
        const passed = ev && best >= ev.pass_score;
        const row = el(`<div class="lesson-row">
          <div class="idx">${i + 1}</div>
          <div class="info">
            <b>${esc(l.title)}</b>
            <small>
              <span class="badge badge--${l.content_type}">${l.content_type === "video" ? "Vidéo" : "PDF"}</span>
              ${ev ? `· Éval. requise ≥ ${ev.pass_score}%` : "· Sans évaluation"}
              ${best >= 0 ? `· Note: ${best}%` : ""}
            </small>
          </div>
          <div class="actions">
            ${passed ? '<span class="badge badge--done">Validée</span>' : ""}
            <button class="btn btn--sm">${ICON.play}<span>Suivre</span></button>
          </div>
        </div>`);
        row.querySelector("button").addEventListener("click", () => go("lesson", { id: l.id, course: id }));
        cont.appendChild(row);
      });
      setView(wrap);
    } catch (e) { setView(errorBox(e)); }
  }

  async function studentLesson(id) {
    loading();
    try {
      const { data: lesson, error } = await sb
        .from("lessons")
        .select("*, courses(id,title), evaluations(*, questions(*))")
        .eq("id", id)
        .single();
      if (error) throw error;
      const ev = (lesson.evaluations || [])[0];
      const wrap = el(`<div>
        <button class="btn btn--ghost btn--sm" id="back">← Retour au cours</button>
        ${header(lesson.title, lesson.courses ? lesson.courses.title : "")}
        <div id="content"></div>
        <div class="section-title">Évaluation</div>
        <div id="quiz"></div>
      </div>`);
      wrap.querySelector("#back").addEventListener("click", () =>
        go("course", { id: lesson.course_id })
      );
      // content
      const content = wrap.querySelector("#content");
      if (lesson.content_type === "video") {
        content.appendChild(el(`<div class="player-wrap">${videoEmbed(lesson.content_url)}</div>`));
      } else {
        content.appendChild(el(`<iframe class="pdf-frame" src="${esc(lesson.content_url)}" title="Document PDF"></iframe>
          <p style="margin-top:8px;font-size:13px;"><a class="btn btn--ghost btn--sm" href="${esc(lesson.content_url)}" target="_blank" rel="noopener">Ouvrir le PDF dans un nouvel onglet</a></p>`));
      }
      // quiz
      const quizBox = wrap.querySelector("#quiz");
      if (!ev || !(ev.questions || []).length) {
        quizBox.innerHTML = `<div class="card"><div class="card__body">Aucune évaluation pour cette leçon.</div></div>`;
      } else {
        quizBox.appendChild(buildQuiz(ev));
      }
      setView(wrap);
    } catch (e) { setView(errorBox(e)); }
  }

  function videoEmbed(url) {
    const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]{11})/);
    if (yt) return `<iframe src="https://www.youtube.com/embed/${yt[1]}" allowfullscreen></iframe>`;
    const vimeo = url.match(/vimeo\.com\/(\d+)/);
    if (vimeo) return `<iframe src="https://player.vimeo.com/video/${vimeo[1]}" allowfullscreen></iframe>`;
    return `<video src="${esc(url)}" controls></video>`;
  }

  function buildQuiz(ev) {
    const questions = (ev.questions || []).sort((a, b) => a.id.localeCompare(b.id));
    const box = el(`<div>
      <p style="font-size:13px;color:var(--muted);margin-bottom:12px;">${esc(ev.title || "Évaluation")} — note de passage : ${ev.pass_score}%</p>
      <form id="quiz-form"></form>
      <button class="btn" id="submit-quiz">Valider mes réponses</button>
      <div id="quiz-result" style="margin-top:16px;"></div>
    </div>`);
    const form = box.querySelector("#quiz-form");
    questions.forEach((q, qi) => {
      const opts = (q.options || [])
        .map(
          (o, oi) => `<label class="quiz-opt" data-q="${qi}" data-o="${oi}">
            <input type="radio" name="q${qi}" value="${oi}"> <span>${esc(o)}</span></label>`
        )
        .join("");
      form.appendChild(el(`<div class="quiz-q"><b>${qi + 1}. ${esc(q.question)}</b>${opts}</div>`));
    });
    box.querySelector("#submit-quiz").addEventListener("click", async () => {
      let correct = 0;
      questions.forEach((q, qi) => {
        const sel = form.querySelector(`input[name="q${qi}"]:checked`);
        const chosen = sel ? parseInt(sel.value) : -1;
        form.querySelectorAll(`.quiz-opt[data-q="${qi}"]`).forEach((opt) => {
          const oi = parseInt(opt.dataset.o);
          if (oi === q.correct_index) opt.classList.add("correct");
          else if (oi === chosen) opt.classList.add("wrong");
        });
        if (chosen === q.correct_index) correct++;
      });
      const score = Math.round((correct / questions.length) * 100);
      const passed = score >= ev.pass_score;
      try {
        await sb.from("attempts").insert({
          user_id: state.user.id,
          evaluation_id: ev.id,
          score,
          passed,
        });
      } catch (e) { /* ignore insert errors visually */ }
      box.querySelector("#quiz-result").innerHTML = `<div class="card"><div class="card__body" style="text-align:center;">
        <div class="num" style="font-size:34px;font-weight:800;color:${passed ? "var(--green)" : "var(--danger)"};font-family:var(--font-serif);">${score}%</div>
        <p>${passed ? "Félicitations, leçon validée !" : "Note insuffisante, réessaie après révision."}</p>
        </div></div>`;
      box.querySelector("#submit-quiz").disabled = true;
      toast(passed ? "Évaluation réussie (" + score + "%)" : "Évaluation : " + score + "%", !passed);
      // refresh module certificates check
      checkAndIssueCertificates();
    });
    return box;
  }

  async function studentModules() {
    loading();
    try {
      const [modules, attempts, certs] = await Promise.all([
        getModules(),
        getMyAttempts(),
        sb.from("certificates").select("module_id").eq("user_id", state.user.id),
      ]);
      const certIds = new Set((certs.data || []).map((c) => c.module_id));
      const wrap = el(`<div>${header("Modules de formation", "Valide tous les cours d'un module pour obtenir un certificat")}<div id="list" class="grid"></div></div>`);
      const list = wrap.querySelector("#list");
      if (!modules.length) list.innerHTML = empty("Aucun module défini par le promoteur.");
      for (const m of modules) {
        const courseIds = (m.courses || []).map((c) => c.id);
        let pcts = [];
        for (const cid of courseIds) {
          try { const c = await getCourse(cid); pcts.push(courseProgress(c, attempts).pct >= 60 ? 100 : courseProgress(c, attempts).pct); } catch {}
        }
        const modPct = pcts.length ? Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length) : 0;
        const validated = pcts.length > 0 && pcts.every((p) => p >= 60);
        const card = el(`<div class="card"><div class="card__body">
          <div style="display:flex;justify-content:space-between;align-items:start;gap:10px;">
            <h3>${esc(m.title)}</h3>
            ${certIds.has(m.id) ? '<span class="badge badge--gold">Certifié</span>' : validated ? '<span class="badge badge--done">Validé</span>' : ""}
          </div>
          <p class="desc">${esc(m.description || "")}</p>
          <div class="progress-label"><span>${(m.courses || []).length} cours</span><span>${modPct}%</span></div>
          <div class="progress"><i style="width:${modPct}%"></i></div>
        </div></div>`);
        list.appendChild(card);
      }
      setView(wrap);
    } catch (e) { setView(errorBox(e)); }
  }

  // Vérifie les modules validés et émet les certificats manquants
  async function checkAndIssueCertificates() {
    try {
      const [modules, attempts, certs] = await Promise.all([
        getModules(),
        getMyAttempts(),
        sb.from("certificates").select("module_id").eq("user_id", state.user.id),
      ]);
      const have = new Set((certs.data || []).map((c) => c.module_id));
      for (const m of modules) {
        if (have.has(m.id)) continue;
        const courseIds = (m.courses || []).map((c) => c.id);
        if (!courseIds.length) continue;
        let allOk = true;
        for (const cid of courseIds) {
          const c = await getCourse(cid);
          if (courseProgress(c, attempts).pct < 60) { allOk = false; break; }
        }
        if (allOk) {
          await sb.from("certificates").insert({ user_id: state.user.id, module_id: m.id });
          toast("Nouveau certificat obtenu : " + m.title);
        }
      }
    } catch (e) { /* silencieux */ }
  }

  async function studentCertificates() {
    loading();
    try {
      const { data, error } = await sb
        .from("certificates")
        .select("*, modules(title)")
        .eq("user_id", state.user.id)
        .order("issued_at", { ascending: false });
      if (error) throw error;
      const wrap = el(`<div>${header("Mes certificats", "Tes réussites validées")}<div id="list" class="grid"></div></div>`);
      const list = wrap.querySelector("#list");
      if (!data.length) { list.innerHTML = empty("Aucun certificat pour l'instant. Termine un module complet pour en obtenir un."); setView(wrap); return; }
      data.forEach((c) => {
        const cert = el(`<div class="cert">
          <span class="badge badge--gold">Certificat de validation</span>
          <h2>Agreste Academy</h2>
          <p>Ce certificat est décerné à</p>
          <div class="who">${esc(state.profile.full_name)}</div>
          <p>pour la validation complète du module</p>
          <p style="font-family:var(--font-serif);font-size:20px;color:var(--green);margin-top:6px;">${esc(c.modules ? c.modules.title : "")}</p>
          <div class="meta">Délivré le ${fmtDate(c.issued_at)} · Réf. ${c.id.slice(0, 8).toUpperCase()}</div>
        </div>`);
        list.appendChild(cert);
      });
      setView(wrap);
    } catch (e) { setView(errorBox(e)); }
  }

  /* =======================================================================
     TEACHER
     ===================================================================== */
  async function teacherDashboard() {
    loading();
    try {
      const courses = await getCourses({ created_by: state.user.id });
      const lessonCount = courses.reduce((s, c) => s + (c.lessons || []).length, 0);
      const wrap = el(`<div>
        ${header("Espace enseignant", "Gère tes cours, leçons et évaluations",
          `<button class="btn" id="new">${ICON.plus}<span>Nouveau cours</span></button>`)}
        <div class="grid grid--stats">
          <div class="stat"><div class="num">${courses.length}</div><div class="lab">Cours créés</div></div>
          <div class="stat"><div class="num">${lessonCount}</div><div class="lab">Leçons</div></div>
        </div>
        <div class="section-title">Tes cours</div>
        <div class="grid grid--cards" id="cards"></div>
      </div>`);
      wrap.querySelector("#new").addEventListener("click", () => openCourseModal());
      const cards = wrap.querySelector("#cards");
      if (!courses.length) cards.innerHTML = empty("Tu n'as pas encore créé de cours.");
      courses.forEach((c) => cards.appendChild(teacherCourseCard(c)));
      setView(wrap);
    } catch (e) { setView(errorBox(e)); }
  }

  async function teacherCourses() { return teacherDashboard(); }

  function teacherCourseCard(c) {
    const node = el(`<div class="card" role="button" tabindex="0">
      <div class="card__cover"><span class="badge badge--gold">${(c.lessons || []).length} leçon(s)</span></div>
      <div class="card__body">
        <h3>${esc(c.title)}</h3>
        <p class="desc">${esc((c.description || "").slice(0, 90) || "Sans description")}</p>
        <div class="card__meta"><span>${c.modules ? esc(c.modules.title) : "Cours libre"}</span><span class="btn btn--sm">Gérer</span></div>
      </div>
    </div>`);
    node.addEventListener("click", () => go("course-edit", { id: c.id }));
    return node;
  }

  async function openCourseModal(course) {
    const modules = await getModules();
    const opts = ['<option value="">— Cours libre (sans module) —</option>']
      .concat(modules.map((m) => `<option value="${m.id}" ${course && course.module_id === m.id ? "selected" : ""}>${esc(m.title)}</option>`))
      .join("");
    openModal(course ? "Modifier le cours" : "Nouveau cours", `
      <form id="course-form">
        <label class="field"><span>Titre du cours</span><input class="input" name="title" required value="${course ? esc(course.title) : ""}"></label>
        <label class="field"><span>Description</span><textarea class="input" name="description" rows="3">${course ? esc(course.description || "") : ""}</textarea></label>
        <label class="field"><span>Module associé</span><select class="select" name="module_id">${opts}</select></label>
        <button class="btn btn--block" type="submit">${course ? "Enregistrer" : "Créer le cours"}</button>
      </form>
    `, (modal) => {
      modal.querySelector("#course-form").addEventListener("submit", async (e) => {
        e.preventDefault();
        const f = e.target;
        const payload = {
          title: f.title.value.trim(),
          description: f.description.value.trim(),
          module_id: f.module_id.value || null,
          created_by: state.user.id,
        };
        try {
          if (course) await sb.from("courses").update(payload).eq("id", course.id);
          else await sb.from("courses").insert(payload);
          closeModal();
          toast("Cours enregistré.");
          go(course ? "course-edit" : "dashboard", course ? { id: course.id } : {});
        } catch (err) { toast(err.message, true); }
      });
    });
  }

  async function teacherCourseEdit(id) {
    loading();
    try {
      const course = await getCourse(id);
      const wrap = el(`<div>
        <button class="btn btn--ghost btn--sm" id="back">← Mes cours</button>
        ${header(course.title, course.modules ? "Module : " + course.modules.title : "Cours libre",
          `<button class="btn btn--ghost btn--sm" id="edit">Modifier</button> <button class="btn" id="add-lesson">${ICON.plus}<span>Ajouter une leçon</span></button>`)}
        <p class="desc" style="color:var(--muted);margin-bottom:10px;">${esc(course.description || "")}</p>
        <div class="section-title">Leçons & évaluations</div>
        <div id="lessons"></div>
      </div>`);
      wrap.querySelector("#back").addEventListener("click", () => go("my-courses"));
      wrap.querySelector("#edit").addEventListener("click", () => openCourseModal(course));
      wrap.querySelector("#add-lesson").addEventListener("click", () => openLessonModal(course.id, course.lessons.length));
      const cont = wrap.querySelector("#lessons");
      if (!course.lessons.length) cont.innerHTML = empty("Ajoute ta première leçon (PDF ou vidéo).");
      course.lessons.forEach((l, i) => {
        const ev = (l.evaluations || [])[0];
        const row = el(`<div class="lesson-row">
          <div class="idx">${i + 1}</div>
          <div class="info"><b>${esc(l.title)}</b>
            <small><span class="badge badge--${l.content_type}">${l.content_type === "video" ? "Vidéo" : "PDF"}</span>
            ${ev ? `· Évaluation (${ev.pass_score}%)` : "· Pas d'évaluation"}</small></div>
          <div class="actions">
            <button class="btn btn--ghost btn--sm" data-act="eval">${ev ? "Modifier éval." : "Ajouter éval."}</button>
            <button class="btn btn--danger btn--sm" data-act="del">Suppr.</button>
          </div>
        </div>`);
        row.querySelector('[data-act="eval"]').addEventListener("click", () => openEvalModal(l, ev));
        row.querySelector('[data-act="del"]').addEventListener("click", async () => {
          if (!confirm("Supprimer cette leçon ?")) return;
          await sb.from("lessons").delete().eq("id", l.id);
          toast("Leçon supprimée.");
          go("course-edit", { id });
        });
        cont.appendChild(row);
      });
      setView(wrap);
    } catch (e) { setView(errorBox(e)); }
  }

  function openLessonModal(courseId, position) {
    openModal("Ajouter une leçon", `
      <form id="lesson-form">
        <label class="field"><span>Titre de la leçon</span><input class="input" name="title" required></label>
        <label class="field"><span>Type de contenu</span>
          <select class="select" name="content_type">
            <option value="pdf">Document PDF</option>
            <option value="video">Vidéo</option>
          </select></label>
        <div id="upload-zone">
          <label class="field"><span>Fichier PDF (téléversé dans Supabase Storage)</span>
            <input class="input" type="file" name="file" accept="application/pdf"></label>
        </div>
        <div id="url-zone" class="hidden">
          <label class="field"><span>Lien de la vidéo (YouTube, Vimeo ou URL .mp4)</span>
            <input class="input" name="url" placeholder="https://www.youtube.com/watch?v=..."></label>
        </div>
        <button class="btn btn--block" type="submit">Ajouter la leçon</button>
      </form>
    `, (modal) => {
      const form = modal.querySelector("#lesson-form");
      const typeSel = form.content_type;
      const uploadZone = modal.querySelector("#upload-zone");
      const urlZone = modal.querySelector("#url-zone");
      typeSel.addEventListener("change", () => {
        const isVideo = typeSel.value === "video";
        urlZone.classList.toggle("hidden", !isVideo);
        uploadZone.classList.toggle("hidden", isVideo);
      });
      form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const btn = form.querySelector("button");
        btn.disabled = true; btn.textContent = "Enregistrement…";
        try {
          let content_url = "";
          if (typeSel.value === "pdf") {
            const file = form.file.files[0];
            if (!file) throw new Error("Choisis un fichier PDF.");
            const path = `${state.user.id}/${Date.now()}-${file.name.replace(/\s+/g, "_")}`;
            const { error: upErr } = await sb.storage.from(CFG.STORAGE_BUCKET).upload(path, file);
            if (upErr) throw upErr;
            const { data } = sb.storage.from(CFG.STORAGE_BUCKET).getPublicUrl(path);
            content_url = data.publicUrl;
          } else {
            content_url = form.url.value.trim();
            if (!content_url) throw new Error("Indique un lien vidéo.");
          }
          await sb.from("lessons").insert({
            course_id: courseId,
            title: form.title.value.trim(),
            content_type: typeSel.value,
            content_url,
            position,
          });
          closeModal();
          toast("Leçon ajoutée.");
          go("course-edit", { id: courseId });
        } catch (err) {
          toast(err.message, true);
          btn.disabled = false; btn.textContent = "Ajouter la leçon";
        }
      });
    });
  }

  async function openEvalModal(lesson, existing) {
    // load questions if existing
    let questions = [];
    if (existing) {
      const { data } = await sb.from("questions").select("*").eq("evaluation_id", existing.id);
      questions = (data || []).map((q) => ({ ...q }));
    }
    if (!questions.length) questions = [blankQ()];

    openModal(existing ? "Modifier l'évaluation" : "Ajouter une évaluation", `
      <form id="eval-form">
        <label class="field"><span>Titre de l'évaluation</span>
          <input class="input" name="title" value="${existing ? esc(existing.title || "") : "Évaluation : " + esc(lesson.title)}"></label>
        <label class="field"><span>Note de passage (%)</span>
          <input class="input" type="number" name="pass_score" min="1" max="100" value="${existing ? existing.pass_score : 60}"></label>
        <div id="questions"></div>
        <button type="button" class="btn btn--ghost btn--sm" id="add-q">+ Ajouter une question</button>
        <button class="btn btn--block" type="submit" style="margin-top:14px;">Enregistrer l'évaluation</button>
      </form>
    `, (modal) => {
      const qBox = modal.querySelector("#questions");
      const renderQs = () => {
        qBox.innerHTML = "";
        questions.forEach((q, qi) => {
          const optInputs = q.options.map((o, oi) => `
            <label class="quiz-opt" style="cursor:default;">
              <input type="radio" name="correct-${qi}" ${q.correct_index === oi ? "checked" : ""} data-correct="${qi}-${oi}">
              <input class="input" data-opt="${qi}-${oi}" value="${esc(o)}" placeholder="Réponse ${oi + 1}" style="margin:0;">
            </label>`).join("");
          qBox.appendChild(el(`<div class="quiz-q">
            <div style="display:flex;justify-content:space-between;gap:8px;">
              <b>Question ${qi + 1}</b>
              ${questions.length > 1 ? `<button type="button" class="btn btn--danger btn--sm" data-delq="${qi}">Retirer</button>` : ""}
            </div>
            <input class="input" data-q="${qi}" value="${esc(q.question)}" placeholder="Énoncé de la question" style="margin:8px 0;">
            <small style="color:var(--muted);">Coche la bonne réponse :</small>
            ${optInputs}
          </div>`));
        });
        // bind
        qBox.querySelectorAll("[data-q]").forEach((inp) =>
          inp.addEventListener("input", () => (questions[+inp.dataset.q].question = inp.value)));
        qBox.querySelectorAll("[data-opt]").forEach((inp) =>
          inp.addEventListener("input", () => {
            const [qi, oi] = inp.dataset.opt.split("-").map(Number);
            questions[qi].options[oi] = inp.value;
          }));
        qBox.querySelectorAll("[data-correct]").forEach((inp) =>
          inp.addEventListener("change", () => {
            const [qi, oi] = inp.dataset.correct.split("-").map(Number);
            questions[qi].correct_index = oi;
          }));
        qBox.querySelectorAll("[data-delq]").forEach((b) =>
          b.addEventListener("click", () => { questions.splice(+b.dataset.delq, 1); renderQs(); }));
      };
      renderQs();
      modal.querySelector("#add-q").addEventListener("click", () => { questions.push(blankQ()); renderQs(); });

      modal.querySelector("#eval-form").addEventListener("submit", async (e) => {
        e.preventDefault();
        const f = e.target;
        const btn = f.querySelector("button[type=submit]");
        btn.disabled = true; btn.textContent = "Enregistrement…";
        try {
          const valid = questions.filter((q) => q.question.trim() && q.options.filter((o) => o.trim()).length >= 2);
          if (!valid.length) throw new Error("Ajoute au moins une question valide (énoncé + 2 réponses).");
          let evalId = existing ? existing.id : null;
          const evalPayload = { lesson_id: lesson.id, title: f.title.value.trim(), pass_score: parseInt(f.pass_score.value) };
          if (existing) {
            await sb.from("evaluations").update(evalPayload).eq("id", existing.id);
            await sb.from("questions").delete().eq("evaluation_id", existing.id);
          } else {
            const { data, error } = await sb.from("evaluations").insert(evalPayload).select().single();
            if (error) throw error;
            evalId = data.id;
          }
          const rows = valid.map((q) => ({
            evaluation_id: evalId,
            question: q.question.trim(),
            options: q.options.filter((o) => o.trim()),
            correct_index: Math.min(q.correct_index, q.options.filter((o) => o.trim()).length - 1),
          }));
          await sb.from("questions").insert(rows);
          closeModal();
          toast("Évaluation enregistrée.");
          go("course-edit", { id: lesson.course_id });
        } catch (err) {
          toast(err.message, true);
          btn.disabled = false; btn.textContent = "Enregistrer l'évaluation";
        }
      });
    });
  }
  const blankQ = () => ({ question: "", options: ["", "", "", ""], correct_index: 0 });

  /* =======================================================================
     PROMOTER
     ===================================================================== */
  async function promoterDashboard() {
    loading();
    try {
      const [modules, courses, certs, users] = await Promise.all([
        getModules(),
        getCourses(),
        sb.from("certificates").select("id"),
        sb.from("profiles").select("id,role"),
      ]);
      const byRole = (r) => (users.data || []).filter((u) => u.role === r).length;
      const wrap = el(`<div>
        ${header("Espace promoteur", "Pilote les modules, cours et certifications")}
        <div class="grid grid--stats">
          <div class="stat"><div class="num">${modules.length}</div><div class="lab">Modules</div></div>
          <div class="stat"><div class="num">${courses.length}</div><div class="lab">Cours</div></div>
          <div class="stat"><div class="num">${(certs.data || []).length}</div><div class="lab">Certificats émis</div></div>
          <div class="stat"><div class="num">${byRole("student")}</div><div class="lab">Étudiants</div></div>
        </div>
        <div class="section-title">Aperçu des rôles</div>
        <div class="grid grid--stats">
          <div class="stat"><div class="num">${byRole("teacher")}</div><div class="lab">Enseignants</div></div>
          <div class="stat"><div class="num">${byRole("promoter")}</div><div class="lab">Promoteurs</div></div>
        </div>
      </div>`);
      setView(wrap);
    } catch (e) { setView(errorBox(e)); }
  }

  async function promoterModules() {
    loading();
    try {
      const modules = await getModules();
      const wrap = el(`<div>
        ${header("Modules de cours", "Regroupe des cours en parcours certifiants",
          `<button class="btn" id="new">${ICON.plus}<span>Nouveau module</span></button>`)}
        <div id="list" class="grid"></div>
      </div>`);
      wrap.querySelector("#new").addEventListener("click", () => openModuleModal());
      const list = wrap.querySelector("#list");
      if (!modules.length) list.innerHTML = empty("Aucun module. Crée le premier parcours certifiant.");
      modules.forEach((m) => {
        const card = el(`<div class="card"><div class="card__body">
          <div style="display:flex;justify-content:space-between;gap:10px;">
            <h3>${esc(m.title)}</h3>
            <div style="display:flex;gap:6px;">
              <button class="btn btn--ghost btn--sm" data-act="edit">Modifier</button>
              <button class="btn btn--danger btn--sm" data-act="del">Suppr.</button>
            </div>
          </div>
          <p class="desc">${esc(m.description || "")}</p>
          <span class="badge">${(m.courses || []).length} cours rattaché(s)</span>
        </div></div>`);
        card.querySelector('[data-act="edit"]').addEventListener("click", () => openModuleModal(m));
        card.querySelector('[data-act="del"]').addEventListener("click", async () => {
          if (!confirm("Supprimer ce module ? Les cours ne seront pas supprimés.")) return;
          await sb.from("modules").delete().eq("id", m.id);
          toast("Module supprimé."); go("modules-admin");
        });
        list.appendChild(card);
      });
      setView(wrap);
    } catch (e) { setView(errorBox(e)); }
  }

  function openModuleModal(m) {
    openModal(m ? "Modifier le module" : "Nouveau module", `
      <form id="m-form">
        <label class="field"><span>Titre du module</span><input class="input" name="title" required value="${m ? esc(m.title) : ""}"></label>
        <label class="field"><span>Description</span><textarea class="input" name="description" rows="3">${m ? esc(m.description || "") : ""}</textarea></label>
        <button class="btn btn--block" type="submit">${m ? "Enregistrer" : "Créer le module"}</button>
      </form>
    `, (modal) => {
      modal.querySelector("#m-form").addEventListener("submit", async (e) => {
        e.preventDefault();
        const f = e.target;
        const payload = { title: f.title.value.trim(), description: f.description.value.trim(), created_by: state.user.id };
        try {
          if (m) await sb.from("modules").update(payload).eq("id", m.id);
          else await sb.from("modules").insert(payload);
          closeModal(); toast("Module enregistré."); go("modules-admin");
        } catch (err) { toast(err.message, true); }
      });
    });
  }

  async function promoterCourses() {
    loading();
    try {
      const [courses, modules] = await Promise.all([getCourses(), getModules()]);
      const wrap = el(`<div>${header("Tous les cours", "Assigne les cours aux modules")}<div id="list" class="grid"></div></div>`);
      const list = wrap.querySelector("#list");
      if (!courses.length) list.innerHTML = empty("Aucun cours créé par les enseignants.");
      courses.forEach((c) => {
        const opts = ['<option value="">— Aucun module —</option>']
          .concat(modules.map((m) => `<option value="${m.id}" ${c.module_id === m.id ? "selected" : ""}>${esc(m.title)}</option>`)).join("");
        const card = el(`<div class="card"><div class="card__body">
          <h3>${esc(c.title)}</h3>
          <p class="desc">${esc((c.description || "").slice(0, 100))}</p>
          <label class="field"><span>Module assigné</span><select class="select" data-course="${c.id}">${opts}</select></label>
        </div></div>`);
        card.querySelector("select").addEventListener("change", async (e) => {
          await sb.from("courses").update({ module_id: e.target.value || null }).eq("id", c.id);
          toast("Cours réassigné.");
        });
        list.appendChild(card);
      });
      setView(wrap);
    } catch (e) { setView(errorBox(e)); }
  }

  async function promoterCerts() {
    loading();
    try {
      const { data, error } = await sb
        .from("certificates")
        .select("*, modules(title), profiles(full_name)")
        .order("issued_at", { ascending: false });
      if (error) throw error;
      const wrap = el(`<div>${header("Certificats émis", "Suivi des validations de module")}<div id="list" class="grid"></div></div>`);
      const list = wrap.querySelector("#list");
      if (!data.length) list.innerHTML = empty("Aucun certificat émis pour le moment.");
      data.forEach((c) => {
        list.appendChild(el(`<div class="card"><div class="card__body" style="display:flex;justify-content:space-between;align-items:center;gap:12px;">
          <div><h3 style="margin:0;">${esc(c.profiles ? c.profiles.full_name : "Étudiant")}</h3>
          <small style="color:var(--muted);">Module : ${esc(c.modules ? c.modules.title : "—")}</small></div>
          <div style="text-align:right;"><span class="badge badge--gold">Certifié</span><br><small style="color:var(--muted);">${fmtDate(c.issued_at)}</small></div>
        </div></div>`));
      });
      setView(wrap);
    } catch (e) { setView(errorBox(e)); }
  }

  async function promoterUsers() {
    loading();
    try {
      const { data, error } = await sb.from("profiles").select("*").order("role");
      if (error) throw error;
      const wrap = el(`<div>${header("Utilisateurs", "Membres de la plateforme")}<div id="list" class="grid"></div></div>`);
      const list = wrap.querySelector("#list");
      if (!data.length) list.innerHTML = empty("Aucun utilisateur.");
      data.forEach((u) => {
        list.appendChild(el(`<div class="card"><div class="card__body" style="display:flex;justify-content:space-between;align-items:center;">
          <div><h3 style="margin:0;">${esc(u.full_name || "Sans nom")}</h3></div>
          <span class="badge ${u.role === "promoter" ? "badge--gold" : ""}">${ROLE_LABEL[u.role] || u.role}</span>
        </div></div>`));
      });
      setView(wrap);
    } catch (e) { setView(errorBox(e)); }
  }

  /* ----------------------- Modal helpers -------------------------------- */
  function openModal(title, bodyHtml, onMount) {
    const root = $("#modal-root");
    const backdrop = el(`<div class="modal-backdrop">
      <div class="modal">
        <div class="modal__head"><h3>${esc(title)}</h3><button aria-label="Fermer">×</button></div>
        <div class="modal__body">${bodyHtml}</div>
      </div>
    </div>`);
    backdrop.addEventListener("mousedown", (e) => { if (e.target === backdrop) closeModal(); });
    backdrop.querySelector(".modal__head button").addEventListener("click", closeModal);
    root.appendChild(backdrop);
    if (onMount) onMount(backdrop.querySelector(".modal"));
  }
  function closeModal() { $("#modal-root").innerHTML = ""; }

  function errorBox(e) {
    console.log("[v0] erreur:", e && e.message);
    return el(`<div><div class="config-warn">Une erreur est survenue : ${esc(e && e.message ? e.message : e)}.<br>
      Vérifie que les tables Supabase sont bien créées et que les politiques RLS autorisent l'accès.</div></div>`);
  }

  /* ----------------------- Boot ----------------------------------------- */
  async function boot() {
    if (!CONFIGURED || !sb) { renderAuth("login"); return; }
    const { data: { session } } = await sb.auth.getSession();
    if (!session) { renderAuth("login"); return; }
    state.user = session.user;
    // load profile
    let { data: profile } = await sb.from("profiles").select("*").eq("id", state.user.id).single();
    if (!profile) {
      const meta = state.user.user_metadata || {};
      const fallback = { id: state.user.id, full_name: meta.full_name || state.user.email, role: meta.role || "student" };
      await sb.from("profiles").upsert(fallback);
      profile = fallback;
    }
    state.profile = profile;
    state.route = "dashboard";
    renderShell();
  }

  async function logout() {
    await sb.auth.signOut();
    state.user = null; state.profile = null;
    renderAuth("login");
  }

  // listen auth changes
  if (sb) {
    sb.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") renderAuth("login");
    });
  }

  document.addEventListener("DOMContentLoaded", boot);
  // boot may run before DOMContentLoaded if script loaded after; guard:
  if (document.readyState !== "loading") boot();
})();
