// Static lab, plus byte-range replies for video: iPhones refuse to play clips without them.
export default {
  async fetch(request, env) {
    const res = await env.ASSETS.fetch(request);
    const range = request.headers.get('range');
    const m = range && /bytes=(\d*)-(\d*)/.exec(range);
    if (!m || !res.ok || !(res.headers.get('content-type') || '').startsWith('video/')) {
      if (!(res.headers.get('content-type') || '').startsWith('video/')) return res;
      const whole = new Response(res.body, res);
      whole.headers.set('Accept-Ranges', 'bytes');
      return whole;
    }
    const buf = await res.arrayBuffer();
    const size = buf.byteLength;
    let start = m[1] === '' ? Math.max(0, size - Number(m[2])) : Number(m[1]);
    let end = m[1] !== '' && m[2] !== '' ? Math.min(Number(m[2]), size - 1) : size - 1;
    if (start >= size || start > end) return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${size}` } });
    const headers = new Headers(res.headers);
    headers.set('Accept-Ranges', 'bytes');
    headers.set('Content-Range', `bytes ${start}-${end}/${size}`);
    headers.set('Content-Length', String(end - start + 1));
    headers.delete('etag');
    return new Response(buf.slice(start, end + 1), { status: 206, headers });
  },
};
