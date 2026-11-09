/* AnimPIX · app.js — logique de l'application (Firebase, lecteur, chat, Premium…) */
/* ====== CONFIG ====== */
const FIREBASE = {
  apiKey: "AIzaSyD90LXRc_pRV2KpAujKyCIgVplMasBvrSs",
  authDomain: "xil-book.firebaseapp.com",
  projectId: "xil-book",
  appId: "1:290319178475:web:43b6e6dd2ecd0fefae7cae"
};
const CLOUD_NAME = "haxtqhcv";
const UPLOAD_PRESET = "ToonBox";
/* E-mail(s) du/des administrateur(s) : seuls eux voient le bouton « Publier » */
const ADMIN_EMAILS = ["christianolyam@gmail.com", "lyamsr.14.02@gmail.com"];
/* ==================== */
const MAX_MB = 100, NEW_DAYS = 7;
const GENRES = ["Romance","Action","Aventure","Comédie","Drame","Fantastique","Horreur","Science-fiction","Slice of life","Thriller","Mystère","Sport","Isekai"];
const fillG = (id, sel = []) => { $("#" + id).innerHTML = GENRES.map(g => `<label><input type="checkbox" value="${g}" ${sel.includes(g) ? "checked" : ""}>${g}</label>`).join(""); };
const gGet = id => [...document.querySelectorAll(`#${id} input:checked`)].map(i => i.value);
const $ = s => document.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const LS = {
  get(k, d){ try{ return JSON.parse(localStorage.getItem(k)) ?? d; }catch{ return d; } },
  set(k, v){ try{ localStorage.setItem(k, JSON.stringify(v)); }catch{} }
};
let items = [], admin = false, term = "", current = null, db, auth, fb = {};
let fav = LS.get("apx_fav", []), prog = LS.get("apx_prog", {});
let sS = null, sN = 0, editId = null, plTry = 0, plQ = LS.get("apx_q", "auto");
let sel = new Set(), selMode = false, dling = "";
let myUntil = 0, usersMap = {}, reqs = [], myReqs = [], unsubP = [], lastP = false;
const CROWN = '<svg class="crown" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 18h18v2H3zM3 8l4.5 4L12 5l4.5 7L21 8l-2 8H5z"/></svg>';
const PRICE = 1000, PAY_NUM = "034 32 330 89", DAYS = 30;
const premOn = () => admin || myUntil > Date.now();
const locked = v => !!v.prem && !premOn();

const img = (v, w, h) => v.thumb.replace("/upload/", `/upload/${v.thumb.includes("/video/") ? "so_2," : ""}c_fill,g_auto,w_${w},h_${h},q_auto/`);
const isNew = v => v.rel === "recent" ? true : v.rel === "ancien" ? false : Date.now() - (v.created?.toMillis?.() ?? Date.now()) < NEW_DAYS * 864e5;
const route = () => decodeURIComponent(location.hash.slice(1)) || "accueil";
const meta = v => v.serie ? v.serie + (v.saison ? ` · S${v.saison}` : "") + (v.ep ? ` · Ép. ${v.ep}` : "") : v.cat;
const pct = v => { const p = prog[v.id]; return p && p.d ? Math.min(100, p.t / p.d * 100) : 0; };
const cmpEp = (a, b) => (a.saison || 0) - (b.saison || 0) || (a.order ?? 1e9) - (b.order ?? 1e9) || (a.ep || 0) - (b.ep || 0);
const nm = v => (v.serie || v.title || "").trim().toLowerCase();
const gkey = v => (v.cat || "") + "|" + nm(v);
const epsOf = k => items.filter(x => gkey(x) === k).sort(cmpEp);
const eps = v => epsOf(gkey(v));
const isGrp = v => !!v.serie || eps(v).length > 1;
const groupsOrdered = () => {
  const m = new Map();
  items.forEach((v, i) => { const k = gkey(v), o = v.sorder ?? 1e9, g = m.get(k); if(!g) m.set(k, {k, o, i}); else { g.o = Math.min(g.o, o); g.i = Math.min(g.i, i); } });
  return [...m.values()].sort((a, b) => a.o - b.o || a.i - b.i).map(g => g.k);
};
const ordered = l => { const ix = new Map(groupsOrdered().map((k, i) => [k, i])); return [...l].sort((a, b) => ix.get(gkey(a)) - ix.get(gkey(b)) || cmpEp(a, b)); };
const grp = l => { const s = new Set(), o = []; for(const v of l){ const k = gkey(v); if(s.has(k)) continue; s.add(k); o.push(eps(v)[0]); } return o; };
const inProg = v => { const p = prog[v.id]; return p && p.t > 10 && p.t < p.d - 10; };

const card = (v, d) => {
  const g = !d && isGrp(v) ? eps(v) : null;
  const ns = g ? new Set(g.filter(x => x.saison).map(x => x.saison)).size : 0;
  const nw = g ? g.some(isNew) : isNew(v), pc = g ? 0 : pct(v), on = d ? sel.has(v.id) : eps(v).every(x => sel.has(x.id));
  const pr = g ? g.some(x => x.prem) : !!v.prem, lk = g ? g.every(locked) : locked(v);
  const sub = g ? (ns ? `${ns} saison${ns > 1 ? "s" : ""} · ` : "") + `${g.length} ép.` : meta(v);
  return `<button class="pc ${on ? "sel" : ""} ${lk ? "lk" : ""}" ${d ? "data-id" : "data-g"}="${v.id}"><div class="po"><img loading="lazy" alt="" src="${img(v,300,450)}">${v.lang ? `<span class="bd">${esc(v.lang)}</span>` : ""}${nw ? "<em>NEW</em>" : ""}${pr ? `<span class="pcr" title="Premium">${CROWN}</span>` : ""}${selMode || on ? '<u class="ck">✓</u>' : ""}${pc ? `<i style="width:${pc}%"></i>` : ""}</div><b>${esc(g ? (v.serie || v.title) : v.title)}</b><span class="m">${esc(sub)}</span></button>`;
};
const grid = (l, n = 999, d) => `<div class="grid">${(d ? l : grp(l)).slice(0, n).map(v => card(v, d)).join("")}</div>`;
const SORTS = {ordre: "Mon ordre", recent: "Plus récents", nom: "Nom (A-Z)", saison: "Saison / épisode"};
let sortBy = "ordre";
const byName = (a, b) => (a.serie || a.title).localeCompare(b.serie || b.title, "fr", {numeric: true}) || (a.saison || 0) - (b.saison || 0) || (a.ep || 0) - (b.ep || 0);
const bySeason = (a, b) => (a.saison || 0) - (b.saison || 0) || byName(a, b);
const srt = l => sortBy === "nom" ? [...l].sort(byName) : sortBy === "saison" ? [...l].sort(bySeason) : sortBy === "ordre" ? ordered(l) : l;
const head = (t, s) => `<div class="sh"><h1>${esc(t)}</h1>${s ? `<select id="sortSel" aria-label="Trier">${Object.entries(SORTS).map(([k, n]) => `<option value="${k}" ${k === sortBy ? "selected" : ""}>${n}</option>`).join("")}</select>` : ""}</div>`;
const sec = (t, l, link, d) => l.length ? `<section class="sec hz"><div class="sh"><h2>${esc(t)}</h2>${link ? `<a href="#${encodeURIComponent(link)}">Voir tout ›</a>` : ""}</div>${grid(l, 12, d)}</section>` : "";

const cnt = f => items.filter(f);
const nGrp = l => new Set(l.map(gkey)).size;
const tile = (href, name, l, cls) => `<a class="tile ${cls || ""}" href="#${encodeURIComponent(href)}"><b>${esc(name)}</b><span>${nGrp(l)} titre${nGrp(l) > 1 ? "s" : ""}</span></a>`;
const hero = () => { const f = items[0], g = isGrp(f), t = g ? (f.serie || f.title) : f.title;
  return `<section class="hero"><div><span class="st">Dernier ajout</span><h1>${esc(t)}</h1><p>${esc(f.desc || "Tes animés, mangas et créations, au même endroit. Reprends où tu t'es arrêté ou explore le catalogue.")}</p><div class="acts"><button class="btn" data-g="${f.id}">▶ Regarder</button><a class="btn ghost" href="#catalogue">Explorer le catalogue</a></div><div class="stats"><div><b>${nGrp(items)}</b>titres</div><div><b>${items.length}</b>épisodes</div><div><b>${new Set(items.map(v => v.cat)).size}</b>catégories</div></div></div><img class="pic" alt="" src="${img(f, 420, 630)}"></section>`; };
