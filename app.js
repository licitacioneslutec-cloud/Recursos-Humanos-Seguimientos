import { store, auth, DEMO } from './store.js';
import { GOOGLE_CLIENT_ID } from './config.js';

/* ================= Utilidades ================= */
const $ = s => document.querySelector(s);
const h = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pad = n => String(n).padStart(2, '0');
const iso = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const D = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const hoy = () => iso(new Date());
const dias = (a, b) => Math.round((D(b) - D(a)) / 864e5); // b − a
const sumarDias = (s, n) => { const d = D(s); d.setDate(d.getDate() + n); return iso(d); };
const fmtF = s => (s ? h(s.split('-').reverse().join('/')) : '');
const peso = n => (n ? new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n) : '');
const nombre = e => `${e.nombres || ''} ${e.apellidos || ''}`.trim();
const norm = s => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\*/g, '').trim();
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const correoOk = s => !s || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);

function toast(msg, ms = 3500) {
  const t = $('#toast'); t.textContent = msg; t.hidden = false;
  clearTimeout(toast.t); toast.t = setTimeout(() => (t.hidden = true), ms);
}

/* ================= Catálogos fijos ================= */
const ESTADOS = ['activo', 'vacaciones', 'incapacitado', 'suspendido', 'retirado'];
const TIPOS_CTR = ['Término fijo', 'Término indefinido', 'Obra o labor', 'Aprendizaje', 'Prestación de servicios'];
const TIPOS_NOV = ['Cita médica', 'Incapacidad', 'Ausentismo', 'Permiso', 'Vacaciones', 'Licencia', 'Accidente laboral', 'Llamado de atención', 'Otro'];
const AUSENTISMO = new Set(['Cita médica', 'Incapacidad', 'Ausentismo', 'Permiso', 'Licencia', 'Accidente laboral']);
const TIPOS_CERT = ['Examen médico de ingreso', 'Examen médico periódico', 'Examen médico de egreso', 'Curso de alturas', 'Coordinador de alturas', 'Matrícula CONTE / RETIE', 'Licencia de conducción', 'Otro'];
const TRACK = ['estado', 'cargo', 'sede', 'area', 'salario', 'correoEmpresarial', 'fechaRetiro'];

// [clave, etiqueta, tipo, obligatorio]
const CAMPOS = [
  ['cedula', 'Cédula', 'text', 1], ['nombres', 'Nombres', 'text', 1], ['apellidos', 'Apellidos', 'text', 1],
  ['fechaNacimiento', 'Fecha nacimiento', 'date'], ['telefono', 'Teléfono', 'tel'], ['direccion', 'Dirección'],
  ['correoPersonal', 'Correo personal', 'email'], ['correoEmpresarial', 'Correo empresarial', 'email'],
  ['sede', 'Sede', 'sedes', 1], ['area', 'Área', 'areas', 1], ['cargo', 'Cargo', 'cargos', 1], ['estado', 'Estado', 'estado'],
  ['fechaIngreso', 'Fecha ingreso', 'date', 1], ['fechaRetiro', 'Fecha retiro', 'date'], ['motivoRetiro', 'Motivo retiro'],
  ['salario', 'Salario', 'number'], ['eps', 'EPS'], ['afp', 'Fondo pensiones'], ['arl', 'ARL'], ['caja', 'Caja compensación'],
  ['cesantias', 'Fondo cesantías'], ['banco', 'Banco'], ['cuenta', 'Cuenta bancaria'],
  ['tallaCamisa', 'Talla camisa'], ['tallaPantalon', 'Talla pantalón'], ['tallaCalzado', 'Talla calzado'],
  ['contactoEmergencia', 'Contacto emergencia'], ['telEmergencia', 'Teléfono emergencia'],
  ['vacPrevias', 'Días de vacaciones ya disfrutados (antes del sistema)', 'number'], ['observaciones', 'Observaciones', 'textarea'],
];
// Columnas extra de la plantilla para el contrato vigente
const CTR_COLS = [['tipoContrato', 'Tipo contrato'], ['inicioContrato', 'Inicio contrato'], ['finContrato', 'Fin contrato'], ['prorroga', 'N° prórroga']];

// Registros que cuelgan de un colaborador: [clave, etiqueta, tipo|lista, obligatorio]
const REG = {
  contratos: { titulo: 'Contratos', campos: [['tipo', 'Tipo', TIPOS_CTR, 1], ['inicio', 'Inicio', 'date', 1], ['fin', 'Fin (vacío si es indefinido)', 'date'], ['prorroga', 'N° prórroga (0 = inicial)', 'number'], ['cargo', 'Cargo', 'text'], ['salario', 'Salario', 'number'], ['observacion', 'Observación / otrosí']] },
  novedades: { titulo: 'Novedades', campos: [['tipo', 'Tipo', TIPOS_NOV, 1], ['desde', 'Desde', 'date', 1], ['hasta', 'Hasta', 'date'], ['dias', 'Días', 'number'], ['observacion', 'Observación']] },
  certificaciones: { titulo: 'Certificaciones', campos: [['tipo', 'Tipo', TIPOS_CERT, 1], ['entidad', 'Entidad / IPS'], ['expedicion', 'Expedición', 'date'], ['vencimiento', 'Vencimiento', 'date'], ['observacion', 'Observación']] },
  entregas: { titulo: 'Dotación y EPP', campos: [['tipo', 'Tipo', ['Dotación', 'EPP'], 1], ['fecha', 'Fecha', 'date', 1], ['items', 'Elementos entregados'], ['observacion', 'Observación']] },
};

const CFG0 = {
  empresa: 'LUTEC', nit: '', ciudad: 'Bogotá D.C.', firmante: '', cargoFirmante: 'Director(a) de Talento Humano',
  correoRRHH: '', smmlv: 1423500, sabadoHabil: false, driveRootId: '', logo: '', logoRatio: 0.4,
  sedes: [], areas: [], cargos: [],
  checkIngreso: ['Hoja de vida y documentos', 'Examen médico de ingreso', 'Afiliación EPS', 'Afiliación pensión', 'Afiliación ARL', 'Afiliación caja de compensación', 'Contrato firmado', 'Entrega de dotación / EPP', 'Inducción', 'Correo empresarial creado'],
  checkRetiro: ['Carta de renuncia / terminación', 'Paz y salvo', 'Examen médico de egreso', 'Liquidación', 'Devolución de dotación y equipos', 'Desactivar correo empresarial', 'Retiro de afiliaciones'],
};

/* ================= Estado ================= */
const S = {
  user: null, cfg: { ...CFG0 }, emps: [], contratos: [], certificaciones: [], novedades: [], entregas: [],
  byCed: new Map(), ctrAct: new Map(),
  vista: 'tablero', ficha: null, filtro: { q: '', sede: '', area: '', estado: 'vigentes' },
  vacNov: null, imp: null, anio: new Date().getFullYear(), charts: [], driveToken: null,
};

function indexar() {
  S.emps.sort((a, b) => nombre(a).localeCompare(nombre(b)));
  S.byCed = new Map(S.emps.map(e => [e.cedula, e]));
  S.ctrAct = new Map();
  [...S.contratos].sort((a, b) => a.inicio.localeCompare(b.inicio)).forEach(c => S.ctrAct.set(c.cedula, c));
}

async function cargar() {
  const desde = `${new Date().getFullYear() - 1}-01-01`;
  // ponytail: novedades se cargan desde el 1 de enero del año anterior; una incapacidad que empezó antes no cuenta en indicadores.
  const [emps, ctr, cert, nov, ent, cfg] = await Promise.all([
    store.all('empleados'), store.all('contratos'), store.all('certificaciones'),
    store.where('novedades', 'desde', '>=', desde), store.where('entregas', 'fecha', '>=', periodoDotacion().inicio),
    store.get('config', 'general'),
  ]);
  Object.assign(S, { emps, contratos: ctr, certificaciones: cert, novedades: nov, entregas: ent, cfg: { ...CFG0, ...cfg }, vacNov: null });
  indexar();
}

/* ================= Reglas de negocio ================= */
function semaforo(d) { return d < 0 ? 'venc' : d <= 15 ? 'rojo' : d <= 30 ? 'amar' : 'verde'; }

// Contratos vigentes y certificaciones (la última de cada tipo) que vencen en ≤ 60 días o ya vencieron.
function vencimientos() {
  const out = [];
  for (const [ced, c] of S.ctrAct) {
    const e = S.byCed.get(ced);
    if (e && e.estado !== 'retirado' && c.fin) out.push({ clase: 'Contrato', e, detalle: c.tipo + (+c.prorroga ? ` · prórroga ${c.prorroga}` : ''), fecha: c.fin });
  }
  const ult = new Map();
  for (const c of S.certificaciones) {
    if (!c.vencimiento) continue;
    const k = c.cedula + '|' + c.tipo;
    if (!ult.has(k) || ult.get(k).vencimiento < c.vencimiento) ult.set(k, c);
  }
  for (const c of ult.values()) {
    const e = S.byCed.get(c.cedula);
    if (e && e.estado !== 'retirado') out.push({ clase: 'Certificación', e, detalle: c.tipo, fecha: c.vencimiento });
  }
  const t = hoy();
  return out.map(x => ({ ...x, d: dias(t, x.fecha) })).filter(x => x.d <= 60).sort((a, b) => a.d - b.d);
}

// Art. 46 CST: el término fijo inferior a un año se prorroga hasta 3 veces por igual periodo; después, mínimo 1 año.
const limiteProrrogas = c => c && c.tipo === 'Término fijo' && c.fin && dias(c.inicio, c.fin) < 364 && +c.prorroga >= 3;

