/* =============================================================================
   DEV NAV — Panel flotante de navegación libre entre páginas
   Activación: agregar ?dev=1 (o ?demo=1) a cualquier URL del proyecto
   
   Uso en una página:
     <script src="assets/devnav.js"></script>
   
   El script se autoejecuta. Si NO hay ?dev=1 en la URL, no hace nada.
   ============================================================================= */
(function(){
  const isDev = /[?&](dev|demo)=1/.test(location.search);
  if (!isDev) return;
  
  // Marcar el HTML para que cualquier CSS específico de dev se active
  document.documentElement.dataset.devMode = '1';
  
  // Detectar página actual para resaltarla
  const here = (location.pathname.split('/').pop() || 'landing.html').toLowerCase();
  
  // Helpers de URL: mantener ?dev=1 al saltar entre páginas
  const link = (file) => file + '?dev=1';
  
  // Construir DOM cuando esté listo
  const build = () => {
    if (document.getElementById('devnav')) return;
    
    const panel = document.createElement('div');
    panel.id = 'devnav';
    panel.innerHTML = `
      <span class="dn-lbl">DEV</span>
      <a href="${link('landing.html')}"   data-page="landing.html"   ${here.includes('landing')   ? 'data-active="1"' : ''}>Landing</a>
      <a href="${link('registro.html')}"  data-page="registro.html"  ${here.includes('registro')  ? 'data-active="1"' : ''}>Registro</a>
      <a href="${link('mapa.html')}"      data-page="mapa.html"      ${here.includes('mapa')      ? 'data-active="1"' : ''}>Mapa</a>
      <a href="${link('supervisor.html')}" data-page="supervisor.html" ${here.includes('supervisor') ? 'data-active="1"' : ''}>Supervisor</a>
      <button id="dn-reset" title="Limpiar sessionStorage y recargar">🧹</button>
      <button id="dn-close" title="Cerrar este panel (queda dev mode activo)">×</button>
    `;
    document.body.appendChild(panel);
    
    document.getElementById('dn-reset').onclick = () => {
      sessionStorage.clear();
      alert('sessionStorage limpiado · recargando...');
      location.reload();
    };
    document.getElementById('dn-close').onclick = () => panel.remove();
  };
  
  // Inyectar CSS una sola vez
  const css = `
    #devnav {
      position:fixed; bottom:12px; left:12px; z-index:99999;
      display:flex; gap:6px; align-items:center; flex-wrap:wrap;
      background:rgba(8,12,10,0.94); backdrop-filter:blur(8px);
      padding:7px 10px; border-radius:10px;
      border:1px solid rgba(62,201,167,.35);
      font-family:Inter,system-ui,sans-serif; font-size:12px; color:#F5F9F7;
      box-shadow:0 6px 20px rgba(0,0,0,.45);
      max-width:calc(100vw - 24px);
    }
    #devnav .dn-lbl {
      font-size:9px; letter-spacing:1.5px; opacity:.55;
      text-transform:uppercase; font-weight:700; padding-right:4px;
      border-right:1px solid rgba(255,255,255,.12); margin-right:2px;
    }
    #devnav a {
      color:#3EC9A7; text-decoration:none; font-weight:600;
      padding:4px 9px; border-radius:5px;
      background:rgba(62,201,167,.10);
      transition:background .15s;
    }
    #devnav a:hover { background:rgba(62,201,167,.22); }
    #devnav a[data-active="1"] {
      background:#3EC9A7; color:#080C0A;
    }
    #devnav button {
      background:rgba(245,249,247,.08); color:#F5F9F7;
      border:none; padding:4px 8px; border-radius:5px;
      font-size:12px; cursor:pointer; font-family:inherit;
      transition:background .15s;
    }
    #devnav button:hover { background:rgba(245,249,247,.16); }
    #devnav #dn-reset { background:rgba(220,38,38,.18); color:#FCA5A5; }
    #devnav #dn-reset:hover { background:rgba(220,38,38,.30); }
  `;
  const style = document.createElement('style');
  style.id = 'devnav-style';
  style.textContent = css;
  document.head.appendChild(style);
  
  if (document.body) build();
  else document.addEventListener('DOMContentLoaded', build);
  
  console.log('🛠️ Dev mode activo · panel de navegación visible · Reset = 🧹 · Cerrar = ×');
})();
