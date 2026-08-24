export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    const id = url.searchParams.get('id');

    // 1) Redirección real del QR (esto es lo que va DENTRO del código QR)
    if (path === '/' && id) {
      const raw = await env.QR_LINKS.get(id);
      if (!raw) {
        return new Response('QR no encontrado o sin destino configurado.', { status: 404 });
      }
      const data = JSON.parse(raw);
      return Response.redirect(data.link, 302); // redirect HTTP real, sin pasar por dominios de Google
    }

    // 2) Panel de administración
    if (path === '/admin') {
      return new Response(ADMIN_HTML, {
        headers: { 'Content-Type': 'text/html;charset=UTF-8' }
      });
    }

    // 3) API usada por el panel
    if (path === '/api/list' && request.method === 'GET') {
      const list = await env.QR_LINKS.list();
      const items = [];
      for (const key of list.keys) {
        const raw = await env.QR_LINKS.get(key.name);
        const data = JSON.parse(raw);
        items.push({ id: key.name, nombre: data.nombre, link: data.link, fecha: data.fecha });
      }
      items.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
      return json(items);
    }

    if (path === '/api/create' && request.method === 'POST') {
      const body = await request.json();
      if (!body.nombre || !body.link) return json({ ok: false, error: 'Faltan datos' }, 400);
      const id = crypto.randomUUID().substring(0, 8);
      await env.QR_LINKS.put(id, JSON.stringify({
        nombre: body.nombre,
        link: body.link,
        fecha: new Date().toISOString()
      }));
      return json({ ok: true, id });
    }

    if (path === '/api/update' && request.method === 'POST') {
      const body = await request.json();
      const raw = await env.QR_LINKS.get(body.id);
      if (!raw) return json({ ok: false, error: 'No encontrado' }, 404);
      const data = JSON.parse(raw);
      data.nombre = body.nombre;
      data.link = body.link;
      await env.QR_LINKS.put(body.id, JSON.stringify(data));
      return json({ ok: true });
    }

    if (path === '/api/delete' && request.method === 'POST') {
      const body = await request.json();
      await env.QR_LINKS.delete(body.id);
      return json({ ok: true });
    }

    return new Response('Not found', { status: 404 });
  }
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