function render(){
  const m = $("#main"), r = route();
  if(!items.length){
    m.innerHTML = `<div class="empty"><h2>Aucune vidéo pour l'instant</h2><p>${admin ? "Clique sur Publier pour ajouter ta première création." : "Reviens bientôt, rien n'a encore été publié."}</p></div>`;
    $("#tabs").innerHTML = ""; return;
  }
  const cats = [...new Set(items.map(v => v.cat))];
  const gens = GENRES.filter(g => items.some(v => (v.genres || []).includes(g)));
  const [rc, rg] = r.split("/");
  const gOk = rg && rg.startsWith("g:") && gens.includes(rg.slice(2)) ? rg.slice(2) : "";
  const view = ["accueil","nouveautes","catalogue","liste"].includes(r) || (cats.includes(rc) && (!rg || gOk)) || (r.startsWith("g:") && gens.includes(r.slice(2))) ? r : "accueil";
  const tabOn = view.split("/")[0];
  { const k = ["accueil","nouveautes","liste"].includes(tabOn) ? tabOn : "catalogue";
    document.querySelectorAll("#appbar a").forEach(a => a.classList.toggle("on", !term && a.dataset.k === k)); }
  $("#tabs").innerHTML = [["accueil","Accueil"],["nouveautes","Nouveautés"],["catalogue","Catalogue"],...cats.map(c => [c,c]),...gens.map(g => ["g:" + g, g]),["liste","Ma liste"]]
    .map(([k,t]) => `<a href="#${encodeURIComponent(k)}" class="${!term && tabOn === k ? "on" : ""}">${esc(t)}</a>`).join("");

  if(term){
    const l = items.filter(v => (v.title + " " + v.cat + " " + (v.serie || "") + " " + (v.genres || []).join(" ")).toLowerCase().includes(term));
    m.innerHTML = head("Résultats", 1) + (l.length ? `<div class="sec">${grid(srt(l))}</div>` : `<div class="empty"><p>Rien trouvé pour « ${esc(term)} ».</p></div>`);
  }else if(view === "nouveautes"){
    const nw = items.filter(isNew); m.innerHTML = head("Sorties récentes") + (nw.length ? `<div class="sec">${grid(nw.slice(0, 40))}</div>` : `<div class="empty"><p>Aucune sortie récente pour l'instant.</p></div>`);
  }else if(view === "catalogue"){
    m.innerHTML = `<div class="sec"><div class="sh"><h1>Catalogue</h1></div>`
      + `<h3 class="s">Catégories</h3><div class="tiles">${cats.map(c => tile(c, c, cnt(v => v.cat === c))).join("")}</div>`
      + (gens.length ? `<h3 class="s">Genres</h3><div class="tiles">${gens.map(g => tile("g:" + g, g, cnt(v => (v.genres || []).includes(g)), "g")).join("")}</div>` : "")
      + `</div>`
      + cats.map(c => {
          const inC = items.filter(v => v.cat === c), gs = gens.filter(g => inC.some(v => (v.genres || []).includes(g)));
          return `<section class="sec"><div class="sh"><h2>${esc(c)}</h2><a href="#${encodeURIComponent(c)}">Voir tout ›</a></div>`
            + (gs.length ? `<div class="tiles sm">${gs.map(g => tile(c + "/g:" + g, g, inC.filter(v => (v.genres || []).includes(g)), "g")).join("")}</div>` : `<p class="msg">Aucun genre renseigné.</p>`) + `</section>`;
        }).join("");
  }else if(view === "liste"){
    const l = items.filter(v => fav.includes(v.id));
    m.innerHTML = head("Ma liste", 1) + (l.length ? `<div class="sec">${grid(srt(l))}</div>` : `<div class="empty"><p>Vide pour l'instant. Ouvre une vidéo et appuie sur « Ajouter à ma liste ».</p></div>`);
  }else if(view.startsWith("g:")){
    m.innerHTML = head(view.slice(2), 1) + `<div class="sec">${grid(srt(items.filter(v => (v.genres || []).includes(view.slice(2)))))}</div>`;
  }else if(view !== "accueil"){
    const inC = items.filter(v => v.cat === rc), gs = gens.filter(g => inC.some(v => (v.genres || []).includes(g)));
    const chips = gs.length ? `<div class="chips fl"><a class="ep ${gOk ? "" : "on"}" href="#${encodeURIComponent(rc)}">Tous</a>${gs.map(g => `<a class="ep ${gOk === g ? "on" : ""}" href="#${encodeURIComponent(rc + "/g:" + g)}">${esc(g)}</a>`).join("")}</div>` : "";
    const l = gOk ? inC.filter(v => (v.genres || []).includes(gOk)) : inC;
    m.innerHTML = head(rc + (gOk ? " · " + gOk : ""), 1) + `<div class="sec">${chips}${grid(srt(l))}</div>`;
  }else{
    const cont = items.filter(v => { const p = prog[v.id]; return p && p.t > 10 && p.t < p.d - 10; });
    m.innerHTML = hero() + sec("Reprendre la lecture", cont, "", 1) + sec("Sorties récentes", items.filter(isNew), "nouveautes") + sec("Anciennes sorties", items.filter(v => !isNew(v)), "catalogue")
      + cats.map(c => sec(c, ordered(items.filter(v => v.cat === c)), c)).join("")
      + gens.map(g => sec(g, ordered(items.filter(v => (v.genres || []).includes(g))), "g:" + g)).join("");
  }
}

function openPlayer(id){
  const v = items.find(x => x.id === id); if(!v) return;
  if(locked(v)){ openPrem(v); return; }
  current = v;
  const el = $("#vid"), dlg = $("#player"), p = prog[id];
  plTry = 0; el.src = qUrl(v); el.poster = img(v, 960, 540);
  el.onloadedmetadata = () => { if(p && p.t > 10 && p.t < el.duration - 10) el.currentTime = p.t; };
  $("#pPoster").src = img(v, 300, 450);
  $("#pTags").innerHTML = (v.prem ? `<span>${CROWN} Premium</span>` : "") + (v.lang ? `<span>${esc(v.lang)}</span>` : "") + `<span class="c">${esc(v.cat)}</span>` + (v.genres || []).map(g => `<span class="c">${esc(g)}</span>`).join("");
  $("#pTitle").textContent = v.title + (v.saison ? ` · S${v.saison}` : "") + (v.ep ? ` · Ép. ${v.ep}` : "");
  $("#pDesc").textContent = (v.serie ? v.serie + (v.desc ? " — " : "") : "") + (v.desc || "");
  $("#plTitle").textContent = v.serie || v.title; $("#plSub").textContent = (v.saison ? "Saison " + v.saison + " · " : "") + (v.ep ? "Épisode " + v.ep : v.cat) + (v.lang ? " · " + v.lang : "");
  adminUI(); premPaint();
  favLabel();
  $("#dlBtn").href = dlUrl(v);
  const e = eps(v);
  $("#eps").innerHTML = e.length > 1 ? `<h3 class="s">Épisodes</h3><div class="chips">${e.map(x => `<button class="ep ${x.id === id ? "on" : ""}" data-id="${x.id}" title="${esc(x.title)}">${x.ep ? (x.saison ? "S" + x.saison + " · " : "") + "Ép. " + x.ep : esc(x.title)}</button>`).join("")}</div>` : "";
  const sug = items.filter(x => x.cat === v.cat && x.id !== id && gkey(x) !== gkey(v)).slice(0, 8);
  $("#sug").innerHTML = sug.length ? `<h3 class="s">À voir aussi</h3>${grid(sug)}` : "";
  if(!dlg.open){ dlg.showModal(); history.pushState({p: 1}, ""); }
  dlg.scrollTop = 0;
  el.play().catch(() => {}); plSync();
}
function favLabel(){ $("#favBtn").textContent = fav.includes(current.id) ? "♥ Dans ma liste" : "♡ Ajouter à ma liste"; }

$("#favBtn").onclick = () => {
  fav = fav.includes(current.id) ? fav.filter(x => x !== current.id) : [...fav, current.id];
  LS.set("apx_fav", fav); favLabel();
};
$("#vid").ontimeupdate = e => {
  const el = e.target, now = Date.now();
  if(!current || !el.duration || now - (el.last || 0) < 4000) return;
  el.last = now; prog[current.id] = {t: el.currentTime, d: el.duration}; LS.set("apx_prog", prog);
};
$("#vid").onended = () => {
  if(!current) return;
  delete prog[current.id]; LS.set("apx_prog", prog);
  const e = eps(current), nxt = e[e.findIndex(x => x.id === current.id) + 1];
  if(nxt) openPlayer(nxt.id);
};
$("#player").addEventListener("close", () => { const el = $("#vid"); el.pause(); el.removeAttribute("src"); el.load(); current = null; render(); });
$("#closeP").onclick = () => history.state?.p ? history.back() : $("#player").close();
addEventListener("popstate", () => { if($("#player").open) $("#player").close(); else if($("#serieD").open) $("#serieD").close(); });
addEventListener("hashchange", () => { term = ""; $("#q").value = ""; render(); scrollTo(0, 0); });
document.addEventListener("click", e => {
  const a = e.target.closest("[data-act]");
  if(a){ barAct(a.dataset.act); return; }
  const g = e.target.closest("[data-g]"), b = !g && e.target.closest("[data-id]");
  if(selMode && (g || b) && !e.target.closest("#player")){ g ? togGroup(g.dataset.g) : tog(b.dataset.id); return; }
  if(g){ openGroup(g.dataset.g); return; }
  if(b) openPlayer(b.dataset.id);
});
$("#q").oninput = e => { term = e.target.value.trim().toLowerCase(); render(); };
$("#adminBtn").onclick = () => $("#admin").showModal();
$("#closeA").onclick = () => $("#admin").close();

function upload(file, type, onProgress, tries = 3){
  return new Promise((ok, ko) => {
    const go = n => {
      const x = new XMLHttpRequest();
      x.open("POST", `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/${type}/upload`);
      if(onProgress) x.upload.onprogress = e => e.lengthComputable && onProgress(Math.min(e.loaded, file.size));
      x.onload = () => { let r = {}; try{ r = JSON.parse(x.responseText); }catch{} x.status < 300 ? ok(r) : ko(new Error(r.error?.message || "Échec de l'envoi")); };
      x.onerror = () => n > 1 ? setTimeout(() => go(n - 1), 1500) : ko(new Error("Pas de connexion"));
      const f = new FormData(); f.append("file", file); f.append("upload_preset", UPLOAD_PRESET);
      x.send(f);
    };
    go(tries);
  });
}

