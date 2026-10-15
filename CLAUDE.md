# Talento Humano · LUTEC

## Qué es

App web (SPA) para que Recursos Humanos de LUTEC (2–3 usuarias) lleve los datos de 600+ colaboradores: contratos con semáforo de vencimiento, novedades (citas médicas, incapacidades, ausentismos, vacaciones…), certificaciones (alturas, exámenes médicos, CONTE, licencias), dotación/EPP, checklists de ingreso y retiro, historial de cambios, indicadores, vacaciones, certificado laboral PDF e importación desde Excel.

- Repo: `licitacioneslutec-cloud/Recursos-Humanos-Seguimientos` (rama `main`)
- Deploy: Netlify, sitio estático, sin build (`netlify.toml` publica `.`)
- Guía de puesta en marcha para el usuario: `README.md`

## Stack

- HTML + CSS + JS vanilla con módulos ES. **Sin bundler, sin npm, sin framework.**
- Firebase 10.12 (Auth correo/clave + Firestore) importado desde `gstatic.com` en `store.js`.
- Google Drive API vía Google Identity Services (token OAuth en memoria, scope `drive`).
- CDN con SRI en `index.html`: SheetJS 0.18.5, jsPDF 2.5.1, Chart.js 4.4.1. Si cambias una versión, recalcula el hash `integrity`.
- n8n para alertas por correo (`n8n/alertas-vencimientos.json`).

## Archivos

| Archivo | Qué tiene |
|---|---|
| `index.html` | Shell: login, nav lateral, `#main`, toast |
| `config.js` | `firebaseConfig`, `GOOGLE_CLIENT_ID`, `DEMO` (true si apiKey empieza por `PEGAR`) |
| `store.js` | Capa de datos con interfaz única `store.{all,where,get,put,add,del,putMany}` y `auth.{onChange,login,logout,reset}`. Dos implementaciones: Firestore o **modo demo** (localStorage `th-lutec-demo`) |
| `app.js` | Todo lo demás: estado, reglas de negocio, vistas, Drive, PDF, importador, eventos |
| `styles.css` | Variables CSS en `:root`, componentes, responsive (<760px) |
| `firebase/firestore.rules` | Reglas: solo UIDs en `admins`; `historial` solo crear/leer |
| `n8n/alertas-vencimientos.json` | Flujo diario 7 a. m.: avisos a 15 y 5 días al jefe del área |

## Modelo de datos (Firestore, colecciones de primer nivel)

- `empleados/{cedula}` — campos definidos en `CAMPOS` (app.js). `estado` ∈ `activo|vacaciones|incapacitado|suspendido|retirado`. Mapas `checkIngreso`/`checkRetiro` = `{ítem: 'AAAA-MM-DD' | ''}`. `driveFolderId`.
- `contratos`, `novedades`, `certificaciones`, `entregas` — cada doc con `cedula`, campos según `REG` (app.js), `archivo: {id, nombre, link}` opcional, `creado`, `usuario`, `editado`. El contrato vigente = el de `inicio` más reciente (`S.ctrAct`).
- `historial` — `{cedula, campo, antes, despues, fecha ISO, usuario}`. Inmutable por reglas.
- `config/general` — empresa, NIT, firma, logo (dataURL), `smmlv`, `sabadoHabil`, `driveRootId`, `sedes[]`, `cargos[]`, `checkIngreso[]`, `checkRetiro[]`, `areas: [{nombre, jefeCedula}]`.
- `admins/{uid}` — se crea a mano en la consola.

Fechas siempre como string `AAAA-MM-DD` (se comparan como texto). Usar los helpers `D()`, `iso()`, `hoy()`, `dias()`, `sumarDias()`, `fmtF()`; nunca `toISOString()` para fechas (zona horaria).

## Arquitectura de app.js

- **Estado global `S`**. `cargar()` trae al iniciar: empleados, contratos, certificaciones, novedades desde el 1 de enero del año anterior, entregas del periodo de dotación vigente y config. `indexar()` reconstruye `S.byCed` y `S.ctrAct`; llamarlo tras cualquier cambio a empleados o contratos.
- La ficha (`S.ficha`) consulta aparte por `cedula`: novedades, entregas, historial. `S.ficha.edit`/`pref` controlan el formulario en modo editar o prórroga.
- **Render imperativo**: `render()` elige `v<Vista>()` que devuelve HTML string para `#main`. Todo dato de usuario pasa por `h()` (escape). `fmtF()` ya escapa.
- **Eventos por delegación** al final del archivo: `click` en `[data-act]` → `ACT[nombre](dataset, el)`; `submit` en `form[data-form]` → `guardarEmpleado | guardarRegistro | guardarAjustes | guardarAreas`; `change`/`input` para filtros, checklists, días automáticos de novedades, buscador y tarjetas de áreas.
- Registros genéricos: `REG` define campos; `tablaRegistros`, `formRegistro`, `guardarRegistro` (alta y edición) y `borrar` sirven para las cuatro colecciones. Para un tipo de registro nuevo, agregar a `REG` antes de escribir código propio.
- Cambios en campos de `TRACK` y altas, ediciones o borrados de registros escriben `historial()`.
- Jefes: `jefeDe(area)` = colaborador activo con `cedula === areas[].jefeCedula`. El correo de alertas es `correoDe(jefe)` (empresarial, si no, personal); sin jefe activo → `correoRRHH`.

## Reglas de negocio (Colombia)

- Vacaciones: 15 días hábiles por año, año comercial de 360 días (`d360`). Saldo = causados − (`vacPrevias` + novedades tipo Vacaciones). `contarDias` no descuenta festivos.
- Prórrogas: término fijo < 1 año, después de 3 prórrogas la siguiente es mínimo 1 año (art. 46 CST) → `limiteProrrogas`.
- Dotación: 3 entregas al año (30 abr, 31 ago, 20 dic) para salario ≤ 2 SMMLV y más de 3 meses de antigüedad.
- Ausentismo cuenta los tipos de `AUSENTISMO`; tasa = días perdidos / (activos × días del mes).

## Desarrollo y pruebas

- Correr localmente con un servidor estático: en la raíz de `Claude code` el `launch.json` tiene `talento-humano` (`python -m http.server 5500 -d talento-humano-lutec`). Abrir el HTML con doble clic no funciona (módulos ES).
- Con `config.js` en `PEGAR_AQUI` arranca en **modo demo**: cualquier correo entra y los datos van a localStorage. Así se prueba todo sin Firebase. Limpiar con `localStorage.removeItem('th-lutec-demo')`.
- Revisar sintaxis: `node --check app.js`.
- La lógica del nodo Code de n8n vive como string en el JSON. Para probarla, extraer `jsCode` y ejecutarlo con `new Function('$', code)` pasándole un `$(nombreNodo).all()` simulado.

## Cuidado

- Datos sensibles (Ley 1581): no relajar las reglas de Firestore, no usar Auth anónimo (a diferencia de la Tienda LUTEC), no meter cédulas ni datos en URLs.
- `setDoc` con `merge:true` combina mapas pero **reemplaza arreglos** (por ejemplo `areas`): siempre escribir el arreglo completo.
- La importación masiva no escribe historial por fila (decisión deliberada para no hacer cientos de escrituras).
- Nada de dependencias nuevas ni paso de build salvo que se pida.