function d360(a, b) {
  const [y1, m1, d1] = a.split('-').map(Number), [y2, m2, d2] = b.split('-').map(Number);
  return (y2 - y1) * 360 + (m2 - m1) * 30 + (Math.min(d2, 30) - Math.min(d1, 30)) + 1;
}
// 15 días hábiles por año trabajado (año comercial de 360 días).
function vacaciones(e, disfrutadosSistema) {
  if (!e.fechaIngreso) return null;
  const fin = e.fechaRetiro && e.fechaRetiro < hoy() ? e.fechaRetiro : hoy();
  const causados = Math.max(0, d360(e.fechaIngreso, fin)) * 15 / 360;
  const disfrutados = (+e.vacPrevias || 0) + disfrutadosSistema;
  return { causados, disfrutados, saldo: causados - disfrutados };
}

// ponytail: no descuenta festivos; RRHH ajusta el campo "Días" a mano cuando aplique.
function contarDias(tipo, desde, hasta) {
  if (!desde) return '';
  hasta ||= desde;
  if (hasta < desde) return '';
  if (tipo !== 'Vacaciones') return dias(desde, hasta) + 1;
  let n = 0;
  for (let d = D(desde); d <= D(hasta); d.setDate(d.getDate() + 1)) {
    const w = d.getDay();
    if (w !== 0 && (w !== 6 || S.cfg.sabadoHabil)) n++;
  }
  return n;
}

// Dotación: 3 entregas al año (30 abr, 31 ago, 20 dic) a quien gana ≤ 2 SMMLV y lleva más de 3 meses.
function periodoDotacion() {
  const d = new Date(), y = d.getFullYear(), m = d.getMonth();
  const [a, b, lim] = m < 4 ? [1, 4, '30 de abril'] : m < 8 ? [5, 8, '31 de agosto'] : [9, 12, '20 de diciembre'];
  return { inicio: `${y}-${pad(a)}-01`, nombre: `${MESES[a - 1]}–${MESES[b - 1]} ${y}`, limite: lim };
}
function dotacionPendiente() {
  const tope = 2 * (+S.cfg.smmlv || 0);
  const con = new Set(S.entregas.filter(x => x.tipo === 'Dotación').map(x => x.cedula));
  const hace3m = sumarDias(hoy(), -90);
  return S.emps.filter(e => e.estado !== 'retirado' && +e.salario && +e.salario <= tope && e.fechaIngreso && e.fechaIngreso <= hace3m && !con.has(e.cedula));
}

const pct = (e, k) => { const it = S.cfg[k] || []; return it.length ? Math.round(it.filter(i => e[k]?.[i]).length * 100 / it.length) : 100; };
function checklistsPendientes() {
  const lim = sumarDias(hoy(), -180);
  return [
    ...S.emps.filter(e => e.estado !== 'retirado' && e.fechaIngreso >= lim && pct(e, 'checkIngreso') < 100).map(e => ({ e, k: 'Ingreso', p: pct(e, 'checkIngreso') })),
    ...S.emps.filter(e => e.estado === 'retirado' && e.fechaRetiro >= lim && pct(e, 'checkRetiro') < 100).map(e => ({ e, k: 'Retiro', p: pct(e, 'checkRetiro') })),
  ];
}

async function historial(cedula, campo, antes, despues) {
  const r = { cedula, campo, antes: String(antes ?? ''), despues: String(despues ?? ''), fecha: new Date().toISOString(), usuario: S.user.email };
  r.id = await store.add('historial', r);
  S.ficha?.historial?.push(r);
}

/* ================= Google Drive ================= */
const DRIVE = 'https://www.googleapis.com/drive/v3/files';
function conectarDrive() {
  if (GOOGLE_CLIENT_ID.startsWith('PEGAR')) return toast('Falta el ID de cliente de Google en config.js.');
  if (!window.google?.accounts?.oauth2) return toast('Google todavía está cargando, intenta de nuevo en un segundo.');
  google.accounts.oauth2.initTokenClient({
    client_id: GOOGLE_CLIENT_ID,
    // Alcance completo para que las 3 personas de RRHH trabajen sobre la misma carpeta compartida.
    scope: 'https://www.googleapis.com/auth/drive',
    callback: r => {
      if (r.error) return toast('No se pudo conectar Google Drive.');
      S.driveToken = r.access_token; toast('Google Drive conectado.'); pintarNav(); render();
    },
  }).requestAccessToken();
}
async function gfetch(url, opt = {}) {
  const r = await fetch(url, { ...opt, headers: { Authorization: 'Bearer ' + S.driveToken, ...opt.headers } });
  if (r.status === 401) { S.driveToken = null; pintarNav(); throw new Error('La sesión de Drive expiró, vuelve a conectarla.'); }
  if (!r.ok) throw new Error('Drive respondió ' + r.status);
  return r.json();
}
async function crearCarpeta(name, parent) {
  const body = { name, mimeType: 'application/vnd.google-apps.folder', ...(parent && { parents: [parent] }) };
  return (await gfetch(DRIVE + '?supportsAllDrives=true&fields=id', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })).id;
}
async function carpetaDe(e) {
  if (e.driveFolderId) return e.driveFolderId;
  if (!S.cfg.driveRootId) {
    S.cfg.driveRootId = await crearCarpeta('Talento Humano LUTEC');
    await store.put('config', 'general', { driveRootId: S.cfg.driveRootId });
  }
  e.driveFolderId = await crearCarpeta(`${e.cedula} - ${nombre(e)}`, S.cfg.driveRootId);
  await store.put('empleados', e.cedula, { driveFolderId: e.driveFolderId });
  return e.driveFolderId;
}
async function subirArchivo(file, e, prefijo) {
  const parent = await carpetaDe(e);
  const fd = new FormData();
  fd.append('metadata', new Blob([JSON.stringify({ name: `${prefijo} - ${file.name}`, parents: [parent] })], { type: 'application/json' }));
  fd.append('file', file);
  const r = await gfetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&supportsAllDrives=true&fields=id,name,webViewLink', { method: 'POST', body: fd });
  return { id: r.id, nombre: r.name, link: r.webViewLink };
}

/* ================= Render general ================= */
function pintarNav() {
  document.querySelectorAll('.nav [data-v]').forEach(b => b.classList.toggle('on', b.dataset.v === S.vista));
  const b = $('#btn-drive');
  b.textContent = S.driveToken ? 'Drive conectado ✓' : 'Conectar Drive';
  b.classList.toggle('ok', !!S.driveToken);
  $('#usuario').textContent = S.user?.email || '';
}

function render() {
  S.charts.forEach(c => c.destroy()); S.charts = [];
  pintarNav();
  const V = { tablero: vTablero, directorio: vDirectorio, ficha: vFicha, indicadores: vIndicadores, vacaciones: vVacaciones, importar: vImportar, ajustes: vAjustes };
  $('#main').innerHTML = V[S.vista]();
  if (S.vista === 'directorio') pintarTabla();
  if (S.vista === 'indicadores') pintarGraficas();
  if (S.vista === 'vacaciones' && !S.vacNov) cargarVacaciones();
}

const tagEstado = e => `<span class="tag ${h(e)}">${h(e || '—')}</span>`;
const opciones = (lista, sel, vacio = '') => (vacio !== null ? `<option value="">${h(vacio)}</option>` : '') + lista.map(o => `<option ${o === sel ? 'selected' : ''}>${h(o)}</option>`).join('');
const nombresArea = () => S.cfg.areas.map(a => a.nombre);
const correoDe = e => e.correoEmpresarial || e.correoPersonal || '';
// Jefe = colaborador activo asignado al área en Ajustes; null si no hay o está retirado.
function jefeDe(area) {
  const j = S.byCed.get(S.cfg.areas.find(a => a.nombre === area)?.jefeCedula);
  return j && j.estado !== 'retirado' ? j : null;
}
const areasDeJefe = ced => S.cfg.areas.filter(a => a.jefeCedula === ced).map(a => a.nombre);
const areasSinJefe = () => [...new Set([...nombresArea(), ...S.emps.filter(e => e.estado !== 'retirado' && e.area).map(e => e.area)])].filter(a => !jefeDe(a)).sort();
const etiquetaJefe = e => `${nombre(e)} — ${e.cedula}`;
const cedulaDeEtiqueta = t => String(t).split('—').pop().replace(/\D/g, '');
function infoJefe(j, ced) {
  if (!j) return ced ? '<span class="tag rojo">No encontrado</span>' : '<span class="tag amar">Sin jefe</span>';
  if (j.estado === 'retirado') return '<span class="tag rojo">Jefe retirado: elige otro</span>';
  return `${h(j.cargo)} · ${correoDe(j) ? h(correoDe(j)) : '<span class="tag amar">sin correo: las alertas irán a RRHH</span>'}`;
}
const vacio = t => `<p class="vacio">${h(t)}</p>`;

