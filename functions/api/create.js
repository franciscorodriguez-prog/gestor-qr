export async function onRequestPost(context) {
  const { request, env } = context;
  const body = await request.json();

  if (!body.nombre || !body.link) {
    return new Response(JSON.stringify({ ok: false, error: 'Faltan datos' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const id = crypto.randomUUID().substring(0, 8);
  await env.QR_LINKS.put(id, JSON.stringify({
    nombre: body.nombre,
    link: body.link,
    fecha: new Date().toISOString()
  }));

  return new Response(JSON.stringify({ ok: true, id }), {
    headers: { 'Content-Type': 'application/json' }
  });
}
