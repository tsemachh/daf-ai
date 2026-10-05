// Reader-note updates by email, via Resend (https://resend.com). Env: RESEND_API_KEY (secret).
// Sent once, when a note reaches a final status and its author asked to be notified; the address is
// then cleared from the database.
export const FINAL = { fixed: "תוקן בדף", feature: "נרשם כהצעה לשיפור", rejected: "נבדק — לא נדרש שינוי" };
const SITE = "https://daf.tsemach.dev";
const FROM = "דפי חזרה ולימוד <daf@tsemach.dev>";

const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

export function noteLink(n) {
  const [slug, daf] = String(n.page).split("/");
  return `${SITE}/${n.page}/${n.section ? `#${slug}${daf}-${n.section}` : ""}`;
}

export async function sendNoteUpdate(env, n) {
  if (!env.RESEND_API_KEY || !n.email || !FINAL[n.status]) return { sent: false };
  const link = noteLink(n);
  const where = n.section_title ? ` — ${n.section_title}` : "";
  const html = `<div dir="rtl" style="font-family:Arial,sans-serif;font-size:16px;line-height:1.6;color:#1C2230">
<p>שלום,</p>
<p>תודה על ההערה ששלחת על <b>${esc(n.page)}</b>${esc(where)}.</p>
<p><b>סטטוס:</b> ${FINAL[n.status]}</p>
${n.reply ? `<p><b>תגובה:</b> ${esc(n.reply)}</p>` : ""}
<p style="color:#5B6272;font-size:14px">ההערה שלך: ״${esc(String(n.text).slice(0, 300))}״</p>
<p><a href="${link}">לצפייה בדף</a></p>
<p style="color:#5B6272;font-size:13px">דפי חזרה ולימוד · daf.tsemach.dev<br>המייל נשלח פעם אחת בלבד, כפי שביקשת, וכתובתך נמחקה מהמערכת.</p>
</div>`;
  const text = `תודה על ההערה על ${n.page}${where}.\nסטטוס: ${FINAL[n.status]}\n${n.reply ? "תגובה: " + n.reply + "\n" : ""}${link}`;
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${env.RESEND_API_KEY}`, "content-type": "application/json" },
    body: JSON.stringify({ from: FROM, to: [n.email], subject: `ההערה שלך על ${n.page} — ${FINAL[n.status]}`, html, text }),
  }).catch(() => null);
  return { sent: !!(r && r.ok), status: r ? r.status : 0 };
}
