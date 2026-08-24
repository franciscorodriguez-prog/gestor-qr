export async function onRequestGet(context) {
  const { env } = context;
  const list = await env.QR_LINKS.list();
  const items = [];

  for (const key of list.keys) {
    const raw = await env.QR_LINKS.get(key.name);
    const data = JSON.parse(raw);
    items.push({ id: key.name, nombre: data.nombre, link: data.link, fecha: data.fecha });
  }

  items.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

  return new Response(JSON.stringify(items), {
    headers: { 'Content-Type': 'application/json' }
  });
}
