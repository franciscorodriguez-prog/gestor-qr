export async function onRequestPost(context) {
  const { request, env } = context;
  const body = await request.json();

  const raw = await env.QR_LINKS.get(body.id);
  if (!raw) {
    return new Response(JSON.stringify({ ok: false, error: 'No encontrado' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const data = JSON.parse(raw);
  data.nombre = body.nombre;
  data.link = body.link;
  await env.QR_LINKS.put(body.id, JSON.stringify(data));

  return new Response(JSON.stringify({ ok: true }), {
    headers: { 'Content-Type': 'application/json' }
  });
}
