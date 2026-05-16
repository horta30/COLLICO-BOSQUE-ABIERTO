# SETUP-BACKEND — Configuración inicial

> ⚠️ Este archivo es para configurar el backend **una sola vez**. Después de completar los 3 pasos, el repo funciona en producción y no hay que tocar nada del backend para operar el parque.

---

## ¿Qué hay que configurar?

3 cosas, todas conectadas en `assets/config.js`:

1. **Firebase Realtime Database** — almacena la posición GPS de los visitantes en tiempo real
2. **Google Apps Script + Sheet** — registra los datos de cada visitante que se registra
3. **PIN supervisor** — para acceder a `supervisor.html`

Tiempo total: **~15 minutos**.

---

## PASO 1 · Firebase project (5 min)

### 1.1 Crear el project

1. Ir a [console.firebase.google.com](https://console.firebase.google.com/)
2. Click **"Add project"**
3. Nombre: `collico-bosque-abierto` (o el que prefieras)
4. **Desactivar** Google Analytics (no se necesita)
5. Click **"Create project"** → esperar ~30 seg
6. Click **"Continue"**

### 1.2 Activar Realtime Database

1. En el menú lateral izquierdo → **"Build"** → **"Realtime Database"**
2. Click **"Create Database"**
3. **Location**: `us-central1` (default está bien)
4. **Security rules**: seleccionar **"Start in test mode"** → Click **"Enable"**

⚠️ El "test mode" deja la DB abierta a lectura/escritura sin auth — es **lo correcto** para este caso de uso (solo se guardan coordenadas GPS efímeras, sin datos personales sensibles).

### 1.3 Configurar reglas de seguridad permanentes

1. En Realtime Database → pestaña **"Rules"**
2. Reemplazar el contenido por:

```json
{
  "rules": {
    ".read": true,
    ".write": true
  }
}
```

3. Click **"Publish"**

> Las reglas son las mismas que ya usabas en el piloto TEST-04. Si el día de mañana querés cerrar la DB, basta con cambiar estas reglas — no hay que tocar código.

### 1.4 Registrar una app web

1. En el panel principal → ícono **"</>"** (Web app)
2. Nickname: `collico-bosque-abierto-web`
3. **NO** marcar "Also set up Firebase Hosting"
4. Click **"Register app"**
5. Verás un bloque de código que empieza con `const firebaseConfig = { ... }`. **Copialo entero.**

### 1.5 Pegar en `config.js`

Abrir `assets/config.js` y reemplazar el objeto `FIREBASE_CONFIG` con el que copiaste. Debería quedar similar a esto:

```javascript
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyXXXXXXXXXXXXXXXXXXXXX",
  authDomain: "collico-bosque-abierto.firebaseapp.com",
  databaseURL: "https://collico-bosque-abierto-default-rtdb.firebaseio.com",
  projectId: "collico-bosque-abierto",
  storageBucket: "collico-bosque-abierto.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abc123xyz456"
};
```

✅ Listo el paso 1.

---

## PASO 2 · Google Sheet + Apps Script (8 min)

### 2.1 Crear el Sheet

1. Ir a [drive.google.com](https://drive.google.com/)
2. Click **"+ Nuevo"** → **"Hoja de cálculo de Google"** → en blanco
3. Renombrar el documento a: **`Bosque Abierto · Registros 2026`**
4. Renombrar la hoja `Hoja 1` a **`Registros`** (importante: el script depende de este nombre)
5. En la fila 1, agregar los headers (en este orden):

| A | B | C | D | E | F | G |
|---|---|---|---|---|---|---|
| timestamp | nombre | email | telefono | ubicacion | locKey | aceptado |

### 2.2 Crear el Apps Script

1. En el Sheet → menú **"Extensiones"** → **"Apps Script"**
2. Se abre un editor con un archivo `Code.gs` con `function myFunction() { }`. **Borrar todo** y pegar este código:

```javascript
function doPost(e) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Registros');
    if (!sheet) throw new Error('Hoja "Registros" no encontrada');
    
    const params = e.parameter || {};
    
    sheet.appendRow([
      params.timestamp || new Date().toISOString(),
      params.nombre    || '',
      params.email     || '',
      params.telefono  || '',
      params.ubicacion || '',
      params.locKey    || '',
      params.aceptado  || false
    ]);
    
    return ContentService
      .createTextOutput(JSON.stringify({ ok: true }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  return ContentService
    .createTextOutput('Bosque Abierto · Endpoint activo')
    .setMimeType(ContentService.MimeType.TEXT);
}
```

3. Renombrar el proyecto (arriba a la izquierda donde dice "Proyecto sin título") a **`Bosque Abierto Registros`**
4. Click en el icono de disquete (💾) para guardar

### 2.3 Deploy del Apps Script

1. Arriba a la derecha → **"Deploy"** → **"New deployment"**
2. Click en el icono de engranaje ⚙ junto a "Select type" → marcar **"Web app"**
3. Configurar:
   - Description: `v1`
   - Execute as: **`Me (tu-email@gmail.com)`**
   - Who has access: **`Anyone`** ⚠️ importante — sin esto, el form de registro no puede escribir desde el browser
4. Click **"Deploy"**
5. La primera vez te va a pedir autorización:
   - Click **"Authorize access"**
   - Elegir tu cuenta de Google
   - Aparece "Google hasn't verified this app" → click **"Advanced"** → **"Go to Bosque Abierto Registros (unsafe)"**
   - Click **"Allow"**
6. **Copiar la "Web app URL"** que aparece al final. Debe verse así:
   `https://script.google.com/macros/s/AKfycb...XXXXXX/exec`

### 2.4 Pegar en `config.js`

Abrir `assets/config.js` y reemplazar la línea:

```javascript
const APPS_SCRIPT_URL = 'TODO_PEGAR_URL_DEL_APPS_SCRIPT';
```

por:

```javascript
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycb.../exec';
```

✅ Listo el paso 2.

---

## PASO 3 · PIN supervisor (1 min)

Abrir `assets/config.js` y reemplazar:

```javascript
const PIN_SUPERVISOR = 'TODO_DEFINIR_4_DIGITOS';
```

por algo como:

```javascript
const PIN_SUPERVISOR = '4521';   // ← define un PIN de 4 dígitos
```

⚠️ Compartí el PIN solo con el equipo del parque que necesite el panel supervisor.

✅ Listo el paso 3.

---

## Verificación

Con los 3 pasos completos, `assets/config.js` debería tener:
- `FIREBASE_CONFIG` → con valores reales (sin "TODO_…")
- `APPS_SCRIPT_URL` → URL real de tu Apps Script
- `PIN_SUPERVISOR` → 4 dígitos definidos

Subir todo a GitHub (`COLLICO-BOSQUE-ABIERTO`) y activar GitHub Pages:
1. GitHub → Settings → Pages → Source: `main` / root → Save
2. Esperar ~2 min → el sitio queda en `https://horta30.github.io/COLLICO-BOSQUE-ABIERTO/`

**Probar el flujo completo:**

1. Abrir en el celular: `https://horta30.github.io/COLLICO-BOSQUE-ABIERTO/`
2. Landing → "Entrar al Parque"
3. Registrarse con nombre/email/teléfono
4. **Esperar 3 segundos**, abrir el Sheet → debe aparecer una fila nueva en `Registros`
5. Click "Comenzar" en el overlay → permitir GPS
6. En otra pestaña, abrir `https://horta30.github.io/COLLICO-BOSQUE-ABIERTO/supervisor.html`
7. Ingresar el PIN → debería aparecer el visitante (tú) en el mapa en tiempo real

---

## Replicación a otros parques ARAUCO Bosque Abierto

Cuando quieras agregar un parque nuevo (Tirúa, Caramávida, etc.):

1. **Clonar el repo** `COLLICO-BOSQUE-ABIERTO` → renombrarlo (ej. `TIRUA-BOSQUE-ABIERTO`)
2. **Editar `assets/config.js`** — solo los valores de `PARQUE_CONFIG` (id, nombre, locKey, ubicacion, centro, totem, bbox)
3. **Reemplazar `assets/senderos.js`** con los datos del nuevo parque
4. **Repetir pasos 1-3** de este archivo (Firebase, Apps Script, PIN nuevos)

Ningún otro archivo necesita cambios. El módulo `cc.js`, el `sw.js`, los HTMLs — todo se adapta solo desde `config.js` y `senderos.js`.
