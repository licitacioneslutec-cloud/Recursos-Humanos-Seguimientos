# Talento Humano · LUTEC

Central de datos de colaboradores para Recursos Humanos: contratos con alertas de vencimiento, novedades (citas médicas, incapacidades, ausentismos, vacaciones), certificaciones (alturas, exámenes médicos, CONTE, licencias), dotación y EPP, checklists de ingreso y retiro, historial de cambios, indicadores y certificados laborales en PDF.

HTML + JavaScript sin compilación. Datos en Firebase Firestore, archivos en Google Drive, alertas por correo con n8n, publicado en Netlify.

---

## Probarlo ya (modo demo)

Mientras `config.js` tenga `PEGAR_AQUI`, la app arranca en **modo demo**: entra con cualquier correo y guarda todo en el navegador. Sirve para que RRHH la conozca antes de configurar nada. No pongas datos reales en modo demo.

Abre la carpeta con cualquier servidor local (por ejemplo la extensión *Live Server* de VS Code). Abrir el `index.html` con doble clic no funciona porque usa módulos.

## Archivos

```
index.html  styles.css  app.js  store.js  config.js  netlify.toml
firebase/firestore.rules         reglas de seguridad (se pegan en la consola)
n8n/alertas-vencimientos.json    flujo de correos (se importa en n8n)
```

---

## Puesta en marcha

### 1 · Firebase

1. Crea un proyecto en https://console.firebase.google.com (por ejemplo `talento-humano-lutec`).
2. **Firestore Database** › Crear base de datos › modo producción › región `southamerica-east1` (São Paulo).
3. **Authentication** › Comenzar › **Correo electrónico/contraseña** › Habilitar.
4. Authentication › Usuarios › **Agregar usuario** para cada persona de RRHH (2–3). Copia el **UID** de cada una.
5. Firestore › **Iniciar colección** `admins` › un documento por persona con **ID = su UID** (puede tener un campo `nombre`). Sin este paso la persona entra pero no ve nada.
6. Firestore › **Reglas** › pega `firebase/firestore.rules` › Publicar.
7. Configuración del proyecto › Tus aplicaciones › **Web** › copia el bloque `firebaseConfig` en `config.js`.

### 2 · Google Drive (adjuntos)

1. En https://console.cloud.google.com, sobre el **mismo proyecto** de Firebase: APIs y servicios › Biblioteca › **Google Drive API** › Habilitar.
2. Pantalla de consentimiento OAuth › tipo **Interno** (solo cuentas @lutec.com.co, no requiere verificación de Google).
3. Credenciales › Crear › **ID de cliente OAuth** › Aplicación web › Orígenes autorizados: la URL de Netlify y `http://localhost:5500` (o el puerto que uses). Copia el ID en `GOOGLE_CLIENT_ID` de `config.js`.
4. Crea en Drive una carpeta **Talento Humano LUTEC**, compártela solo con las personas de RRHH como editoras y pega su ID (lo que va después de `/folders/` en la URL) en la app › **Ajustes** › *ID carpeta raíz*. Si lo dejas vacío, la app la crea en el Drive de quien suba el primer archivo y luego hay que compartirla.

La app crea una subcarpeta por colaborador (`cédula - nombre`) la primera vez que se le adjunta algo.

### 3 · GitHub y Netlify

1. Sube esta carpeta a un repositorio **privado** de GitHub.
2. Netlify › Add new site › Import from GitHub › elige el repo. No hay comando de compilación; `netlify.toml` ya lo indica.
3. Agrega la URL que te da Netlify como origen autorizado en el paso 2.3 y como dominio autorizado en Firebase › Authentication › Configuración › Dominios autorizados.

### 4 · Primer uso

1. **Ajustes**: empresa, NIT, ciudad, quién firma los certificados, logo, correo de RRHH, SMMLV vigente, sedes y cargos.
2. **Importar Excel** › Descargar plantilla › llenarla con **todos** los colaboradores, **incluidos los jefes** › subirla › revisar la vista previa › Importar. Las áreas que vengan en el Excel se crean solas. Las filas con error no se cargan; corrígelas y vuelve a subir el archivo (las cédulas que ya existen se actualizan, nada se duplica).
3. **Ajustes › Áreas y jefes**: cada área es una tarjeta. En *Jefe* escribe parte del nombre o la cédula y elige de la lista (solo salen colaboradores activos). El correo de las alertas es el correo empresarial de ese jefe. También se puede asignar desde la ficha del colaborador con el botón **Hacer jefe de …**. Si el jefe se retira, el área aparece en el tablero como *sin jefe activo* y las alertas van a RRHH hasta que se elija otro.

