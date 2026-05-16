# Parque Collico — Mapa Interactivo
### ARAUCO Bosque Abierto · Valdivia · v2.0

> Aplicación web móvil para navegación de senderos del Parque Collico (Valdivia, Chile). Funciona desde cualquier teléfono sin instalar nada. GPS en vivo, notificaciones de voz, planificador de rutas, monitoreo de visitantes en tiempo real, y **funciona sin señal** dentro del parque.

**Stack:** HTML · CSS · JavaScript · MapLibre GL JS · Firebase Realtime DB · Google Apps Script · Service Worker  
**Hosting:** GitHub Pages  
**URL:** `https://horta30.github.io/COLLICO-BOSQUE-ABIERTO/`

---

## Estructura

```
COLLICO-BOSQUE-ABIERTO/
├── index.html             → Redirect a landing
├── landing.html           → Presentación del parque + lista de senderos
├── registro.html          → Opt-in visitante (Firebase + Apps Script)
├── mapa.html              → Mapa interactivo con GPS y notificaciones
├── supervisor.html        → Panel supervisor (PIN-protected, tiempo real)
├── sw.js                  → Service Worker (pre-cache de tiles)
├── README.md              → Este archivo
├── SETUP-BACKEND.md       → Guía paso a paso para configurar el backend
└── assets/
    ├── config.js          → Configuración centralizada (parque, Firebase, PIN, tiles)
    ├── senderos.js        → Fuente única de verdad (12 senderos + 3 sub-segmentos)
    ├── cc.js              → Módulo Collico Companion (TTS, geofence, toast, wake lock)
    └── offline.js         → Cliente del Service Worker + badge "Mapa offline"
```

### Flujo de usuario

```
landing.html → registro.html → mapa.html
                                  ↓
                          [overlay primer toque]
                                  ↓
                      audio + GPS + Wake Lock + SW
                                  ↓
                              mapa activo
```

---

## Senderos del parque

12 senderos · 5 disciplinas · ~26 km de red total · 3 sub-segmentos sobre Collico 1.

| Sendero | km | D+ | D+/km | Dificultad | Disciplinas |
|---|---|---|---|---|---|
| 🛣️ Camino Principal (Ripio) | 7.72 | +72 | 9.3 | Fácil | RP·TR·ED·XC |
| 🐰 Conejo | 0.26 | +12 | 44.9 | Moderado | TR·ED·XC·DH |
| 🤖 Androides | 1.79 | +95 | 52.8 | Moderado | ED |
| 🐆 Mirador del Puma | 5.09 | +276 | 54.2 | Moderado | TR·ED·XC·DH |
| 🌿 Collico 1 | 4.92 | +281 | 57.1 | Moderado | TR·ED·XC·DH |
| 🌳 Budicali | 1.35 | +93 | 69.1 | Moderado | TR·ED·XC·DH |
| 🌿 Los Helechos | 0.68 | +57 | 84.5 | Moderado | TR·ED·XC·DH |
| 🔭 Mirador Kunstmann | 0.94 | +88 | 93.5 | Difícil | TR·ED·XC·DH |
| 🧗 El Muro | 1.60 | +163 | 101.9 | Difícil | TR |
| 💧 La Cascada | 0.56 | +58 | 103.4 | Difícil | TR |
| 🏃 Vietnam | 0.79 | +84 | 106.6 | Difícil | TR |
| 🚵 Spot DH 23 Alto | 0.71 | 0 (D− 84) | — | Técnico DH | DH |

**Sub-segmentos sobre Collico 1:** Sanguijuela (1.06 km) · Chela Track (0.89 km) · Los Pinos (0.71 km)

### Disciplinas

- **TR** — Trail · Trekking · Caminata
- **XC** — Cross Country MTB
- **ED** — Enduro MTB
- **DH** — Downhill MTB
- **RP** — Ripio (camino vehicular)

---

## Criterio de dificultad

Asignada con el estándar internacional ITRA — **D+/km** (desnivel positivo acumulado por kilómetro).

