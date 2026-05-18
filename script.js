/**
 * PEQUEÑO SEMBRADOR V2.0 - LÓGICA DE INTERFAZ (Seda 2.0)
 */

// 1. Variables de Estado Global
let zm = 0.65;
let boxCount = 0; 
let cajaActiva = null; // 🎯 Brújula para saber qué estrofa está en edición
let ultimaPuchita = null; // Referencia al widget musical activo

// 2. Variables de Arrastre e Interfaz
let stationDragging = false, sX, sY;
let comDragging = false, cX, cY;
let colResizing = null; 
let resizeMode = ''; 
let mX_Col = 0, mY_Col = 0, startW = 0, startH = 0, startL = 0, startT = 0;
let prDragging = false, prX, prY;

// 3. Variables de Proyección
let indiceProyeccion = 0;
let listaParaProyectar = []; 

// --- CONEXIÓN Y ARRANQUE SEGURO CON CORTAFUEGOS ---
async function asegurarConexion() {
    // 1. Esperamos a que el puente Firebase esté inyectado en la ventana
    while(!window.fb) await new Promise(r => setTimeout(r, 100));
    
    // 2. Esperamos un instante a que onAuthStateChanged determine el rol oficial (admin/comunidad)
    while(typeof window.esSembradorMaestro === 'undefined') await new Promise(r => setTimeout(r, 50));
    
    // 3. Disparamos el cortafuegos para mutilar o mostrar botones según el rango detectado
    if (typeof aplicarRestriccionesUsuario === 'function') {
        aplicarRestriccionesUsuario();
    }
    
    // 4. Cargamos el catálogo de semillas (cantos) de forma segura
    cargarCatalogoNube();
}


/**
 * 🚀 EL PUENTE: Esta función ahora solo sirve de enlace 
 * con el motor externo 'acordes-engine.js'
 */
function addNoteChar(nota) {
    if (typeof sembrarAcordeWidget === "function") {
        sembrarAcordeWidget(nota);
    } else {
        console.error("🛰️ Motor de acordes no cargado.");
    }
}

/**
 * 🎨 ACTIVACIÓN VISUAL: Gestiona el brillo del acorde seleccionado
 */
function activarPuchita(el) {
    // Quitamos el brillo a todos los widgets del escenario
    document.querySelectorAll('.acorde-widget').forEach(p => p.classList.remove('activa'));
    
    ultimaPuchita = el; 
    el.classList.add('activa');
    console.log("📌 Widget anclado:", el.innerText);
}

// --- CONTROL DE PANELES ---
function togglePandora() {
    const p = document.getElementById('pandora');
    const t = document.getElementById('toggle-p');
    if (!p || !t) return;

    const currentLeft = p.style.left || "-340px";
    const opening = currentLeft === "-340px";

    p.style.left = opening ? "0px" : "-340px";
    t.style.left = opening ? "340px" : "0px";
    t.innerText = opening ? "❮" : "❯";
}
/**
 * 🎨 GESTIÓN DE IDENTIDAD Y ESTILOS
 */
function sID(id, val) {
    const el = document.getElementById(id);
    if (!el) return;
    
    if (id === 'v-titulo') {
        el.innerText = val.trim() !== "" ? val : "TÍTULO DEL CANTO";
    } else if (id === 'v-autor') {
        el.innerText = val.trim() !== "" ? val : "Autor / Compositor";
    }
}

function appS(prop, val) {
    const el = document.getElementById('obj-sel').value; // 't', 'a', 'l' o 'ac'
    
    // Inyectamos al ADN visual
    document.documentElement.style.setProperty('--' + el + '-' + prop, val);

    // Si ajustamos la Letra (l), sincronizamos las cajas
    if (prop === 'al' && el === 'l') { 
        document.querySelectorAll('.box-estrofa').forEach(box => {
            box.style.textAlignLast = "auto";
            if (val === 'optimize') {
                box.style.textAlign = "justify";
                box.style.textAlignLast = "left";
            } else {
                box.style.textAlign = val; 
            }
        });
        syncAlignButtons(val);
    } 

    if (prop === 'sz') {
        const badge = document.getElementById('sz-badge');
        if(badge) badge.innerText = val.replace('pt', '') + 'pt';
    }
}

