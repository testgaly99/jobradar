// Reine Filterlogik (ohne DOM), damit sie in Node getestet werden kann.
function filtere(stellen, unternehmen, f) {
  const firma = Object.fromEntries(unternehmen.map((u) => [u.name, u]));
  const ort = f.ort.trim().toLowerCase();
  const q = f.stichwort.trim().toLowerCase();
  return stellen
    .filter((s) => {
      const u = firma[s.unternehmen] || { kategorie: [] };
      return (
        (!f.groessen.length || f.groessen.includes(u.groesse_klasse)) &&
        (!f.kategorien.length || u.kategorie.some((k) => f.kategorien.includes(k))) &&
        (!ort || (s.ort || "").toLowerCase().includes(ort)) &&
        (!f.remote || s.remote) &&
        (!q || (s.titel + " " + (s.beschreibung_kurz || "")).toLowerCase().includes(q)) &&
        (!f.neuSeit || s.erstmals_gesehen >= f.neuSeit)
      );
    })
    .sort((a, b) => b.erstmals_gesehen.localeCompare(a.erstmals_gesehen));
}
if (typeof module !== "undefined") module.exports = { filtere };

if (typeof document !== "undefined") {
  const $ = (id) => document.getElementById(id);
  const TAG = 86400000;
  let daten;

  function el(tag, text, cls) {
    const e = document.createElement(tag);
    if (text) e.textContent = text;
    if (cls) e.className = cls;
    return e;
  }
  const tage = (iso) => Date.parse(iso + "T00:00:00Z") / TAG;

  function checkboxen(box, name, werte) {
    for (const w of werte) {
      const l = el("label", "", "check");
      const i = el("input");
      i.type = "checkbox";
      i.name = name;
      i.value = w;
      l.append(i, " " + w);
      box.append(l);
    }
  }
  const gewaehlt = (name) => [...document.querySelectorAll(`input[name=${name}]:checked`)].map((i) => i.value);

  function lies() {
    return {
      groessen: gewaehlt("groesse"), kategorien: gewaehlt("kategorie"),
      ort: $("ort").value, remote: $("remote").checked, stichwort: $("q").value, neuSeit: $("neu").value,
    };
  }

  function speichereUrl(f) {
    const p = new URLSearchParams();
    f.groessen.forEach((g) => p.append("groesse", g));
    f.kategorien.forEach((k) => p.append("kategorie", k));
    if (f.ort) p.set("ort", f.ort);
    if (f.remote) p.set("remote", "1");
    if (f.stichwort) p.set("q", f.stichwort);
    if (f.neuSeit) p.set("neu", f.neuSeit);
    const s = p.toString();
    history.replaceState(null, "", s ? "?" + s : location.pathname);
  }

  function stelleUrlWieder() {
    const p = new URLSearchParams(location.search);
    const gruppe = (name) => p.getAll(name);
    document.querySelectorAll("input[name=groesse],input[name=kategorie]").forEach((i) => {
      i.checked = gruppe(i.name).includes(i.value);
    });
    $("ort").value = p.get("ort") || "";
    $("remote").checked = p.get("remote") === "1";
    $("q").value = p.get("q") || "";
    $("neu").value = p.get("neu") || "";
  }

  function karte(s, u) {
    const li = el("li", "", "karte");
    const h = el("h3");
    const a = el("a", s.titel);
    if (/^https?:\/\//i.test(s.url || "")) {
      a.href = s.url;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
    }
    h.append(a);
    if (tage(daten.stand) - tage(s.erstmals_gesehen) <= 2) h.append(" ", el("span", "neu", "badge"));
    const meta = [s.unternehmen, s.ort].filter(Boolean).join(" · ");
    li.append(h, el("p", meta, "meta"));
    const tags = el("p", "", "tags");
    if (s.remote) tags.append(el("span", "Remote", "tag remote"));
    if (u) tags.append(el("span", u.groesse_klasse, "tag"), ...u.kategorie.map((k) => el("span", k, "tag")));
    li.append(tags, el("p", "Erstmals gesehen: " + s.erstmals_gesehen, "meta"));
    if (s.beschreibung_kurz) li.append(el("p", s.beschreibung_kurz));
    return li;
  }

  function zeige() {
    const f = lies();
    speichereUrl(f);
    const treffer = filtere(daten.stellen, daten.unternehmen, f);
    const firma = Object.fromEntries(daten.unternehmen.map((u) => [u.name, u]));
    $("anzahl").textContent = treffer.length + (treffer.length === 1 ? " Stelle" : " Stellen");
    $("liste").replaceChildren(...treffer.map((s) => karte(s, firma[s.unternehmen])));
  }

  fetch("daten.json") // relativ, weil GitHub Pages unter /jobradar/ liegt
    .then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then((d) => {
      daten = d;
      daten.stellen = d.stellen;
      $("stand").textContent = "Stand: " + d.stand;
      if ((Date.now() / TAG) - tage(d.stand) > 2) {
        $("warnung").textContent = `Letzter Lauf am ${d.stand} – automatischen Abruf prüfen (siehe README)`;
        $("warnung").hidden = false;
      }
      const grossen = ["<50", "50–249", "250–999", "1.000+"];
      checkboxen($("groessen"), "groesse", grossen);
      checkboxen($("kategorien"), "kategorie", [...new Set(d.unternehmen.filter((u) => d.stellen.some((s) => s.unternehmen === u.name)).flatMap((u) => u.kategorie))].sort());
      stelleUrlWieder();
      $("filter").addEventListener("input", zeige);
      zeige();
    })
    .catch(() => { $("warnung").textContent = "daten.json konnte nicht geladen werden."; $("warnung").hidden = false; });
}

// Ab 800 px immer offen; auf dem Handy eingeklappt starten.
if (typeof document !== "undefined" && matchMedia("(max-width: 799px)").matches) document.getElementById("filterbox").open = false;
