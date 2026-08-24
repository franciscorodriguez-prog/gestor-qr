export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const id = url.searchParams.get('id');

  // Sin id -> mandamos al panel de administración
  if (!id) {
    return Response.redirect(url.origin + '/admin', 302);
  }

  const raw = await env.QR_LINKS.get(id);
  if (!raw) {
    return new Response('QR no encontrado o sin destino configurado.', { status: 404 });
  }

  const data = JSON.parse(raw);
  return Response.redirect(data.link, 302); // redirect HTTP real
}