/* ---------- Tablero ---------- */
function vTablero() {
  const vig = S.emps.filter(e => e.estado !== 'retirado');
  const v = vencimientos();
  const n = c => v.filter(x => semaforo(x.d) === c).length;
  const conteo = k => Object.entries(vig.reduce((m, e) => ((m[e[k] || '—'] = (m[e[k] || '—'] || 0) + 1), m), {})).sort((a, b) => b[1] - a[1]);
  const t = hoy();
  const incap = S.novedades.filter(x => x.tipo === 'Incapacidad' && x.desde <= t && (x.hasta || x.desde) >= t);
  const mes = pad(new Date().getMonth() + 1);
  const cumple = vig.filter(e => e.fechaNacimiento?.slice(5, 7) === mes).sort((a, b) => a.fechaNacimiento.slice(8).localeCompare(b.fechaNacimiento.slice(8)));
  const chk = checklistsPendientes();
  const dot = dotacionPendiente(), per = periodoDotacion(), sinJefe = areasSinJefe();
  const lineaEmp = (e, extra = '') => `<li><a href="#" data-act="ficha" data-ced="${h(e.cedula)}">${h(nombre(e))}</a> <span class="muted">${extra}</span></li>`;
  const tablaConteo = (titulo, k) => `<div class="panel"><h3>${titulo}</h3><table>${conteo(k).map(([a, c]) => `<tr><td>${h(a)}</td><td class="num">${c}</td></tr>`).join('') || '<tr><td class="muted">Sin datos</td></tr>'}</table></div>`;

  return `
  <h2>Tablero</h2>
  <div class="kpis">
    <div class="kpi"><span class="muted">Colaboradores vigentes</span><b>${vig.length}</b></div>
    ${[['vacaciones', 'En vacaciones'], ['incapacitado', 'Incapacitados'], ['suspendido', 'Suspendidos']].map(([s, l]) => `<div class="kpi"><span class="muted">${l}</span><b>${vig.filter(e => e.estado === s).length}</b></div>`).join('')}
  </div>
  <div class="kpis">
    <div class="kpi venc"><span class="muted">Vencidos</span><b>${n('venc')}</b></div>
    <div class="kpi rojo"><span class="muted">Vencen en 0–15 días</span><b>${n('rojo')}</b></div>
    <div class="kpi amar"><span class="muted">16–30 días</span><b>${n('amar')}</b></div>
    <div class="kpi verde"><span class="muted">31–60 días</span><b>${n('verde')}</b></div>
  </div>
  <div class="panel">
    <h3>Contratos y certificaciones por vencer</h3>
    ${v.length ? `<div class="tabla-wrap"><table>
      <tr><th>Días</th><th>Vence</th><th>Tipo</th><th>Detalle</th><th>Colaborador</th><th>Área</th><th>Sede</th></tr>
      ${v.map(x => `<tr class="clic" data-act="ficha" data-ced="${h(x.e.cedula)}">
        <td><span class="tag ${semaforo(x.d)}">${x.d < 0 ? `vencido hace ${-x.d}` : x.d}</span></td><td>${fmtF(x.fecha)}</td><td>${x.clase}</td>
        <td>${h(x.detalle)}</td><td>${h(nombre(x.e))}</td><td>${h(x.e.area)}</td><td>${h(x.e.sede)}</td></tr>`).join('')}
    </table></div>` : vacio('Nada vence en los próximos 60 días.')}
  </div>
  <div class="grid">
    ${tablaConteo('Por sede', 'sede')}
    ${tablaConteo('Por área', 'area')}
    <div class="panel"><h3>Áreas sin jefe activo (${sinJefe.length})</h3>
      ${sinJefe.length ? `<ul class="lista">${sinJefe.map(a => `<li>${h(a)}</li>`).join('')}</ul><p><a href="#" data-act="ir" data-v="ajustes">Asignar en Ajustes</a></p>` : vacio('Todas las áreas tienen jefe.')}</div>
    <div class="panel"><h3>Incapacidades activas (${incap.length})</h3>
      ${incap.length ? `<ul class="lista">${incap.map(x => { const e = S.byCed.get(x.cedula); return e ? lineaEmp(e, `hasta ${fmtF(x.hasta || x.desde)}`) : ''; }).join('')}</ul>` : vacio('Ninguna.')}</div>
    <div class="panel"><h3>Cumpleaños de ${MESES[+mes - 1]} (${cumple.length})</h3>
      ${cumple.length ? `<ul class="lista">${cumple.map(e => lineaEmp(e, `día ${+e.fechaNacimiento.slice(8)}`)).join('')}</ul>` : vacio('Ninguno.')}</div>
    <div class="panel"><h3>Checklists pendientes (${chk.length})</h3>
      ${chk.length ? `<ul class="lista">${chk.map(x => lineaEmp(x.e, `${x.k} ${x.p}%`)).join('')}</ul>` : vacio('Ingresos y retiros de los últimos 6 meses al día.')}</div>
    <div class="panel"><h3>Dotación pendiente ${h(per.nombre)} (${dot.length})</h3>
      <p class="muted">Plazo: ${per.limite}. Solo cuenta a quien tiene salario ≤ 2 SMMLV registrado y más de 3 meses.</p>
      ${dot.length ? `<details><summary>Ver lista</summary><ul class="lista">${dot.map(e => lineaEmp(e, h(e.area))).join('')}</ul></details>` : vacio('Todos tienen su entrega del periodo.')}</div>
  </div>`;
}

/* ---------- Directorio ---------- */
function filtrados() {
  const { q, sede, area, estado } = S.filtro, nq = norm(q);
  return S.emps.filter(e =>
    (!nq || norm(`${nombre(e)} ${e.cedula} ${e.cargo} ${e.correoEmpresarial}`).includes(nq)) &&
    (!sede || e.sede === sede) && (!area || e.area === area) &&
    (estado === 'todos' || (estado === 'vigentes' ? e.estado !== 'retirado' : e.estado === estado)));
}
function vDirectorio() {
  const f = S.filtro;
  return `
  <div class="fila entre"><h2>Colaboradores</h2>
    <div class="fila"><button class="btn" data-act="exportar">Exportar a Excel</button><button class="btn primary" data-act="nuevo">+ Nuevo colaborador</button></div></div>
  <div class="panel">
    <div class="form" style="margin-bottom:.8rem">
      <label class="ancho">Buscar<input id="q" value="${h(f.q)}" placeholder="Nombre, cédula, cargo o correo"></label>
      <label>Sede<select data-filtro="sede">${opciones(S.cfg.sedes, f.sede, 'Todas')}</select></label>
      <label>Área<select data-filtro="area">${opciones(nombresArea(), f.area, 'Todas')}</select></label>
      <label>Estado<select data-filtro="estado">${['vigentes', 'todos', ...ESTADOS].map(s => `<option ${s === f.estado ? 'selected' : ''}>${s}</option>`).join('')}</select></label>
    </div>
    <p class="muted" id="cuenta"></p>
    <div class="tabla-wrap"><table>
      <thead><tr><th>Cédula</th><th>Nombre</th><th>Cargo</th><th>Área</th><th>Jefe</th><th>Sede</th><th>Estado</th><th>Fin contrato</th><th>Correo empresarial</th></tr></thead>
      <tbody id="tbody"></tbody></table></div>
  </div>`;
}
function pintarTabla() {
  const lista = filtrados(), jefes = new Map(S.cfg.areas.map(a => [a.nombre, jefeDe(a.nombre)]));
  $('#cuenta').textContent = `${lista.length} colaborador(es)`;
  $('#tbody').innerHTML = lista.map(e => {
    const c = S.ctrAct.get(e.cedula), d = c?.fin ? dias(hoy(), c.fin) : null;
    return `<tr class="clic" data-act="ficha" data-ced="${h(e.cedula)}"><td>${h(e.cedula)}</td><td>${h(nombre(e))}</td><td>${h(e.cargo)}</td><td>${h(e.area)}</td><td>${h(jefes.get(e.area) ? nombre(jefes.get(e.area)) : '—')}</td><td>${h(e.sede)}</td>
      <td>${tagEstado(e.estado)}</td><td>${c ? (c.fin ? `<span class="tag ${e.estado !== 'retirado' && d <= 60 ? semaforo(d) : ''}">${fmtF(c.fin)}</span>` : 'Indefinido') : '—'}</td><td>${h(e.correoEmpresarial)}</td></tr>`;
  }).join('') || `<tr><td colspan="9" class="muted">Sin resultados</td></tr>`;
}
function exportar() {
  const filas = filtrados().map(e => {
    const c = S.ctrAct.get(e.cedula) || {};
    return Object.fromEntries([...CAMPOS.map(([k, l]) => [l, e[k] ?? '']), ['Jefe', jefeDe(e.area) ? nombre(jefeDe(e.area)) : ''], ['Tipo contrato', c.tipo || ''], ['Inicio contrato', c.inicio || ''], ['Fin contrato', c.fin || '']]);
  });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(filas), 'Colaboradores');
  XLSX.writeFile(wb, `colaboradores-${hoy()}.xlsx`);
}

/* ---------- Ficha ---------- */
async function abrirFicha(ced, tab, filtroNov = '') {
  S.vista = 'ficha';
  if (!ced) { S.ficha = { nuevo: true, tab: 'datos' }; return render(); }
  const [novedades, entregas, hist] = await Promise.all(['novedades', 'entregas', 'historial'].map(c => store.where(c, 'cedula', '==', ced)));
  S.ficha = { ced, tab: tab || (S.ficha?.ced === ced ? S.ficha.tab : 'datos'), novedades, entregas, historial: hist, pref: null, edit: null, filtroNov };
  render();
}

