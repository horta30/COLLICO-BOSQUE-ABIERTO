// =============================================================================
// COLLICO BOSQUE ABIERTO — config.js
// CONFIGURACIÓN CENTRALIZADA — replicable a otros parques ARAUCO
// =============================================================================
//
// PARA REPLICAR ESTE SISTEMA A OTRO PARQUE:
//   1. Duplica este archivo y modifica los valores en PARQUE_CONFIG
//   2. Crea un Firebase project nuevo y pega su config en FIREBASE_CONFIG
//   3. Crea un Google Apps Script nuevo y pega su URL en APPS_SCRIPT_URL
//   4. Cambia el PIN_SUPERVISOR
//   5. Reemplaza assets/senderos.js con los datos del nuevo parque
//   6. Listo — ningún otro archivo del proyecto requiere cambios
//
// =============================================================================

const PARQUE_CONFIG = {
  // --- Identificación del parque ---
  id:        'collico',
  nombre:    'Parque Collico',
  subtitulo: 'Valdivia · Bosque Nativo',
  programa:  'ARAUCO Bosque Abierto',

  // --- Identificadores para registro (Apps Script + Sheet) ---
  ubicacion: 'Parque Collico · Valdivia',
  locKey:    'collico',

  // --- Geografía del parque ---
  // VISTA INICIAL DEL DEPLOY (calibrada a "Vista SI" de Pablo):
  //   El parque es una franja NE-SW; vista calibrada para mostrarla en diagonal
  //   con la Cumbre arriba y el Acceso Principal abajo.
  //   bearing 250° → norte sale por abajo-izquierda (la cámara mira hacia el WSW)
  //   pitch 30° → tilt 3D moderado para sensación de relieve sin distorsionar íconos
  // El usuario puede rotar libre con 2 dedos y volver a esta vista con long-press en ⌖
  centro:        [-73.180, -39.8265],        // [lng, lat] — centro vertical entre Cumbre y Kunstmann
  zoom_inicial:  13.8,                       // desktop: muestra la franja completa con margen
  zoom_mobile:   13.5,                       // mobile: alejado para mostrar TODO el parque + contexto Valdivia
  bearing_inicial: 85,                       // ajuste de Pablo (v17)
  pitch_inicial:   30,                       // tilt 3D moderado
  totem:         { lng: -73.20285, lat: -39.81886 },

  // Bounding box — usado por el Service Worker para pre-cachear tiles offline
  // 4.95 km E-W × 3.10 km N-S = ~15.3 km²
  bbox: {
    sw: [-73.20396, -39.84438],   // [lng, lat] esquina suroeste
    ne: [-73.14599, -39.81653]    // [lng, lat] esquina noreste
  },

  // --- Métricas del parque (calculadas en base a senderos.js) ---
  total_km:        29.7,
  total_senderos:  14,
  total_subsegmentos: 3,

  // --- Disciplinas soportadas en este parque ---
  // RP = Ripio (camino vehicular)
  // TR = Trail / Trekking / Caminata
  // XC = Cross Country MTB
  // DH = Downhill MTB
  disciplinas_disponibles: ['TR', 'XC', 'DH', 'RP'],
};


// =============================================================================
// FIREBASE — Realtime Database para tracking GPS en vivo
// =============================================================================
// ⚠️ COMPLETAR con los valores de TU Firebase project
// Pasos:
//   1. console.firebase.google.com → "Add project" → nombre: collico-bosque-abierto
//   2. Build → Realtime Database → Create database → "Test mode" (reglas: read/write = true)
//   3. Project Settings → "Your apps" → "Web app" → registra app → copia firebaseConfig
//   4. Pega el objeto firebaseConfig completo abajo
//
const FIREBASE_CONFIG = {
  apiKey:            "AIzaSyCcmmi1ar9x-T2bph6bv4iSy9NE-XjAz3Y",
  authDomain:        "collico-bosque-abierto.firebaseapp.com",
  databaseURL:       "https://collico-bosque-abierto-default-rtdb.firebaseio.com",
  projectId:         "collico-bosque-abierto",
  storageBucket:     "collico-bosque-abierto.firebasestorage.app",
  messagingSenderId: "493100624688",
  appId:             "1:493100624688:web:9434e1562a8d00062cf6f5",
  measurementId:     "G-CGCN6FYGNT"
};


// =============================================================================
// GOOGLE APPS SCRIPT — endpoint POST para registro de visitantes
// =============================================================================
// ⚠️ COMPLETAR con la URL de TU deployment
// Pasos detallados en SETUP-BACKEND.md
//
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyPC8xTiy-KRl5-TF7Cy6Q2M9NfZuY2LLrKKiVfxcsECCrAJ4uWrRVkIy00eG8SnDca8w/exec';


// =============================================================================
// PIN — Acceso al panel supervisor.html
// =============================================================================
// ⚠️ DEFINIR un PIN de 4 dígitos para el equipo del parque
//
const PIN_SUPERVISOR = '9999';


// =============================================================================
// TILES — Servidores de tiles del mapa
// =============================================================================
const TILES_CONFIG = {
  satellite: {
    label: 'Satélite',
    url:   'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '© ESRI © OpenStreetMap'
  },
  topo: {
    label: 'Topo',
    url:   'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
    attribution: '© ESRI'
  },
  streets: {
    label: 'Calles',
    url:   'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '© OpenStreetMap'
  }
};


// =============================================================================
// OFFLINE — configuración del pre-cache de tiles (Service Worker)
// =============================================================================
const OFFLINE_CONFIG = {
  enabled: true,
  // Zooms a pre-cachear — el rango actual cubre desde panorámica (z13)
  // hasta detalle de sendero (z17). Total: ~455 tiles × ~15KB ≈ 6.7 MB
  zoom_min: 13,
  zoom_max: 17,
  // Solo se pre-cachean los tiles del estilo "default" para ahorrar cuota
  default_style: 'satellite',
  // Re-cachear automáticamente si han pasado X días desde último cache
  // (iOS borra cache ~7 días, así que 5 días es prudente)
  recache_after_days: 5
};


// =============================================================================
// EXPORTACIONES — disponibles globalmente para todos los HTML
// =============================================================================
window.PARQUE_CONFIG    = PARQUE_CONFIG;
window.FIREBASE_CONFIG  = FIREBASE_CONFIG;
window.APPS_SCRIPT_URL  = APPS_SCRIPT_URL;
window.PIN_SUPERVISOR   = PIN_SUPERVISOR;
window.TILES_CONFIG     = TILES_CONFIG;
window.OFFLINE_CONFIG   = OFFLINE_CONFIG;