| Nivel | D+/km | Descripción |
|---|---|---|
| **Fácil** | < 30 m/km | Terreno plano, sin pendiente significativa |
| **Moderado** | 30–90 m/km | Subidas progresivas, recuperación posible |
| **Difícil** | 90–120 m/km | Pendiente sostenida, exige condición física |
| **Muy Difícil** | > 120 m/km | Técnico, desnivel continuo y pronunciado |
| **Técnico DH** | — | Senderos sin D+ (bajada pura) — métrica no aplica |

Esta métrica permite comparar senderos de distancias muy distintas en igualdad de condiciones. La Cascada (0.56 km, +58m) tiene D+/km de 103 — más exigente que Collico 1 (4.92 km, +281m) con D+/km de 57, aunque sea ~9× más largo.

---

## Funcionalidades

### Visitante (mapa.html)

- **Overlay obligatorio "Toca para entrar"** → garantiza gesto activo del usuario para desbloquear audio iOS, Wake Lock, GPS y Service Worker en un solo gesto
- **Mapa vectorial MapLibre** con 3 estilos (Satélite ESRI · Topo ESRI · Calles OSM)
- **12 senderos** con trazado GPS real (2,472 puntos)
- **3 sub-segmentos** sobre Collico 1 visualizados con línea punteada violeta
- **Filtros por disciplina** (Todos · Trail · XC · Enduro · DH · Ripio)
- **GPS en tiempo real** con punto pulsante sobre el mapa
- **Geofencing 50 m** — alerta TTS + toast + vibración al entrar a inicio/fin de cada sendero (una vez por sesión)
- **TTS en español Chileno** (es-CL) con cola de mensajes y prioridad
- **Wake Lock** — pantalla siempre activa durante la visita
- **Planificador de ruta** desde el Tótem de Acceso (5 rutas iniciales, ampliable)
- **Panel de sendero** con datos técnicos al tocar el trazado
- **Deep links** por sendero, disciplina y ruta
- **Funciona sin señal** — Service Worker pre-cachea 455 tiles del bbox (~6.7 MB)
- **Indicador "Mapa listo offline ✓"** en topbar
- **Re-conexión automática del GPS** al volver de background (iOS)
- **Publicación de posición** en Firebase Realtime DB con auto-cleanup al desconectar

### Supervisor (supervisor.html)

- **PIN-protected** (definido en `config.js`)
- **Visitantes en tiempo real** con marker sobre el mapa
- **Lista lateral** con nombre, email, tiempo desde última actualización
- **Timeout 5 min** — visitantes inactivos se ocultan automáticamente
- **Fly-to** a la posición de cualquier visitante con un click
- **Mismo mapa base** que el visitante (satellite/topo/streets)

---

## Fuente de datos — `assets/senderos.js`

`assets/senderos.js` es la fuente única de verdad del parque. Contiene:

```javascript
SENDEROS[]          // 12 senderos con coords, disciplinas, métricas
SUBSEGMENTOS[]      // 3 sub-segmentos (slice del padre, sin duplicar coords)
RIPIO_ACCESO        // Alias a coords del camino_principal
POIS[]              // Puntos de interés (Cumbre, Cascada, Miradores)
RUTAS{}             // Planificador desde Tótem
```

Cada objeto en `SENDEROS`:

```javascript
{
  id, nombre, emoji, color,
  disciplinas: ['TR','ED','XC','DH'],
  dificultad: 'Moderado',
  descripcion,
  dist_km, desnivel_pos, desnivel_neg,
  elevacion_min, elevacion_max, elevacion_avg,
  pendiente_avg_up, pendiente_avg_dn,
  pendiente_max_up, pendiente_max_dn,
  dpkm,
  tiempo_trek, tiempo_trail, tiempo_xc,  // Naismith ajustado
  geofence: {
    inicio: { lng, lat, radio },
    fin:    { lng, lat, radio }
  },
  coords: [[lng, lat], ...]
}
```