function vFicha() {
  const F = S.ficha;
  if (F.nuevo) return `<h2>Nuevo colaborador</h2><div class="panel">${formEmpleado({ estado: 'activo' })}</div>`;
  const e = S.byCed.get(F.ced);
  if (!e) return vacio('Colaborador no encontrado.');
  const jefe = jefeDe(e.area);
  const vac = vacaciones(e, F.novedades.filter(n => n.tipo === 'Vacaciones').reduce((s, n) => s + (+n.dias || 0), 0));
  const tabs = { datos: 'Datos', contratos: 'Contratos', novedades: 'Novedades', certificaciones: 'Certificaciones', entregas: 'Dotación y EPP', checklists: 'Checklists', historial: 'Historial', documentos: 'Documentos' };
  const cuerpo = {
    datos: () => formEmpleado(e),
    contratos: () => tabContratos(e),
    novedades: () => tabNovedades(F),
    certificaciones: () => tabRegistros('certificaciones', S.certificaciones.filter(c => c.cedula === e.cedula)),
    entregas: () => tabRegistros('entregas', F.entregas),
    checklists: () => tabChecklists(e),
    historial: () => tabHistorial(F.historial),
    documentos: () => tabDocumentos(e),
  }[F.tab]();
  return `
  <p><a href="#" data-act="ir" data-v="directorio">← Colaboradores</a></p>
  <div class="panel cabecera-ficha">
    <div>
      <h2>${h(nombre(e))} ${tagEstado(e.estado)}</h2>
      <div class="muted">C.C. ${h(e.cedula)} · ${h(e.cargo)} · ${h(e.area)} · ${h(e.sede)}</div>
      <div class="muted">${jefe && jefe !== e ? `Jefe: <a href="#" data-act="ficha" data-ced="${h(jefe.cedula)}">${h(nombre(jefe))}</a>` : jefe ? '' : 'Su área no tiene jefe activo'}
        ${areasDeJefe(e.cedula).length ? ` <span class="tag verde">Jefe de: ${h(areasDeJefe(e.cedula).join(', '))}</span>` : ''}</div>
      <div class="muted">Ingreso ${fmtF(e.fechaIngreso)}${e.fechaRetiro ? ` · Retiro ${fmtF(e.fechaRetiro)}` : ''}
        ${vac ? ` · Vacaciones: causados ${vac.causados.toFixed(1)}, disfrutados ${vac.disfrutados}, <b>saldo ${vac.saldo.toFixed(1)}</b>` : ''}</div>
    </div>
    <div class="fila">
      ${e.correoEmpresarial || e.correoPersonal ? `<a class="btn" href="mailto:${h(e.correoEmpresarial || e.correoPersonal)}">Enviar correo</a>` : ''}
      <button class="btn" data-act="certificado" data-sal="1">Certificado con salario</button>
      <button class="btn" data-act="certificado" data-sal="0">Certificado sin salario</button>
    </div>
  </div>
  <div class="tabs">${Object.entries(tabs).map(([k, l]) => `<button class="${k === F.tab ? 'on' : ''}" data-act="tab" data-tab="${k}">${l}</button>`).join('')}</div>
  <div class="panel">${cuerpo}</div>`;
}

function campo([k, l, t, req], val, extra = '') {
  const lab = `<label class="${t === 'textarea' ? 'ancho' : ''}"><span>${h(l)}${req ? ' <b class="req">*</b>' : ''}</span>`;
  const r = req ? 'required' : '';
  if (Array.isArray(t)) return `${lab}<select name="${k}" ${r}>${opciones(t, val, req ? null : '')}</select></label>`;
  if (t === 'estado') return `${lab}<select name="${k}">${opciones(ESTADOS, val, null)}</select></label>`;
  if (t === 'textarea') return `${lab}<textarea name="${k}">${h(val)}</textarea></label>`;
  if (['sedes', 'areas', 'cargos'].includes(t)) return `${lab}<input name="${k}" list="dl-${t}" value="${h(val)}" ${r}></label>`;
  return `${lab}<input name="${k}" type="${t || 'text'}" ${t === 'number' ? 'step="any" min="0"' : ''} value="${h(val)}" ${r} ${extra}></label>`;
}

function formEmpleado(e) {
  const nuevo = !e.cedula;
  return `<form data-form="empleado" class="form">
    ${CAMPOS.map(c => campo(c, e[c[0]], c[0] === 'cedula' && !nuevo ? 'readonly' : '')).join('')}
    <datalist id="dl-sedes">${opciones(S.cfg.sedes, '', null)}</datalist>
    <datalist id="dl-areas">${opciones(nombresArea(), '', null)}</datalist>
    <datalist id="dl-cargos">${opciones(S.cfg.cargos, '', null)}</datalist>
    <div class="ancho fila"><button class="btn primary">${nuevo ? 'Crear colaborador' : 'Guardar cambios'}</button>
      ${!nuevo && e.estado !== 'retirado' && e.area && !areasDeJefe(e.cedula).includes(e.area) ? `<button type="button" class="btn" data-act="hacerJefe">Hacer jefe de ${h(e.area)}</button>` : ''}
      <span class="muted">Los cambios de estado, cargo, sede, área, salario y correo quedan en el historial.</span></div>
  </form>`;
}

const celda = (k, v) => k === 'salario' ? peso(v) : /^(inicio|fin|desde|hasta|fecha|expedicion|vencimiento)$/.test(k) ? fmtF(v) : h(v);
function tablaRegistros(col, filas, extra) {
  const cols = REG[col].campos;
  const kf = cols.find(c => c[2] === 'date')[0];
  const ord = [...filas].sort((a, b) => String(b[kf] ?? '').localeCompare(String(a[kf] ?? '')));
  if (!ord.length) return vacio('Sin registros.');
  return `<div class="tabla-wrap"><table><tr>${cols.map(c => `<th>${h(c[1])}</th>`).join('')}<th>Archivo</th><th></th></tr>
    ${ord.map(r => `<tr>${cols.map(([k]) => `<td class="${k === 'observacion' || k === 'items' ? 'wrap' : ''}">${celda(k, r[k])}</td>`).join('')}
      <td>${r.archivo ? `<a href="${h(r.archivo.link)}" target="_blank" rel="noopener">${h(r.archivo.nombre)}</a>` : ''}</td>
      <td>${extra ? extra(r) : ''} <button class="btn peq" data-act="editar" data-col="${col}" data-id="${h(r.id)}">Editar</button> <button class="btn peq peligro" data-act="borrar" data-col="${col}" data-id="${h(r.id)}">Borrar</button></td></tr>`).join('')}
  </table></div>`;
}
function formRegistro(col, pref = {}) {
  const ed = S.ficha.edit?.col === col;
  return `<h3 id="form-registro" style="margin-top:1.2rem">${ed ? 'Editar registro' : 'Agregar'}</h3>
  <form data-form="registro" data-col="${col}" class="form">
    ${REG[col].campos.map(c => campo(c, pref[c[0]] ?? '')).join('')}
    <label>Archivo (PDF, imagen)<input type="file" name="archivo" ${S.driveToken ? '' : 'disabled'}>
      ${ed && pref.archivo ? `<span>Actual: ${h(pref.archivo.nombre)} (se conserva si no eliges otro)</span>` : ''}</label>
    <div class="ancho fila"><button class="btn primary">${ed ? 'Actualizar' : 'Guardar'}</button>
      ${ed ? '<button type="button" class="btn" data-act="cancelarEdit">Cancelar</button>' : ''}
      ${S.driveToken ? '' : '<span class="muted">Conecta Google Drive para adjuntar archivos.</span>'}</div>
  </form>`;
}
const tabRegistros = (col, filas) => tablaRegistros(col, filas) + formRegistro(col, S.ficha.edit?.col === col ? S.ficha.pref : {});
function tabNovedades(F) {
  const filas = F.novedades.filter(n => !F.filtroNov || n.tipo === F.filtroNov);
  return `<div class="fila entre" style="margin-bottom:.8rem">
      <label>Ver<select data-act="filtroNov">${opciones(TIPOS_NOV, F.filtroNov, 'Todas')}</select></label>
      <span class="muted">${filas.length} registro(s) · ${filas.reduce((s, n) => s + (+n.dias || 0), 0)} días</span></div>` + tabRegistros('novedades', filas);
}

function tabContratos(e) {
  const filas = S.contratos.filter(c => c.cedula === e.cedula);
  const act = S.ctrAct.get(e.cedula);
  const pref = S.ficha.pref || { cargo: e.cargo, salario: e.salario, prorroga: 0 };
  return (limiteProrrogas(act) ? `<div class="aviso">Este contrato ya tuvo 3 prórrogas por periodos inferiores a un año: la siguiente renovación debe ser <b>mínimo por 1 año</b> (art. 46 CST).</div>` : '') +
    tablaRegistros('contratos', filas, r => r === act && r.fin && r.tipo === 'Término fijo' ? `<button class="btn peq" data-act="prorrogar">Prorrogar</button>` : '') +
    formRegistro('contratos', pref);
}

function tabChecklists(e) {
  const bloque = (k, titulo) => `<div><h3>${titulo} · ${pct(e, k)}%</h3><div class="barra"><i style="width:${pct(e, k)}%"></i></div>
    ${(S.cfg[k] || []).map(i => `<label class="check"><input type="checkbox" data-act="check" data-k="${k}" data-item="${h(i)}" ${e[k]?.[i] ? 'checked' : ''}>
      ${h(i)} <span class="muted">${e[k]?.[i] ? fmtF(e[k][i]) : ''}</span></label>`).join('') || vacio('Configura los ítems en Ajustes.')}</div>`;
  return `<div class="grid">${bloque('checkIngreso', 'Ingreso')}${bloque('checkRetiro', 'Retiro')}</div>`;
}

function tabHistorial(hist) {
  const o = [...hist].sort((a, b) => b.fecha.localeCompare(a.fecha));
  return o.length ? `<div class="tabla-wrap"><table><tr><th>Fecha</th><th>Campo</th><th>Antes</th><th>Después</th><th>Usuario</th></tr>
    ${o.map(r => `<tr><td>${new Date(r.fecha).toLocaleString('es-CO')}</td><td>${h(r.campo)}</td><td class="wrap">${h(r.antes)}</td><td class="wrap">${h(r.despues)}</td><td>${h(r.usuario)}</td></tr>`).join('')}</table></div>`
    : vacio('Sin cambios registrados.');
}

function tabDocumentos(e) {
  const F = S.ficha;
  const docs = [
    ...S.contratos.filter(c => c.cedula === e.cedula).map(r => ['Contrato', r]),
    ...S.certificaciones.filter(c => c.cedula === e.cedula).map(r => ['Certificación', r]),
    ...F.novedades.map(r => ['Novedad', r]), ...F.entregas.map(r => ['Dotación/EPP', r]),
  ].filter(([, r]) => r.archivo);
  return `<div class="fila" style="margin-bottom:1rem">
      ${e.driveFolderId ? `<a class="btn primary" target="_blank" rel="noopener" href="https://drive.google.com/drive/folders/${h(e.driveFolderId)}">Abrir carpeta en Drive</a>`
      : S.driveToken ? `<button class="btn primary" data-act="crearCarpeta">Crear carpeta en Drive</button>` : '<span class="muted">Conecta Google Drive para crear la carpeta del colaborador.</span>'}
    </div>
    ${docs.length ? `<ul class="lista">${docs.map(([t, r]) => `<li>${t} · ${h(r.tipo)} — <a target="_blank" rel="noopener" href="${h(r.archivo.link)}">${h(r.archivo.nombre)}</a></li>`).join('')}</ul>` : vacio('Sin archivos adjuntos.')}`;
}

