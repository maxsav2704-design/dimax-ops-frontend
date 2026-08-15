export function createDownloadResponse(
  body: string,
  contentType: string,
  init: ResponseInit = {},
): Response {
  const headers = new Headers(init.headers);
  headers.set("content-type", contentType);

  // Node 20 Response cannot consume jsdom's Blob because it has no stream().
  return new Response(body, { ...init, headers });
}