function syncAlignButtons(val) {
    document.querySelectorAll('.al-btn').forEach(btn => {
        const onclickAttr = btn.getAttribute('onclick') || "";
        if (onclickAttr.includes(`'${val}'`)) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
}

function uLit(sel) {
    const opt = sel.options[sel.selectedIndex];
    const hex = opt.dataset.color;
    if (!hex) return;

    document.documentElement.style.setProperty('--accent', hex);
    
    const r = parseInt(hex.slice(1,3), 16), 
          g = parseInt(hex.slice(3,5), 16), 
          b = parseInt(hex.slice(5,7), 16);
    document.documentElement.style.setProperty('--accent-rgb', `${r},${g},${b}`);
    
    sel.classList.add('selected');

    const t = document.getElementById('v-testigo');
    if(t) { 
        t.innerText = sel.value; 
        t.style.background = hex; 
        t.style.display = "flex"; 
    }
}

/**
 * 📡 SENSORES DE ADN Y WIDGETS
 */
function checkADN() {
    const fichaVal = document.getElementById('in-ficha-l').value;
    const comVal = document.getElementById('in-comentario').value;

    const btnMaj = document.getElementById('btn-majestuoso');
    if(btnMaj) btnMaj.classList.toggle('activo', fichaVal.trim() !== "");

    const stCom = document.getElementById('st-com');
    const txtCom = document.getElementById('txt-com');
    if(stCom && txtCom) {
        const tieneTexto = comVal.trim() !== "";
        stCom.style.display = tieneTexto ? "flex" : "none";
        txtCom.innerText = comVal;
    }
}

function tglMajestuoso(show) {
    const m = document.getElementById('modal-majestuoso');
    if(show) {
        const val = document.getElementById('in-ficha-l').value;
        document.getElementById('txt-majestuoso').innerText = val;
    }
    if(m) m.style.display = show ? 'flex' : 'none';
}

function tglComPaleta() {
    if(comDragged) return;
    const b = document.getElementById('pal-com'); // Corregido: ID único del CSS
    if(b) b.style.display = (b.style.display === 'none' || b.style.display === '') ? 'block' : 'none';
}

/**
 * 🕹️ MOTOR DE ARRASTRE MULTIPLATAFORMA UNIFICADO (PROTOCOLO SEDA 3.0)
 */

// Extractor inteligente de coordenadas para soportar Mouse (Computadora) y Touch (Tableta/Móvil)
function obtenerCoordsSeda(e) {
    if (e.touches && e.touches.length > 0) {
        return { x: e.touches[0].clientX, y: e.touches[0].clientY, target: e.target };
    } else if (e.changedTouches && e.changedTouches.length > 0) {
        return { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY, target: e.target };
    }
    return { x: e.clientX, y: e.clientY, target: e.target };
}

// Fase 1: Captura e Inicio de Arrastre (Mousedown & Touchstart)
function procesarInicioArrastre(e) {
    // Cortafuegos: Evita que el arrastre interfiera si tocas dentro de los paneles de control
    if (e.target.closest('#pandora') || e.target.closest('#biblioteca') || 
        e.target.closest('#toggle-p') || e.target.closest('#toggle-b')) return;

    const coords = obtenerCoordsSeda(e);
    const zoomVal = zm || 0.65;
    
    // CORREGIDO: Mapeado al nuevo ID unificado de la paleta flotante
    const paletaFly = document.getElementById('paleta-fly');
    const modoSiembra = paletaFly ? paletaFly.classList.contains('estacion-visible') : false;

    // A. LA CABECERA DE LA PALETA FLOTANTE (🎹 CORREGIDO Y BLINDADO)
    const cabeceraFly = e.target.closest('#cabecera-fly');
    if (cabeceraFly && paletaFly) {
        // CORREGIDO: Filtro de permisos del Punto 2 (Un usuario común no puede arrastrar si está oculta)
        if (typeof esSembradorMaestro !== 'undefined' && !esSembradorMaestro && paletaFly.style.display === 'none') return;
        
        e.stopPropagation();
        stationDragging = true; 
        sX = coords.x - paletaFly.offsetLeft;
        sY = coords.y - paletaFly.offsetTop;
        return; 
    }

    // B. EL COMENTARIO DE LA MARIPOSA (💬)
    const comContainer = e.target.closest('#st-com');
    if (comContainer) {
        e.stopPropagation();
        comDragging = true; 
        cX = coords.x - comContainer.offsetLeft;
        cY = coords.y - comContainer.offsetTop;
        return; 
    }

    // C. EL PROYECTOR / CÁPSULA (🚀)
    const prCont = e.target.closest('#pr-container');
    if (prCont) {
        e.stopPropagation();
        prDragging = true;
        prX = coords.x - prCont.offsetLeft;
        prY = coords.y - prCont.offsetTop;
        return; 
    }

    // D. RADAR DE ESTROFAS (LEGO - CON CORTAFUEGOS DE SEGURIDAD)
    const box = e.target.closest('.box-estrofa');
    if (box) {
        // CORREGIDO: Filtro del Punto 2 (Si es cuenta de usuario común, las cajas quedan congeladas e inamovibles)
        if (typeof esSembradorMaestro !== 'undefined' && !esSembradorMaestro) return;

        // En modo siembra, las cajas no se mueven para dejar que el cursor fluya
        if (modoSiembra) {
            box.contentEditable = "true";
            cajaActiva = box; // 🎯 Marcamos la caja destino para los acordes
            return; 
        }

        if (box.contentEditable === "true") return;

        colResizing = box;
        const rect = box.getBoundingClientRect();
        const offX = (coords.x - rect.left) / zoomVal;
        const offY = (coords.y - rect.top) / zoomVal;

        // Detectar si el dedo/mouse toca la esquina inferior derecha para redimensionar o el centro para mover
        resizeMode = (offX > (box.offsetWidth - 25) && offY > (box.offsetHeight - 25)) ? 'both' : 'move';

        startL = parseInt(box.style.left) || 0;
        startT = parseInt(box.style.top) || 0;
        startW = box.offsetWidth;
        startH = box.offsetHeight;
        mX_Col = coords.x;
        mY_Col = coords.y;

        if (e.cancelable) e.preventDefault(); 
    }
}

// Fase 2: Desplazamiento Atómico en Tiempo Real (Mousemove & Touchmove)
function procesarMovimientoMaestro(e) {
    const coords = obtenerCoordsSeda(e);
    const zoomVal = zm || 0.65;

    // 1. Arrastre y Redimensión de Estrofas (Protegido por Rol Admin)
    if (colResizing && (typeof esSembradorMaestro === 'undefined' || esSembradorMaestro)) {
        const dx = (coords.x - mX_Col) / zoomVal;
        const dy = (coords.y - mY_Col) / zoomVal;

        if (resizeMode === 'move') {
            colResizing.style.left = (startL + dx) + 'px';
            colResizing.style.top = (startT + dy) + 'px';
            colResizing.style.setProperty('border', '2px dashed #00ff0d', 'important'); 
        } else {
            colResizing.style.setProperty('border', '2px solid #ffcc00', 'important');
            colResizing.style.width = (startW + dx) + 'px';
            colResizing.style.height = (startH + dy) + 'px';    
        }
        return;
    }

    // 2. Vuelo de la Estación de Acordes (CORREGIDO: Desplaza el ID de la paleta entera)
    if (stationDragging) {
        const paletaCompleta = document.getElementById('paleta-fly');
        if (paletaCompleta) { 
            paletaCompleta.style.left = (coords.x - sX) + 'px'; 
            paletaCompleta.style.top = (coords.y - sY) + 'px'; 
        }
    }
    
    // 3. Vuelo de la Mariposa de Comentarios
    if (comDragging) {
        const p = document.getElementById('st-com');
        if (p) { p.style.left = (coords.x - cX) + 'px'; p.style.top = (coords.y - cY) + 'px'; }
    }
    
    // 4. Vuelo de la Cápsula del Proyector
    if (prDragging) {
        const pr = document.getElementById('pr-container');
        if (pr) { 
            pr.style.left = (coords.x - prX) + 'px'; 
            pr.style.top = (coords.y - prY) + 'px'; 
            pr.style.bottom = 'auto'; 
        }
    }
}

// Fase 3: Liberación de Carga y Soltado (Mouseup & Touchend)
function procesarFinArrastre() {
    if (colResizing) {
        if (colResizing.contentEditable !== "true") {
            colResizing.style.border = "1px solid transparent"; // Restaura marco limpio e higiénico
        }
    }
    stationDragging = false;
    comDragging = false;
    prDragging = false;
    colResizing = null;
    resizeMode = '';
}

// --- ASIGNACIÓN DE LA MATRIZ DE SENSORES DUALES (ESCRITORIO + TABLETA) ---
document.addEventListener('mousedown', procesarInicioArrastre);
document.addEventListener('touchstart', procesarInicioArrastre, { passive: false });

document.addEventListener('mousemove', procesarMovimientoMaestro);
document.addEventListener('touchmove', procesarMovimientoMaestro, { passive: false });

document.addEventListener('mouseup', procesarFinArrastre);
document.addEventListener('touchend', procesarFinArrastre);


/**
 * 🛠️ INTERFAZ Y HERRAMIENTAS
 */
function tPS() { 
    const p = document.getElementById('paleta-fly');
    if (p) p.style.display = (p.style.display === 'none' || p.style.display === '') ? 'flex' : 'none'; 
}

function tPS_C() { 
    const p = document.getElementById('pal-com');
    if (p) p.style.display = (p.style.display === 'block') ? 'none' : 'block'; 
}

function aZ(v) { 
    zm += v; 
    document.documentElement.style.setProperty('--zoom-level', zm); 
    const txt = document.getElementById('zoom-txt');
    if(txt) txt.innerText = Math.round(zm*100)+'%';
}

function tH() { 
    let h2 = document.getElementById('hoja2'); 
    if(h2) h2.style.display = h2.style.display === 'none' ? 'block' : 'none'; 
}

function tglADN(s) {
    const modal = document.getElementById('modal-adn');
    if (modal) {
        modal.style.display = s ? 'flex' : 'none';
        if (s) document.getElementById('fuel-tank').focus();
    }
}

function tglPurga(s) {
    const m = document.getElementById('modal-purga');
    if (m) m.style.display = s ? 'flex' : 'none';
}

/**
 * 🧬 INYECCIÓN DE ADN (SISTEMA DE SIEMBRA MASIVA)
 */
function inyectarADN() {
    const raw = document.getElementById('fuel-tank').value;
    if (!raw.trim()) return;

    const bloques = raw.split(/\n\s*\n/);
    
    let xActual = 60;    
    let yActual = 200;   
    const limiteY = 950; 
    const gapX = 380;    
    const gapY = 20;     

    bloques.forEach((texto) => {
        if (texto.trim() !== "") {
            // Inyectamos texto puro, el nuevo paradigma no usa etiquetas dentro
            const htmlLimpio = `<p>${texto.trim().replace(/\n/g, '<br>')}</p>`;
            const nuevaCaja = crearCajaEstrofa(htmlLimpio);
            
            // Calculamos posición (Si es la primera vez, el offset puede ser 0, usamos un estimado)
            const altoEstimado = 100; 

            if (yActual + altoEstimado > limiteY) {
                if (xActual === 60) {
                    xActual += gapX;
                    yActual = 120; 
                }
            }

            nuevaCaja.style.left = xActual + 'px';
            nuevaCaja.style.top = yActual + 'px';
            
            yActual += altoEstimado + gapY;
        }
    });

    document.getElementById('fuel-tank').value = ""; 
    tglADN(false);
}
/**
 * 🧱 CONSTRUCCIÓN ATÓMICA: CREAR CAJA DE ESTROFA
 */
function crearCajaEstrofa(contenido = "Nueva estrofa...", index = 0) {
    boxCount++;
    const id = `box_${boxCount}`;
    const hoja1 = document.getElementById('hoja1');
    if (!hoja1) return;

    const caja = document.createElement('div');
    caja.id = id;
    caja.className = 'box-estrofa col'; 
    caja.contentEditable = "false"; 
    
    caja.style.left = '60px';
    caja.style.top = (220 + (index * 40)) + 'px'; 
    caja.innerHTML = contenido;

    // --- 1. ACCIÓN: CLIC / ARRASTRE ---
    caja.addEventListener('mousedown', function(e) {
        // Si el usuario da clic en la esquina de redimensión, no disparamos la edición de texto
        const rect = this.getBoundingClientRect();
        const offX = e.clientX - rect.left;
        const offY = e.clientY - rect.top;
        if (offX > (this.offsetWidth - 20) && offY > (this.offsetHeight - 20) && this.dataset.seleccionada === "true") {
            return; // Dejamos que actúe el tirador nativo
        }

        const paleta = document.getElementById('paleta-fly');
        const modoSiembra = paleta ? paleta.classList.contains('estacion-visible') : false;
        
        // Si no estamos en diseño amarillo, abrimos la edición de texto
        if (this.dataset.seleccionada !== "true") {
            this.contentEditable = "true";
            cajaActiva = this; 
        }

        // Si la estación no está abierta, mostramos el marcodashed de arrastre
        if (!modoSiembra && this.contentEditable !== "true") {
            this.style.border = "2px dashed #ffcc00"; 
            if (e.detail > 1) e.preventDefault(); 
        }

        const soltar = () => {
            if (this.dataset.seleccionada !== "true" && this.contentEditable !== "true") {
                this.style.border = "1px solid transparent";
            }
            window.removeEventListener('mouseup', soltar);
        };
        window.addEventListener('mouseup', soltar);
    });

    // --- 2. ACCIÓN: DOBLE CLIC (DISEÑO / REDIMENSIÓN CHICLE) ---
    caja.addEventListener('dblclick', function(e) {
        if (typeof toggleSeleccionMasiva === "function") toggleSeleccionMasiva(this);
        
        e.preventDefault(); 
        e.stopPropagation();
        
        this.contentEditable = "false"; 
        this.dataset.seleccionada = "true";
        // Al ponerse en true, el CSS enciende automáticamente el resize: both y el tirador
    });

    // --- 3. REGLA DE ORO: EL FOCO ---
    caja.addEventListener('blur', function(e) {
        const paleta = document.getElementById('paleta-fly');
        const modoSiembra = paleta ? paleta.classList.contains('estacion-visible') : false;
        
        if (modoSiembra) {
            if (e.relatedTarget && e.relatedTarget.closest('#paleta-fly')) return; 
        }
        
        // Al perder el foco limpiamos marcos, pero conservamos el tamaño estirado
        this.style.border = "1px solid transparent";
        if (!modoSiembra) {
            this.contentEditable = "false";
            this.dataset.seleccionada = "false";
            // Forzamos a que el overflow regrese a visible para que las notas altas no se recorten
            this.style.overflow = "visible"; 
        }
    });

    // --- 🚀 4. EL PEGAMENTO CUÁNTICO ---
    caja.addEventListener('input', () => {
        if (typeof refrescarPosicionAcordes === 'function') {
            refrescarPosicionAcordes(caja);
        }
    });

    hoja1.appendChild(caja);
    return caja; 
}
window.crearCajaEstrofa = crearCajaEstrofa;

/**
 * 🌪️ ESTACIÓN DE LIMPIEZA (PURGA - REPARADA Y BLINDADA)
 */
async function ejecutarPurga(nivel, idExtra = null) {
    if (!window.fb || !window.fb.db) return alert("🛰️ Sin conexión con la nube.");
    
    // 🚀 EXTRACCIÓN DINÁMICA: Si deleteDoc no viene desestructurado, usamos el motor global
    const db = window.fb.db;
    const doc = window.fb.doc;
    const funcionBorrar = window.fb.deleteDoc || window.fb.deleteObject; // Respaldo de compatibilidad

    switch(nivel) {
        case 'lienzo': 
            // 🚀 Limpieza Total de Objetos y Variables
            document.querySelectorAll('.box-estrofa').forEach(b => b.remove());
            document.getElementById('v-titulo').innerText = "TÍTULO DEL CANTO";
            document.getElementById('v-autor').innerText = "Autor / Compositor";
            document.getElementById('in-comentario').value = "";
            document.getElementById('in-ficha-l').value = "";
            
            boxCount = 0;
            cajaActiva = null;    // Reseteo de brújula
            ultimaPuchita = null; // Reseteo de motor musical
            
            if (typeof checkADN === 'function') checkADN();
            console.log("🧹 Escenario y Variables purificadas.");
            break;

        case 'busqueda': 
            if (document.getElementById('bus-txt')) document.getElementById('bus-txt').value = "";
            if (document.getElementById('bus-lit')) document.getElementById('bus-lit').value = "";
            if (document.getElementById('bus-tiempo')) document.getElementById('bus-tiempo').value = "";
            const lista = document.getElementById('lista-cantos');
            if (lista) lista.innerHTML = "<p style='opacity:0.2; text-align:center; font-size:11px;'>Buscador reseteado.</p>";
            break;

        case 'nube': 
            // Cortafuegos de seguridad por si el puente no ha cargado el método de borrado
            if (!funcionBorrar) {
                return alert("⚠️ El motor de borrado de Firebase aún no está asignado en la ventana. Revisa el HTML.");
            }

            const idABorrar = idExtra || document.getElementById('v-titulo').innerText.trim();
            if (idABorrar === "TÍTULO DEL CANTO" || idABorrar === "") return alert("⚠️ Selecciona un canto.");

            if (confirm(`🔥 ¿Borrar definitivamente "${idABorrar}"?`)) {
                try {
                    // 🚀 COMPATIBILIDAD V12: Invocamos la función de borrado recuperada de la ventana
                    await funcionBorrar(doc(db, "cantos", idABorrar));
                    
                    if(idABorrar === document.getElementById('v-titulo').innerText) ejecutarPurga('lienzo');
                    if (typeof cargarTodaLaBiblioteca === 'function') cargarTodaLaBiblioteca();
                    alert("🗑️ Eliminado.");
                } catch (error) { 
                    console.error("🚨 Error en la consola de Firebase al purgar:", error); 
                    alert("❌ No se pudo borrar de la nube.");
                }
            }
            break;
    }
    if (typeof tglPurga === 'function') tglPurga(false);
}
// Aseguramos la persistencia en la ventana global para los onclick del HTML
window.ejecutarPurga = ejecutarPurga;

/**
 * 🧪 LABORATORIO DE PANDORA (SINCRONIZACIÓN)
 */
function syncLab() {
    const selector = document.getElementById('obj-sel');
    if (!selector) return;
    
    const el = selector.value; // 't', 'a', 'l' o 'ac'
    const style = getComputedStyle(document.documentElement);
    
    // 1. Sincroniza el slider de tamaño
    const rawSz = style.getPropertyValue('--' + el + '-sz').trim();
    const sz = parseInt(rawSz) || 12; 
    
    const slider = document.getElementById('s-range');
    if (slider) slider.value = sz;
    
    const badge = document.getElementById('sz-badge');
    if (badge) badge.innerText = sz + 'pt';

    // 2. Sincroniza la alineación
    const al = style.getPropertyValue('--' + el + '-al').trim() || 'left';
    syncAlignButtons(al); 

    console.log(`✅ Lab Sincronizado: [${el}] a ${sz}pt / ${al}`);
}

/**
 * 🌙 REINGENIERÍA MODO NOCHE (SEDA OLED)
 */
let respaldoColores = null;

function tD() {
    const html = document.documentElement;
    const isDark = html.classList.toggle('modo-noche');
    const btn = document.getElementById('btn-luna');

    html.style.transition = "background 0.8s ease, filter 0.8s ease";
    
    if (isDark) {
        html.style.filter = "saturate(0.8) contrast(1.1)";
        
        const style = getComputedStyle(html);
        respaldoColores = {
            t: style.getPropertyValue('--t-clr').trim(),
            a: style.getPropertyValue('--a-clr').trim(),
            l: style.getPropertyValue('--l-clr').trim(),
            ac: style.getPropertyValue('--ac-clr').trim()
        };

        // Forzamos Blanco Seda para textos y color de contraste para acordes
        html.style.setProperty('--t-clr', '#e0e0e0');
        html.style.setProperty('--a-clr', '#b0b0b0');
        html.style.setProperty('--l-clr', '#d0d0d0');
        html.style.setProperty('--ac-clr', 'var(--accent)'); // El acorde brilla en la oscuridad

        if(btn) btn.innerText = "☀️";
    } else {
        html.style.filter = "none";
        if (respaldoColores) {
            html.style.setProperty('--t-clr', respaldoColores.t);
            html.style.setProperty('--a-clr', respaldoColores.a);
            html.style.setProperty('--l-clr', respaldoColores.l);
            html.style.setProperty('--ac-clr', respaldoColores.ac);
            if(btn) btn.innerText = "🌙";
        }
    }
}

/**
 * 🎨 GENERADOR DE ESPECTRO (PANDORA)
 */
function generarPaleta() {
    const paleta = document.getElementById('color-pal');
    if (!paleta) return;

    const colores = [
        '#000000', '#444444', '#888888', '#ffffff', '#e74c3c', '#9b59b6',
        '#3498db', '#2ecc71', '#f1c40f', '#e67e22', '#2c3e50', '#7f8c8d'
    ];

    paleta.innerHTML = ''; 

    colores.forEach(col => {
        const dot = document.createElement('div');
        dot.className = 'color-dot';
        dot.style.background = col;
        dot.onclick = () => appS('clr', col); 
        paleta.appendChild(dot);
    });

    const plus = document.createElement('div');
    plus.className = 'color-dot plus-trigger';
    plus.innerHTML = '+';
    plus.onclick = () => {
        const picker = document.getElementById('hex-picker');
        if(picker) picker.click();
    };
    paleta.appendChild(plus);
}

/**
 * 🚀 ARRANQUE MAESTRO
 */
window.onload = () => {
    generarPaleta(); 
    syncLab(); 
    asegurarConexion(); // Inicia rastreo de Firebase
    console.log("🚀 Sistema Atómico V2.0 en línea.");
};
/**
 * 🎹 FUNCIONES MUSICALES Y DE CONTROL
 */

/**
 * 🗑️ ELIMINAR: Esta es la que antes se llamaba limpiarSeleccion
 */
function eliminarAcordeActivo() {
    const activo = document.querySelector('.acorde-widget.activa');
    if (activo) {
        activo.remove();
        window.ultimaPuchita = null;
        console.log("🗑️ Widget eliminado del escenario.");
    } else {
        console.log("⚠️ No hay acorde activo para eliminar.");
    }
}

/**
 * 📝 EDITAR: Limpia el texto pero deja el "globo" listo para nuevas notas
 */
function editarAcordeActivo() {
    const activo = document.querySelector('.acorde-widget.activa');
    if (activo) {
        activo.innerText = ""; // Vaciamos la nota
        window.ultimaPuchita = activo; // Mantenemos el imán encendido
        console.log("📝 Modo edición: El widget espera nuevas notas de la paleta.");
    } else {
        console.log("⚠️ Selecciona un acorde primero.");
    }
}

// 🚀 VITAL: Hazlas globales para que el HTML las vea
window.eliminarAcordeActivo = eliminarAcordeActivo;
window.editarAcordeActivo = editarAcordeActivo;

function cambiarEstiloAcorde(estilo) {
    const libro = document.getElementById('libro');
    if (!libro) return;

    // 1. Limpieza de clases estructurales del escenario
    libro.classList.remove('ac-txt', 'ac-rel', 'ac-bor');
    
    // 2. Inyección de ADN de diseño musical
    libro.classList.add('ac-' + estilo);

    // 3. Feedback visual: Encendemos el botón mini activo dentro de la paleta Fly
    document.querySelectorAll('.fly-btn-mini').forEach(btn => {
        const cmd = btn.getAttribute('onclick') || "";
        btn.classList.toggle('active', cmd.includes(`'${estilo}'`));
    });

    console.log("🎨 Estilo aplicado a widgets: " + estilo);
}
window.cambiarEstiloAcorde = cambiarEstiloAcorde;


/**
 * 🛰️ TRANSPORTE ATÓMICO (acordes-engine.js)
 * Esta función es un puente hacia la lógica del motor musical
 */
function transportarTodo(semitonos) {
    // Buscamos todos los widgets en el escenario
    const widgets = document.querySelectorAll('.acorde-widget');
    
    widgets.forEach(w => {
        let texto = w.innerText;
        if (!texto) return;

        const match = texto.match(/^([A-G][#b]?)(.*)/);
        if (!match) return;

        let notaBase = match[1];
        let naturaleza = match[2];

        if (bemoles[notaBase]) notaBase = bemoles[notaBase];
        let indexActual = escalaCromatica.indexOf(notaBase);
        if (indexActual === -1) return;

        let nuevoIndex = (indexActual + semitonos) % 12;
        if (nuevoIndex < 0) nuevoIndex += 12;

        w.innerText = escalaCromatica[nuevoIndex] + naturaleza;
    });

    console.log(`🎵 Transporte de widgets: ${semitonos > 0 ? '+' : ''}${semitonos} semitonos.`);
}

/**
 * ⌨️ GESTIÓN DE TECLADO (BLINDADA)
 */
document.addEventListener('keydown', (e) => {
    // 🚀 1. PRIORIDAD: ¿Hay un acorde brillando?
    const acordeActivo = document.querySelector('.acorde-widget.activa');

    if (acordeActivo && (e.key === "Backspace" || e.key === "Delete")) {
        e.preventDefault(); // Evitamos que borre la letra de abajo
        acordeActivo.remove(); // Fulminamos el widget
        window.ultimaPuchita = null;
        console.log("🗑️ Widget eliminado con teclado.");
        return; // Salimos para no disparar otras funciones
    }

    // 2. GESTIÓN DE ESTROFAS (Borrar caja completa)
    if (e.key === "Delete" || e.key === "Backspace") {
        const seleccionada = document.querySelector('.box-estrofa[data-seleccionada="true"]');
        if (seleccionada && seleccionada.contentEditable !== "true") {
            e.preventDefault();
            if (confirm("¿Eliminar esta estrofa por completo?")) {
                seleccionada.remove();
                cajaActiva = null;
            }
        }
    }

    // 3. GESTIÓN DE PROYECTOR
    const proyector = document.getElementById('pr-container');
    if (proyector && proyector.style.display !== 'none') {
        if (e.key === "ArrowRight") { e.preventDefault(); navegarProyeccion(1); }
        if (e.key === "ArrowLeft") { e.preventDefault(); navegarProyeccion(-1); }
        if (e.key === "Escape") { e.preventDefault(); cerrarProyeccion(); }
    }
});

/**
 * ☁️ PERSISTENCIA Y NUBE (FIREBASE V2.0)
 */
async function guardarCantoOficial() {
    if (!window.fb || !window.fb.db) return alert("🛰️ Sin señal de la nube...");
    const { db, doc, setDoc, getDoc } = window.fb;

    const titulo = document.getElementById('v-titulo').innerText.trim();
    const autor = document.getElementById('v-autor').innerText.trim();
    
    if (titulo === "TÍTULO DEL CANTO" || titulo === "") return alert("Ponle un título real.");

    const docRef = doc(db, "cantos", titulo);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
        if (!confirm(`📝 El canto "${titulo}" ya existe. ¿Actualizar?`)) return;
    }

    // Captura de Atmósfera Litúrgica
    const momentoLit = document.getElementById('lit-sel').value;
    const acentoHex = document.documentElement.style.getPropertyValue('--accent');
    const fichaLit = document.getElementById('in-ficha-l').value;
    const comentarioRapido = document.getElementById('in-comentario').value;

    const adnCanto = {
        titulo,
        autor,
        momento: momentoLit,
        ficha: fichaLit,
        comentario: comentarioRapido, 
        config: {
            accent: acentoHex,
            lineHeight: document.documentElement.style.getPropertyValue('--l-lh'),
            estiloAcorde: document.getElementById('libro').className 
        },
        // 🚀 GUARDADO ATÓMICO: Capturamos el HTML completo que ya incluye los widgets-acorde
        estrofas: Array.from(document.querySelectorAll('.box-estrofa')).map(box => ({
            html: box.innerHTML,
            x: box.style.left,
            y: box.style.top,
            w: box.style.width || 'auto'
        })),
        fechaEdicion: new Date().toISOString()
    };

    try {
        await setDoc(docRef, adnCanto);
        alert("💎 ¡Canto Guardado! La música y la letra están a salvo. 🚀");
    } catch (e) {
        console.error(e);
        alert("❌ Error al guardar.");
    }
}

/**
 * 📚 BIBLIOTECA Y RECUPERACIÓN
 */
function toggleBiblioteca() {
    const b = document.getElementById('biblioteca');
    const t = document.getElementById('toggle-b');
    if (!b || !t) return;

    const currentRight = b.style.right || "-340px";
    const opening = currentRight === "-340px";

    b.style.right = opening ? "0px" : "-340px";
    t.innerText = opening ? "❯" : "❮";
    
    if (opening && typeof motorBusqueda === 'function') motorBusqueda();
}

async function cargarCatalogoNube() {
    const listaDiv = document.getElementById('lista-cantos');
    if (!listaDiv) return;
    if (!window.fb || !window.fb.db) {
        setTimeout(cargarCatalogoNube, 500); 
        return;
    }

    // 🚀 BLINDAJE DE ARRANQUE: Al encender la app, dejamos el buscador limpio en espera de la orden del usuario
    listaDiv.innerHTML = `
        <p style="opacity: 0.2; text-align: center; font-size: 11px; padding: 20px;">
            Usa el buscador o despliega la biblioteca completa...
        </p>
    `;
    console.log("🛰️ Bóveda Firebase lista. Esperando interacción del Sembrador.");
}

// --- AMARRES GLOBALES Y ACORDEONES ---
document.querySelectorAll('.menu-header').forEach(header => {
    header.onclick = () => {
        const section = header.parentElement;
        section.classList.toggle('open');
        syncLab(); // Sincronizamos laboratorio al abrir sección
    };
});

window.guardarCantoOficial = guardarCantoOficial;
window.toggleBiblioteca = toggleBiblioteca;
window.cargarCatalogoNube = cargarCatalogoNube;

/**
 * 🛠️ RECONSTRUCCIÓN Y BÚSQUEDA AVANZADA
 */
async function descargarCanto(id) {
    if (!window.fb) return;
    const { db, doc, getDoc } = window.fb;
    const docSnap = await getDoc(doc(db, "cantos", id));

    if (docSnap.exists()) {
        const canto = docSnap.data();
        // Limpieza total antes de reconstruir (resetea variables globales)
        ejecutarPurga('lienzo');

        // 1. Sincronizar Identidad (Escenario e Inputs)
        document.getElementById('v-titulo').innerText = canto.titulo;
        document.getElementById('v-autor').innerText = canto.autor;
        
        const inputs = document.querySelectorAll('#pandora input[type="text"]');
        if(inputs[0]) inputs[0].value = canto.titulo;
        if(inputs[1]) inputs[1].value = canto.autor;

        // 2. Reconstruir ADN de Pandora
        document.getElementById('lit-sel').value = canto.momento || "";
        document.getElementById('in-ficha-l').value = canto.ficha || "";
        document.getElementById('in-comentario').value = canto.comentario || "";

        // 3. Reconstruir Clima Visual
        if (canto.config && canto.config.accent) {
            const hex = canto.config.accent;
            document.documentElement.style.setProperty('--accent', hex);
            const t = document.getElementById('v-testigo');
            if(t) { 
                t.innerText = canto.momento || ""; 
                t.style.background = hex; 
                t.style.display = "flex"; 
            }
        }

        // 4. Reconstruir Estrofas y Widgets
        canto.estrofas.forEach(est => {
            const caja = crearCajaEstrofa(est.html);
            caja.style.left = est.x;
            caja.style.top = est.y;
            if (est.w) caja.style.width = est.w;

            // 🚀 RE-HIDRATACIÓN: Buscamos widgets dentro de la caja para activar sus clics
            caja.querySelectorAll('.acorde-widget').forEach(widget => {
                widget.onclick = (e) => {
                    e.stopPropagation();
                    activarPuchita(widget);
                };
            });
        });

        checkADN(); 
        console.log(`✅ Canto "${canto.titulo}" reconstruido con widgets activos.`);
    }
}

function normalizar(texto) {
    if (!texto) return "";
    return texto.toLowerCase()
                .trim()
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, ""); 
}

/**
 * 🔍 MOTOR DE BÚSQUEDA DINÁMICO
 */
async function motorBusqueda() {
    const inputTxt = document.getElementById('bus-txt');
    const txt = inputTxt ? normalizar(inputTxt.value) : "";
    
    // Aquí disparamos la lógica de filtrado de Firebase (se completa en la Busqueda Maestra)
    console.log("Rastreando:", txt);
}

let filtrosActivos = [];

function agregarFilaFiltro() {
    const opcionesTotales = ["titulo", "autor", "momento", "frase"];
    const opcionesRestantes = opcionesTotales.filter(opt => !filtrosActivos.includes(opt));

    if (opcionesRestantes.length === 0) return;

    const contenedor = document.getElementById('contenedor-filtros');
    const div = document.createElement('div');
    div.className = "fila-filtro";
    div.style = "display:flex; gap:5px; margin-bottom:8px; align-items:center;";

    let selectTipoHTML = `<select class="sel-tipo" onchange="cambiarTipoInput(this)" style="background:#111; color:white; border:1px solid rgba(255,255,255,0.1); padding:8px; border-radius:5px; font-size:10px;">`;
    opcionesRestantes.forEach(opt => {
        selectTipoHTML += `<option value="${opt}">${opt.toUpperCase()}</option>`;
    });
    selectTipoHTML += `</select>`;

    div.innerHTML = `
        ${selectTipoHTML}
        <div class="valor-contenedor" style="flex-grow:1;">
            <input type="text" class="in-valor" placeholder="Escribe aquí..." 
                   style="width:100%; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1); padding:8px; color:white; border-radius:5px;">
        </div>
        <button onclick="eliminarFila(this)" style="background:none; border:none; color:#ff4444; cursor:pointer; font-weight:bold; padding:0 10px;">✕</button>
    `;

    contenedor.appendChild(div);
    actualizarListaFiltros();
}

function eliminarFila(btn) {
    btn.parentElement.remove();
    actualizarListaFiltros();
}
/**
 * 🔍 GESTIÓN DE FILTROS Y BÓVEDA
 */
function actualizarListaFiltros() {
    filtrosActivos = Array.from(document.querySelectorAll('.sel-tipo')).map(s => s.value);
    
    // Si ya usaste los 4 filtros posibles, escondemos el botón de añadir (+)
    const btnAdd = document.getElementById('btn-add-filtro');
    if (btnAdd) btnAdd.style.display = (filtrosActivos.length >= 4) ? 'none' : 'block';
}

async function cargarTodaLaBiblioteca() {
    if (!window.fb) return;
    const { db, collection, getDocs } = window.fb;
    const listaDiv = document.getElementById('lista-cantos');
    if (!listaDiv) return;

    // 🚀 LIMPIEZA HIGIÉNICA ANTES DE PINTAR LOS BOTONES OFICIALES
    listaDiv.innerHTML = "<p style='text-align:center; opacity:0.5; font-size:11px;'>Abriendo bóveda de Seda...</p>";

    try {
        const snap = await getDocs(collection(db, "cantos"));
        let cantos = [];
        snap.forEach(doc => cantos.push({ id: doc.id, ...doc.data() }));

        // Orden Alfabético Máster
        cantos.sort((a, b) => a.titulo.localeCompare(b.titulo));

        // Pinta la lista con los privilegios reales (botones ✕ y + sincronizados)
        pintarResultados(cantos);
    } catch (e) { 
        console.error("Error al cargar biblioteca:", e); 
        listaDiv.innerHTML = "<p style='text-align:center; color:red; font-size:11px;'>Error al conectar.</p>";
    }
}

/**
 * 🎨 RENDERIZADO DE RESULTADOS (SEMILLAS BLINDADAS PARA EL MÓVIL)
 */
function pintarResultados(arrayCantos) {
    const listaDiv = document.getElementById('lista-cantos');
    if (!listaDiv) return;
    listaDiv.innerHTML = "";
    
    // Filtro de seguridad por si esquemaActual no se ha inicializado
    const esquema = window.esquemaActual || [];

    arrayCantos.forEach(canto => {
        const yaEsta = esquema.some(c => c.id === canto.id);
        
        const item = document.createElement('div');
        item.className = 'item-semilla' + (yaEsta ? ' en-canasta' : '');
        
        const colorCanto = canto.config?.accent || 'var(--accent)';
        item.style.borderLeft = `3px solid ${colorCanto}`;
        
        // 🚀 RECONSTRUCCIÓN BLINDADA ANTI-RESTRICCIÓN DEL BOTÓN DE BORRADO
        let botonBorrarNubeHTML = '';
        if (typeof window.esSembradorMaestro !== 'undefined' && window.esSembradorMaestro === true) {
            // Saneamos comillas que rompen la cadena del título en el DOM
            const idSaneado = canto.id.replace(/'/g, "\\'"); 
            
            botonBorrarNubeHTML = `
                <button class="btn-borrar-nube-real"
                        data-canto-id="${idSaneado}"
                        style="background: #1a1a1a !important; border: 1px solid rgba(255,255,255,0.15) !important; color: #ff4444 !important; cursor: pointer !important; font-weight: bold !important; font-size: 13px !important; opacity: 0.5; padding: 4px 8px !important; border-radius: 6px; transition: all 0.2s ease; pointer-events: auto !important; position: relative !important; z-index: 999999 !important; display: inline-flex !important; align-items: center; justify-content: center;"
                        onmouseover="this.style.opacity='1'; this.style.background='#ff4444'; this.style.color='white';" 
                        onmouseout="this.style.opacity='0.5'; this.style.background='#1a1a1a'; this.style.color='#ff4444';">
                    ✕
                </button>
            `;
        }

        // Inyectamos la estructura limpia de la semilla
        item.innerHTML = `
            <div class="semilla-textos" onclick="descargarCanto('${canto.id}')" style="flex-grow:1; display:flex; align-items:center; gap:8px; cursor:pointer;">
                <span class="semilla-nombre" style="font-size:13px; font-weight:500; color:#fff; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                    ${canto.titulo}
                </span>
                <span class="semilla-autor-mini" style="font-size:10px; color:rgba(255,255,255,0.35); text-transform:uppercase; letter-spacing:1px;">
                    ${canto.autor || 'Anónimo'}
                </span>
            </div>
            
            <div style="display:flex; align-items:center; gap:12px; margin-left:10px;">
                <!-- Aquí caerá el botón de borrado vacío o activo según tu Rango -->
                ${botonBorrarNubeHTML}
                
                <!-- Botón de añadir a la canasta (+), visible y funcional para todos -->
                <button id="btn-add-${canto.id}" 
                        onclick="event.stopPropagation(); accionarBotonCesta(this, '${canto.id}', '${canto.titulo}')" 
                        ontouchstart="event.stopPropagation(); accionarBotonCesta(this, '${canto.id}', '${canto.titulo}')"
                        class="btn-plus-cesta" style="padding:5px 10px; cursor:pointer;">
                    ${yaEsta ? '✓' : '+'}
                </button>
            </div>
        `;
        
        listaDiv.appendChild(item);
    });

    // 🚀 DESPACHADOR CUÁNTICO DE PURGA: Escucha los clics de forma directa e inmune al cortafuegos
    listaDiv.querySelectorAll('.btn-borrar-nube-real').forEach(btn => {
        btn.addEventListener('click', async (event) => {
            // Detiene por completo que el clic active la descarga del canto en la capa de atrás
            event.preventDefault();
            event.stopPropagation();
            
            const idCanto = btn.getAttribute('data-canto-id');
            if (!idCanto) return;

            if (confirm(`🔥 ¿Borrar definitivamente "${idCanto}" de la base de datos de la nube?`)) {
                try {
                    // Validamos que el tanque de Firebase esté listo en la ventana global
                    if (!window.fb || !window.fb.db || !window.fb.deleteDoc || !window.fb.doc) {
                        return alert("🛰️ Conectando con los motores de Firebase. Intenta de nuevo en un segundo.");
                    }

                    // Ejecutamos la destrucción directa en el servidor remoto sin intermediarios
                    await window.fb.deleteDoc(window.fb.doc(window.fb.db, "cantos", idCanto));
                    
                    // Si borramos el canto activo en pantalla, limpiamos el lienzo central
                    const tituloActual = document.getElementById('v-titulo')?.innerText;
                    if (idCanto === tituloActual) {
                        document.querySelectorAll('.box-estrofa').forEach(box => box.remove());
                        if (document.getElementById('v-titulo')) document.getElementById('v-titulo').innerText = "TÍTULO DEL CANTO";
                        if (document.getElementById('v-autor')) document.getElementById('v-autor').innerText = "Autor del Canto";
                    }

                    // Refrescamos instantáneamente la biblioteca completa en la pantalla
                    if (typeof cargarTodaLaBiblioteca === 'function') {
                        cargarTodaLaBiblioteca();
                    }
                    alert("🗑️ Semilla eliminada con éxito de la bóveda de la nube.");
                } catch (err) {
                    console.error("🚨 Error físico al ejecutar deleteDoc en Firestore:", err);
                    alert("❌ No se pudo completar la eliminación en el servidor.");
                }
            }
        }, { capture: true }); // Prioridad absoluta sobre eventos del elemento padre
    });
}
window.pintarResultados = pintarResultados;



/**
 * 🧺 MOTOR DE LA CESTA (FEEDBACK VISUAL)
 */
function accionarBotonCesta(btn, id, titulo) {
    // 1. Lógica funcional
    if (typeof agregarAlCarrito === 'function') {
        agregarAlCarrito(id, titulo);
    }
    
    // 2. Transformación de Seda al botón
    btn.innerHTML = "✓";
    btn.style.background = "var(--accent)";
    btn.style.color = "black";
    btn.style.borderColor = "var(--accent)";
    
    // Añadimos clase de estado al contenedor padre (opcional para CSS)
    const padre = btn.closest('.item-semilla');
    if (padre) padre.classList.add('en-canasta');

    console.log(`🧺 "${titulo}" recolectado.`);
}
/**
 * 🧬 BUSCADOR MAESTRO (EL GRAN COLADOR DE ADN)
 */
async function ejecutarBusquedaMaestra() {
    if (!window.fb) return;
    const { db, collection, getDocs } = window.fb;
    const listaDiv = document.getElementById('lista-cantos');

    // 1. Captura de criterios dinámicos
    const filas = document.querySelectorAll('.fila-filtro');
    const criterios = Array.from(filas).map(fila => ({
        tipo: fila.querySelector('.sel-tipo').value,
        valor: normalizar(fila.querySelector('.in-valor').value)
    }));

    if (criterios.length === 0) return alert("Añade al menos un criterio con el botón (+)");

    listaDiv.innerHTML = "<p style='text-align:center; opacity:0.5; font-size:11px;'>Rastreando ADN musical...</p>";

    try {
        const snap = await getDocs(collection(db, "cantos"));
        let resultados = [];

        snap.forEach(docSnap => {
            const canto = docSnap.data();
            const id = docSnap.id;

            // Lógica de "Cumple Todo" (And Gate)
            let cumpleTodo = criterios.every(criterio => {
                if (!criterio.valor) return true;
                const vB = criterio.valor;

                switch (criterio.tipo) {
                    case 'titulo':
                        return normalizar(canto.titulo).includes(vB);
                    case 'autor':
                        return normalizar(canto.autor || "").includes(vB);
                    case 'momento':
                        return normalizar(canto.momento || "").includes(vB);
                    case 'frase':
                        if (!canto.estrofas) return false;
                        return canto.estrofas.some(est => {
                            // 🚀 Limpieza quirúrgica: Quitamos HTML y etiquetas de acordes
                            let textoLimpio = est.html
                                .replace(/<div[^>]*>.*?<\/div>/g, '') // Borra widgets de acordes
                                .replace(/<[^>]*>/g, ' ')             // Borra el resto (p, br, spans)
                                .replace(/\s+/g, ' ');                // Unifica espacios
                            return normalizar(textoLimpio).includes(vB);
                        });
                    default: return true;
                }
            });

            if (cumpleTodo) resultados.push({ id, ...canto });
        });

        // Orden de Seda Alfabético
        resultados.sort((a, b) => a.titulo.localeCompare(b.titulo));
        pintarResultados(resultados);

    } catch (e) {
        console.error("Error en búsqueda:", e);
        listaDiv.innerHTML = "<p style='color:red; font-size:11px;'>Error de conexión.</p>";
    }
}

/**
 * 🛠️ GESTIÓN DE INPUTS DINÁMICOS
 */
function cambiarTipoInput(select) {
    const contenedor = select.parentElement.querySelector('.valor-contenedor');
    const tipo = select.value;

    if (tipo === 'momento') {
        contenedor.innerHTML = `
            <select class="in-valor" style="width:100%; background:#111; color:white; border:1px solid rgba(255,255,255,0.1); padding:8px; border-radius:5px; font-size:10px;">
                <option value="Entrada">Entrada</option>
                <option value="Piedad">Piedad</option>
                <option value="Gloria">Gloria</option>
                <option value="Aleluya">Aleluya</option>
                <option value="Ofertorio">Ofertorio</option>
                <option value="Santo">Santo</option>
                <option value="Cordero">Cordero</option>
                <option value="Comunión">Comunión</option>
                <option value="Salida">Salida</option>
            </select>`;
    } else {
        contenedor.innerHTML = `
            <input type="text" class="in-valor" placeholder="Escribe aquí..." 
                   style="width:100%; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1); padding:8px; color:white; border-radius:5px; font-size:10px;">`;
    }
    actualizarListaFiltros();
}

// AMARRES GLOBALES
window.ejecutarBusquedaMaestra = ejecutarBusquedaMaestra;
window.agregarFilaFiltro = agregarFilaFiltro;
window.eliminarFila = eliminarFila;
window.cambiarTipoInput = cambiarTipoInput;

/**
 * 🛰️ NAVEGACIÓN Y ALAS (PANELES LATERALES)
 */
function cambiarAla(ala) {
    // 1. Limpieza total de visibilidad
    const alas = document.querySelectorAll('.ala-content');
    alas.forEach(a => a.style.display = 'none');

    // 2. Activación de la pestaña elegida
    const alaActiva = document.getElementById('ala-' + ala);
    if (alaActiva) {
        alaActiva.style.display = 'block';
        
        // 3. Disparador de carga asíncrona para Huertos
        if (ala === 'huertos') {
            setTimeout(() => {
                console.log("🚀 Cargando Huertos...");
                cargarListasDeNube();
            }, 50);
        }
    }

    // 4. Feedback visual de botones (Brillo)
    const btns = document.querySelectorAll('.tab-btn');
    btns.forEach(b => {
        const text = b.innerText.toLowerCase();
        b.classList.toggle('active', text.includes(ala.substring(0,3)));
    });
}

/**
 * 🧺 GESTIÓN DE LA CESTA (ESQUEMA ACTUAL)
 */
let esquemaActual = []; // Variable única y definitiva para la canasta

function agregarAlCarrito(id, titulo) {
    // Evitamos duplicados con validación atómica
    if (esquemaActual.some(c => c.id === id)) {
        return alert("Este canto ya está en tu esquema.");
    }

    esquemaActual.push({ id, titulo });
    console.log(`🧺 Semilla capturada: ${titulo}`);
    
    actualizarVistaCarrito();
    
    // Forzamos el check verde en la lista de búsqueda
    const btn = document.getElementById(`btn-add-${id}`);
    if (btn) {
        btn.innerHTML = "✓";
        btn.classList.add('check-active');
    }
}

function quitarDelCarrito(index) {
    const cantoEliminado = esquemaActual[index];
    if (!cantoEliminado) return;

    const idParaLimpiar = cantoEliminado.id;

    // Lo extraemos de la canasta física
    esquemaActual.splice(index, 1);
    
    actualizarVistaCarrito();

    // 🚀 RECONEXIÓN: Restauramos el botón en la biblioteca original
    const btnEnBiblioteca = document.getElementById(`btn-add-${idParaLimpiar}`);
    if (btnEnBiblioteca) {
        btnEnBiblioteca.innerHTML = "+";
        btnEnBiblioteca.classList.remove('check-active');
        btnEnBiblioteca.style.background = "transparent";
        btnEnBiblioteca.style.color = "var(--accent)";
        btnEnBiblioteca.style.borderColor = "rgba(var(--accent-rgb), 0.5)";
        
        const itemSemilla = btnEnBiblioteca.closest('.item-semilla');
        if (itemSemilla) itemSemilla.classList.remove('en-canasta');
    }
}

/**
 * ☁️ GUARDADO DE LISTAS (HUERTO)
 */
async function guardarListaEnNube() {
    const inputNombre = document.getElementById('nombre-esquema');
    const nombre = inputNombre ? inputNombre.value.trim() : "";

    if (!nombre || esquemaActual.length === 0) {
        return alert("Ponle un nombre a tu lista y añade al menos un canto.");
    }

    const { db, doc, setDoc } = window.fb;
    try {
        await setDoc(doc(db, "listas_misa", nombre), {
            nombre: nombre,
            cantos: esquemaActual,
            fecha: new Date().toISOString(),
            tipo: "coleccion"
        });
        alert(`🛰️ ¡'${nombre}' guardada con éxito en el Huerto!`);
        cargarListasDeNube(); // Refrescamos el archivero
    } catch (e) { 
        console.error("Error al guardar lista:", e); 
        alert("Error al conectar con la nube.");
    }
}

// AMARRES
window.cambiarAla = cambiarAla;
window.agregarAlCarrito = agregarAlCarrito;
window.quitarDelCarrito = quitarDelCarrito;
window.guardarListaEnNube = guardarListaEnNube;

/**
 * 🧺 GESTIÓN DE LA CANASTA (ESQUEMA ACTUAL)
 */
function actualizarVistaCarrito() {
    const contenedor = document.getElementById('carrito-liturgico');
    if (!contenedor) return;

    if (esquemaActual.length === 0) {
        contenedor.innerHTML = "<p style='opacity:0.2; text-align:center; font-size:11px;'>Canasta vacía.</p>";
        return;
    }

    contenedor.innerHTML = "";
    esquemaActual.forEach((canto, index) => {
        const div = document.createElement('div');
        div.className = 'item-carrito';
        // 🚀 Estilo inyectado vía JS alineado con el nuevo CSS de Seda
        div.style = "display:flex; align-items:center; gap:10px; padding:8px; background:rgba(255,255,255,0.03); margin-bottom:5px; border-radius:8px;";
        
        div.innerHTML = `
            <div style="display:flex; flex-direction:column; gap:2px;">
                <button onclick="moverCanto(${index}, -1)" style="background:none; border:none; color:var(--accent); cursor:pointer; font-size:10px;">▲</button>
                <button onclick="moverCanto(${index}, 1)" style="background:none; border:none; color:var(--accent); cursor:pointer; font-size:10px;">▼</button>
            </div>
            <span style="flex-grow:1; font-size:12px; color:white;">${index + 1}. ${canto.titulo}</span>
            <button onclick="quitarDelCarrito(${index})" style="background:none; border:none; color:#ff4444; cursor:pointer; font-weight:bold;">✕</button>
        `;
        contenedor.appendChild(div);
    });
}

// 🚀 Única función de movimiento (Eliminada la duplicada)
function moverCanto(index, direccion) {
    const nuevoIndex = index + direccion;
    if (nuevoIndex < 0 || nuevoIndex >= esquemaActual.length) return;
    
    // Intercambio de posiciones de Seda
    const temp = esquemaActual[index];
    esquemaActual[index] = esquemaActual[nuevoIndex];
    esquemaActual[nuevoIndex] = temp;
    
    actualizarVistaCarrito();
}

/**
 * ☁️ PERSISTENCIA DE COLECCIONES (HUERTOS)
 */
async function guardarEsquemaNube() {
    if (esquemaActual.length === 0) return alert("La canasta está vacía.");
    
    const nombreInput = document.getElementById('nombre-esquema');
    const nombre = nombreInput ? nombreInput.value.trim() : "";
    
    if (!nombre) return alert("Ponle un nombre a tu colección.");

    if (!window.fb) return;
    const { db, doc, setDoc } = window.fb;
    
    const adnColeccion = {
        nombre: nombre,
        cantos: esquemaActual, 
        fecha: new Date().toISOString(),
        tipo: "coleccion"
    };

    try {
        await setDoc(doc(db, "listas_misa", nombre), adnColeccion);
        alert(`🛰️ ¡Huerto "${nombre}" sembrado con éxito! 🧺`);
        
        // Limpieza de canasta tras éxito
        esquemaActual = [];
        if(nombreInput) nombreInput.value = "";
        actualizarVistaCarrito();

        // Reseteo visual de botones en la biblioteca
        document.querySelectorAll('.item-semilla').forEach(item => {
            item.classList.remove('en-canasta');
            const btn = item.querySelector('.btn-plus-cesta');
            if (btn) {
                btn.innerHTML = "+";
                btn.style.background = "transparent";
                btn.style.color = "var(--accent)";
            }
        });

        if(typeof cargarListasDeNube === 'function') cargarListasDeNube(); 
    } catch (e) {
        console.error("Error al guardar esquema:", e);
    }
}

async function cargarListasDeNube() {
    const contenedor = document.getElementById('lista-colecciones');
    if (!contenedor || !window.fb) return;
    const { db, collection, getDocs } = window.fb;

    try {
        contenedor.innerHTML = "<p style='opacity:0.5; font-size:11px; text-align:center;'>Abriendo archivero...</p>";
        const snap = await getDocs(collection(db, "listas_misa"));
        contenedor.innerHTML = "";

        if (snap.empty) {
            contenedor.innerHTML = "<p style='opacity:0.2; font-size:11px; text-align:center;'>Huerto vacío.</p>";
            return;
        }

        snap.forEach(docSnap => {
            const lista = docSnap.data();
            const div = document.createElement('div');
            div.className = 'coleccion-item';
            div.setAttribute('data-id', docSnap.id); 

            div.innerHTML = `
                <div class="col-header" onclick="tglDetalleLista('${docSnap.id}')">
                    <strong style="flex-grow:1;">📂 ${docSnap.id}</strong>
                    <div style="display:flex; align-items:center; gap:10px;">
                        <span style="font-size:10px; opacity:0.4;">${lista.cantos ? lista.cantos.length : 0} 🎶</span>
                        <button onclick="event.stopPropagation(); eliminarMisaDelHuerto('${docSnap.id}')" class="btn-delete-huerto">🗑️</button>
                    </div>
                </div>
                <div id="det-${docSnap.id}" class="col-detalle" style="display:none;">
                    <!-- Los cantos se inyectan dinámicamente al abrir -->
                </div>
            `;
            contenedor.appendChild(div);
        });
    } catch (e) { console.error("Error al cargar Huertos:", e); }
}

window.guardarEsquemaNube = guardarEsquemaNube;
window.moverCanto = moverCanto;

/**
 * 📂 EXPLORADOR DE HUERTOS Y DETALLE DE LISTAS
 */
async function tglDetalleLista(id) {
    // Saneamos el ID para el selector (evita errores con espacios)
    const detalle = document.getElementById(`det-${id}`);
    if (!detalle) return;

    const estaAbierto = detalle.style.display === 'block';
    
    // Cerramos cualquier otro detalle abierto para mantener la Seda
    document.querySelectorAll('.col-detalle').forEach(d => {
        d.style.display = 'none';
        d.innerHTML = ""; // Limpiamos para ahorrar memoria
    });
    
    if (!estaAbierto) {
        detalle.style.display = 'block';
        detalle.innerHTML = "<p style='opacity:0.5; font-size:10px; padding:10px;'>Extrayendo esquema...</p>";

        if (!window.fb) return;
        const { db, doc, getDoc } = window.fb;

        try {
            const snap = await getDoc(doc(db, "listas_misa", id));
            if (snap.exists()) {
                const data = snap.data();
                
                // 🚀 CARGA DEL TANQUE GLOBAL: Conectamos con el Proyector
                window.listaParaProyectar = data.cantos || []; 
                listaParaProyectar = window.listaParaProyectar; 

                detalle.innerHTML = `
                    <button class="btn-glass" onclick="iniciarProyeccion()" 
                            style="width:100%; margin-bottom:12px; font-size:10px; color:var(--accent); border: 1px solid var(--accent); background:rgba(var(--accent-rgb),0.05);">
                        🚀 PROYECTAR ESTA MISA
                    </button>
                `;

                 listaParaProyectar.forEach((canto, idx) => {
                    const div = document.createElement('div');
                    div.className = "item-lista-detalle";
                    div.style = "display:flex; align-items:center; gap:8px; background:rgba(255,255,255,0.03); padding:10px; border-radius:8px; margin-bottom:5px; cursor:pointer; transition:0.3s;";
                    
                    div.onmouseover = () => div.style.background = "rgba(255,255,255,0.08)";
                    div.onmouseout = () => div.style.background = "rgba(255,255,255,0.03)";

                    div.onclick = () => { 
                        if(canto.id) {
                            indiceProyeccion = idx; 
                            descargarCanto(canto.id); 
                            if (typeof actualizarProyeccion === 'function') actualizarProyeccion();
                        }
                    };
                    
                    div.innerHTML = `
                        <span style="font-size:9px; opacity:0.3; font-weight:bold;">${idx + 1}</span>
                        <span style="font-size:12px; color:white; font-weight:500;">${canto.titulo}</span>
                    `;
                    detalle.appendChild(div);
                });
            }
        } catch (e) { 
            console.error("🚨 Error al abrir huerto:", e); 
            detalle.innerHTML = "<p style='color:red; font-size:10px;'>Error de conexión.</p>";
        }
    }
}

/**
 * 🎬 SISTEMA DE PROYECCIÓN (CÁPSULA FLOTANTE)
 */
function actualizarProyeccion() {
    const lista = window.listaParaProyectar || [];
    const item = lista[indiceProyeccion];
    if (!item) return;

    // Descargamos el canto al escenario central
    descargarCanto(item.id);

    // Sincronizamos la UI de la cápsula
    const txtTit = document.getElementById('pr-titulo');
    const txtPas = document.getElementById('pr-paso');
    
    if (txtTit) txtTit.innerText = item.titulo.toUpperCase();
    if (txtPas) txtPas.innerText = `CANTO ${indiceProyeccion + 1} DE ${lista.length}`;
}

function iniciarProyeccion() {
    listaParaProyectar = window.listaParaProyectar || [];
    
    if (listaParaProyectar.length === 0) {
        return alert("⚠️ Selecciona un huerto antes de proyectar.");
    }

    indiceProyeccion = 0;
    const prContainer = document.getElementById('pr-container');
    if (prContainer) prContainer.style.display = 'flex';
    
    // ⚓ Ocultamos el Dock para máxima visibilidad (Seda Style)
    const dock = document.querySelector('.glass-dock');
    if (dock) dock.style.transform = "translateX(-50%) translateY(120%)";

    actualizarProyeccion();
}

function navegarProyeccion(direccion) {
    const lista = window.listaParaProyectar || [];
    const nuevoIndex = indiceProyeccion + direccion;

    if (nuevoIndex >= 0 && nuevoIndex < lista.length) {
        indiceProyeccion = nuevoIndex;
        actualizarProyeccion();
    }
}

function cerrarProyeccion() {
    const prContainer = document.getElementById('pr-container');
    if (prContainer) prContainer.style.display = 'none';
    
    // 🔓 Restauramos el Dock
    const dock = document.querySelector('.glass-dock');
    if (dock) dock.style.transform = ""; 
    console.log("🌊 Proyección terminada.");
}

// AMARRES GLOBALES
window.iniciarProyeccion = iniciarProyeccion;
window.navegarProyeccion = navegarProyeccion;
window.cerrarProyeccion = cerrarProyeccion;
window.tglDetalleLista = tglDetalleLista;

/**
 * ⚡ SENSOR MAESTRO: GESTIÓN DE ESCENARIO Y OBJETOS (V2.5 BLINDADA ANTI-ENCIMADO)
 */
document.addEventListener('click', (e) => {
    
    // 1. ¿TOCAMOS UN ACORDE-WIDGET? 
    const widgetClick = e.target.closest('.acorde-widget');
    if (widgetClick) {
        activarPuchita(widgetClick);
        return; 
    }

    // 2. ZONAS SEGURAS EXTENDIDAS (Incluye la paleta completa y sus botones)
    if (e.target.closest('.box-estrofa') || 
        e.target.closest('#paleta-fly') || // 🚀 ID Sincronizado
        e.target.closest('.fly-btn') ||    // 🚀 Protege botones de notas base
        e.target.closest('.fly-btn-mini') || // 🚀 Protege botones de alteraciones
        e.target.closest('#pandora') || 
        e.target.closest('#biblioteca')) {
        
        // 🚀 LA CLAVE: Si tocamos la estrofa pero NO un botón musical ni el widget mismo...
        if (!e.target.closest('.acorde-widget') && !e.target.closest('.fly-btn') && !e.target.closest('.fly-btn-mini')) {
            // ...apagamos el brillo de CUALQUIER acorde activo en la pantalla
            document.querySelectorAll('.acorde-widget.activa').forEach(w => {
                w.classList.remove('activa');
            });
            window.ultimaPuchita = null; 
            console.log("✂️ Vínculo roto de forma voluntaria. Listo para nueva siembra.");
        }
        return; 
    }

    // 3. LIMPIEZA TOTAL (Si picamos el vacío del viewport)
    console.log("🧹 Despejando escenario...");
    cajaActiva = null; 
    window.ultimaPuchita = null;

    // Reset de Estrofas (Lego)
    document.querySelectorAll('.box-estrofa').forEach(box => {
        box.contentEditable = "false"; 
        box.style.setProperty('border', '1px solid transparent', 'important');
        box.dataset.seleccionada = "false"; 
        box.style.resize = "none";         
        box.style.overflow = "visible";     
        box.style.cursor = "move";          
    });

    // Reset de Widgets Musicales
    document.querySelectorAll('.acorde-widget').forEach(w => {
        w.classList.remove('activa');
    });

    console.log("🌙 Escenario en reposo.");
});


/**
 * 🎨 ACTIVADOR DE WIDGETS
 */
function activarPuchita(el) {
    // Limpiamos brillo previo
    document.querySelectorAll('.acorde-widget').forEach(w => w.classList.remove('activa'));
    
    ultimaPuchita = el;
    el.classList.add('activa');
    
    // Al ser un widget flotante, no necesita .focus() para no robar el cursor del texto
    console.log("📌 Widget activo:", el.innerText);
}

/**
 * 🧺 FUNCIONES DE APOYO (BIBLIOTECA)
 */
function agregarYConfirmar(btn, id, titulo) {
    if (typeof agregarAlCarrito === 'function') agregarAlCarrito(id, titulo); 

    const originalHTML = btn.innerHTML;
    btn.innerHTML = "✓";
    btn.style.borderColor = "var(--accent)";
    btn.style.color = "var(--accent)";

    setTimeout(() => {
        btn.innerHTML = originalHTML;
        btn.style.borderColor = "";
        btn.style.color = "";
    }, 800);
}

function toggleAcordeon(header, contentId) {
    const content = document.getElementById(contentId);
    if (!content) return;
    
    // Alternamos clase para la persiana CSS
    const isOpen = content.classList.toggle('open');
    header.classList.toggle('active');
    
    // Si abrimos, nos aseguramos que el max-height sea suficiente
    if (isOpen) {
        content.style.maxHeight = content.scrollHeight + "px";
    } else {
        content.style.maxHeight = "0px";
    }
}

async function eliminarMisaDelHuerto(id) {
    if (!confirm(`⚠️ ¿Borrar definitivamente "${id}" del huerto?`)) return;
    
    if (!window.fb) return;
    const { db, doc, deleteDoc } = window.fb;
    try {
        await deleteDoc(doc(db, "listas_misa", id));
        console.log("🗑️ Huerto purgado.");
        if (typeof cargarListasDeNube === 'function') cargarListasDeNube(); 
    } catch (e) { console.error("Error al borrar lista:", e); }
}
/**
 * 🛠️ UTILIDADES DE INTERFAZ Y FILTRADO
 */
function filtrarHuertos() {
    const busqueda = document.getElementById('input-buscar-huerto').value.toLowerCase();
    const carpetas = document.querySelectorAll('.coleccion-item');
    
    carpetas.forEach(carpeta => {
        const nombreLista = carpeta.getAttribute('data-id').toLowerCase();
        carpeta.style.display = nombreLista.includes(busqueda) ? 'block' : 'none';
    });
}

function toggleEstacionMusical() {
    const paleta = document.getElementById('paleta-fly'); // ID Nuevo
    const btnTopBar = document.querySelector('.btn-music'); 
    if (!paleta) return console.error("🚨 No encontré #paleta-fly en el HTML");

    // Detectamos si está oculta o cerrada
    const estaCerrada = (paleta.style.display === 'none' || paleta.style.display === '');
    
    if (estaCerrada) {
        // LA ENCENDEMOS
        paleta.style.display = 'flex';
        paleta.classList.add('estacion-visible'); // Activa el radar de siembra
        if(btnTopBar) btnTopBar.style.boxShadow = `0 0 15px #ffd600`; // Brillo de oro
        console.log("🪄 Estación Musical encendida.");
    } else {
        // LA APAGAMOS
        paleta.style.display = 'none';
        paleta.classList.remove('estacion-visible');
        if(btnTopBar) btnTopBar.style.boxShadow = "none";
        
        // Limpieza de brillo de acordes al cerrar
        if(window.ultimaPuchita) {
            window.ultimaPuchita.classList.remove('activa');
            window.ultimaPuchita = null;
        }
    }
}
window.toggleEstacionMusical = toggleEstacionMusical;


function limpiarCamposBusqueda() {
    const contenedor = document.getElementById('contenedor-filtros');
    if (contenedor) contenedor.innerHTML = "";
    
    const lista = document.getElementById('lista-cantos');
    if (lista) lista.innerHTML = "<p style='opacity:0.2; text-align:center; font-size:11px; padding:20px;'>Búsqueda reseteada.</p>";
    
    console.log("🧹 Campos de búsqueda limpios.");
}

/**
 * 🌪️ PURGA TOTAL DEL ESCENARIO LOCAL (REPARADA Y UNIFICADA)
 * Sincronizada con el onclick de tu nueva Top-Bar fija
 */
function ejecutarLimpiezaEscenario(confirmar = false) {
    if (confirmar) {
        if (!confirm("⚠️ ¿Deseas purificar el escenario? Se borrará todo el trabajo actual de la pantalla.")) return;
    }

    // 1. Limpieza física de Hojas e Identidad en el escenario
    document.querySelectorAll('.box-estrofa').forEach(box => box.remove());
    
    const titulo = document.getElementById('v-titulo');
    const autor = document.getElementById('v-autor');
    if (titulo) titulo.innerText = "TÍTULO DEL CANTO";
    if (autor) autor.innerText = "Autor del Canto";

    // 2. Reseteo higiénico de Variables de Control en la memoria volátil
    window.esquemaActual = [];
    boxCount = 0;
    cajaActiva = null;
    window.ultimaPuchita = null;

    // Refrescamos la vista de la canasta para que se pinte vacía
    if (typeof actualizarVistaCarrito === 'function') {
        actualizarVistaCarrito();
    }
    
    // 3. Cierre automático de la Estación Flotante si estaba encendida
    const paleta = document.getElementById('paleta-fly');
    if (paleta && paleta.classList.contains('estacion-visible')) {
        if (typeof toggleEstacionMusical === 'function') toggleEstacionMusical();
    }

    console.log("🌪️ Escenario purificado: Gravedad cero restablecida en el lienzo local.");
}

// 🚀 VITAL: Amarre global definitivo para que el HTML pueda ver la función
window.ejecutarLimpiezaEscenario = ejecutarLimpiezaEscenario;


/**
 * 📏 GESTIÓN DE GRUPOS (RESIZE OBSERVER SEDA)
 */
let grupoSeleccionado = [];

const observadorTamaño = new ResizeObserver(entries => {
    // 🛡️ Solo sincronizamos si hay un grupo activo y real
    if (grupoSeleccionado.length < 2) return;
    
    for (let entry of entries) {
        const guia = entry.target;
        if (grupoSeleccionado.includes(guia)) {
            const ancho = guia.style.width;
            const alto = guia.style.height;

            grupoSeleccionado.forEach(caja => {
                if (caja !== guia) {
                    caja.style.width = ancho;
                    caja.style.height = alto;
                }
            });
        }
    }
});

// Amarres finales al mundo global
window.filtrarHuertos = filtrarHuertos;
window.toggleEstacionMusical = toggleEstacionMusical;
window.limpiarCamposBusqueda = limpiarCamposBusqueda;
window.tglPurga = tglPurga;

/**
 * 📏 SISTEMA DE MAQUETACIÓN MASIVA (LEGO)
 */
function toggleSeleccionMasiva(elemento) {
    if (grupoSeleccionado.includes(elemento)) {
        // SOLTAR: Eliminamos del grupo y dejamos de observar cambios
        grupoSeleccionado = grupoSeleccionado.filter(el => el !== elemento);
        elemento.style.outline = ""; 
        elemento.classList.remove('seleccion-masiva');
        observadorTamaño.unobserve(elemento);
    } else {
        // UNIR: Agregamos al grupo y activamos el observador de tamaño
        grupoSeleccionado.push(elemento);
        elemento.classList.add('seleccion-masiva'); // 🚀 Usa la clase del CSS purificado
        observadorTamaño.observe(elemento);
    }
    
    const info = document.getElementById('info-grupo');
    if (info) info.innerText = `${grupoSeleccionado.length} CAJAS EN GRUPO`;
}

function alinearGrupo(modo) {
    if (grupoSeleccionado.length < 2) return;
    
    // Usamos la primera caja seleccionada como "Regla Maestra"
    const guia = grupoSeleccionado[0];
    const xGuia = guia.style.left;

    grupoSeleccionado.forEach(caja => {
        if (caja === guia) return; 

        if (modo === 'izquierda') {
            caja.style.left = xGuia;
        } 
    });
    console.log(`⚖️ Alineación a la izquierda completada.`);
}

function distribuirGrupo(sentido) {
    if (grupoSeleccionado.length < 2) return;

    if (sentido === 'vertical') {
        // 1. Ordenamos por posición 'y' actual para respetar el orden visual
        grupoSeleccionado.sort((a, b) => (parseInt(a.style.top) || 0) - (parseInt(b.style.top) || 0));

        grupoSeleccionado.forEach((caja, index) => {
            if (index === 0) return; // La primera es el ancla
            
            const cajaAnterior = grupoSeleccionado[index - 1];
            // Calculamos la nueva 'y' basándonos en el borde inferior de la anterior + 20px
            const nuevaY = (parseInt(cajaAnterior.style.top) || 0) + cajaAnterior.offsetHeight + 20;
            caja.style.top = nuevaY + 'px';
        });
    }
    console.log("↕ Distribución vertical uniforme aplicada.");
}

function soltarGrupo() {
    grupoSeleccionado.forEach(caja => {
        caja.style.outline = "";
        caja.classList.remove('seleccion-masiva');
        observadorTamaño.unobserve(caja);
    });
    grupoSeleccionado = [];
    const info = document.getElementById('info-grupo');
    if (info) info.innerText = "0 CAJAS SELECCIONADAS";
}

/**
 * 🎯 RECALIBRACIÓN CUÁNTICA (FOCO DE SIEMBRA)
 */
const hoja1 = document.getElementById('hoja1');
if (hoja1) {
    hoja1.addEventListener('click', function(e) {
        // Solo actúa si la Estación Musical está visible
        const estacion = document.getElementById('paleta-fly');
        if (!estacion || !estacion.classList.contains('estacion-visible')) return;

        // GPS de precisión para el cursor en lienzos con Zoom
        let range;
        if (document.caretRangeFromPoint) {
            range = document.caretRangeFromPoint(e.clientX, e.clientY);
        }

        if (range) {
            const sel = window.getSelection();
            sel.removeAllRanges();
            sel.addRange(range);
            
            // Si el clic aterrizó en una caja, le damos el mando
            const cajaDestino = range.startContainer.parentElement.closest('.box-estrofa');
            if (cajaDestino) {
                cajaActiva = cajaDestino;
                cajaDestino.focus();
                console.log("🎯 Foco de siembra anclado en:", cajaDestino.id);
            }
        }
    });
}

/**
 * 📄 Alternar Hoja 2 con Scroll Inteligente
 */
function tglHoja2() {
    const h2 = document.getElementById('hoja2');
    const btn = document.querySelector('.btn-hoja');
    
    if (h2.style.display === 'none' || !h2.style.display) {
        h2.style.display = 'block';
        btn.style.background = 'var(--accent)';
        btn.style.color = '#000';
        
        // 🚀 Desplazamiento suave para que el usuario sepa dónde apareció
        h2.scrollIntoView({ behavior: 'smooth', block: 'start' });
        console.log("📄 Hoja 2 desplegada.");
    } else {
        h2.style.display = 'none';
        btn.style.background = '';
        btn.style.color = '';
        
        // Regresamos al inicio de la Hoja 1
        document.getElementById('hoja1').scrollIntoView({ behavior: 'smooth' });
        console.log("📄 Escenario compactado a Hoja 1.");
    }
}

// Aseguramos que sea global
window.tglHoja2 = tglHoja2;
// AMARRES FINALES
window.toggleSeleccionMasiva = toggleSeleccionMasiva;
window.alinearGrupo = alinearGrupo;
window.distribuirGrupo = distribuirGrupo;
window.soltarGrupo = soltarGrupo;

/**
 * 📄 PERSAL: Esconde o muestra la barra superior para visualización limpia
 */
function tglOcultarTopBar() {
    const bar = document.getElementById('top-bar');
    const gatillo = document.getElementById('gatillo-top-bar');
    if (!bar || !gatillo) return;

    // Conmutamos la clase de ocultamiento del CSS
    const escondiendo = bar.classList.toggle('bar-escondida');
    
    // Rotamos la flecha del indicador táctil
    gatillo.innerText = escondiendo ? "▼" : "▲";
    gatillo.style.color = escondiendo ? "var(--accent)" : "#ffffff";
    
    console.log(escondiendo ? "🌊 Escenario liberado: Barra superior oculta." : "🛰️ Puente de mando activo.");
}

// Lo exportamos al ecosistema global de la ventana
window.tglOcultarTopBar = tglOcultarTopBar;


function aplicarRestriccionesUsuario() {
    // 1. 👑 MODO ADMINISTRADOR (Acceso total Máster)
    if (typeof window.esSembradorMaestro !== 'undefined' && window.esSembradorMaestro === true) {
        console.log("👑 Modo Administrador: Mesa de control liberada al 100%.");
        
        // Te encendemos tus herramientas exclusivas de la barra superior
        const comandosAdmin = ['.btn-load', '.btn-add-box', '.btn-save', '.btn-music', '#btn-add-filtro'];
        comandosAdmin.forEach(sel => {
            document.querySelectorAll(sel).forEach(el => el.style.display = ''); 
        });
        
        // Te devolvemos la visibilidad de TODOS los bloques de tu panel de Pandora original
        document.querySelectorAll('#pandora .menu-section, #pandora .acordeon-item').forEach(seccion => {
            seccion.style.display = ''; 
        });
        
        // Ocultamos de tu barra superior los botones rápidos de usuario para evitar duplicidad
        document.querySelectorAll('.btn-user-transporte').forEach(el => el.style.display = 'none');
        return; 
    }

    // 2. 👥 MODO USUARIO (Filtro elástico: Oculta Ficha y Maquetación, libera Laboratorio completo)
    console.log("👥 Modo Usuario: Ocultando Ficha y Maquetación de Grupo.");

    // A. Mutilamos estrictamente los botones de la barra superior que escriben o borran en la nube
    const comandosNubeOcultar = [
        '.btn-load',          // El Tanque de carga masiva de ADN
        '.btn-add-box',       // El Creador Atómico de estrofas (+)
        '.btn-save',          // El botón de Guardar Canto Oficial en la nube
        '.btn-music',         // El interruptor de la paleta Fly de siembra
        '.btn-delete-huerto'  // Las papeleras de borrado de misas del archivero central
    ];

    comandosNubeOcultar.forEach(sel => {
        document.querySelectorAll(sel).forEach(el => el.style.display = 'none');
    });

    // Aseguramos que tus botones rápidos de transposición Litúrgica en la barra estén encendidos para el coro
    document.querySelectorAll('.btn-user-transporte').forEach(sel => {
        sel.style.display = 'flex';
    });

    // 🚀 B. EL TRUCO QUIRÚRGICO DE PANDORA (Ficha de Canto y Maquetación fuera)
    const seccionesPandora = document.querySelectorAll('#pandora .menu-section');
    if (seccionesPandora.length >= 2) {
        // Apagamos la Ficha del Canto (Título, Autor, Comentarios planos)
        seccionesPandora[0].style.setProperty('display', 'none', 'important');
        // El Laboratorio de Estilo completo con Tipografías, Tamaños y Alineación se queda al 100%
        seccionesPandora[1].style.setProperty('display', 'block', 'important');
    }

    // 🚀 NUEVO TRUCO: Ocultamos el bloque de Maquetación de Grupo (LEGO) al final de Pandora
    const maquetacionGrupo = document.querySelector('#pandora .acordeon-item');
    if (maquetacionGrupo) {
        maquetacionGrupo.style.setProperty('display', 'none', 'important');
    }

    // 🔒 Congelamos la hoja de canto: Las estrofas quedan estáticas para pura lectura en el presbiterio
    document.querySelectorAll('.box-estrofa').forEach(box => {
        box.contentEditable = "false";
        box.style.cursor = "default";
        box.removeAttribute('onmousedown'); 
    });
}
window.aplicarRestriccionesUsuario = aplicarRestriccionesUsuario;

/**
 * 🛰️ MOTOR DE GESTOS TÁCTILES SEDA (SWIPE DETECTOR V1.0)
 * Diseñado para usabilidad en presbiterio (Galaxy Tab S9+ / Android)
 */
(function() {
    let touchStartX = 0;
    let touchStartY = 0;
    let touchEndX = 0;
    let touchEndY = 0;

    // Umbral mínimo de pixeles para activar el comando (evita falsos disparos al hacer scroll vertical)
    const umbralSwipeHorizontal = 80; 
    const umbralSwipeVertical = 50;

    // Sensor 1: Captura el punto exacto donde el dedo toca la pantalla
    document.addEventListener('touchstart', function(e) {
        // Cortafuegos: Si estás operando dentro de un panel ya abierto, o en la paleta, no dispares gestos
        if (e.target.closest('#pandora') || e.target.closest('#biblioteca') || e.target.closest('#paleta-fly')) return;
        
        const toque = e.touches[0];
        touchStartX = toque.clientX;
        touchStartY = toque.clientY;
    }, { passive: true });

    // Sensor 2: Captura el punto exacto donde el dedo se levanta de la pantalla
    document.addEventListener('touchend', function(e) {
        if (e.target.closest('#pandora') || e.target.closest('#biblioteca') || e.target.closest('#paleta-fly')) return;

        const toque = e.changedTouches[0];
        touchEndX = toque.clientX;
        touchEndY = toque.clientY;

        procesarGestoLiturgico();
    }, { passive: true });

    // Analizador de vectores matemáticos en la pantalla táctil
    function procesarGestoLiturgico() {
        const deltaX = touchEndX - touchStartX;
        const deltaY = touchEndY - touchStartY;

        // 🚀 DIAGNÓSTICO DEL VECTOR: ¿El movimiento fue predominantemente HORIZONTAL?
        if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > umbralSwipeHorizontal) {
            
            if (deltaX > 0) {
                // ➡️ DESLIZ HACIA LA DERECHA (Dedo va de izquierda a derecha)
                const bibliotecaAbierta = document.getElementById('biblioteca')?.style.right === "0px";
                
                if (bibliotecaAbierta) {
                    // Si el panel derecho estaba abierto, lo cerramos
                    if (typeof toggleBiblioteca === 'function') toggleBiblioteca();
                } else {
                    // Si todo estaba limpio, abrimos Pandora (Ajustes izquierdos)
                    const pandoraCerrada = document.getElementById('pandora')?.style.left === "-340px" || !document.getElementById('pandora')?.style.left;
                    if (pandoraCerrada && typeof togglePandora === 'function') togglePandora();
                }
                console.log("👉 Gesto: Deslizar a la derecha procesado.");
            } else {
                // ⬅️ DESLIZ HACIA LA IZQUIERDA (Dedo va de derecha a izquierda)
                const pandoraAbierta = document.getElementById('pandora')?.style.left === "0px";
                
                if (pandoraAbierta) {
                    // Si el panel izquierdo estaba abierto, lo cerramos
                    if (typeof togglePandora === 'function') togglePandora();
                } else {
                    // Si todo estaba limpio, abrimos la Biblioteca (Panel derecho)
                    const bibliotecaCerrada = document.getElementById('biblioteca')?.style.right === "-340px" || !document.getElementById('biblioteca')?.style.right;
                    if (bibliotecaCerrada && typeof toggleBiblioteca === 'function') toggleBiblioteca();
                }
                console.log("👈 Gesto: Deslizar a la izquierda procesado.");
            }
        }
        
        // 🚀 DIAGNÓSTICO DEL VECTOR: ¿El movimiento fue predominantemente VERTICAL?
        else if (Math.abs(deltaY) > Math.abs(deltaX) && Math.abs(deltaY) > umbralSwipeVertical) {
            
            if (deltaY > 0) {
                // ⬇️ DESLIZ HACIA ABAJO: Si el usuario jala la pantalla hacia abajo, mostramos la barra superior
                const barraOculta = document.getElementById('top-bar')?.classList.contains('bar-escondida');
                if (barraOculta && typeof tglOcultarTopBar === 'function') {
                    tglOcultarTopBar();
                }
                console.log("👇 Gesto: Mostrar puente de mando superior.");
            } else {
                // ⬆️ DESLIZ HACIA ARRIBA: Si el usuario empuja la pantalla hacia arriba, escondemos la barra para lectura limpia
                const barraVisible = document.getElementById('top-bar')?.classList.contains('top-bar-visible') && !document.getElementById('top-bar')?.classList.contains('bar-escondida');
                if (barraVisible && typeof tglOcultarTopBar === 'function') {
                    tglOcultarTopBar();
                }
                console.log("👆 Gesto: Esconder puente de mando superior para lectura limpia.");
            }
        }
    }
})();









