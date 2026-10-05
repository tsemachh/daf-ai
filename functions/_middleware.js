// Old host → custom domain. daf-ai.pages.dev is blocked on some platforms (e.g. LinkedIn), so page
// views move to https://daf.tsemach.dev with a permanent redirect. /admin and /api stay reachable on the
// old host (the nightly job calls them there until its allow-list and Access app include the new domain).
// Preview deployments (<hash>.daf-ai.pages.dev) are not redirected.
const OLD = "daf-ai.pages.dev";
const NEW = "https://daf.tsemach.dev";

export async function onRequest({ request, next }) {
  const url = new URL(request.url);
  if (url.hostname === OLD && (request.method === "GET" || request.method === "HEAD")
      && !url.pathname.startsWith("/admin") && !url.pathname.startsWith("/api/")) {
    return Response.redirect(NEW + url.pathname + url.search, 301);
  }
  return next();
}