const base = "https://www.gstatic.com/firebasejs/10.14.1/";
let mods;
try{ mods = await Promise.all([import(base + "firebase-app.js"), import(base + "firebase-auth.js"), import(base + "firebase-firestore.js")]); }
catch(err){
  document.body.classList.remove("locked"); $("#gate").hidden = true;
  $("#tabs").innerHTML = "";
  $("#main").innerHTML = `<div class="hero"><small>Connexion impossible</small><h1>Le site ne peut pas charger ses données.</h1><p>Firebase est bloqué ici (aperçu intégré ou pas d'Internet). Ouvre sitex.html directement dans Chrome ou Safari, ou héberge-le (Netlify, GitHub Pages, Firebase Hosting).</p><div class="acts"><button class="btn" onclick="location.reload()">Réessayer</button></div></div>`;
  throw err;
}
const [{initializeApp}, A, F] = mods;
const app = initializeApp(FIREBASE);
auth = A.getAuth(app); db = F.getFirestore(app); fb = {...A, ...F};

/* ====== Chat / boîte à requêtes ====== */
let msgs = [], unsubC = null, chatT = null, me = null, inboxF = false, kind = "Demande d'anime";
const seen = LS.get("apx_seen", {});
const ts = m => m.created?.toMillis?.() ?? Date.now();
const fmtT = t => new Date(t).toLocaleString("fr-FR", {day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit"});
const threads = () => {
  const m = new Map();
  msgs.forEach(x => { const t = m.get(x.uid) || {uid: x.uid, name: "", email: "", list: []}; t.list.push(x); if(x.from === "user"){ t.name = x.name || t.name; t.email = x.email || t.email; } m.set(x.uid, t); });
  return [...m.values()].map(t => { t.list.sort((a, b) => ts(a) - ts(b)); t.last = t.list[t.list.length - 1]; t.unread = t.last.from === (admin ? "user" : "admin") && ts(t.last) > (seen[t.uid] || 0); return t; }).sort((a, b) => ts(b.last) - ts(a.last));
};
const markSeen = t => { if(t && t.last){ seen[t.uid] = ts(t.last); LS.set("apx_seen", seen); } };
function chatBadge(){
  const n = threads().filter(t => t.unread).length;
  $("#chatBtn").innerHTML = (admin ? "Boîte à requêtes" : "Contacter l'admin") + (n ? `<i class="bdg">${n}</i>` : "");
}
function renderChat(){
  const all = threads(), th = admin && !chatT && inboxF ? all.filter(x => x.unread) : all, body = $("#chatBody"), inbox = admin && !chatT;
  const t = admin ? th.find(x => x.uid === chatT) : th.find(x => x.uid === me?.uid);
  if(admin && chatT && !t && !th.length) chatT = null;
  $("#cBack").hidden = !(admin && chatT); $("#cDel").hidden = !(admin && chatT);
  $("#cForm").hidden = inbox; $("#cKinds").hidden = admin || inbox; $("#cFilter").hidden = !inbox; $("#cFilter").textContent = inboxF ? "Tous (" + all.length + ")" : "Non lus";
  $("#chatTitle").innerHTML = (admin && !inbox && t && premOf(t.uid) ? CROWN + " " : "") + esc(inbox ? "Boîte à requêtes" + (all.length ? " (" + all.length + ")" : "") : admin ? (t?.name || t?.email || "Conversation") : "Contacter l'admin");
  if(inbox){
    body.innerHTML = th.length ? th.map(x => `<button class="thr ${x.unread ? "un" : ""}" data-t="${esc(x.uid)}"><b>${premOf(x.uid) ? CROWN + " " : ""}${esc(x.name || x.email || "Utilisateur")}${x.unread ? '<i class="bdg">•</i>' : ""}${(x.list.find(m => m.kind) || {}).kind ? `<em class="k">${esc(x.list.find(m => m.kind).kind)}</em>` : ""}</b><span>${esc((x.last.from === "admin" ? "Toi : " : "") + x.last.text)}</span><small>${esc(x.email)} · ${fmtT(ts(x.last))}</small></button>`).join("") : `<p class="msg">${inboxF ? "Aucune requête non lue." : "Aucune requête pour l'instant."}</p>`;
  }else{
    const me1 = admin ? "admin" : "user", list = t ? t.list : [];
    body.innerHTML = `<div id="cMsgs">${list.length ? list.map(x => `<div class="bub ${x.from === me1 ? "me" : ""}"><small>${x.from !== "admin" && premOf(x.uid) ? CROWN + " " : ""}${esc(x.from === "admin" ? "Admin" + (x.adminName ? " · " + x.adminName : "") : (x.name || "Utilisateur"))} · ${fmtT(ts(x))}</small>${x.kind ? `<span class="k">${esc(x.kind)}</span><br>` : ""}${esc(x.text)}</div>`).join("") : `<p class="msg">${admin ? "Aucun message." : "Choisis un type, décris ce que tu veux voir ou ce qui ne va pas. La réponse de l'admin apparaîtra ici."}</p>`}</div>`;
    const m = $("#cMsgs"); m.scrollTop = m.scrollHeight;
    markSeen(t);
  }
  chatBadge();
}
function startChat(u){
  me = u; chatT = null;
  const col = fb.collection(db, "messages");
  unsubC = fb.onSnapshot(admin ? col : fb.query(col, fb.where("uid", "==", u.uid)),
    snap => { msgs = snap.docs.map(d => ({id: d.id, ...d.data()})); if($("#chatD").open) renderChat(); else chatBadge(); },
    err => console.warn("chat :", err));
  chatBadge();
}
function stopChat(){ unsubC?.(); unsubC = null; msgs = []; me = null; chatT = null; }
$("#chatBtn").onclick = () => { if(!me) return; chatT = null; renderChat(); $("#chatD").showModal(); const m = $("#cMsgs"); if(m) m.scrollTop = m.scrollHeight; if(!admin) $("#cIn").focus(); };
$("#closeC").onclick = () => $("#chatD").close();
$("#chatD").addEventListener("close", chatBadge);
$("#chatBody").addEventListener("click", e => { const b = e.target.closest("[data-t]"); if(b){ chatT = b.dataset.t; renderChat(); $("#cIn").focus(); } });
$("#cKinds").addEventListener("click", e => { const b = e.target.closest("[data-k]"); if(!b) return; kind = b.dataset.k; document.querySelectorAll("#cKinds .ep").forEach(x => x.classList.toggle("on", x === b)); });
$("#cFilter").onclick = () => { inboxF = !inboxF; renderChat(); };
$("#cBack").onclick = () => { chatT = null; renderChat(); };
$("#cDel").onclick = async () => {
  const t = threads().find(x => x.uid === chatT); if(!t || !confirm("Supprimer toute cette conversation ?")) return;
  try{
    for(let i = 0; i < t.list.length; i += 400){
      const b = fb.writeBatch(db);
      t.list.slice(i, i + 400).forEach(x => b.delete(fb.doc(db, "messages", x.id)));
      await b.commit();
    }
    chatT = null; renderChat();
  }catch(err){ alert("Échec : " + (err.message || err)); }
};
$("#cForm").onsubmit = async e => {
  e.preventDefault();
  const i = $("#cIn"), text = i.value.trim(); if(!text || !me) return;
  const t = admin ? threads().find(x => x.uid === chatT) : null; if(admin && !t) return;
  i.value = ""; $("#cErr").hidden = true;
  try{
    await fb.addDoc(fb.collection(db, "messages"), admin
      ? {uid: chatT, name: t.name, email: t.email, text, from: "admin", adminName: whoIs(me), created: fb.serverTimestamp()}
      : {uid: me.uid, name: whoIs(me), email: me.email || "", text, from: "user", kind, created: fb.serverTimestamp()});
  }catch(err){
    let ok = false;
    if(!admin){ try{ await fb.addDoc(fb.collection(db, "messages"), {uid: me.uid, name: whoIs(me), email: me.email || "", text: "[" + kind + "] " + text, from: "user", created: fb.serverTimestamp()}); ok = true; }catch{} }
    if(!ok){ i.value = text; const e2 = $("#cErr"); e2.hidden = false; e2.textContent = /permission/i.test(err.message || "") ? "Envoi refusé : les règles Firestore bloquent la collection « messages ». L'admin du site doit les mettre à jour (voir les règles fournies)." : "Message non envoyé : " + (err.message || err); }
  }
};

/* ====== Premium (abonnement mensuel, validé par l'admin) ====== */
const fmtD = t => new Date(t).toLocaleDateString("fr-FR", {day: "numeric", month: "long", year: "numeric"});
const premOf = uid => (uid === auth.currentUser?.uid ? myUntil : (usersMap[uid]?.premiumUntil || 0)) > Date.now();
const untilOf = uid => Math.max(Date.now(), usersMap[uid]?.premiumUntil || 0) + DAYS * 864e5;
const saveMe = u => { if(u) fb.setDoc(fb.doc(db, "users", u.uid), {name: whoIs(u), email: u.email || ""}, {merge: true}).catch(() => {}); };
const isProt = u => u.id === auth.currentUser?.uid || ADMIN_EMAILS.some(x => x.toLowerCase() === (u.email || "").toLowerCase());
async function delAccounts(ids){
  const refs = [];
  ids.forEach(id => {
    refs.push(fb.doc(db, "users", id));
    reqs.filter(r => r.uid === id).forEach(r => refs.push(fb.doc(db, "premiumRequests", r.id)));
    msgs.filter(m => m.uid === id).forEach(m => refs.push(fb.doc(db, "messages", m.id)));
  });
  for(let i = 0; i < refs.length; i += 400){
    const w = fb.writeBatch(db); refs.slice(i, i + 400).forEach(r => w.delete(r)); await w.commit();
  }
}
function startPrem(u){
  const col = n => fb.collection(db, n), mk = d => ({id: d.id, ...d.data()});
  unsubP.push(fb.onSnapshot(fb.doc(db, "users", u.uid), s => { myUntil = s.exists() ? (s.data().premiumUntil || 0) : 0; premChanged(); }, e => console.warn("premium :", e)));
  unsubP.push(fb.onSnapshot(fb.query(col("premiumRequests"), fb.where("uid", "==", u.uid)), s => { myReqs = s.docs.map(mk); premPaint(); }, e => console.warn("premium :", e)));
  if(admin){
    unsubP.push(fb.onSnapshot(col("users"), s => { usersMap = {}; s.docs.forEach(d => usersMap[d.id] = mk(d)); premPaint(); if($("#chatD").open) renderChat(); }, e => console.warn("users :", e)));
    unsubP.push(fb.onSnapshot(col("premiumRequests"), s => { reqs = s.docs.map(mk); premPaint(); }, e => console.warn("premium :", e)));
  }
  saveMe(u);
}
function stopPrem(){ unsubP.forEach(f => f()); unsubP = []; myUntil = 0; usersMap = {}; reqs = []; myReqs = []; premChanged(); }
function premChanged(){ lastP = premOn(); premPaint(); render(); syncSeries(); if($("#chatD").open) renderChat(); }
function premPaint(){
  $("#whoC").hidden = !(myUntil > Date.now());
  const n = admin ? reqs.filter(r => r.status === "pending").length : 0;
  $("#premBtn").innerHTML = CROWN + " Premium" + (n ? `<i class="bdg">${n}</i>` : "");
  const c = current && items.find(x => x.id === current.id);
  $("#premTog").innerHTML = CROWN + (c?.prem ? " Rendre gratuite" : " Rendre Premium");
  const l = sS ? epsOf(sS) : [];
  $("#sPrem").innerHTML = CROWN + (l.length && l.every(x => x.prem) ? " Tout en gratuit" : " Tout en Premium");
  if($("#premD").open) premDraw();
}
function premDraw(){
  const now = Date.now(), left = myUntil - now, d = Math.ceil(left / 864e5), pl = n => n > 1 ? "s" : "";
  let st;
  if(admin) st = `<div class="pst on">${CROWN} Admin : tu as accès à tous les contenus Premium.</div>`;
  else if(left > 0) st = `<div class="pst on">${CROWN} <b>Premium actif</b> jusqu'au ${fmtD(myUntil)} · ${d} jour${pl(d)} restant${pl(d)}</div>` + (d <= 5 ? `<p class="msg err">Ton abonnement se termine bientôt : renouvelle-le pour garder l'accès.</p>` : "");
  else st = `<div class="pst">${myUntil ? "Ton Premium a expiré le " + fmtD(myUntil) + ". Renouvelle-le pour retrouver l'accès." : "Tu n'es pas encore Premium."}</div>`;
  $("#premStat").innerHTML = st;
  $("#premPay").hidden = admin;
  $("#pHow").textContent = myUntil ? "Renouveler mon Premium" : "Comment devenir Premium";
  $("#pSend").textContent = myUntil ? "J'ai payé, renouveler" : "J'ai payé, envoyer ma demande";
  const mine = [...myReqs].sort((a, b) => ts(b) - ts(a)).slice(0, 4);
  $("#premMine").innerHTML = !admin && mine.length ? `<h3 class="s">Mes demandes</h3>` + mine.map(r => `<div class="prow"><span>${fmtT(ts(r))} · ${PRICE} Ar · réf. ${esc(r.ref)}</span><i class="tg ${r.status === "approved" ? "ok" : r.status === "denied" ? "no" : ""}">${r.status === "approved" ? "Validée" : r.status === "denied" ? "Refusée" : "En attente"}</i></div>`).join("") : "";
  $("#premAdmin").hidden = !admin;
  if(!admin) return;
  const pend = reqs.filter(r => r.status === "pending").sort((a, b) => ts(a) - ts(b));
  $("#aReq").innerHTML = `<h3 class="s">Demandes en attente (${pend.length})</h3>` + (pend.length ? pend.map(r => `<div class="prow"><div><b>${premOf(r.uid) ? CROWN + " " : ""}${esc(r.name || r.email || "Utilisateur")}</b><br><span>${esc(r.email || "")} · Tél. ${esc(r.phone)} · réf. ${esc(r.ref)} · ${fmtT(ts(r))}</span></div><div class="ad"><button data-pa="ok" data-r="${esc(r.id)}">✓ Valider +30 j</button><button data-pa="no" data-r="${esc(r.id)}">✕ Refuser</button></div></div>`).join("") : `<p class="msg">Aucune demande pour l'instant.</p>`);
  const q = $("#aSearch").value.trim().toLowerCase();
  const us = Object.values(usersMap).filter(u => !q || ((u.name || "") + " " + (u.email || "")).toLowerCase().includes(q))
    .sort((a, b) => (b.premiumUntil || 0) - (a.premiumUntil || 0) || (a.name || "").localeCompare(b.name || "", "fr")).slice(0, 60);
  $("#aList").innerHTML = us.length ? us.map(u => { const on = (u.premiumUntil || 0) > now;
    return `<div class="prow"><div><b>${on ? CROWN + " " : ""}${esc(u.name || u.email || "Utilisateur")}</b><br><span>${esc(u.email || "")} · ${on ? "actif jusqu'au " + fmtD(u.premiumUntil) : u.premiumUntil ? "expiré le " + fmtD(u.premiumUntil) : "gratuit"}</span></div><div class="ad"><button data-pu="add" data-u="${esc(u.id)}">+30 j</button>${u.premiumUntil ? `<button data-pu="rm" data-u="${esc(u.id)}">Retirer</button>` : ""}${isProt(u) ? "" : `<button data-pu="del" data-u="${esc(u.id)}" title="Supprimer ce compte" aria-label="Supprimer ce compte">🗑</button>`}</div></div>`; }).join("") : `<p class="msg">Aucun utilisateur trouvé.</p>`;
}
function openPrem(v){
  const l = $("#premLock"); l.hidden = !v; if(v) l.innerHTML = `${CROWN} « ${esc(v.serie || v.title)} » est réservé aux membres Premium.`;
  premDraw(); const d = $("#premD"); if(!d.open) d.showModal(); d.scrollTop = 0;
}
$("#premBtn").onclick = () => openPrem();
$("#closeM").onclick = () => $("#premD").close();
$("#aSearch").oninput = premDraw;
async function togPrem(l){
  if(!admin || !l.length) return;
  const v = !l.every(x => x.prem);
  await commit(l.map(x => [x, {prem: v}]));
}
$("#premForm").onsubmit = async e => {
  e.preventDefault();
  const msg = $("#pMsg"), u = auth.currentUser; if(!u) return;
  msg.className = "msg";
  if(myReqs.some(r => r.status === "pending")){ msg.className = "msg err"; msg.textContent = "Tu as déjà une demande en attente : l'admin va la vérifier."; return; }
  $("#pSend").disabled = true; msg.textContent = "Envoi…";
  try{
    await fb.addDoc(fb.collection(db, "premiumRequests"), {uid: u.uid, name: whoIs(u), email: u.email || "", phone: $("#pPhone").value.trim(), ref: $("#pRef").value.trim(), amount: PRICE, status: "pending", created: fb.serverTimestamp()});
    e.target.reset(); msg.textContent = "Demande envoyée ! L'admin vérifie ton paiement et active ton Premium.";
  }catch(err){
    msg.className = "msg err";
    msg.textContent = /permission/i.test(err.message || "") ? "Envoi refusé : l'admin doit mettre à jour les règles Firestore (collection premiumRequests)." : "Échec : " + (err.message || err);
  }
  $("#pSend").disabled = false;
};
$("#premD").addEventListener("click", async e => {
  const b = e.target.closest("button"); if(!b) return;
  try{
    if(b.dataset.copy !== undefined){
      const t = PAY_NUM.replace(/\s/g, "");
      try{ await navigator.clipboard.writeText(t); }catch{ prompt("Numéro :", t); }
      b.textContent = "Copié ✓"; setTimeout(() => b.textContent = "Copier", 1800);
    }else if(b.dataset.pa){
      const r = reqs.find(x => x.id === b.dataset.r); if(!r) return;
      b.disabled = true;
      if(b.dataset.pa === "ok"){
        const until = untilOf(r.uid), w = fb.writeBatch(db);
        w.set(fb.doc(db, "users", r.uid), {name: r.name || "", email: r.email || "", premiumUntil: until}, {merge: true});
        w.update(fb.doc(db, "premiumRequests", r.id), {status: "approved", until});
        await w.commit();
      }else await fb.updateDoc(fb.doc(db, "premiumRequests", r.id), {status: "denied"});
    }else if(b.dataset.pu){
      const id = b.dataset.u, ref = fb.doc(db, "users", id);
      if(b.dataset.pu === "add") await fb.setDoc(ref, {premiumUntil: untilOf(id)}, {merge: true});
      else if(b.dataset.pu === "del"){
        const u = usersMap[id]; if(!u || isProt(u)) return;
        if(confirm(`Supprimer le compte « ${u.name || u.email || "Utilisateur"} » ?\n\nSon profil, ses demandes Premium et ses messages seront effacés.`)) await delAccounts([id]);
      }
      else if(confirm("Retirer le Premium à cet utilisateur ?")) await fb.setDoc(ref, {premiumUntil: 0}, {merge: true});
    }else if(b.dataset.clean !== undefined){
      const dead = Object.values(usersMap).filter(u => !u.name && !u.email && !((u.premiumUntil || 0) > Date.now()) && !isProt(u));
      if(!dead.length){ alert("Aucun compte inutilisable trouvé (sans nom ni e-mail)."); return; }
      if(confirm(`${dead.length} compte(s) sans nom ni e-mail et sans Premium actif vont être supprimés. Continuer ?`)) await delAccounts(dead.map(u => u.id));
    }
  }catch(err){ alert("Échec : " + (err.message || err)); }
});
$("#premD").addEventListener("close", () => { $("#premLock").hidden = true; });
/* expiration : on vérifie régulièrement que l'abonnement est encore valide */
setInterval(() => {
  const p = premOn(); if(p === lastP) return;
  premChanged();
  if(!p && current && locked(current)) $("#closeP").click();
}, 15000);

let unsub = null;
const startData = () => {
  if(unsub) return;
  unsub = fb.onSnapshot(fb.query(fb.collection(db, "videos"), fb.orderBy("created", "desc")),
    snap => { items = snap.docs.map(d => ({id: d.id, ...d.data()})); [...sel].forEach(id => items.some(v => v.id === id) || sel.delete(id)); render(); syncSeries(); paint(); premPaint(); },
    () => { $("#main").innerHTML = `<div class="empty"><h2>Chargement impossible</h2><p>Vérifie les règles Firestore et ta connexion.</p></div>`; });
};
const stopData = () => { unsub?.(); unsub = null; items = []; sel.clear(); selMode = false; };
const whoIs = u => u ? (u.displayName || (u.email || "").split("@")[0]) : "";

fb.onAuthStateChanged(auth, u => {
  const on = !!u;
  admin = on && ADMIN_EMAILS.map(x => x.toLowerCase()).includes((u.email || "").toLowerCase());
  document.body.classList.toggle("locked", !on);
  $("#gLoad").hidden = true; $("#gBox").hidden = on; $("#gate").hidden = on;
  $("#adminBtn").hidden = !admin; $("#who").textContent = whoIs(u);
  if(on){ startData(); startChat(u); startPrem(u); }
  else { stopChat(); stopPrem(); document.querySelectorAll("dialog[open]").forEach(d => d.close()); stopData(); render(); }
  adminUI(); syncSeries(); paint();
});

/* inscription / connexion */
let gMode = "signup";
const gSet = m => {
  gMode = m;
  $("#gTabS").classList.toggle("on", m === "signup"); $("#gTabL").classList.toggle("on", m === "login");
  $("#gName").hidden = m !== "signup"; $("#gForgot").hidden = m !== "login";
  $("#gGo").textContent = m === "signup" ? "Créer mon compte" : "Se connecter";
  $("#gPw").autocomplete = m === "signup" ? "new-password" : "current-password";
  $("#gMsg").textContent = "";
};
$("#gTabS").onclick = () => gSet("signup");
$("#gTabL").onclick = () => gSet("login");
const AUTH_ERR = {
  "auth/email-already-in-use": "Cet e-mail est déjà inscrit : passe sur « Connexion ».",
  "auth/weak-password": "Mot de passe trop faible (6 caractères minimum).",
  "auth/invalid-email": "Adresse e-mail invalide.",
  "auth/invalid-credential": "E-mail ou mot de passe incorrect.",
  "auth/wrong-password": "E-mail ou mot de passe incorrect.",
  "auth/user-not-found": "E-mail ou mot de passe incorrect.",
  "auth/too-many-requests": "Trop d'essais, réessaie dans quelques minutes.",
  "auth/network-request-failed": "Pas de connexion Internet.",
  "auth/operation-not-allowed": "Inscription désactivée : active « E-mail/Mot de passe » dans Firebase > Authentication."
};
const authMsg = c => AUTH_ERR[c] || "Une erreur est survenue, réessaie.";
$("#gForm").onsubmit = async e => {
  e.preventDefault();
  const msg = $("#gMsg"), btn = $("#gGo"), em = $("#gEm").value.trim(), pw = $("#gPw").value, pseudo = $("#gNameIn").value.trim();
  msg.className = "msg"; msg.textContent = "Un instant…"; btn.disabled = true;
  try{
    if(gMode === "signup"){
      let c;
      try{ c = await fb.createUserWithEmailAndPassword(auth, em, pw); }
      catch(err){
        if(err.code !== "auth/email-already-in-use") throw err;
        /* e-mail déjà connu (ex. compte supprimé par l'admin) : on tente de rouvrir avec ce mot de passe */
        try{ c = await fb.signInWithEmailAndPassword(auth, em, pw); }
        catch{
          gSet("login"); msg.className = "msg err";
          msg.textContent = "Cet e-mail a déjà été utilisé avec un autre mot de passe. Clique sur « Mot de passe oublié » pour en choisir un nouveau et retrouver l'accès avec la même adresse.";
          btn.disabled = false; return;
        }
      }
      if(pseudo){ await fb.updateProfile(c.user, {displayName: pseudo}); $("#who").textContent = pseudo; }
      saveMe(c.user);
    }else await fb.signInWithEmailAndPassword(auth, em, pw);
    $("#gPw").value = ""; msg.textContent = "";
  }catch(err){ msg.className = "msg err"; msg.textContent = authMsg(err.code); }
  btn.disabled = false;
};
$("#gForgot").onclick = async () => {
  const msg = $("#gMsg"), em = $("#gEm").value.trim();
  if(!em){ msg.className = "msg err"; msg.textContent = "Entre d'abord ton e-mail ci-dessus."; return; }
  try{ await fb.sendPasswordResetEmail(auth, em); msg.className = "msg"; msg.textContent = "E-mail de réinitialisation envoyé."; }
  catch(err){ msg.className = "msg err"; msg.textContent = authMsg(err.code); }
};
$("#pseudoBtn").onclick = async () => {
  const u = auth.currentUser; if(!u || !admin) return;
  const v = prompt("Choisis ton pseudo (affiché dans le chat et la liste) :", whoIs(u)); if(v === null) return;
  const n = v.trim().slice(0, 30); if(!n) return;
  try{
    await fb.updateProfile(u, {displayName: n});
    $("#who").textContent = n;
    await fb.setDoc(fb.doc(db, "users", u.uid), {name: n, email: u.email || ""}, {merge: true});
    premPaint(); if($("#chatD").open) renderChat();
  }catch(err){ alert("Échec : " + (err.message || err)); }
};
$("#outUser").onclick = () => fb.signOut(auth);
$("#outBtn").onclick = () => fb.signOut(auth);

$("#upForm").onsubmit = async e => {
  e.preventDefault();
  const msg = $("#upMsg"), bar = $("#bar"), cover = $("#fCover").files[0];
  const files = [...$("#fVid").files].sort((a, b) => a.name.localeCompare(b.name, undefined, {numeric: true}));
  const N = files.length, fail = t => { msg.className = "msg err"; msg.textContent = t; };
  msg.className = "msg";
  if(!N) return;
  const big = files.filter(f => f.size > MAX_MB * 1048576);
  if(big.length) return fail(`Trop lourd (max ${MAX_MB} Mo par fichier) : ${big.map(f => f.name).join(", ")}`);
  if(N > 9) return fail("9 parties maximum à la fois.");
  const title = $("#fTitle").value.trim(), serie = $("#fSerie").value.trim() || (N > 1 ? title : "");
  const baseEp = Math.floor(Number($("#fEp").value)) || 1;
  const total = files.reduce((s, f) => s + f.size, 0), loaded = files.map(() => 0), t0 = Date.now();
  let done = 0, next = 0, wl = null;
  const show = () => {
    const L = loaded.reduce((a, b) => a + b, 0), sp = L / ((Date.now() - t0) / 1000 || 1), left = sp > 0 ? (total - L) / sp : 0;
    bar.value = L / total;
    msg.textContent = (N > 1 ? `${done}/${N} parties · ` : "") + `${Math.round(L / total * 100)} %` + (L ? ` · ${(sp / 1048576).toFixed(1)} Mo/s · ~${left > 90 ? Math.ceil(left / 60) + " min" : Math.ceil(left) + " s"}` : "");
  };
  $("#pubBtn").disabled = true; bar.hidden = false; bar.value = 0; msg.textContent = "Envoi… garde cet écran ouvert.";
  try{ wl = await navigator.wakeLock?.request("screen"); }catch{}
  try{
    const coverP = cover ? upload(cover, "image").then(r => r.secure_url) : Promise.resolve("");
    coverP.catch(() => {});
    const worker = async () => {
      while(next < N){
        const i = next++, file = files[i];
        const r = await upload(file, "video", l => { loaded[i] = l; show(); });
        loaded[i] = file.size;
        const coverUrl = await coverP;
        await fb.addDoc(fb.collection(db, "videos"), {
          title: N > 1 ? `${title} - Partie ${i + 1}` : title, desc: $("#fDesc").value.trim(), cat: $("#fCat").value, lang: $("#fLang").value,
          serie, saison: Number($("#fSaison").value) || 0, genres: gGet("fGen"), ep: N > 1 ? Number(`${baseEp}.${i + 1}`) : (Number($("#fEp").value) || 0),
          rel: $("#fRel").value, prem: $("#fAcc").value === "prem", url: r.secure_url, thumb: coverUrl || r.secure_url.replace(/\.\w+$/, ".jpg"), created: fb.serverTimestamp()
        });
        done++; show();
      }
    };
    await Promise.all([worker(), worker()]);
    msg.textContent = N > 1 ? `${N} parties publiées !` : "Publié !"; e.target.reset(); bar.hidden = true;
  }catch(err){ fail(err.message + (done ? ` (${done} partie(s) déjà publiée(s))` : "")); }
  try{ wl?.release(); }catch{}
  $("#pubBtn").disabled = false;
};

$("#delBtn").onclick = async () => {
  if(!current || !confirm(`Supprimer « ${current.title} » du site ?`)) return;
  await fb.deleteDoc(fb.doc(db, "videos", current.id)); $("#closeP").click();
};
document.addEventListener("change", e => { if(e.target.id === "sortSel"){ sortBy = e.target.value; render(); } });
fillG("fGen");
function openEdit(v){
  if(!v) return; editId = v.id;
  $("#eTitle").value = v.title || ""; $("#eDesc").value = v.desc || ""; $("#eCat").value = v.cat || "Autre"; $("#eLang").value = v.lang || "VF"; $("#eRel").value = v.rel || (isNew(v) ? "recent" : "ancien");
  $("#eSerie").value = v.serie || ""; $("#eSaison").value = v.saison || ""; $("#eEp").value = v.ep || ""; $("#eCover").value = "";
  $("#eAcc").value = v.prem ? "prem" : "free"; fillG("eGen", v.genres || []); $("#eMsg").textContent = ""; $("#editD").showModal();
}
$("#editBtn").onclick = () => current && openEdit(current);
$("#closeE").onclick = () => $("#editD").close();
$("#editForm").onsubmit = async e => {
  e.preventDefault();
  const msg = $("#eMsg"), btn = $("#eSave"), c = $("#eCover").files[0];
  msg.className = "msg"; msg.textContent = "Enregistrement…"; btn.disabled = true;
  try{
    const d = {title: $("#eTitle").value.trim(), desc: $("#eDesc").value.trim(), cat: $("#eCat").value, lang: $("#eLang").value,
      serie: $("#eSerie").value.trim(), saison: Number($("#eSaison").value) || 0, ep: Number($("#eEp").value) || 0, genres: gGet("eGen"), rel: $("#eRel").value, prem: $("#eAcc").value === "prem"};
    if(c) d.thumb = (await upload(c, "image")).secure_url;
    await fb.updateDoc(fb.doc(db, "videos", editId), d);
    const it = items.find(x => x.id === editId); if(it) Object.assign(it, d);
    $("#editD").close(); syncSeries(it ? gkey(it) : ""); if($("#player").open && current && current.id === editId) openPlayer(editId);
  }catch(err){ msg.className = "msg err"; msg.textContent = err.message || "Échec de l'enregistrement"; }
  btn.disabled = false;
};
function adminUI(){ ["delBtn","editBtn","gUp","gDown","sUp","sDown","premTog","sPrem","pseudoBtn"].forEach(i => $("#" + i).hidden = !admin); }

async function commit(up){
  try{
    for(let i = 0; i < up.length; i += 400){
      const b = fb.writeBatch(db);
      up.slice(i, i + 400).forEach(([v, d]) => b.update(fb.doc(db, "videos", v.id), d));
      await b.commit();
    }
  }catch(err){ alert("Échec : " + (err.message || err)); }
}
async function moveGroup(k, d){
  const ord = groupsOrdered(), i = ord.indexOf(k); if(i < 0) return;
  const cat = items.find(v => gkey(v) === k)?.cat;
  let j = i + d;
  while(j >= 0 && j < ord.length && items.find(v => gkey(v) === ord[j])?.cat !== cat) j += d;
  if(j < 0 || j >= ord.length) return;
  [ord[i], ord[j]] = [ord[j], ord[i]];
  const up = [];
  ord.forEach((g, n) => items.filter(v => gkey(v) === g).forEach(v => { if(v.sorder !== n) up.push([v, {sorder: n}]); }));
  sortBy = "ordre"; await commit(up); render();
}
async function moveEp(id, d){
  const l = epsOf(sS), i = l.findIndex(x => x.id === id), j = i + d;
  if(i < 0 || !l[j] || (l[j].saison || 0) !== (l[i].saison || 0)) return;
  [l[i], l[j]] = [l[j], l[i]];
  await commit(l.map((x, n) => [x, {order: n}]).filter(([x, u]) => x.order !== u.order));
}
async function setSeason(id, n){
  const l = epsOf(sS), m = l.find(x => x.id === id); if(!m) return;
  const sOf = x => x.id === id ? n : (x.saison || 0);
  const keys = [...new Set(l.map(sOf))].sort((a, b) => a - b);
  const nl = keys.flatMap(k => { const g = l.filter(x => sOf(x) === k && x.id !== id); return sOf(m) === k ? [...g, m] : g; });
  sN = n;
  await commit(nl.map((x, i) => [x, x.id === id ? {saison: n, order: i} : {order: i}]));
}

/* ====== Sélection & téléchargement multiple ====== */
function dlUrl(v){
  const fn = (v.title + (v.ep ? "_ep" + v.ep : "")).normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\W+/g, "_").replace(/^_+|_+$/g, "") || "video";
  return v.url.replace("/upload/", `/upload/fl_attachment:${fn}/`);
}
function paint(){
  document.querySelectorAll("#main .pc").forEach(el => {
    let on = false;
    if(el.dataset.g){ const v = items.find(x => x.id === el.dataset.g); on = !!v && eps(v).every(x => sel.has(x.id)); }
    else on = sel.has(el.dataset.id);
    el.classList.toggle("sel", on);
    const po = el.querySelector(".po"); let ck = po.querySelector(".ck");
    if((selMode || on) && !ck){ ck = document.createElement("u"); ck.className = "ck"; ck.textContent = "✓"; po.append(ck); }
    else if(!selMode && !on && ck) ck.remove();
  });
  document.querySelectorAll("#sEps input[data-sel]").forEach(i => { i.checked = sel.has(i.dataset.sel); });
  document.body.classList.toggle("selmode", selMode); document.body.classList.toggle("hassel", sel.size > 0);
  $("#selBtn").textContent = selMode ? "Terminer" : "Sélectionner";
  $("#selBtn").classList.toggle("on", selMode);
  const n = sel.size;
  ["#selBar", "#selBarS"].forEach(q => {
    const b = $(q); b.hidden = !n;
    b.innerHTML = n ? `<span class="n">${n} sélectionnée${n > 1 ? "s" : ""}</span><span class="acts"><button class="btn ghost" data-act="clear">Vider</button><button class="btn" data-act="dl" ${dling ? "disabled" : ""}>${dling || "⬇ Télécharger"}</button></span>` : "";
  });
  if(sS){ const cur = epsOf(sS).filter(x => (x.saison || 0) === sN); $("#sAll").textContent = cur.length && cur.every(x => sel.has(x.id)) ? "☐ Tout désélectionner" : "☑ Tout sélectionner"; }
}
function tog(id){ sel.has(id) ? sel.delete(id) : sel.add(id); paint(); }
function togGroup(id){
  const v = items.find(x => x.id === id); if(!v) return;
  const l = eps(v), all = l.every(x => sel.has(x.id));
  l.forEach(x => all ? sel.delete(x.id) : sel.add(x.id)); paint();
}
async function dlMany(){
  if(dling) return;
  const all = ordered(items.filter(v => sel.has(v.id))), l = all.filter(v => !locked(v));
  if(l.length < all.length) alert("Les vidéos Premium sont ignorées : elles sont réservées aux membres Premium.");
  if(!l.length) return;
  for(let i = 0; i < l.length; i++){
    dling = `Téléchargement ${i + 1}/${l.length}…`; paint();
    const a = document.createElement("a");
    a.href = dlUrl(l[i]); a.download = ""; a.style.display = "none";
    document.body.append(a); a.click(); a.remove();
    await new Promise(r => setTimeout(r, 1200));
  }
  dling = ""; paint();
}
function barAct(act){ if(act === "clear"){ sel.clear(); paint(); } else if(act === "dl") dlMany(); }
$("#selBtn").onclick = () => { selMode = !selMode; paint(); };
$("#sAll").onclick = () => {
  const cur = epsOf(sS).filter(x => (x.saison || 0) === sN), all = cur.every(x => sel.has(x.id));
  cur.forEach(x => all ? sel.delete(x.id) : sel.add(x.id)); paint();
};
paint();

function openGroup(id){
  const v = items.find(x => x.id === id); if(!v) return;
  if(isGrp(v)){ if($("#player").open) $("#player").close(); openSeries(gkey(v)); } else openPlayer(id);
}
function openSeries(name){
  const l = epsOf(name); if(!l.length) return;
  sS = name;
  const pg = l.find(inProg); sN = pg ? (pg.saison || 0) : (l[0].saison || 0);
  renderSeries();
  const dlg = $("#serieD");
  if(!dlg.open){ dlg.showModal(); history.pushState({s: 1}, ""); }
  dlg.scrollTop = 0;
}
function syncSeries(newName){
  const dlg = $("#serieD"); if(!dlg.open) return;
  if(epsOf(sS).length) renderSeries(); else { dlg.close(); if(newName) openSeries(newName); }
}
function renderSeries(){
  const l = epsOf(sS); if(!l.length) return;
  const ss = [...new Set(l.map(x => x.saison || 0))];
  if(!ss.includes(sN)) sN = ss[0];
  const r = l[0], genres = [...new Set(l.flatMap(x => x.genres || []))];
  const lab = n => n ? "Saison " + n : "Épisodes";
  $("#sPoster").src = img(r, 300, 450);
  $("#sTags").innerHTML = (r.lang ? `<span>${esc(r.lang)}</span>` : "") + `<span class="c">${esc(r.cat)}</span>` + genres.map(g => `<span class="c">${esc(g)}</span>`).join("");
  $("#sTitle").textContent = r.serie || r.title;
  $("#sDesc").textContent = (l.find(x => x.desc) || {}).desc || "";
  $("#sPlay").textContent = l.some(inProg) ? "▶ Reprendre" : "▶ Lecture";
  $("#sSeasons").innerHTML = ss.length > 1 ? ss.map(n => `<button class="ep ${n === sN ? "on" : ""}" data-sn="${n}">${lab(n)}</button>`).join("") : "";
  const cur = l.filter(x => (x.saison || 0) === sN), maxS = Math.max(0, ...ss);
  const opts = x => Array.from({length: maxS + 2}, (_, n) => `<option value="${n}" ${n === (x.saison || 0) ? "selected" : ""}>${n ? "Saison " + n : "Sans saison"}</option>`).join("");
  $("#sEps").innerHTML = `<h3 class="s">${lab(sN)} · ${cur.length} ép.</h3>` + cur.map((x, i) => `<div class="er"><label class="sc" title="Sélectionner"><input type="checkbox" data-sel="${x.id}" ${sel.has(x.id) ? "checked" : ""}></label><button class="th" data-id="${x.id}" aria-label="Lire"><img loading="lazy" alt="" src="${img(x,320,180)}">${pct(x) ? `<i style="width:${pct(x)}%"></i>` : ""}</button><button class="tx" data-id="${x.id}"><b>${x.prem ? CROWN + " " : ""}${esc(x.title)}</b><span>${esc((x.ep ? "Ép. " + x.ep : "") + (x.ep && x.lang ? " · " : "") + (x.lang || ""))}</span></button>${admin ? `<div class="ad"><button data-mv="-1" data-mid="${x.id}" ${i === 0 ? "disabled" : ""} title="Monter">▲</button><button data-mv="1" data-mid="${x.id}" ${i === cur.length - 1 ? "disabled" : ""} title="Descendre">▼</button><select data-ss="${x.id}" title="Changer de saison">${opts(x)}</select><button data-pt="${x.id}" title="Premium / gratuit" style="opacity:${x.prem ? 1 : .4}">${CROWN}</button><button data-ed="${x.id}" title="Modifier">✎</button></div>` : ""}</div>`).join("");
  adminUI(); paint();
}
$("#serieD").addEventListener("click", e => {
  const t = e.target.closest("button"); if(!t) return;
  if(t.dataset.sn !== undefined){ sN = Number(t.dataset.sn); renderSeries(); }
  else if(t.dataset.mv) moveEp(t.dataset.mid, Number(t.dataset.mv));
  else if(t.dataset.ed) openEdit(items.find(x => x.id === t.dataset.ed));
  else if(t.dataset.pt){ const x = items.find(y => y.id === t.dataset.pt); if(x) togPrem([x]); }
});
$("#serieD").addEventListener("change", e => {
  const t = e.target.dataset;
  if(t?.ss) setSeason(t.ss, Number(e.target.value));
  else if(t?.sel){ e.target.checked ? sel.add(t.sel) : sel.delete(t.sel); paint(); }
});
$("#serieD").addEventListener("close", () => { sS = null; render(); });
$("#closeS").onclick = () => history.state?.s ? history.back() : $("#serieD").close();
$("#sPlay").onclick = () => { const l = epsOf(sS), f = l.find(inProg) || l.find(x => (x.saison || 0) === sN) || l[0]; if(f) openPlayer(f.id); };
$("#sPrem").onclick = () => sS && togPrem(epsOf(sS));
$("#premTog").onclick = () => { if(!current) return; togPrem([items.find(x => x.id === current.id) || current]); };
$("#sUp").onclick = () => sS && moveGroup(sS, -1);
$("#sDown").onclick = () => sS && moveGroup(sS, 1);
$("#gUp").onclick = () => current && moveGroup(gkey(current), -1);
$("#gDown").onclick = () => current && moveGroup(gkey(current), 1);

/* ====== Lecteur vidéo AnimPIX ====== */
const PL = $("#pl"), V = $("#vid");
const IC = {
  play: '<svg viewBox="0 0 24 24"><path d="M7 4.5v15l13-7.5z"/></svg>',
  pause: '<svg viewBox="0 0 24 24"><path d="M6 4h4v16H6zM14 4h4v16h-4z"/></svg>',
  back: '<svg viewBox="0 0 24 24"><path d="M12 5V2L7 6.5 12 11V8a6 6 0 1 1-6 6H4a8 8 0 1 0 8-9z"/></svg>',
  fwd: '<svg viewBox="0 0 24 24"><path d="M12 5V2l5 4.5L12 11V8a6 6 0 1 0 6 6h2a8 8 0 1 1-8-9z"/></svg>',
  next: '<svg viewBox="0 0 24 24"><path d="M6 5v14l9-7zM17 5h2v14h-2z"/></svg>',
  vol: '<svg viewBox="0 0 24 24"><path d="M3 9v6h4l5 4V5L7 9zM16 8.5a5 5 0 0 1 0 7l-1.4-1.4a3 3 0 0 0 0-4.2zM18.8 5.7a9 9 0 0 1 0 12.6l-1.4-1.4a7 7 0 0 0 0-9.8z"/></svg>',
  mute: '<svg viewBox="0 0 24 24"><path d="M3 9v6h4l5 4V5L7 9zM15 9.4l1.4-1.4 2.1 2.1 2.1-2.1L22 9.4 19.9 11.5 22 13.6 20.6 15l-2.1-2.1L16.4 15 15 13.6l2.1-2.1z"/></svg>',
  fs: '<svg viewBox="0 0 24 24"><path d="M4 4h6v2H6v4H4zM14 4h6v6h-2V6h-4zM4 14h2v4h4v2H4zM18 14h2v6h-6v-2h4z"/></svg>',
  fsx: '<svg viewBox="0 0 24 24"><path d="M8 4h2v6H4V8h4zM14 4h2v4h4v2h-6zM4 14h6v6H8v-4H4zM14 14h6v2h-4v4h-2z"/></svg>'
};
const fm = t => { if(!isFinite(t) || t < 0) t = 0; t = Math.floor(t); const h = Math.floor(t / 3600), m = Math.floor(t % 3600 / 60), x = String(t % 60).padStart(2, "0"); return h ? `${h}:${String(m).padStart(2, "0")}:${x}` : `${m}:${x}`; };
const setIc = () => {
  $("#plPlay").innerHTML = V.paused ? IC.play : IC.pause; $("#plBig").innerHTML = IC.play;
  $("#plMute").innerHTML = V.muted || V.volume === 0 ? IC.mute : IC.vol;
  $("#plFs").innerHTML = (document.fullscreenElement || document.webkitFullscreenElement) === PL ? IC.fsx : IC.fs;
};
const pip = $("#plPip"); pip.innerHTML = '<svg viewBox="0 0 24 24"><path d="M3 5h18v14H3zm2 2v10h14V7zm7 4h6v4h-6z"/></svg>'; pip.hidden = !document.pictureInPictureEnabled;
pip.onclick = () => document.pictureInPictureElement ? document.exitPictureInPicture() : V.requestPictureInPicture().catch(() => {});
$("#plBack").innerHTML = IC.back; $("#plFwd").innerHTML = IC.fwd; $("#plNext").innerHTML = IC.next;
const plUpd = () => {
  const d = V.duration || 0, t = V.currentTime || 0, p = d ? t / d * 100 : 0;
  $("#plFill").style.width = p + "%"; $("#plKnob").style.left = p + "%";
  $("#plTime").textContent = fm(t) + " / " + fm(d);
  const b = V.buffered; $("#plBuf").style.width = d && b.length ? Math.min(100, b.end(b.length - 1) / d * 100) + "%" : "0";
  $("#plSeek").setAttribute("aria-valuenow", Math.round(p));
};
const plToggle = () => V.paused ? V.play().catch(() => {}) : V.pause();
const plSeekBy = n => { if(V.duration) V.currentTime = Math.max(0, Math.min(V.duration, V.currentTime + n)); };
let idleT = null;
const plShow = () => { PL.classList.remove("idle"); clearTimeout(idleT); if(!V.paused) idleT = setTimeout(() => PL.classList.add("idle"), 2800); };
function plFx(side, txt){ const f = $("#plFx"); f.style.left = side === "l" ? "14%" : side === "r" ? "calc(86% - 68px)" : "calc(50% - 34px)"; f.textContent = txt; f.classList.remove("go"); void f.offsetWidth; f.classList.add("go"); }
function plSync(){
  const e = current ? eps(current) : [], nx = e[e.findIndex(x => x.id === current?.id) + 1];
  $("#plNext").hidden = !nx; $("#plQ").textContent = plQ === "auto" ? "Auto" : plQ + "p"; $("#plErr").hidden = true; $("#plSpin").hidden = false; plUpd(); setIc(); plShow();
}
["play", "pause", "volumechange"].forEach(ev => V.addEventListener(ev, () => { PL.classList.toggle("paused", V.paused); setIc(); plShow(); }));
["timeupdate", "durationchange", "progress", "loadedmetadata"].forEach(ev => V.addEventListener(ev, plUpd));
["waiting", "loadstart", "seeking"].forEach(ev => V.addEventListener(ev, () => { if(V.getAttribute("src")) $("#plSpin").hidden = false; }));
["playing", "canplay", "seeked", "loadeddata"].forEach(ev => V.addEventListener(ev, () => { $("#plSpin").hidden = true; }));
const QS = ["auto", "360", "480", "720", "1080"];
function qUrl(v){ return plQ === "auto" ? v.url : v.url.replace("/upload/", `/upload/c_scale,h_${plQ},vc_h264,ac_aac,f_mp4,q_auto:good/`); }
$("#plQ").onclick = () => {
  plQ = QS[(QS.indexOf(plQ) + 1) % QS.length]; LS.set("apx_q", plQ);
  $("#plQ").textContent = plQ === "auto" ? "Auto" : plQ + "p";
  if(!current) return;
  const t = V.currentTime, was = !V.paused;
  plTry = 0; $("#plErr").hidden = true; $("#plSpin").hidden = false; V.src = qUrl(current);
  V.addEventListener("loadedmetadata", () => { V.currentTime = t; if(was) V.play().catch(() => {}); }, {once: true});
  plFx("c", $("#plQ").textContent);
};
const plFail = () => {
  if(!current || !V.getAttribute("src")) return;
  if(plTry === 0){
    /* faux MP4 (HEVC, MKV renommé…) : on demande une version H.264/AAC convertie par Cloudinary */
    plTry = 1; const t = V.currentTime;
    V.src = current.url.replace("/upload/", "/upload/f_mp4,vc_h264,ac_aac,q_auto/");
    V.addEventListener("loadedmetadata", () => { if(t > 1) V.currentTime = t; }, {once: true});
    $("#plSpin").hidden = false; V.play().catch(() => {}); return;
  }
  $("#plSpin").hidden = true; $("#plErr").hidden = false;
};
V.addEventListener("error", plFail);
V.addEventListener("loadedmetadata", () => { if(V.duration && V.videoWidth === 0) plFail(); });
$("#plRetry").onclick = () => { if(!current) return; plTry = 0; $("#plErr").hidden = true; $("#plSpin").hidden = false; V.src = current.url; V.play().catch(() => {}); };
V.addEventListener("ended", () => { PL.classList.add("paused"); setIc(); });
/* tap : 1 = lecture/pause, double-tap gauche/droite = ∓10 s, double-tap centre = plein écran */
let tapT = null, lastTap = 0;
V.addEventListener("click", e => {
  plShow();
  const r = V.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, now = Date.now();
  if(now - lastTap < 300){
    clearTimeout(tapT); lastTap = 0;
    if(x < .33){ plSeekBy(-10); plFx("l", "−10 s"); } else if(x > .67){ plSeekBy(10); plFx("r", "+10 s"); } else plFs();
  }else{ lastTap = now; tapT = setTimeout(plToggle, 280); }
});
$("#plBig").onclick = plToggle; $("#plPlay").onclick = plToggle;
$("#plBack").onclick = () => { plSeekBy(-10); plFx("l", "−10 s"); };
$("#plFwd").onclick = () => { plSeekBy(10); plFx("r", "+10 s"); };
$("#plNext").onclick = () => { const e = eps(current), nx = e[e.findIndex(x => x.id === current.id) + 1]; if(nx) openPlayer(nx.id); };
$("#plMute").onclick = () => { V.muted = !V.muted; if(!V.muted && V.volume === 0) V.volume = .6; $("#plVol").value = V.muted ? 0 : V.volume; };
$("#plVol").oninput = e => { V.volume = Number(e.target.value); V.muted = V.volume === 0; };
const SP = [.5, .75, 1, 1.25, 1.5, 2];
$("#plSpd").onclick = () => { const n = SP[(SP.indexOf(V.playbackRate) + 1) % SP.length]; V.playbackRate = n; $("#plSpd").textContent = n + "×"; };
function plFs(){
  const fs = document.fullscreenElement || document.webkitFullscreenElement;
  if(fs){ (document.exitFullscreen || document.webkitExitFullscreen).call(document); return; }
  const rq = PL.requestFullscreen || PL.webkitRequestFullscreen;
  if(rq) rq.call(PL); else if(V.webkitEnterFullscreen) V.webkitEnterFullscreen();
}
$("#plFs").onclick = plFs;
["fullscreenchange", "webkitfullscreenchange"].forEach(ev => document.addEventListener(ev, setIc));
/* barre de progression : glisser / cliquer */
const sk = $("#plSeek"); let drag = false;
const ratio = e => { const r = sk.getBoundingClientRect(); return Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)); };
sk.addEventListener("pointerdown", e => { drag = true; sk.classList.add("drag"); sk.setPointerCapture(e.pointerId); if(V.duration) V.currentTime = ratio(e) * V.duration; });
sk.addEventListener("pointermove", e => {
  const q = ratio(e), tip = $("#plTip"); tip.textContent = fm(q * (V.duration || 0)); tip.style.left = q * 100 + "%";
  if(drag && V.duration) V.currentTime = q * V.duration;
});
["pointerup", "pointercancel"].forEach(ev => sk.addEventListener(ev, () => { drag = false; sk.classList.remove("drag"); }));
sk.addEventListener("keydown", e => { if(e.key === "ArrowLeft"){ plSeekBy(-5); e.preventDefault(); e.stopPropagation(); } else if(e.key === "ArrowRight"){ plSeekBy(5); e.preventDefault(); e.stopPropagation(); } });
["pointermove", "pointerdown", "touchstart"].forEach(ev => PL.addEventListener(ev, plShow, {passive: true}));
/* raccourcis clavier */
document.addEventListener("keydown", e => {
  if(!$("#player").open || /INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName) && document.activeElement.id !== "plVol" || e.ctrlKey || e.metaKey || e.altKey) return;
  const k = e.key.toLowerCase(); let used = true;
  if(k === " " || k === "k") plToggle();
  else if(k === "arrowleft"){ plSeekBy(-5); plFx("l", "−5 s"); } else if(k === "arrowright"){ plSeekBy(5); plFx("r", "+5 s"); }
  else if(k === "j"){ plSeekBy(-10); plFx("l", "−10 s"); } else if(k === "l"){ plSeekBy(10); plFx("r", "+10 s"); }
  else if(k === "arrowup"){ V.volume = Math.min(1, V.volume + .1); V.muted = false; $("#plVol").value = V.volume; }
  else if(k === "arrowdown"){ V.volume = Math.max(0, V.volume - .1); $("#plVol").value = V.volume; }
  else if(k === "m") $("#plMute").click(); else if(k === "f") plFs(); else if(k === "n" && !$("#plNext").hidden) $("#plNext").click();
  else used = false;
  if(used){ e.preventDefault(); plShow(); }
});
$("#player").addEventListener("close", () => { if(document.fullscreenElement || document.webkitFullscreenElement) (document.exitFullscreen || document.webkitExitFullscreen).call(document); PL.classList.add("paused"); setIc(); });
setIc();
render();
{ const b = $("#bgv"); b.muted = true; b.controls = false;
  const go = () => { if(!matchMedia("(prefers-reduced-motion: reduce)").matches) b.play().catch(() => {}); };
  go(); b.addEventListener("loadeddata", go);
  ["touchstart","pointerdown","click","scroll"].forEach(ev => addEventListener(ev, go, {once: true, passive: true}));
  if(matchMedia("(prefers-reduced-motion: reduce)").matches) b.pause(); }