/* ---------- Certificado laboral ---------- */
function certificado(e, conSalario) {
  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF({ unit: 'mm', format: 'letter' });
  const c = S.cfg, ctr = S.ctrAct.get(e.cedula), ret = e.estado === 'retirado' && e.fechaRetiro;
  const largo = s => { const d = D(s); return `${d.getDate()} de ${MESES[d.getMonth()]} de ${d.getFullYear()}`; };
  let y = 20;
  if (c.logo) { pdf.addImage(c.logo, 'PNG', 20, y, 45, 45 * c.logoRatio); y += 45 * c.logoRatio + 8; }
  pdf.setFont('helvetica', 'bold').setFontSize(12);
  pdf.text(c.empresa.toUpperCase(), 108, y, { align: 'center' });
  if (c.nit) pdf.text(`NIT ${c.nit}`, 108, y += 6, { align: 'center' });
  pdf.text('CERTIFICA QUE:', 108, y += 18, { align: 'center' });
  pdf.setFont('helvetica', 'normal').setFontSize(11);
  y += 14;
  const parrafo = t => { pdf.text(t, 20, y, { maxWidth: 170, align: 'justify', lineHeightFactor: 1.6 }); y += pdf.splitTextToSize(t, 170).length * 6.2 + 8; };
  parrafo(`${nombre(e).toUpperCase()}, identificado(a) con cédula de ciudadanía No. ${e.cedula}, ${ret ? 'laboró' : 'labora'} en esta empresa desde el ${largo(e.fechaIngreso)}${ret ? ` hasta el ${largo(e.fechaRetiro)}` : ''}, desempeñando el cargo de ${e.cargo}${ctr ? `, mediante contrato a ${ctr.tipo.toLowerCase()}` : ''}${conSalario && e.salario ? `, ${ret ? 'devengando' : 'devenga'} un salario básico mensual de ${peso(e.salario)}` : ''}.`);
  const d = new Date();
  parrafo(`La presente se expide a solicitud del interesado(a) en ${c.ciudad}, a los ${d.getDate()} días del mes de ${MESES[d.getMonth()]} de ${d.getFullYear()}.`);
  y += 30;
  pdf.line(20, y, 95, y);
  pdf.setFont('helvetica', 'bold').text(c.firmante || ' ', 20, y + 6);
  pdf.setFont('helvetica', 'normal').text(c.cargoFirmante || '', 20, y + 11);
  pdf.save(`certificado-${e.cedula}-${hoy()}.pdf`);
}

/* ---------- Indicadores ---------- */
function indicadores(y) {
  const out = [];
  for (let m = 0; m < 12; m++) {
    const ym = `${y}-${pad(m + 1)}`, ini = ym + '-01', dm = new Date(y, m + 1, 0).getDate(), fin = `${ym}-${dm}`;
    if (ini > hoy()) break;
    const act = S.emps.filter(e => e.fechaIngreso && e.fechaIngreso <= fin && (!e.fechaRetiro || e.fechaRetiro >= ini));
    const actIni = S.emps.filter(e => e.fechaIngreso && e.fechaIngreso < ini && (!e.fechaRetiro || e.fechaRetiro >= ini)).length;
    const perdidos = {}, prog = {};
    act.forEach(e => (prog[e.area || '—'] = (prog[e.area || '—'] || 0) + dm));
    for (const n of S.novedades) {
      if (!AUSENTISMO.has(n.tipo)) continue;
      const a = n.desde, b = n.hasta || n.desde, o0 = a > ini ? a : ini, o1 = b < fin ? b : fin;
      if (o0 > o1) continue;
      const span = dias(a, b) + 1, area = S.byCed.get(n.cedula)?.area || '—';
      perdidos[area] = (perdidos[area] || 0) + (+n.dias || span) * (dias(o0, o1) + 1) / span;
    }
    const totP = Object.values(perdidos).reduce((s, x) => s + x, 0), totG = act.length * dm;
    out.push({
      m, perdidos, prog, totP, aus: totG ? totP * 100 / totG : 0,
      ingresos: S.emps.filter(e => e.fechaIngreso?.startsWith(ym)).length,
      retiros: S.emps.filter(e => e.fechaRetiro?.startsWith(ym)).length,
      actIni,
    });
  }
  return out;
}
function vIndicadores() {
  const y = S.anio, I = indicadores(y);
  const areas = [...new Set(I.flatMap(r => Object.keys(r.prog)))].sort();
  const p = (a, b) => (b ? (a * 100 / b).toFixed(1) + '%' : '—');
  return `
  <div class="fila entre"><h2>Indicadores</h2>
    <label>Año<select data-act="anio">${[y, new Date().getFullYear(), new Date().getFullYear() - 1].filter((v, i, a) => a.indexOf(v) === i).sort().reverse().map(v => `<option ${v === y ? 'selected' : ''}>${v}</option>`).join('')}</select></label></div>
  <div class="grid">
    <div class="panel"><h3>Ausentismo (% de días programados)</h3><div class="grafica"><canvas id="g-aus"></canvas></div></div>
    <div class="panel"><h3>Ingresos vs retiros</h3><div class="grafica"><canvas id="g-rot"></canvas></div></div>
  </div>
  <div class="panel"><h3>Resumen mensual</h3><div class="tabla-wrap"><table>
    <tr><th>Mes</th><th class="num">Días perdidos</th><th class="num">Ausentismo</th><th class="num">Ingresos</th><th class="num">Retiros</th><th class="num">Rotación</th></tr>
    ${I.map(r => `<tr><td>${MESES[r.m]}</td><td class="num">${r.totP.toFixed(1)}</td><td class="num">${r.aus.toFixed(2)}%</td><td class="num">${r.ingresos}</td><td class="num">${r.retiros}</td><td class="num">${p(r.retiros, r.actIni)}</td></tr>`).join('')}
  </table></div><p class="muted">Ausentismo cuenta: ${[...AUSENTISMO].join(', ')}. Rotación = retiros del mes / colaboradores al inicio del mes.</p></div>
  <div class="panel"><h3>Ausentismo por área</h3><div class="tabla-wrap"><table>
    <tr><th>Área</th>${I.map(r => `<th class="num">${MESES[r.m].slice(0, 3)}</th>`).join('')}</tr>
    ${areas.map(a => `<tr><td>${h(a)}</td>${I.map(r => `<td class="num" title="${(r.perdidos[a] || 0).toFixed(1)} días">${p(r.perdidos[a] || 0, r.prog[a])}</td>`).join('')}</tr>`).join('')}
  </table></div></div>`;
}
function pintarGraficas() {
  const I = indicadores(S.anio), labels = I.map(r => MESES[r.m].slice(0, 3));
  const opt = { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } };
  S.charts.push(new Chart($('#g-aus'), { type: 'line', data: { labels, datasets: [{ label: 'Ausentismo %', data: I.map(r => +r.aus.toFixed(2)), borderColor: '#d64545', backgroundColor: '#d64545', tension: .3 }] }, options: opt }));
  S.charts.push(new Chart($('#g-rot'), { type: 'bar', data: { labels, datasets: [{ label: 'Ingresos', data: I.map(r => r.ingresos), backgroundColor: '#2f855a' }, { label: 'Retiros', data: I.map(r => r.retiros), backgroundColor: '#0f2a4a' }] }, options: opt }));
}

/* ---------- Vacaciones ---------- */
async function cargarVacaciones() {
  const v = await store.where('novedades', 'tipo', '==', 'Vacaciones');
  S.vacNov = v.reduce((m, n) => ((m[n.cedula] = (m[n.cedula] || 0) + (+n.dias || 0)), m), {});
  if (S.vista === 'vacaciones') render();
}
function filasVacaciones() {
  return S.emps.filter(e => e.estado !== 'retirado').map(e => ({ e, v: vacaciones(e, S.vacNov[e.cedula] || 0) })).filter(x => x.v).sort((a, b) => b.v.saldo - a.v.saldo);
}
function vVacaciones() {
  if (!S.vacNov) return '<h2>Vacaciones</h2>' + vacio('Cargando…');
  const f = filasVacaciones();
  return `<div class="fila entre"><h2>Vacaciones</h2><button class="btn" data-act="exportarVac">Exportar a Excel</button></div>
  <div class="panel"><p class="muted">15 días hábiles por año trabajado (año de 360 días). Disfrutados = días previos al sistema + novedades tipo Vacaciones. Clic en una fila para ver las fechas de cada periodo.</p>
  <div class="tabla-wrap"><table><tr><th>Colaborador</th><th>Área</th><th>Ingreso</th><th class="num">Causados</th><th class="num">Disfrutados</th><th class="num">Saldo</th></tr>
  ${f.map(({ e, v }) => `<tr class="clic" data-act="ficha" data-ced="${h(e.cedula)}" data-tab="novedades" data-nov="Vacaciones"><td>${h(nombre(e))}</td><td>${h(e.area)}</td><td>${fmtF(e.fechaIngreso)}</td>
    <td class="num">${v.causados.toFixed(1)}</td><td class="num">${v.disfrutados}</td><td class="num"><span class="tag ${v.saldo >= 30 ? 'rojo' : v.saldo >= 15 ? 'amar' : ''}">${v.saldo.toFixed(1)}</span></td></tr>`).join('')}
  </table></div></div>`;
}

