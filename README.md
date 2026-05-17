# Parque Collico — Mapa Interactivo

**ARAUCO Bosque Abierto · Valdivia, Chile · v3.0**

Aplicación web móvil para navegación de senderos del Parque Collico. Funciona desde cualquier teléfono sin instalar nada. GPS en vivo, notificaciones de voz, planificador de rutas, monitoreo de visitantes en tiempo real, y **funciona sin señal** dentro del parque.

---

## 🌐 Acceso

- **URL pública**: https://horta30.github.io/COLLICO-BOSQUE-ABIERTO/
- **Hosting**: GitHub Pages
- **Backend**: Firebase Realtime Database + Google Apps Script

---

## 🛠️ Stack tecnológico

`HTML` · `CSS` · `JavaScript (vanilla)` · `MapLibre GL JS` · `Firebase Realtime DB` · `Google Apps Script` · `Service Worker` (offline-first)

---

## 📁 Estructura del proyecto

```
COLLICO-BOSQUE-ABIERTO/
├── index.html            → Redirect a landing
├── landing.html          → Presentación + lista de senderos
├── registro.html         → Opt-in del visitante (Firebase + Apps Script)
├── mapa.html             → Mapa interactivo con GPS y notificaciones
├── supervisor.html       → Panel supervisor (PIN-protegido, tiempo real)
├── sw.js                 → Service Worker (cache de tiles offline)
├── README.md             → Este archivo
├── SETUP-BACKEND.md      → Guía para configurar el backend desde cero
└── assets/
    ├── config.js         → Configuración del parque (Firebase, PIN, tiles, etc.)
    ├── senderos.js       → Fuente única de verdad: senderos, destinos, áreas
    ├── cc.js             → Módulo Collico Companion (TTS, geofence, toast, wake lock)
    └── offline.js        → Cliente del Service Worker + badge "Mapa offline"
```

---

## 🚶 Flujo de usuario

```
  landing.html  →  registro.html  →  mapa.html
        │                                  ↓
        │                          [overlay primer toque]
        │                                  ↓
        │                     audio + GPS + Wake Lock + SW
        │                                  ↓
        │                              mapa activo
        │
        └────  (si ya hay sessionStorage) ──→ mapa.html directo
```

---

## 🗺️ Senderos del parque

**15 senderos catalogados · 22.65 km de red total** (sin contar ripio)

| # | Sendero | Distancia | Desnivel | D+/km | Dificultad | Disciplinas |
|---|---|---|---|---|---|---|
| 1 | 🛣️ Camino Principal (Ripio) | 7.75 km | 436m | 56.3 | Moderado | RP · TR · XC |
| 2 | 🌿 Collico 1 | 4.93 km | 282m | 57.2 | Moderado | TR · XC · DH |
| 3 | 🐆 Mirador del Puma | 5.09 km | 276m | 54.2 | Moderado | RP · TR |
| 4 | 🏃 Vietnam | 0.67 km | 66m | 99.1 | Difícil | TR |
| 5 | 💧 La Cascada | 0.47 km | 58m | 123.4 | Muy Difícil | TR |
| 6 | 🔭 Mirador Kunstmann | 1.04 km | 98m | 93.7 | Difícil | RP · TR |
| 7 | 🧗 El Muro | 1.6 km | 163m | 101.9 | Moderado | TR · XC |
| 8 | 🤖 Androides | 1.79 km | 267m | 52.8 | Moderado | DH · XC |
| 9 | 🌳 Budicali | 1.35 km | 42m | 29.6 | Fácil | TR · XC |
| 10 | 🌿 Los Helechos | 0.69 km | 46m | 66.7 | Moderado | TR · XC |
| 11 | 🚵 Spot 23 | 1.89 km | 172m ↓ | 7.9 | Moderado | DH · XC |
| 12 | 🐰 Conejo | 0.63 km | 35m | 0 | Fácil | TR · XC · DH |
| 13 | 🔥 Lalo Cura | 1.12 km | 174m ↓ | 7.6 | Técnico DH | DH |
| 14 | 🌀 Suaveton | 0.66 km | 72m | 54.3 | Moderado | TR · XC |
| 15 | ⚡ Suavetona Lex One | 0.75 km | 95m | 20.1 | Difícil | TR |

### Disciplinas

- 🥾 **TR** — Trail / Trekking / Caminata
- 🚵 **XC** — Cross Country MTB
- 🚵 **DH** — Downhill MTB
- 🛣️ **RP** — Ripio (camino vehicular)

