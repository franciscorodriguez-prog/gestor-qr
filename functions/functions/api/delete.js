export async function onRequestPost(context) {
  const { request, env } = context;
  const body = await request.json();

  await env.QR_LINKS.delete(body.id);

  return new Response(JSON.stringify({ ok: true }), {
    headers: { 'Content-Type': 'application/json' }
  });
}