### 5 · Alertas por correo (n8n)

1. En n8n › Workflows › Import from file › `n8n/alertas-vencimientos.json`.
2. Credencial **Google Service Account** para los nodos de Firestore: Firebase › Configuración › Cuentas de servicio › Generar nueva clave privada; pega el correo y la clave en n8n. En cada nodo de Firestore cambia `PEGAR_ID_PROYECTO_FIREBASE`.
3. Credencial **SMTP** en *Enviar correo* (el correo de Google Workspace con contraseña de aplicación sirve) y cambia `PEGAR_CORREO_REMITENTE`.
4. Ejecuta una vez a mano para probar y actívalo.

Todos los días a las 7 a. m. (hora Colombia) envía al jefe de cada área, con copia a RRHH, los contratos y certificaciones de su gente que vencen en **exactamente 15 y 5 días**. Si el área no tiene jefe activo o el jefe no tiene correo, el aviso va a RRHH. La cuenta de servicio lee la base sin pasar por las reglas: guarda esa clave con cuidado.

---

## Cómo funciona

- **Tablero**: semáforo de vencimientos (vencidos, 0–15, 16–30, 31–60 días) de contratos y certificaciones, conteo por sede y área, incapacidades activas, cumpleaños del mes, checklists pendientes y dotación pendiente del periodo.
- **Ficha del colaborador**: datos, contratos (con botón *Prorrogar* que propone las fechas y avisa cuando ya van 3 prórrogas cortas — art. 46 CST), novedades, certificaciones, dotación/EPP, checklists, historial, documentos y certificado laboral en PDF (con o sin salario).
- **Historial**: cada cambio de estado, cargo, sede, área, salario, correo o fecha de retiro, y cada contrato o registro borrado, queda con fecha y usuario. Las reglas impiden editarlo o borrarlo.
- **Indicadores**: ausentismo mensual y por área (días perdidos / días programados) y rotación (retiros / colaboradores al inicio del mes).
- **Vacaciones**: 15 días hábiles por año (año de 360 días) menos los disfrutados. Al importar, la columna *Días de vacaciones ya disfrutados* carga el saldo histórico.
- **Retiros**: a nadie se le borra; se cambia el estado a *retirado* con fecha y motivo.

## Cómo se hace…

- **Días laborados**: no se digitan. Salen de *Fecha ingreso* hasta hoy (o hasta *Fecha retiro*). Si están mal, corrige esas fechas en Ficha › Datos; el cambio queda en el historial.
- **Registrar una incapacidad**: Ficha › Novedades › Tipo *Incapacidad* › Desde y Hasta (los días se calculan solos y se pueden ajustar) › adjunta el PDF › Guardar. Sale en el tablero mientras esté vigente. Si quieres marcar a la persona como *incapacitado*, cambia el estado en Datos.
- **Indicadores**: no se actualizan a mano. Se calculan cada vez que abres la pestaña con las novedades, ingresos y retiros registrados. Si un número está mal, corrige la novedad o la fecha que lo origina.
- **Vacaciones**: se registran como Novedad tipo *Vacaciones*. Para cambiar los días de un periodo ya registrado usa **Editar** en esa fila. El saldo anterior al sistema va en Datos › *Días de vacaciones ya disfrutados*.
- **Ver fechas**: cada pestaña de la ficha muestra sus fechas. En Novedades, el filtro *Ver* deja solo un tipo (por ejemplo, todas las incapacidades) con el total de días. En la vista Vacaciones, un clic en la persona abre sus periodos. Historial muestra cada cambio con fecha y usuario.
- **Corregir un registro**: botón **Editar** en contratos, novedades, certificaciones y dotación. Queda en el historial el valor anterior y el nuevo; si no eliges un archivo nuevo, se conserva el anterior.

## Lo que debes tener claro

- **Datos sensibles (Ley 1581 de 2012).** Citas médicas e incapacidades son datos de salud. Solo las cuentas en `admins` pueden verlos; no compartas claves y retira de `admins` a quien deje RRHH.
- **Días de vacaciones**: la app cuenta lunes a viernes (o sábado si lo activas en Ajustes) pero **no descuenta festivos**; ajusta el campo *Días* a mano cuando haya festivos.
- **Indicadores**: usan novedades desde el 1 de enero del año anterior.
- **Dotación pendiente**: solo cuenta a quien tiene salario registrado ≤ 2 SMMLV y más de 3 meses de antigüedad. Actualiza el SMMLV cada enero.
- **Plan gratuito de Firebase**: cada ingreso lee los ~600 colaboradores, sus contratos y certificaciones. Con 3 usuarios queda muy por debajo del límite diario de 50.000 lecturas.
