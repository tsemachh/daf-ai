// Cloudflare Pages Function: POST /api/feedback
// Stores reader feedback as a GitHub issue in the content repo (label: feedback).
// Env (Pages → Settings → Variables and Secrets):
//   GITHUB_TOKEN  (secret)  fine-grained PAT, repo tsemachh/daf-ai, permission Issues: read & write
//   GITHUB_REPO   (optional) default "tsemachh/daf-ai"

const KINDS = { fix: "תיקון בתוכן", missing: "חסר בדף", feature: "הצעה לשיפור" };
const MAX = 2000;

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}

function clean(s, n) {
  return String(s || "").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").trim().slice(0, n);
}

export async function onRequestPost({ request, env }) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: "bad_json" }, 400);
  }
  if (body.website) return json({ ok: true, id: 0 }); // honeypot: silently accept bots

  const kind = KINDS[body.kind] ? body.kind : "fix";
  const text = clean(body.text, MAX);
  const page = clean(body.page, 120).replace(/[^a-z0-9/_-]/gi, "");
  const section = clean(body.section, 40).replace(/[^a-z0-9_-]/gi, "");
  const sectionTitle = clean(body.sectionTitle, 160);
  const name = clean(body.name, 80);
  if (text.length < 5) return json({ ok: false, error: "too_short" }, 400);
  if (!/^\/?[a-z]+\/\d+\/?$/.test(page) && page !== "" && page !== "/") return json({ ok: false, error: "bad_page" }, 400);

  if (!env.GITHUB_TOKEN) return json({ ok: false, error: "not_configured" }, 503);
  const repo = env.GITHUB_REPO || "tsemachh/daf-ai";
  const key = page.replace(/^\/|\/$/g, "").replace("/", "") || "home";
  const origin = new URL(request.url).origin;
  const url = `${origin}/${page.replace(/^\//, "")}${section ? "#" + key + "-" + section : ""}`;

  const title = `[${kind}] ${key}${section ? " · " + section : ""}: ${text.split("\n")[0].slice(0, 70)}`;
  const issueBody = [
    `**סוג:** ${KINDS[kind]}`,
    `**דף:** ${url}`,
    section ? `**סוגיה:** ${section}${sectionTitle ? " — " + sectionTitle : ""}` : null,
    name ? `**שם:** ${name}` : null,
    "",
    "> " + text.replace(/\n/g, "\n> "),
    "",
    "<!-- feedback-meta " + JSON.stringify({ kind, page: key, section, ts: new Date().toISOString() }) + " -->",
  ].filter((x) => x !== null).join("\n");

  const r = await fetch(`https://api.github.com/repos/${repo}/issues`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${env.GITHUB_TOKEN}`,
      accept: "application/vnd.github+json",
      "user-agent": "daf-ai-feedback",
      "x-github-api-version": "2022-11-28",
    },
    body: JSON.stringify({ title, body: issueBody, labels: ["feedback", `kind:${kind}`, `daf:${key}`] }),
  });
  if (!r.ok) return json({ ok: false, error: "store_failed" }, 502);
  const issue = await r.json();
  return json({ ok: true, id: issue.number });
}

export function onRequest() {
  return json({ ok: false, error: "method" }, 405);
}