Sub-segmentos referencian al padre con `start_idx`, `end_idx` (slice del array de coords del padre, sin duplicar):

```javascript
{
  id: 'sanguijuela',
  nombre: 'Sanguijuela',
  padre: 'collico1',
  start_idx: 264, end_idx: 370,
  invertir: false,
  dist_km: 1.06,
  disciplinas: ['TR']
}
```

---

## Deploy

### Primera vez

1. Completar **SETUP-BACKEND.md** (Firebase + Apps Script + PIN)
2. Subir el repo a GitHub: `github.com/horta30/COLLICO-BOSQUE-ABIERTO`
3. Activar GitHub Pages: Settings → Pages → Source: `main` / root
4. URL final: `https://horta30.github.io/COLLICO-BOSQUE-ABIERTO/`

### Actualizaciones

Solo subir los archivos cambiados a GitHub. El Service Worker invalida automáticamente el cache cuando cambia `CACHE_VERSION` en `sw.js` (cambiar a `cba-v2`, `cba-v3`, etc. en cada update mayor).

### Deep links

```
/mapa.html?disciplina=TR              → Filtro Trail activo
/mapa.html?disciplina=DH              → Filtro Downhill activo
/mapa.html?trail=vietnam              → Abre panel Vietnam
/mapa.html?trail=collico1             → Abre panel Collico 1
/mapa.html?trail=el_muro              → Abre panel El Muro
/mapa.html?ruta=cascada               → Activa ruta planificada La Cascada
```

---

## Replicación a otros parques

Este repo está diseñado para replicarse a otros parques del programa ARAUCO Bosque Abierto. Cambiar SOLO:

1. `assets/config.js` — valores de `PARQUE_CONFIG` (id, nombre, locKey, ubicacion, centro, totem, bbox)
2. `assets/senderos.js` — datos del parque nuevo
3. Crear Firebase project + Apps Script + PIN nuevos (ver SETUP-BACKEND.md)

Ningún otro archivo requiere cambios. Los HTMLs, el `cc.js`, el `sw.js` se adaptan solos.

---

## Notas técnicas

### Service Worker — Estrategia híbrida

- **App shell + tiles ESRI**: cache-first (siempre offline)
- **Firebase + Apps Script**: network-only (NUNCA se cachean — son data en vivo)
- **Pre-cache automático**: 455 tiles del bbox al cargar `mapa.html` (~6.7 MB en cuota iOS)
- **Re-cache automático**: tras 5 días (anticipa borrado de cache iOS a los 7 días)

### Feature detection en `cc.js`

Todas las APIs son verificadas antes de uso para que la app degrade silenciosamente en dispositivos sin soporte:

- TTS — Android, iOS 7+
- Wake Lock — iOS 16.4+, Android 8.4+ (no romper en iOS <16.4)
- Vibrate — Android (silencioso en iOS, no existe)
- Geolocation — universal
- Service Worker + Cache API — universal en browsers modernos

### Inversión de coordenadas

Algunos senderos vienen del KMZ con sus coords en sentido inverso al recorrido natural:

- **El Muro**: trazado KMZ va de arriba a abajo, pero el sendero se camina de abajo (río) a arriba. → `coords` están invertidos en `senderos.js`.
- **Chela Track** y **Los Pinos** (sub-segmentos): sus puntos de inicio en el KMZ caen en índices mayores que sus puntos de fin sobre el track padre Collico 1. → Field `invertir: true` en `SUBSEGMENTOS`, el slice se computa correctamente.

---

## Créditos

| Rol | |
|---|---|
| Cliente | ARAUCO |
| Programa | ARAUCO Bosque Abierto |
| Contacto cliente | Juan Anzieta |
| Datos KMZ | Valdivia Trail (Alex Padilla) |
| Desarrollo | Gravitas Solutions · Dos Ruedas SpA |
| Lead Dev | Pablo (`@horta30`) |
| Versión | COLLICO Bosque Abierto v2.0 · Mayo 2026 |