### Sub-segmentos sobre Collico 1

| Sub-segmento | Distancia | Disciplinas |
|---|---|---|
| Sanguijuela | 1.06 km | TR |
| Chela Track | 0.89 km | TR |
| Los Pinos | 0.71 km | TR |

---

## 🎯 Destinos planificados (4)

Rutas óptimas desde el Tótem de Acceso hasta cada destino, con tiempos estimados (fórmula Naismith).

| Destino | Distancia | Desnivel + | Dificultad | Trek | Trail | XC |
|---|---|---|---|---|---|---|
| 🏔️ Cumbre | 7.06 km | +475m | Moderado | 2h 10 – 2h 56 | 1h 15 – 1h 41 | 1h 00 – 1h 21 |
| 🔭 Mirador Kunstmann | 1.79 km | +140m | Moderado | 34 – 46 min | 20 – 27 min | — |
| 🐆 Mirador del Puma | 7.52 km | +413m | Moderado | 2h 10 – 2h 57 | 1h 14 – 1h 40 | — |
| 💧 La Cascada | 3.92 km | +326m | Moderado | 1h 17 – 1h 45 | 0h 45 – 1h 01 | — |

---

## 🐔 Áreas críticas

### Pata de Gallo

Cruce principal del parque donde se intersectan **Camino Principal de Ripio + Collico 1 + inicio de Sanguijuela**. Polígono visible en el mapa con relleno semi-transparente. Detección GPS automática que dispara:

- **TTS por voz** con instrucciones de evacuación
- **Vibración fuerte** (5 pulsos)
- **Toast warning** durante 8 segundos
- **Panel con 2 rutas de retorno** al acceso principal:
  - **Ruta A · directa**: Camino Principal de Ripio → Tótem
  - **Ruta B · norte**: Collico 1 → Conejo → Camino Principal de Ripio → Acceso principal

---

## 📡 Sistema de geofences

Cada sendero tiene puntos de inicio y fin con radio configurable. Cuando el GPS detecta al visitante dentro de un geofence:

- ✅ Anuncia el sendero por voz (TTS en español de Chile)
- ✅ Muestra toast con datos básicos
- ✅ Vibra suavemente (Android)
- ✅ Cada geofence se activa **una sola vez por sesión**
- ✅ **Lógica del más cercano**: si hay varios geofences activos simultáneamente, solo se dispara el del centro más próximo (evita cascada de avisos en cruces).

---

## ☁️ Backend

**Firebase Realtime Database** — proyecto `collico-bosque-abierto`  
URL: `https://collico-bosque-abierto-default-rtdb.firebaseio.com`

- Almacena posiciones GPS de visitantes en tiempo real
- Reglas públicas (solo coordenadas, sin datos personales)
- Cleanup automático al cerrar sesión

**Google Apps Script** — registra cada opt-in del visitante

- Endpoint: deployment v2
- Destino: Google Sheet "REGISTROS COLLICO BA" → hoja "REGISTROS"
- Campos: nombre, email, teléfono, ubicación, locKey, timestamp, aceptado

**PIN supervisor**: `9999`

---

## 🔧 Cómo correr localmente

No se requiere build ni instalación. Es HTML/JS estático.

```bash
# Servidor local simple
cd COLLICO-BOSQUE-ABIERTO
python3 -m http.server 8000

# Abrir en navegador
open http://localhost:8000
```

---

## 🚀 Despliegue

GitHub Pages se actualiza automáticamente al hacer commit en `main`. Tarda ~30 segundos.

URL final: https://horta30.github.io/COLLICO-BOSQUE-ABIERTO/

---

## 📊 Configuración del parque

Ver `assets/config.js` para los parámetros:

- `PARQUE_CONFIG`: bbox, tótem, total km, total senderos
- `FIREBASE_CONFIG`: credenciales del backend
- `APPS_SCRIPT_URL`: endpoint del Apps Script
- `PIN_SUPERVISOR`: PIN para acceder a `supervisor.html`
- `TILES_CONFIG`: configuración de tiles (ESRI Satellite/Topo + OSM)
- `OFFLINE_CONFIG`: pre-cache de tiles para uso sin señal

---

## 🌳 Créditos

- **Cliente**: ARAUCO · Bosque Abierto · Parque Collico (Valdivia)
- **Trail data**: Alex Padilla · Valdivia Trail
- **Desarrollo**: Gravitas Solutions · 2026