const ADMIN_HTML = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Gestor QR</title>
<style>
  body { font-family: Arial, sans-serif; max-width: 900px; margin: 30px auto; padding: 0 20px; color: #222; }
  h1 { font-size: 22px; margin-bottom: 20px; }
  .form-box { background: #f5f5f5; padding: 20px; border-radius: 8px; margin-bottom: 30px; }
  .form-box input { width: 100%; padding: 8px; margin: 6px 0 14px 0; box-sizing: border-box; border: 1px solid #ccc; border-radius: 4px; }
  .form-box label { font-weight: bold; font-size: 13px; }
  button { cursor: pointer; border: none; border-radius: 4px; padding: 8px 16px; font-size: 14px; }
  .btn-crear { background: #1a73e8; color: white; }
  .btn-editar { background: #f0ad4e; color: white; margin-right: 6px; }
  .btn-eliminar { background: #d9534f; color: white; }
  .btn-guardar { background: #5cb85c; color: white; margin-right: 6px; }
  .btn-cancelar { background: #999; color: white; }
  table { width: 100%; border-collapse: collapse; }
  th, td { text-align: left; padding: 10px; border-bottom: 1px solid #eee; vertical-align: middle; font-size: 14px; }
  img.qr-thumb { width: 60px; height: 60px; }
  .link-cell { max-width: 220px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .edit-input { width: 100%; padding: 4px; box-sizing: border-box; }
  #status { font-size: 13px; color: #666; margin-top: 8px; }
</style>
</head>
<body>

<h1>Gestor QR</h1>

<div class="form-box">
  <label>Nombre de referencia</label>
  <input type="text" id="nombreInput" placeholder="Ej: Cartelera entrada">
  <label>Link de destino</label>
  <input type="text" id="linkInput" placeholder="https://...">
  <button class="btn-crear" onclick="crearQR()">Crear QR</button>
  <div id="status"></div>
</div>

<table>
  <thead>
    <tr><th>QR</th><th>Nombre</th><th>Link</th><th>Creado</th><th>Acciones</th></tr>
  </thead>
  <tbody id="tablaBody"></tbody>
</table>

<script>
  const BASE_URL = window.location.origin;

  function qrUrlFor(id) {
    return 'https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=' + encodeURIComponent(BASE_URL + '/?id=' + id);
  }

  async function cargarLista() {
    const res = await fetch('/api/list');
    const qrs = await res.json();
    renderTabla(qrs);
  }

  function renderTabla(qrs) {
    const body = document.getElementById('tablaBody');
    body.innerHTML = '';
    qrs.forEach(qr => {
      const row = document.createElement('tr');
      row.id = 'row-' + qr.id;
      const fecha = qr.fecha ? new Date(qr.fecha).toLocaleDateString('es-AR') : '';
      row.innerHTML =
        '<td><img class="qr-thumb" src="' + qrUrlFor(qr.id) + '"></td>' +
        '<td class="nombre-cell">' + qr.nombre + '</td>' +
        '<td class="link-cell">' + qr.link + '</td>' +
        '<td>' + fecha + '</td>' +
        '<td>' +
          '<a href="' + qrUrlFor(qr.id) + '" target="_blank">Descargar</a><br><br>' +
          '<button class="btn-editar" onclick="mostrarEdicion(\\'' + qr.id + '\\')">Editar</button>' +
          '<button class="btn-eliminar" onclick="eliminarQR(\\'' + qr.id + '\\')">Eliminar</button>' +
        '</td>';
      row.dataset.nombre = qr.nombre;
      row.dataset.link = qr.link;
      body.appendChild(row);
    });
  }

  async function crearQR() {
    const nombre = document.getElementById('nombreInput').value.trim();
    const link = document.getElementById('linkInput').value.trim();
    if (!nombre || !link) {
      document.getElementById('status').innerText = 'Completá nombre y link.';
      return;
    }
    document.getElementById('status').innerText = 'Creando...';
    const res = await fetch('/api/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre, link })
    });
    const data = await res.json();
    if (data.ok) {
      document.getElementById('nombreInput').value = '';
      document.getElementById('linkInput').value = '';
      document.getElementById('status').innerText = 'QR creado.';
      cargarLista();
    } else {
      document.getElementById('status').innerText = 'Error: ' + data.error;
    }
  }

  function mostrarEdicion(id) {
    const row = document.getElementById('row-' + id);
    const nombreActual = row.dataset.nombre;
    const linkActual = row.dataset.link;
    row.querySelector('.nombre-cell').innerHTML = '<input class="edit-input" id="edit-nombre-' + id + '" value="' + nombreActual + '">';
    row.querySelector('.link-cell').innerHTML = '<input class="edit-input" id="edit-link-' + id + '" value="' + linkActual + '">';
    row.children[4].innerHTML =
      '<button class="btn-guardar" onclick="guardarEdicion(\\'' + id + '\\')">Guardar</button>' +
      '<button class="btn-cancelar" onclick="cargarLista()">Cancelar</button>';
  }

  async function guardarEdicion(id) {
    const nombre = document.getElementById('edit-nombre-' + id).value.trim();
    const link = document.getElementById('edit-link-' + id).value.trim();
    if (!nombre || !link) { alert('Nombre y link no pueden estar vacíos.'); return; }
    await fetch('/api/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, nombre, link })
    });
    cargarLista();
  }

  async function eliminarQR(id) {
    if (!confirm('¿Eliminar este QR? Si ya lo imprimiste, dejará de funcionar.')) return;
    await fetch('/api/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id })
    });
    cargarLista();
  }

  cargarLista();
</script>
</body>
</html>`;