document.addEventListener("visibilitychange", () => { const b = $("#bgv"); document.hidden ? b.pause() : !matchMedia("(prefers-reduced-motion: reduce)").matches && b.play().catch(() => {}); });

/* ====== MODE APP : manifeste + barre du bas ====== */
(() => {
  const ICON192 = "data:image/png;base64,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";
  const ICON512 = "data:image/png;base64,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";
  const MASK512 = "data:image/png;base64,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";
  try {
    const man = {
      name: "AnimPIX", short_name: "AnimPIX", lang: "fr",
      start_url: location.href.split("#")[0], scope: location.href.split("#")[0].replace(/[^/]*$/, ""),
      display: "standalone", orientation: "portrait", background_color: "#07050a", theme_color: "#07050a",
      icons: [
        {src: ICON192, sizes: "192x192", type: "image/png", purpose: "any"},
        {src: ICON512, sizes: "512x512", type: "image/png", purpose: "any"},
        {src: MASK512, sizes: "512x512", type: "image/png", purpose: "maskable"}
      ]
    };
    const l = document.createElement("link"); l.rel = "manifest";
    l.href = URL.createObjectURL(new Blob([JSON.stringify(man)], {type: "application/manifest+json"}));
    document.head.appendChild(l);
  } catch(e) {}
  const std = matchMedia("(display-mode: standalone)").matches || navigator.standalone;
  document.documentElement.classList.toggle("app", !!std);
  const bar = document.getElementById("appbar");
  if(bar) bar.addEventListener("click", e => {
    const a = e.target.closest("a"); if(!a) return;
    if(a.classList.contains("on")) { e.preventDefault(); scrollTo({top: 0, behavior: "smooth"}); }
  });
})();