/* ---------- Importar ---------- */
function descargarPlantilla() {
  const cols = [...CAMPOS, ...CTR_COLS].filter(c => c[0] !== 'fechaRetiro' && c[0] !== 'motivoRetiro').map(c => c[1] + (c[3] ? ' *' : ''));
  const ej = { cedula: '1012345678', nombres: 'Ana María', apellidos: 'Pérez Gómez', fechaNacimiento: '15/03/1990', sede: S.cfg.sedes[0] || 'Bogotá', area: nombresArea()[0] || 'Operaciones', cargo: S.cfg.cargos[0] || 'Técnico electricista', estado: 'activo', fechaIngreso: '01/02/2024', salario: 1800000, tipoContrato: 'Término fijo', inicioContrato: '01/02/2026', finContrato: '31/01/2027', prorroga: 2 };
  const keys = [...CAMPOS, ...CTR_COLS].filter(c => c[0] !== 'fechaRetiro' && c[0] !== 'motivoRetiro').map(c => c[0]);
  const ws = XLSX.utils.aoa_to_sheet([cols, keys.map(k => ej[k] ?? '')]);
  ws['!cols'] = cols.map(c => ({ wch: Math.max(14, c.length + 2) }));
  const listas = [['Sedes', 'Áreas', 'Cargos', 'Estados', 'Tipos de contrato']];
  const L = [S.cfg.sedes, nombresArea(), S.cfg.cargos, ESTADOS, TIPOS_CTR];
  for (let i = 0; i < Math.max(...L.map(l => l.length)); i++) listas.push(L.map(l => l[i] || ''));
  const inst = [['Instrucciones'], ['1. Una fila por colaborador. Las columnas con * son obligatorias.'], ['2. Fechas en formato DD/MM/AAAA.'], ['3. Use los valores de la hoja "Listas" para sede, área, cargo, estado y tipo de contrato.'], ['4. Si la cédula ya existe en el sistema, la fila actualiza sus datos (las celdas vacías no borran nada).'], ['5. Borre la fila de ejemplo antes de subir.']];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Colaboradores');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(listas), 'Listas');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(inst), 'Instrucciones');
  XLSX.writeFile(wb, 'plantilla-colaboradores-lutec.xlsx');
}

// Acepta número de serie de Excel, DD/MM/AAAA, D-M-AAAA o AAAA-MM-DD. Devuelve '' si vacío, null si inválido.
function fechaDe(v) {
  if (v === '' || v == null) return '';
  if (typeof v === 'number') { const p = XLSX.SSF.parse_date_code(v); return p ? `${p.y}-${pad(p.m)}-${pad(p.d)}` : null; }
  const s = String(v).trim();
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  const [y, mo, d] = m ? [m[1], m[2], m[3]] : (m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/)) ? [m[3], m[2], m[1]] : [];
  if (!y) return null;
  const r = `${y}-${pad(+mo)}-${pad(+d)}`;
  return iso(D(r)) === r ? r : null; // descarta 31/02 y similares
}

async function leerExcel(file) {
  const wb = XLSX.read(new Uint8Array(await file.arrayBuffer()), { type: 'array' });
  const filas = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '', raw: true });
  const mapa = new Map([...CAMPOS, ...CTR_COLS].map(([k, l]) => [norm(l), k]));
  const fechas = new Set(['fechaNacimiento', 'fechaIngreso', 'fechaRetiro', 'inicioContrato', 'finContrato']);
  const vistas = new Set(), nuevos = { sedes: new Set(), areas: new Set(), cargos: new Set() };
  const res = filas.map((raw, i) => {
    const d = {}, err = [], av = [];
    for (const [col, v] of Object.entries(raw)) {
      const k = mapa.get(norm(col));
      if (!k) continue;
      if (fechas.has(k)) { const f = fechaDe(v); if (f === null) err.push(`${col}: fecha inválida "${v}"`); else d[k] = f; }
      else d[k] = String(v).trim();
    }
    d.cedula = (d.cedula || '').replace(/\D/g, '');
    if (!d.cedula) err.push('Falta cédula');
    else if (vistas.has(d.cedula)) err.push('Cédula repetida en el archivo');
    vistas.add(d.cedula);
    const existe = S.byCed.has(d.cedula);
    if (!existe) for (const [k, l, , req] of CAMPOS) if (req && !d[k]) err.push(`Falta ${l}`);
    if (d.estado) { d.estado = norm(d.estado); if (!ESTADOS.includes(d.estado)) err.push(`Estado inválido "${d.estado}"`); }
    else if (!existe) d.estado = 'activo';
    if (d.tipoContrato) {
      const t = TIPOS_CTR.find(x => norm(x) === norm(d.tipoContrato));
      if (!t) err.push(`Tipo de contrato inválido "${d.tipoContrato}"`); else d.tipoContrato = t;
      if (!d.inicioContrato) err.push('Falta inicio del contrato');
    }
    if (d.salario) { d.salario = Number(String(d.salario).replace(/\D/g, '')); if (!d.salario) err.push('Salario inválido'); }
    for (const k of ['correoPersonal', 'correoEmpresarial']) if (!correoOk(d[k])) err.push(`Correo inválido: ${d[k]}`);
    if (!err.length) {
      if (d.sede && !S.cfg.sedes.includes(d.sede)) { nuevos.sedes.add(d.sede); av.push(`Sede nueva "${d.sede}"`); }
      if (d.area && !nombresArea().includes(d.area)) { nuevos.areas.add(d.area); av.push(`Área nueva "${d.area}"`); }
      if (d.cargo && !S.cfg.cargos.includes(d.cargo)) { nuevos.cargos.add(d.cargo); av.push(`Cargo nuevo "${d.cargo}"`); }
    }
    return { fila: i + 2, d, err, av, existe };
  });
  S.imp = { res, nuevos, archivo: file.name };
  render();
}

async function confirmarImportacion() {
  const ok = S.imp.res.filter(r => !r.err.length);
  const limpio = o => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== '' && v != null));
  const emps = ok.map(({ d }) => {
    const { tipoContrato, inicioContrato, finContrato, prorroga, ...e } = d;
    if (e.vacPrevias) e.vacPrevias = +e.vacPrevias || 0;
    return { id: d.cedula, data: limpio(e) };
  });
  const ctrs = ok.filter(r => r.d.tipoContrato).map(({ d }) => ({
    id: `${d.cedula}_${d.inicioContrato}`, // re-importar el mismo archivo no duplica contratos
    data: limpio({ cedula: d.cedula, tipo: d.tipoContrato, inicio: d.inicioContrato, fin: d.finContrato, prorroga: +d.prorroga || 0, cargo: d.cargo, salario: d.salario }),
  }));
  const n = S.imp.nuevos;
  const cfg = {
    sedes: [...S.cfg.sedes, ...n.sedes], cargos: [...S.cfg.cargos, ...n.cargos],
    areas: [...S.cfg.areas, ...[...n.areas].map(nombre => ({ nombre, jefeCedula: '' }))],
  };
  await store.put('config', 'general', cfg);
  await store.putMany('empleados', emps);
  await store.putMany('contratos', ctrs);
  // ponytail: la importación masiva no escribe historial por fila (serían cientos de escrituras); queda solo la fecha en "importado".
  await cargar();
  toast(`Importados ${emps.length} colaboradores y ${ctrs.length} contratos.`);
  S.imp = null; S.vista = 'directorio'; render();
}

function vImportar() {
  const I = S.imp;
  const errores = I ? I.res.filter(r => r.err.length).length : 0;
  return `<h2>Importar desde Excel</h2>
  <div class="panel">
    <p>1. Descarga la plantilla, llénala (una fila por colaborador) y súbela. 2. Revisa la vista previa. 3. Confirma.</p>
    <div class="fila"><button class="btn" data-act="plantilla">Descargar plantilla</button>
      <label class="btn">Subir Excel<input type="file" accept=".xlsx,.xls,.csv" data-act="subirExcel" hidden></label></div>
  </div>
  ${I ? `<div class="panel">
    <div class="fila entre"><h3>${h(I.archivo)}: ${I.res.length} filas · ${I.res.length - errores} válidas · ${errores} con error</h3>
      <button class="btn primary" data-act="confirmarImp" ${I.res.length - errores ? '' : 'disabled'}>Importar ${I.res.length - errores} filas válidas</button></div>
    ${[...I.nuevos.sedes, ...I.nuevos.areas, ...I.nuevos.cargos].length ? `<div class="aviso">Se agregarán a los catálogos: ${h([...I.nuevos.sedes, ...I.nuevos.areas, ...I.nuevos.cargos].join(', '))}. Si alguno es un error de digitación, corrígelo en el Excel antes de importar.</div>` : ''}
    <div class="tabla-wrap"><table><tr><th>Fila</th><th>Cédula</th><th>Nombre</th><th>Resultado</th><th>Detalle</th></tr>
    ${I.res.map(r => `<tr><td>${r.fila}</td><td>${h(r.d.cedula)}</td><td>${h(nombre(r.d))}</td>
      <td>${r.err.length ? '<span class="tag rojo">Error</span>' : r.existe ? '<span class="tag amar">Actualiza</span>' : '<span class="tag verde">Nuevo</span>'}</td>
      <td class="wrap">${h([...r.err, ...r.av].join(' · '))}</td></tr>`).join('')}
    </table></div></div>` : ''}`;
}

