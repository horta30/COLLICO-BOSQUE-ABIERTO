// =============================================================================
// COLLICO BOSQUE ABIERTO — offline.js
// 
// Cliente del Service Worker. Responsabilidades:
//   1. Registrar sw.js silenciosamente al cargar la página
//   2. Calcular la lista de URLs de tiles del bbox del parque (zoom 13-17)
//   3. Enviar al SW la orden de pre-cachear esas tiles
//   4. Recibir progreso y exponer estado via window.OfflineManager
//   5. Re-cachear automáticamente si han pasado >5 días desde el último cache
// 
// API expuesta (para el indicador "Mapa listo offline ✓"):
//   window.OfflineManager.getState()  → { ready, progress, lastCached, online }
//   window.OfflineManager.onChange(cb) → suscripción a cambios de estado
//   window.OfflineManager.recache()    → forzar re-descarga
// =============================================================================

window.OfflineManager = (() => {
  'use strict';

  const STORAGE_KEY = 'cba_offline_status';

  const _state = {
    supported:    'serviceWorker' in navigator && 'caches' in window,
    registered:   false,
    precaching:   false,
    ready:        false,        // true = tiles del bbox cacheados
    progress:     { done: 0, total: 0, ok: 0, fail: 0 },
    lastCached:   null,         // timestamp ms
    online:       navigator.onLine,
    error:        null
  };

  const _listeners = [];
  function _emit() {
    _listeners.forEach(cb => { try { cb(_state); } catch(e){} });
  }
  function onChange(cb) {
    _listeners.push(cb);
    cb(_state);
    return () => {
      const i = _listeners.indexOf(cb);
      if (i >= 0) _listeners.splice(i, 1);
    };
  }

  // Online/offline
  window.addEventListener('online',  () => { _state.online = true;  _emit(); });
  window.addEventListener('offline', () => { _state.online = false; _emit(); });


  // ─────────────────────────────────────────────────────────────────────────
  // Registro del Service Worker
  // ─────────────────────────────────────────────────────────────────────────
  async function register() {
    if (!_state.supported) {
      _state.error = 'No soportado';
      _emit();
      return;
    }
    try {
      const reg = await navigator.serviceWorker.register('./sw.js');
      _state.registered = true;

      // Cargar estado previo de cache
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const saved = JSON.parse(raw);
          _state.lastCached = saved.lastCached || null;
          _state.ready     = saved.ready || false;
        }
      } catch(e) {}

      // Escuchar mensajes del SW
      navigator.serviceWorker.addEventListener('message', _onSWMessage);

      _emit();
    } catch (e) {
      _state.error = e.message;
      _emit();
    }
  }

  function _onSWMessage(event) {
    const { type, done, total, ok, fail, timestamp } = event.data || {};

    if (type === 'PRECACHE_PROGRESS') {
      _state.progress = { done, total, ok, fail };
      _emit();
    } else if (type === 'PRECACHE_DONE') {
      _state.precaching = false;
      _state.progress   = { done, total, ok, fail };
      _state.ready      = (ok > total * 0.85);  // 85% éxito mínimo
      _state.lastCached = timestamp || Date.now();
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
          ready: _state.ready,
          lastCached: _state.lastCached
        }));
      } catch(e) {}
      _emit();
    }
  }


  // ─────────────────────────────────────────────────────────────────────────
  // Cálculo de tiles del bounding box
  // ─────────────────────────────────────────────────────────────────────────
  function _lng2tile(lng, z) { return Math.floor((lng + 180) / 360 * Math.pow(2, z)); }
  function _lat2tile(lat, z) {
    const r = lat * Math.PI / 180;
    return Math.floor((1 - Math.log(Math.tan(r) + 1/Math.cos(r)) / Math.PI) / 2 * Math.pow(2, z));
  }

  /**
   * Genera la lista de URLs de tiles a pre-cachear según PARQUE_CONFIG.bbox
   * y OFFLINE_CONFIG (zoom_min, zoom_max, default_style).
   */
  function _buildTileUrls() {
    if (typeof window.PARQUE_CONFIG === 'undefined' ||
        typeof window.OFFLINE_CONFIG === 'undefined' ||
        typeof window.TILES_CONFIG === 'undefined') {
      return [];
    }

    const bbox = window.PARQUE_CONFIG.bbox;
    const cfg  = window.OFFLINE_CONFIG;
    const tileTemplate = window.TILES_CONFIG[cfg.default_style].url;

    const urls = [];
    for (let z = cfg.zoom_min; z <= cfg.zoom_max; z++) {
      const x0 = _lng2tile(bbox.sw[0], z);
      const x1 = _lng2tile(bbox.ne[0], z);
      const y0 = _lat2tile(bbox.ne[1], z);  // norte = y menor
      const y1 = _lat2tile(bbox.sw[1], z);

      for (let x = Math.min(x0,x1); x <= Math.max(x0,x1); x++) {
        for (let y = Math.min(y0,y1); y <= Math.max(y0,y1); y++) {
          const url = tileTemplate
            .replace('{z}', z)
            .replace('{x}', x)
            .replace('{y}', y);
          urls.push(url);
        }
      }
    }
    return urls;
  }


  // ─────────────────────────────────────────────────────────────────────────
  // Pre-cache de tiles del parque
  // 
  // Decide automáticamente si hace falta re-cachear:
  //   - Nunca cacheado → SÍ
  //   - Hace > N días → SÍ (configurable: OFFLINE_CONFIG.recache_after_days)
  //   - Offline → NO (no hay red, igual no funcionaría)
  // ─────────────────────────────────────────────────────────────────────────
  async function precacheTiles(force) {
    if (!_state.registered || !_state.online) return false;
    if (_state.precaching) return false;
    if (typeof window.OFFLINE_CONFIG !== 'undefined' && !window.OFFLINE_CONFIG.enabled) return false;

    // ¿Es necesario re-cachear?
    if (!force && _state.ready && _state.lastCached) {
      const daysSince = (Date.now() - _state.lastCached) / 86400000;
      const recacheAfter = (window.OFFLINE_CONFIG && window.OFFLINE_CONFIG.recache_after_days) || 5;
      if (daysSince < recacheAfter) {
        // Ya está fresco, no hacer nada
        return true;
      }
    }

    const urls = _buildTileUrls();
    if (!urls.length) return false;

    _state.precaching = true;
    _state.progress   = { done: 0, total: urls.length, ok: 0, fail: 0 };
    _emit();

    // Esperar a que el SW esté activo
    const reg = await navigator.serviceWorker.ready;
    if (!reg.active) return false;

    reg.active.postMessage({ type: 'PRECACHE_TILES', urls });
    return true;
  }


  // ─────────────────────────────────────────────────────────────────────────
  // API pública
  // ─────────────────────────────────────────────────────────────────────────
  return {
    register,
    precacheTiles,
    recache: () => precacheTiles(true),
    getState: () => Object.assign({}, _state),
    onChange,

    // Helper: badge HTML para mostrar el estado en topbar
    // Devuelve un string que se actualiza solo al cambiar el estado.
    renderBadge: function(containerEl) {
      if (!containerEl) return;
      const update = (s) => {
        let icon, text, color;
        if (!s.supported)            { icon='–'; text='Sin offline';        color='#666'; }
        else if (s.precaching)       {
          const pct = s.progress.total ? Math.round(s.progress.done / s.progress.total * 100) : 0;
          icon='↓'; text=`Descargando mapa ${pct}%`; color='#0d47a1';
        }
        else if (s.ready)            { icon='✓'; text='Mapa listo offline'; color='#1b5e20'; }
        else if (!s.online)          { icon='⚠'; text='Sin señal';          color='#bf360c'; }
        else                          { icon='○'; text='Mapa online';        color='#666'; }

        containerEl.style.cssText = `
          display:inline-flex; align-items:center; gap:6px;
          padding:4px 10px; border-radius:12px;
          background:${color}22; color:${color};
          font-size:11px; font-weight:600; font-family:'Inter',sans-serif;
        `;
        containerEl.textContent = icon + ' ' + text;
      };
      onChange(update);
    }
  };
})();
