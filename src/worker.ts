/* The only Worker code on this site: video byte ranges.

   Static assets answer a Range request with the whole file and a plain 200, and
   iPhones refuse to play a clip that way: Safari asks for the first bytes and
   gives up without a 206. scripts/add-video-worker.mjs adds this file to the
   deploy config after the build, with run_worker_first limited to *.mp4, so
   every other request is served as a plain asset and never reaches this code. */

type Assets = { fetch: (request: Request) => Promise<Response> };

async function video(request: Request, assets: Assets): Promise<Response> {
  const res = await assets.fetch(request);
  if (!res.ok) return res;
  const range = request.headers.get('range');
  const match = range ? /^bytes=(\d*)-(\d*)$/.exec(range) : null;
  if (!match || (match[1] === '' && match[2] === '')) {
    const whole = new Response(res.body, res);
    whole.headers.set('Accept-Ranges', 'bytes');
    return whole;
  }
  const buf = await res.arrayBuffer();
  const size = buf.byteLength;
  const start = match[1] === '' ? Math.max(0, size - Number(match[2])) : Number(match[1]);
  const end = match[1] !== '' && match[2] !== '' ? Math.min(Number(match[2]), size - 1) : size - 1;
  if (start >= size || start > end) {
    return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${size}` } });
  }
  const headers = new Headers(res.headers);
  headers.set('Accept-Ranges', 'bytes');
  headers.set('Content-Range', `bytes ${start}-${end}/${size}`);
  headers.set('Content-Length', String(end - start + 1));
  headers.delete('etag');
  return new Response(buf.slice(start, end + 1), { status: 206, headers });
}

export default {
  fetch(request: Request, env: { ASSETS: Assets }): Promise<Response> {
    return new URL(request.url).pathname.endsWith('.mp4')
      ? video(request, env.ASSETS)
      : env.ASSETS.fetch(request);
  },
};
