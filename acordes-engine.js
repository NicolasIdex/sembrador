/**
 * 🎹 MOTOR DE ACORDES FLOTANTES V2.0
 * Paradigma: Capas de Siembra (Objetos sobre escenario)
 */

// 1. DICCIONARIOS DE TRANSPORTE (Solo una vez)
var escalaCromatica = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
var bemoles = { "Db": "C#", "Eb": "D#", "Gb": "F#", "Ab": "G#", "Bb": "A#" };
/**
 * 🌱 SIEMBRA DE ACORDE: El motor principal con retención de foco tipográfico
 */
function sembrarAcordeWidget(nota) {
    // 1. Soldadura: Si hay un widget activo con imán encendido, sumamos la nota (Cm7...)
    const activo = document.querySelector('.acorde-widget.activa');
    if (activo) { 
        activo.innerText += nota; 
        console.log("🧩 Soldadura molecular aplicada:", activo.innerText);
        return; 
    }

    // Si no hay widget activo, requerimos una selección tipográfica real en la estrofa
    const sel = window.getSelection();
    if (!sel.rangeCount) return console.warn("⚠️ No hay un punto de inserción activo en el texto.");

    // 2. Siembra: Creamos el contenedor "Ancla" inline
    const range = sel.getRangeAt(0);
    
    // Creamos el Widget único para el acorde completo
    const acorde = document.createElement('span');
    acorde.className = 'acorde-widget activa';
    acorde.innerText = nota;
    acorde.contentEditable = "false"; // La música se mantiene rígida, no es texto plano

    // Insertamos el acorde directamente en el flujo del texto nativo
    range.insertNode(acorde);

    // Ajuste de Cursor: Colocamos el cursor inmediatamente después del acorde inyectado
    const nuevoRange = document.createRange();
    nuevoRange.setStartAfter(acorde);
    nuevoRange.setEndAfter(acorde);
    sel.removeAllRanges();
    sel.addRange(nuevoRange);

    // Guardamos la referencia global del imán encendido
    window.ultimaPuchita = acorde;

    // Comportamiento del clic individual sobre el objeto creado
    acorde.onclick = (e) => { 
        e.stopPropagation(); 
        document.querySelectorAll('.acorde-widget').forEach(w => w.classList.remove('activa'));
        acorde.classList.add('activa');
        window.ultimaPuchita = acorde;
    };
}
window.sembrarAcordeWidget = sembrarAcordeWidget;

/**
 * 🛰️ TRANSPORTE ESPACIAL: Mueve el tono de todos los widgets
 */
function transportarAcordes(semitonos) {
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
    
    console.log(`🎵 Widgets transportados: ${semitonos > 0 ? '+' : ''}${semitonos}`);
}
// Exportamos al mundo global
window.sembrarAcordeWidget = sembrarAcordeWidget;
window.transportarTodo = transportarAcordes;


// Función auxiliar para encontrar texto dentro de la caja
function getTextNodesIn(node) {
    let textNodes = [];
    if (node.nodeType == 3) textNodes.push(node);
    else {
        for (let child of node.childNodes) {
            if (!child.classList?.contains('acorde-widget')) {
                textNodes.push(...getTextNodesIn(child));
            }
        }
    }
    return textNodes;
}
window.refrescarPosicionAcordes = refrescarPosicionAcordes;
/**
 * 🔄 RECALIBRADOR DE COORDENADAS SEDA 3.0 (MUTADO A IN-LINE ELÁSTICO)
 * CORREGIDO: Anula el cálculo estático de pixeles que causaba los encimamientos.
 * Dejamos la función vacía para que no tire errores si la estrofa la sigue invocando,
 * permitiendo que el navegador controle el flujo nativo del texto.
 */
function refrescarPosicionAcordes(caja) {
    // El software litúrgico moderno fluye de forma nativa e inline.
    // Ya no se requiere calcular coordenadas físicas left/top.
    console.log("🎵 Flujo de acordes estabilizado vía render nativo del navegador.");
}
window.refrescarPosicionAcordes = refrescarPosicionAcordes;