/* ---------- Ajustes ---------- */
function vAjustes() {
  const c = S.cfg;
  const t = (k, l, v) => `<label class="ancho">${l}<textarea name="${k}" rows="6">${h(v)}</textarea></label>`;
  return `<h2>Ajustes</h2>
  <form data-form="ajustes" class="panel form">
    <label>Nombre de la empresa<input name="empresa" value="${h(c.empresa)}"></label>
    <label>NIT<input name="nit" value="${h(c.nit)}"></label>
    <label>Ciudad (certificados)<input name="ciudad" value="${h(c.ciudad)}"></label>
    <label>Firma certificados — nombre<input name="firmante" value="${h(c.firmante)}"></label>
    <label>Firma certificados — cargo<input name="cargoFirmante" value="${h(c.cargoFirmante)}"></label>
    <label>Correo RRHH (copia de alertas)<input name="correoRRHH" type="email" value="${h(c.correoRRHH)}"></label>
    <label>SMMLV vigente (verificar cada año)<input name="smmlv" type="number" value="${h(c.smmlv)}"></label>
    <label>ID carpeta raíz en Drive<input name="driveRootId" value="${h(c.driveRootId)}" placeholder="Se crea sola si está vacío"></label>
    <label>Logo para certificados (PNG/JPG)<input type="file" name="logo" accept="image/*"></label>
    <label class="check"><input type="checkbox" name="sabadoHabil" ${c.sabadoHabil ? 'checked' : ''}> El sábado cuenta como día hábil de vacaciones</label>
    ${c.logo ? `<div><img src="${h(c.logo)}" alt="Logo actual" style="max-height:50px"></div>` : ''}
    ${t('sedes', 'Sedes (una por línea)', c.sedes.join('\n'))}
    ${t('cargos', 'Cargos (uno por línea)', c.cargos.join('\n'))}
    ${t('checkIngreso', 'Checklist de ingreso (un ítem por línea)', c.checkIngreso.join('\n'))}
    ${t('checkRetiro', 'Checklist de retiro (un ítem por línea)', c.checkRetiro.join('\n'))}
    <div class="ancho"><button class="btn primary">Guardar ajustes</button></div>
  </form>
  <form data-form="areas" class="panel">
    <div class="fila entre"><h3>Áreas y jefes (${c.areas.length})</h3>
      <div class="fila"><input id="q-areas" placeholder="Buscar área o jefe" style="width:220px"><button type="button" class="btn" data-act="agregarArea">+ Agregar área</button></div></div>
    <p class="muted">El jefe se elige entre los colaboradores activos (escribe parte del nombre o la cédula). Las alertas de vencimiento llegan a su correo empresarial.</p>
    <datalist id="dl-jefes">${S.emps.filter(e => e.estado !== 'retirado').map(e => `<option value="${h(etiquetaJefe(e))}">`).join('')}</datalist>
    <div id="areas-grid" class="grid">${c.areas.map(tarjetaArea).join('')}</div>
    <div style="margin-top:1rem"><button class="btn primary">Guardar áreas</button></div>
  </form>`;
}

function tarjetaArea(a = {}) {
  const j = S.byCed.get(a.jefeCedula);
  const n = a.nombre ? S.emps.filter(e => e.area === a.nombre && e.estado !== 'retirado').length : 0;
  return `<div class="area-card">
    <input type="hidden" name="area_orig" value="${h(a.nombre)}">
    <label>Nombre del área<input name="area_nombre" value="${h(a.nombre)}" required></label>
    <label>Jefe<input name="area_jefe" list="dl-jefes" value="${j ? h(etiquetaJefe(j)) : ''}" placeholder="Buscar colaborador…"></label>
    <div class="muted jefe-info">${infoJefe(j, a.jefeCedula)}</div>
    <div class="fila entre"><span class="muted">${n} colaborador(es) activos</span>
      <button type="button" class="btn peq peligro" data-act="quitarArea" ${n ? 'disabled title="Tiene colaboradores activos"' : ''}>Quitar</button></div>
  </div>`;
}

function logoDataUrl(file) {
  return new Promise((ok, fail) => {
    const img = new Image();
    img.onload = () => {
      const w = Math.min(400, img.width), cv = Object.assign(document.createElement('canvas'), { width: w, height: Math.round(img.height * w / img.width) });
      cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
      URL.revokeObjectURL(img.src);
      ok({ logo: cv.toDataURL('image/png'), logoRatio: cv.height / cv.width });
    };
    img.onerror = fail;
    img.src = URL.createObjectURL(file);
  });
}

/* ================= Guardado ================= */
async function guardarEmpleado(form) {
  const d = Object.fromEntries(new FormData(form));
  d.cedula = d.cedula.replace(/\D/g, '');
  if (!d.cedula) throw new Error('La cédula debe tener números.');
  const prev = S.byCed.get(d.cedula);
  if (S.ficha.nuevo && prev) throw new Error('Ya existe un colaborador con esa cédula.');
  if (d.estado === 'retirado' && !d.fechaRetiro) throw new Error('Indica la fecha de retiro.');
  if (d.fechaRetiro && d.fechaIngreso && d.fechaRetiro < d.fechaIngreso) throw new Error('La fecha de retiro es anterior al ingreso.');
  for (const k of ['correoPersonal', 'correoEmpresarial']) if (!correoOk(d[k])) throw new Error('Correo inválido: ' + d[k]);
  d.salario = d.salario ? +d.salario : '';
  d.vacPrevias = d.vacPrevias ? +d.vacPrevias : '';
  await store.put('empleados', d.cedula, d);
  if (prev) {
    for (const k of TRACK) if (String(prev[k] ?? '') !== String(d[k] ?? '')) await historial(d.cedula, CAMPOS.find(c => c[0] === k)[1], prev[k], d[k]);
    Object.assign(prev, d);
  } else {
    S.emps.push(d);
    await historial(d.cedula, 'Ingreso al sistema', '', `${d.cargo} · ${d.area} · ${d.sede}`);
  }
  indexar();
  toast('Guardado.');
  await abrirFicha(d.cedula);
}

async function guardarRegistro(form) {
  const col = form.dataset.col, e = S.byCed.get(S.ficha.ced);
  const fd = new FormData(form), file = fd.get('archivo');
  fd.delete('archivo');
  const d = { ...Object.fromEntries(fd), cedula: e.cedula, creado: new Date().toISOString(), usuario: S.user.email };
  for (const k of ['salario', 'dias', 'prorroga']) if (k in d) d[k] = d[k] === '' ? '' : +d[k];
  const [ini, fin] = { contratos: ['inicio', 'fin'], novedades: ['desde', 'hasta'], certificaciones: ['expedicion', 'vencimiento'] }[col] || [];
  if (ini && d[ini] && d[fin] && d[fin] < d[ini]) throw new Error('La fecha final es anterior a la inicial.');
  if (col === 'novedades' && d.dias === '') d.dias = contarDias(d.tipo, d.desde, d.hasta);
  if (file?.size) d.archivo = await subirArchivo(file, e, `${REG[col].titulo} ${d.tipo} ${d[ini] || d.fecha || ''}`.trim());
  const ed = S.ficha.edit?.col === col ? S.ficha.edit : null;
  Object.assign(S.ficha, { edit: null, pref: null });

  if (ed) {
    const listas = [S[col], S.ficha[col]].filter(Array.isArray);
    const prev = listas.flat().find(x => x.id === ed.id);
    Object.assign(d, { creado: prev.creado, editado: d.creado, archivo: d.archivo || prev.archivo || '' });
    await store.put(col, ed.id, d);
    d.id = ed.id;
    for (const l of listas) { const i = l.findIndex(x => x.id === ed.id); if (i >= 0) l[i] = d; }
    const resumen = r => `${r.tipo} ${fmtF(r[ini] || r.fecha)}${fin && r[fin] ? '–' + fmtF(r[fin]) : ''}${r.dias !== undefined ? ` (${r.dias} días)` : ''}`;
    await historial(e.cedula, `${REG[col].titulo}: registro editado`, resumen(prev), resumen(d));
    S.vacNov = null; // se recalcula al abrir Vacaciones
  } else {
  d.id = await store.add(col, d);

  if (col === 'contratos') {
    const ant = S.ctrAct.get(e.cedula);
    S.contratos.push(d);
    await historial(e.cedula, 'Contrato', ant ? `${ant.tipo} ${fmtF(ant.inicio)}–${fmtF(ant.fin) || 'indefinido'}` : '', `${d.tipo} ${fmtF(d.inicio)}–${fmtF(d.fin) || 'indefinido'}${d.prorroga ? ` (prórroga ${d.prorroga})` : ''}`);
    // Un otrosí o contrato nuevo con otro cargo/salario actualiza la ficha.
    const cambios = {};
    if (d.cargo && d.cargo !== e.cargo) cambios.cargo = d.cargo;
    if (d.salario && d.salario !== +e.salario) cambios.salario = d.salario;
    for (const [k, v] of Object.entries(cambios)) await historial(e.cedula, CAMPOS.find(c => c[0] === k)[1], e[k], v);
    if (Object.keys(cambios).length) { await store.put('empleados', e.cedula, cambios); Object.assign(e, cambios); }
  } else if (col === 'certificaciones') S.certificaciones.push(d);
  else {
    S.ficha[col].push(d);
    if (col === 'novedades' && d.desde >= `${new Date().getFullYear() - 1}-01-01`) S.novedades.push(d);
    if (col === 'entregas' && d.fecha >= periodoDotacion().inicio) S.entregas.push(d);
    if (S.vacNov && d.tipo === 'Vacaciones') S.vacNov[e.cedula] = (S.vacNov[e.cedula] || 0) + (+d.dias || 0);
  }
  }
  indexar();
  toast('Registro guardado.');
  render();
}

async function borrar(col, id) {
  if (!confirm('¿Borrar este registro? El archivo en Drive no se elimina.')) return;
  if (S.ficha?.edit?.id === id) Object.assign(S.ficha, { edit: null, pref: null });
  await store.del(col, id);
  const listas = [S[col], S.ficha?.[col]].filter(Array.isArray);
  let r;
  for (const l of listas) { const i = l.findIndex(x => x.id === id); if (i >= 0) r = l.splice(i, 1)[0]; }
  if (r) await historial(r.cedula, `${REG[col].titulo}: registro borrado`, `${r.tipo || ''} ${fmtF(r.inicio || r.desde || r.fecha || r.vencimiento || '')}`, '');
  if (S.vacNov && r?.tipo === 'Vacaciones') S.vacNov[r.cedula] = (S.vacNov[r.cedula] || 0) - (+r.dias || 0);
  indexar(); render();
}

