// =============================================================================
// COLLICO BOSQUE ABIERTO — cc.js (Collico Companion)
// Módulo autocontenido: TTS · Geofence · Toast · Wake Lock · Bienvenida
// 
// Diseñado con FEATURE DETECTION para que falle silenciosamente en dispositivos
// que no soporten alguna API (ej. iOS no tiene navigator.vibrate, iOS < 16.4
// no tiene Wake Lock, etc.). El núcleo crítico (mapa + GPS) NUNCA depende
// de estas APIs.
// 
// Depende de: assets/senderos.js (PARQUE_CONFIG, SENDEROS)
// =============================================================================

window.CC = (() => {
  'use strict';

  // ─────────────────────────────────────────────────────────────────────────
  // 1. AUDIO TTS — Síntesis de voz español Chileno (es-CL)
  // ─────────────────────────────────────────────────────────────────────────
  let _audioEnabled  = true;
  let _audioUnlocked = false;
  const _ttsAvailable = ('speechSynthesis' in window) && ('SpeechSynthesisUtterance' in window);
  const _queue       = [];
  let   _speaking    = false;

  /**
   * Desbloquea TTS en iOS — REQUIERE un gesto del usuario activo (no passive).
   * Se llama desde el overlay de "primer toque" en mapa.html.
   */
  function unlockAudio() {
    if (_audioUnlocked || !_ttsAvailable) return;
    _audioUnlocked = true;
    // Truco iOS: utterance silente con volumen 0 desbloquea la cola
    const u = new SpeechSynthesisUtterance('');
    u.volume = 0; u.lang = 'es-CL';
    window.speechSynthesis.speak(u);
  }

  function _bestVoice() {
    if (!_ttsAvailable) return null;
    const voices = window.speechSynthesis.getVoices();
    return voices.find(v => v.lang === 'es-CL')
        || voices.find(v => v.lang.startsWith('es-CL'))
        || voices.find(v => v.lang.startsWith('es-'))
        || null;
  }

  function _buildU(texto) {
    const u = new SpeechSynthesisUtterance(texto);
    u.lang = 'es-CL'; u.rate = 0.95; u.pitch = 1.0; u.volume = 1.0;
    const v = _bestVoice(); if (v) u.voice = v;
    return u;
  }

  function _playNext() {
    if (!_queue.length) { _speaking = false; return; }
    _speaking = true;
    const texto = _queue.shift();
    const u = _buildU(texto);
    u.onend = u.onerror = _playNext;
    window.speechSynthesis.speak(u);
  }

  /**
   * Sintetiza texto en voz.
   * @param {string}  texto
   * @param {boolean} prioridad — true: cancela y habla ya (peligros, alertas)
   *                               false: encola (inicio/fin/POI, bienvenida)
   */
  function speak(texto, prioridad) {
    if (!_audioEnabled || !_ttsAvailable) return;
    if (prioridad) {
      window.speechSynthesis.cancel();
      _queue.length = 0;
      _speaking = false;
      const u = _buildU(texto);
      u.onend = u.onerror = _playNext;
      _speaking = true;
      window.speechSynthesis.speak(u);
    } else {
      _queue.push(texto);
      if (!_speaking) _playNext();
    }
  }

  function toggleAudio() {
    unlockAudio();
    _audioEnabled = !_audioEnabled;
    const btn = document.getElementById('btn-audio-toggle');
    if (btn) {
      btn.textContent = _audioEnabled ? '🔊' : '🔇';
      btn.classList.toggle('audio-off', !_audioEnabled);
      btn.title = _audioEnabled ? 'Audio ON' : 'Audio OFF';
    }
    if (!_audioEnabled && _ttsAvailable) {
      window.speechSynthesis.cancel();
      _queue.length = 0;
      _speaking = false;
    }
  }

  function isAudioAvailable() { return _ttsAvailable; }

  // Pre-cargar voces (Firefox/Chrome cargan asíncrono)
  if (_ttsAvailable && window.speechSynthesis.onvoiceschanged !== undefined) {
    window.speechSynthesis.onvoiceschanged = () => {};
  }


  // ─────────────────────────────────────────────────────────────────────────
  // 2. GEOFENCE — Alertas de proximidad
  // ─────────────────────────────────────────────────────────────────────────
  const RADIO_GEOFENCE_M = 50;            // Radio de detección activa
  const _visited         = new Set();     // IDs activados esta sesión

  function _distMeters(la1, lo1, la2, lo2) {
    const R  = 6371000;
    const p1 = la1 * Math.PI / 180, p2 = la2 * Math.PI / 180;
    const dp = (la2-la1) * Math.PI / 180, dl = (lo2-lo1) * Math.PI / 180;
    const a  = Math.sin(dp/2)**2 + Math.cos(p1)*Math.cos(p2)*Math.sin(dl/2)**2;
    return R * 2 * Math.asin(Math.sqrt(a));
  }

  /**
   * Verifica si el usuario está dentro de algún geofence y dispara alerta.
   * 
   * LÓGICA DEL MÁS CERCANO:
   * Si la persona está dentro de VARIOS geofences simultáneamente (zonas
   * donde se solapan radios, como el acceso al Tótem o transiciones entre
   * senderos), solo se dispara la alerta del geofence cuyo CENTRO esté
   * más cercano al GPS de la persona. Los demás se ignoran en este tick.
   *
   * Cada geofence se activa máximo UNA VEZ por sesión. Si después la
   * persona avanza y entra exclusivamente en otro geofence (que aún no
   * se ha disparado), ese se dispara normalmente.
   *
   * Esto resuelve los conflictos de proximidad sin necesidad de radios
   * súper chicos — es el mismo enfoque de Wikiloc/Strava.
   */
  function checkGeofences(userLat, userLng) {
    if (typeof window.SENDEROS === 'undefined') return;

    // 1. Recolectar TODOS los geofences donde la persona está dentro del radio
    const activos = [];
    for (const s of window.SENDEROS) {
      if (!s.geofence) continue;

      if (s.geofence.inicio) {
        const key = s.id + '_inicio';
        const d   = _distMeters(userLat, userLng, s.geofence.inicio.lat, s.geofence.inicio.lng);
        if (d <= (s.geofence.inicio.radio || RADIO_GEOFENCE_M)) {
          activos.push({ key, sendero: s, tipo: 'inicio', distancia: d });
        }
      }
      if (s.geofence.fin) {
        const key = s.id + '_fin';
        const d   = _distMeters(userLat, userLng, s.geofence.fin.lat, s.geofence.fin.lng);
        if (d <= (s.geofence.fin.radio || RADIO_GEOFENCE_M)) {
          activos.push({ key, sendero: s, tipo: 'fin', distancia: d });
        }
      }
    }

    if (activos.length === 0) return;

    // 2. Filtrar los que aún NO se dispararon en esta sesión
    const candidatos = activos.filter(a => !_visited.has(a.key));
    if (candidatos.length === 0) return;

    // 3. Disparar SOLO el de centro más cercano
    candidatos.sort((a, b) => a.distancia - b.distancia);
    const winner = candidatos[0];
    _visited.add(winner.key);
    _triggerAlert(winner.sendero, winner.tipo);
  }

  function _triggerAlert(s, tipo) {
    const emoji = s.emoji || '📍';
    let audioMsg, toastMsg, level, dur;

    if (tipo === 'inicio') {
      audioMsg  = `Entrando a ${s.nombre}. ${s.dificultad}. ${s.dist_km} kilómetros.`;
      toastMsg  = `${emoji} Inicio: ${s.nombre} · ${s.dificultad} · ${s.dist_km} km`;
      level     = 'normal';
      dur       = 5000;
    } else {
      audioMsg  = `Llegando al fin de ${s.nombre}. Buen recorrido.`;
      toastMsg  = `${emoji} Fin de ${s.nombre} ¡Bien hecho!`;
      level     = 'normal';
      dur       = 4500;
    }

    // Vibración (Android, no iOS — feature detection silenciosa)
    if ('vibrate' in navigator) {
      try { navigator.vibrate([100, 50, 100]); } catch(e) {}
    }

    speak(audioMsg, false);
    showToast(toastMsg, level, dur);
  }


  // ─────────────────────────────────────────────────────────────────────────
  // 3. TOAST visual — Banner animado top
  // ─────────────────────────────────────────────────────────────────────────
  let _toastEl    = null;
  let _toastTimer = null;

  function _ensureToast() {
    if (_toastEl) return;
    _toastEl = document.createElement('div');
    _toastEl.className = 'collico-toast';
    // Estilos inline para no depender del CSS externo
    _toastEl.style.cssText = `
      position:fixed; top:80px; left:50%; transform:translateX(-50%) translateY(-20px);
      max-width:90%; padding:12px 18px;
      background:#1b5e20; color:#fff;
      border-radius:24px; font-family:'Inter',sans-serif;
      font-size:14px; font-weight:600;
      box-shadow:0 8px 24px rgba(0,0,0,.4);
      opacity:0; pointer-events:none;
      transition:opacity .3s, transform .3s;
      z-index:9999; text-align:center; line-height:1.4;
    `;
    document.body.appendChild(_toastEl);
  }

  /**
   * Muestra un toast animado.
   * @param {string} msg
   * @param {'normal'|'alert'|'danger'|'info'} nivel
   * @param {number} duracion ms (default 3500)
   */
  function showToast(msg, nivel, duracion) {
    nivel    = nivel    || 'normal';
    duracion = duracion || 3500;
    _ensureToast();
    clearTimeout(_toastTimer);
    const colors = {
      normal: '#1b5e20',
      info:   '#0d47a1',
      alert:  '#bf360c',
      danger: '#b71c1c'
    };
    _toastEl.style.background = colors[nivel] || colors.normal;
    _toastEl.textContent = msg;
    // Re-trigger animation
    _toastEl.style.opacity = '1';
    _toastEl.style.transform = 'translateX(-50%) translateY(0)';
    _toastTimer = setTimeout(() => {
      _toastEl.style.opacity = '0';
      _toastEl.style.transform = 'translateX(-50%) translateY(-20px)';
    }, duracion);
  }


  // ─────────────────────────────────────────────────────────────────────────
  // 4. WAKE LOCK — Pantalla siempre activa
  // ─────────────────────────────────────────────────────────────────────────
  const _wakeLockAvailable = ('wakeLock' in navigator);
  let _wakeLock = null;

  async function requestWakeLock() {
    if (!_wakeLockAvailable || _wakeLock) return false;
    try {
      _wakeLock = await navigator.wakeLock.request('screen');
      _wakeLock.addEventListener('release', () => {
        _wakeLock = null;
        // Re-arma al volver el foco a la pestaña
        if (document.visibilityState === 'visible') {
          requestWakeLock();
        }
      });
      return true;
    } catch (e) {
      return false;
    }
  }

  async function releaseWakeLock() {
    if (_wakeLock) {
      try { await _wakeLock.release(); } catch(e) {}
      _wakeLock = null;
    }
  }

  function isWakeLockAvailable() { return _wakeLockAvailable; }

  // ─────────────────────────────────────────────────────────────────────────
  // 5. VISIBILITY CHANGE — Reanuda lo necesario al volver de background
  // 
  // Crítico para iOS: cuando la pestaña pierde foco (llamada, otra app),
  // iOS suspende JS y libera el wake lock. Al volver, hay que:
  //   1. Re-armar wake lock
  //   2. Notificar a quien escuche (ej. mapa.html re-arma watchPosition GPS)
  // ─────────────────────────────────────────────────────────────────────────
  const _visibilityListeners = [];

  function onVisibilityResume(callback) {
    _visibilityListeners.push(callback);
  }

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      // 1. Re-armar wake lock si estaba activo antes
      if (_wakeLockAvailable && !_wakeLock) {
        requestWakeLock();
      }
      // 2. Disparar listeners (GPS, Firebase, etc.)
      _visibilityListeners.forEach(cb => {
        try { cb(); } catch(e) { /* silencioso */ }
      });
    }
  });


  // ─────────────────────────────────────────────────────────────────────────
  // 6. BIENVENIDA personalizada (toast + TTS)
  // ─────────────────────────────────────────────────────────────────────────
  function _getNombre() {
    // De querystring o de sessionStorage
    const qs = new URLSearchParams(window.location.search).get('nombre');
    if (qs) return qs.trim();
    try {
      const v = sessionStorage.getItem('collico_v');
      if (v) return (JSON.parse(v).nombre || '').trim();
    } catch(e) {}
    return '';
  }

  /** Toast inmediato al cargar la página. */
  function showToastBienvenida() {
    const nombre = _getNombre();
    const parque = (typeof window.PARQUE_CONFIG !== 'undefined' && window.PARQUE_CONFIG.nombre) || 'Parque Collico';
    const msg    = nombre
      ? `👋 ¡Hola, ${nombre}! Bienvenido al ${parque}`
      : `🌿 Bienvenido al ${parque}`;
    showToast(msg, 'normal', 5500);
  }

  /** TTS de bienvenida — se llama después del primer gesto (audio desbloqueado). */
  function speakBienvenida() {
    const nombre = _getNombre();
    const parque = (typeof window.PARQUE_CONFIG !== 'undefined' && window.PARQUE_CONFIG.nombre) || 'Parque Collico';
    const total  = (typeof window.PARQUE_CONFIG !== 'undefined' && window.PARQUE_CONFIG.total_senderos) || 12;
    let msg;
    if (nombre) {
      msg = `Bienvenido ${nombre}. Tienes ${total} senderos disponibles en ${parque}. GPS activado.`;
    } else {
      msg = `Bienvenido al ${parque}. Explora el bosque con seguridad. GPS activado.`;
    }
    speak(msg, false);
  }


  // ─────────────────────────────────────────────────────────────────────────
  // 7. INDICADOR DE CAPACIDADES — para debugging y para el badge UI
  // ─────────────────────────────────────────────────────────────────────────
  function getCapabilities() {
    return {
      tts:         _ttsAvailable,
      wakeLock:    _wakeLockAvailable,
      vibrate:     'vibrate' in navigator,
      geolocation: 'geolocation' in navigator,
      serviceWorker: 'serviceWorker' in navigator,
      cacheAPI:    'caches' in window,
      online:      navigator.onLine
    };
  }


  // ─────────────────────────────────────────────────────────────────────────
  // API PÚBLICA
  // ─────────────────────────────────────────────────────────────────────────
  return {
    // Audio
    speak, unlockAudio, toggleAudio, isAudioAvailable,
    // Geofence
    checkGeofences,
    // Toast
    showToast,
    // Wake Lock
    requestWakeLock, releaseWakeLock, isWakeLockAvailable,
    // Visibility
    onVisibilityResume,
    // Bienvenida
    showToastBienvenida, speakBienvenida,
    // Misc
    getCapabilities
  };
})();