/* ====== EFFETS : pétales + tilt ====== */
;/* FX : pétales de sakura + tilt 3D des affiches */
(()=>{
  if(matchMedia("(prefers-reduced-motion:reduce)").matches) return;
  const c=document.getElementById("fxc"), x=c.getContext("2d"); let W,H,P=[];
  const rs=()=>{W=c.width=innerWidth;H=c.height=innerHeight};rs();addEventListener("resize",rs);
  const N=Math.min(28,Math.floor(innerWidth/38));
  const mk=(top)=>({x:Math.random()*W,y:top?-20:Math.random()*H,s:4+Math.random()*7,v:.35+Math.random()*.8,w:Math.random()*6.28,r:Math.random()*6.28,vr:(Math.random()-.5)*.03,a:.25+Math.random()*.4});
  for(let i=0;i<N;i++)P.push(mk());
  (function f(){
    x.clearRect(0,0,W,H);
    for(const p of P){
      p.y+=p.v;p.w+=.015;p.x+=Math.sin(p.w)*.6+.25;p.r+=p.vr;
      if(p.y>H+20||p.x>W+20){Object.assign(p,mk(1));}
      x.save();x.translate(p.x,p.y);x.rotate(p.r);x.globalAlpha=p.a;
      const g=x.createRadialGradient(0,0,0,0,0,p.s);g.addColorStop(0,"#ffd3dc");g.addColorStop(1,"#ff4d6d");
      x.fillStyle=g;x.beginPath();x.moveTo(0,-p.s);x.bezierCurveTo(p.s,-p.s*.6,p.s*.8,p.s*.7,0,p.s);x.bezierCurveTo(-p.s*.8,p.s*.7,-p.s,-p.s*.6,0,-p.s);x.fill();x.restore();
    }
    requestAnimationFrame(f);
  })();
  if(!matchMedia("(hover:hover)").matches) return;
  document.addEventListener("pointermove",e=>{
    const t=e.target.closest&&e.target.closest(".pc"); if(!t) return;
    const r=t.getBoundingClientRect(),px=(e.clientX-r.left)/r.width-.5,py=(e.clientY-r.top)/r.height-.5;
    t.style.setProperty("--ry",(px*14).toFixed(1)+"deg");t.style.setProperty("--rx",(-py*14).toFixed(1)+"deg");
  });
  document.addEventListener("pointerout",e=>{const t=e.target.closest&&e.target.closest(".pc");if(t){t.style.removeProperty("--rx");t.style.removeProperty("--ry")}});
})();