async function guardarAjustes(form) {
  const fd = new FormData(form), logo = fd.get('logo');
  const lineas = k => String(fd.get(k)).split('\n').map(s => s.trim()).filter(Boolean);
  const c = {
    ...Object.fromEntries(['empresa', 'nit', 'ciudad', 'firmante', 'cargoFirmante', 'correoRRHH', 'driveRootId'].map(k => [k, String(fd.get(k)).trim()])),
    smmlv: +fd.get('smmlv') || 0, sabadoHabil: fd.has('sabadoHabil'),
    sedes: lineas('sedes'), cargos: lineas('cargos'), checkIngreso: lineas('checkIngreso'), checkRetiro: lineas('checkRetiro'),
  };
  if (!correoOk(c.correoRRHH)) throw new Error('Correo de RRHH inválido.');
  if (logo?.size) Object.assign(c, await logoDataUrl(logo));
  await store.put('config', 'general', c);
  Object.assign(S.cfg, c);
  toast('Ajustes guardados.'); render();
}

async function guardarAreas(form) {
  const fd = new FormData(form), orig = fd.getAll('area_orig'), jefes = fd.getAll('area_jefe');
  const vistos = new Set(), renombres = [];
  const areas = fd.getAll('area_nombre').map((v, i) => {
    const nom = v.trim();
    if (vistos.has(norm(nom))) throw new Error(`Área repetida: ${nom}`);
    vistos.add(norm(nom));
    if (orig[i] && orig[i] !== nom) renombres.push([orig[i], nom]);
    let jefeCedula = '';
    if (jefes[i].trim()) {
      const j = S.byCed.get(cedulaDeEtiqueta(jefes[i]));
      if (!j) throw new Error(`Área ${nom}: el jefe no está en la lista de colaboradores.`);
      if (j.estado === 'retirado') throw new Error(`Área ${nom}: ${nombre(j)} está retirado(a).`);
      jefeCedula = j.cedula;
    }
    return { nombre: nom, jefeCedula };
  }).sort((a, b) => a.nombre.localeCompare(b.nombre));
  // Renombrar un área mueve a sus colaboradores al nombre nuevo.
  const mover = renombres.flatMap(([de, a]) => S.emps.filter(e => e.area === de).map(e => ((e.area = a), { id: e.cedula, data: { area: a } })));
  if (mover.length) await store.putMany('empleados', mover);
  await store.put('config', 'general', { areas });
  S.cfg.areas = areas;
  toast(`Áreas guardadas${mover.length ? ` · ${mover.length} colaborador(es) movidos al nombre nuevo` : ''}.`); render();
}

/* ================= Eventos ================= */
const ACT = {
  ir: d => { S.vista = d.v; S.ficha = null; render(); },
  ficha: d => abrirFicha(d.ced, d.tab, d.nov),
  nuevo: () => abrirFicha(null),
  tab: d => { Object.assign(S.ficha, { tab: d.tab, edit: null, pref: null }); render(); },
  editar: d => {
    const r = [S[d.col], S.ficha[d.col]].filter(Array.isArray).flat().find(x => x.id === d.id);
    Object.assign(S.ficha, { edit: { col: d.col, id: d.id }, pref: { ...r } });
    render();
    $('#form-registro').scrollIntoView({ behavior: 'smooth' });
  },
  cancelarEdit: () => { Object.assign(S.ficha, { edit: null, pref: null }); render(); },
  agregarArea: () => { $('#areas-grid').insertAdjacentHTML('afterbegin', tarjetaArea()); $('#areas-grid [name=area_nombre]').focus(); },
  quitarArea: (d, el) => el.closest('.area-card').remove(),
  hacerJefe: async () => {
    const e = S.byCed.get(S.ficha.ced), ant = jefeDe(e.area);
    if (ant && !confirm(`${nombre(ant)} es hoy jefe de ${e.area}. ¿Reemplazarlo por ${nombre(e)}?`)) return;
    const areas = S.cfg.areas.some(a => a.nombre === e.area)
      ? S.cfg.areas.map(a => (a.nombre === e.area ? { ...a, jefeCedula: e.cedula } : a))
      : [...S.cfg.areas, { nombre: e.area, jefeCedula: e.cedula }];
    await store.put('config', 'general', { areas });
    S.cfg.areas = areas;
    await historial(e.cedula, 'Jefe de área', ant ? `${e.area}: ${nombre(ant)}` : '', `${e.area}: ${nombre(e)}`);
    toast(`${nombre(e)} ahora es jefe de ${e.area}.`); render();
  },
  exportar,
  exportarVac: () => {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(filasVacaciones().map(({ e, v }) => ({ Cédula: e.cedula, Nombre: nombre(e), Área: e.area, Ingreso: e.fechaIngreso, Causados: +v.causados.toFixed(2), Disfrutados: v.disfrutados, Saldo: +v.saldo.toFixed(2) }))), 'Vacaciones');
    XLSX.writeFile(wb, `vacaciones-${hoy()}.xlsx`);
  },
  certificado: d => { const e = S.byCed.get(S.ficha.ced); if (!e.fechaIngreso || !e.cargo) throw new Error('Faltan fecha de ingreso o cargo.'); certificado(e, d.sal === '1'); },
  prorrogar: () => {
    const c = S.ctrAct.get(S.ficha.ced), e = S.byCed.get(S.ficha.ced);
    const inicio = sumarDias(c.fin, 1);
    const d = D(inicio);
    if (limiteProrrogas(c)) d.setFullYear(d.getFullYear() + 1); else d.setDate(d.getDate() + dias(c.inicio, c.fin) + 1);
    d.setDate(d.getDate() - 1);
    S.ficha.pref = { tipo: c.tipo, inicio, fin: iso(d), prorroga: (+c.prorroga || 0) + 1, cargo: e.cargo, salario: e.salario, observacion: 'Prórroga' };
    render();
    toast('Revisa las fechas propuestas y guarda.');
  },
  borrar: d => borrar(d.col, d.id),
  crearCarpeta: async () => { await carpetaDe(S.byCed.get(S.ficha.ced)); render(); },
  drive: conectarDrive,
  plantilla: descargarPlantilla,
  confirmarImp: confirmarImportacion,
  salir: () => auth.logout(),
  resetClave: async () => {
    const email = $('#f-login').email.value;
    if (!email) return ($('#login-err').textContent = 'Escribe tu correo primero.');
    await auth.reset(email);
    $('#login-err').textContent = 'Te enviamos un correo para cambiar la clave.';
  },
};

const fallo = err => { console.error(err); toast(err.code === 'permission-denied' ? 'Tu cuenta no tiene permiso. Pide que la agreguen como administradora.' : err.message || 'Error inesperado'); };

document.addEventListener('click', ev => {
  const el = ev.target.closest('[data-act]');
  if (!el || el.tagName === 'INPUT' || el.tagName === 'SELECT') return;
  ev.preventDefault();
  Promise.resolve().then(() => ACT[el.dataset.act](el.dataset, el)).catch(fallo);
});

document.addEventListener('change', ev => {
  const el = ev.target;
  if (el.dataset.filtro) { S.filtro[el.dataset.filtro] = el.value; pintarTabla(); }
  else if (el.dataset.act === 'anio') { S.anio = +el.value; render(); }
  else if (el.dataset.act === 'filtroNov') { Object.assign(S.ficha, { filtroNov: el.value, edit: null, pref: null }); render(); }
  else if (el.dataset.act === 'subirExcel' && el.files[0]) leerExcel(el.files[0]).catch(fallo);
  else if (el.dataset.act === 'check') {
    const e = S.byCed.get(S.ficha.ced), k = el.dataset.k, v = el.checked ? hoy() : '';
    (e[k] ||= {})[el.dataset.item] = v;
    store.put('empleados', e.cedula, { [k]: { [el.dataset.item]: v } }).then(render).catch(fallo);
  }
});

document.addEventListener('input', ev => {
  if (ev.target.id === 'q') { S.filtro.q = ev.target.value; pintarTabla(); }
  if (ev.target.id === 'q-areas') {
    const q = norm(ev.target.value);
    document.querySelectorAll('.area-card').forEach(c => (c.hidden = !!q && ![...c.querySelectorAll('input')].some(i => norm(i.value).includes(q))));
  }
  if (ev.target.name === 'area_jefe') {
    const ced = cedulaDeEtiqueta(ev.target.value);
    ev.target.closest('.area-card').querySelector('.jefe-info').innerHTML = ev.target.value.trim() ? infoJefe(S.byCed.get(ced), ced || '?') : infoJefe(null, '');
  }
  const f = ev.target.form;
  if (f?.dataset.col === 'novedades' && ['tipo', 'desde', 'hasta'].includes(ev.target.name))
    f.dias.value = contarDias(f.tipo.value, f.desde.value, f.hasta.value);
});

document.addEventListener('submit', async ev => {
  ev.preventDefault();
  const f = ev.target, btn = f.querySelector('button:not([type=button])');
  if (f.id === 'f-login') {
    $('#login-err').textContent = '';
    return auth.login(f.email.value, f.clave.value).catch(() => ($('#login-err').textContent = 'Correo o clave incorrectos.'));
  }
  btn.disabled = true;
  try { await { empleado: guardarEmpleado, registro: guardarRegistro, ajustes: guardarAjustes, areas: guardarAreas }[f.dataset.form](f); }
  catch (err) { fallo(err); }
  finally { btn.disabled = false; }
});

/* ================= Arranque ================= */
$('#demo').hidden = !DEMO;
auth.onChange(async u => {
  S.user = u;
  $('#login').hidden = !!u;
  $('#app').hidden = !u;
  if (!u) return;
  try { await cargar(); render(); }
  catch (err) { fallo(err); $('#main').innerHTML = vacio('No se pudieron cargar los datos. ' + (err.code === 'permission-denied' ? 'Esta cuenta no está autorizada.' : '')); }
});
