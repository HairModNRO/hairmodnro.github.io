// Nap thong bao (API) va ban phat hanh (GitHub). Du lieu ngoai chi chen bang textContent (an toan XSS).
"use strict";

(function () {
  const cfg = window.HAIRMOD || {};

  function el(tag, cls, text) {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function showState(box, message, isError, retry) {
    const state = el("div", isError ? "state error" : "state", message);
    if (retry) {
      const again = el("button", "btn btn-ghost", "Thử lại");
      again.type = "button";
      again.addEventListener("click", retry);
      state.appendChild(document.createElement("br"));
      state.appendChild(again);
    }
    box.replaceChildren(state);
  }

  function dateText(value) {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? "" : d.toLocaleString("vi-VN", { dateStyle: "medium", timeStyle: "short" });
  }

  async function getJson(url) {
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) throw new Error("HTTP " + res.status);
    return res.json();
  }

  async function loadNotices(box) {
    showState(box, "Đang tải thông báo…", false);
    try {
      if (!cfg.api) throw new Error("chưa cấu hình API");
      const list = await getJson(cfg.api + "/api/public/notices");
      if (!Array.isArray(list) || list.length === 0) {
        showState(box, "Chưa có thông báo nào.", false);
        return;
      }
      const items = list.map((n) => {
        const card = el("article", "notice");
        card.appendChild(el("h3", "", String(n.title || "")));
        const time = el("time", "", dateText(n.created));
        time.dateTime = String(n.created || "");
        card.appendChild(time);
        card.appendChild(el("p", "", String(n.body || "")));
        return card;
      });
      box.replaceChildren(...items);
    } catch (err) {
      showState(box, "Chưa tải được thông báo.", true, () => loadNotices(box));
    }
  }

  function sizeText(bytes) {
    if (!Number.isFinite(bytes)) return "";
    if (bytes >= 1048576) return (bytes / 1048576).toFixed(1) + " MB";
    return Math.max(1, Math.round(bytes / 1024)) + " KB";
  }

  async function loadRelease(box) {
    showState(box, "Đang tải danh sách tệp…", false);
    try {
      const rel = await getJson("https://api.github.com/repos/" + cfg.releasesRepo + "/releases/latest");
      const assets = Array.isArray(rel.assets) ? rel.assets : [];
      const head = el("p", "lead", (rel.name || rel.tag_name || "Bản mới nhất") + " — " + dateText(rel.published_at));
      if (assets.length === 0) {
        box.replaceChildren(head, el("div", "state", "Bản phát hành này chưa có tệp tải."));
        return;
      }
      const rows = assets.map((a) => {
        const row = el("div", "file");
        const info = el("div");
        info.appendChild(el("strong", "", String(a.name || "")));
        info.appendChild(document.createElement("br"));
        info.appendChild(el("span", "", sizeText(a.size) + " · " + dateText(a.updated_at)));
        const link = el("a", "btn btn-primary", "Tải về");
        const url = String(a.browser_download_url || "");
        if (url.startsWith("https://github.com/")) link.href = url;
        link.rel = "noopener";
        row.append(info, link);
        return row;
      });
      box.replaceChildren(head, ...rows);
    } catch (err) {
      showState(box, "Chưa có bản phát hành hoặc GitHub đang giới hạn, thử lại sau.", true, () => loadRelease(box));
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    const notices = document.getElementById("notices");
    if (notices) loadNotices(notices);
    const release = document.getElementById("release");
    if (release) loadRelease(release);
    const year = document.getElementById("year");
    if (year) year.textContent = String(new Date().getFullYear());
  });
})();
