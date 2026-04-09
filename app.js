const SUPABASE_URL = 'https://sesrmzxwpgxobfrmuaix.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_JWQLt7yJm0bw406beocZAQ_-t28acp3';

// --- MOTOR DE VOZ INTELIGENTE ---
function dictarLote(idCampo) {
    const Reconocimiento = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Reconocimiento) { alert("Navegador no compatible."); return; }
    const reco = new Reconocimiento();
    reco.lang = 'es-ES';
    reco.onstart = () => { document.getElementById(idCampo).style.backgroundColor = "#fff3cd"; };
    reco.onresult = (e) => {
        let t = e.results[0][0].transcript.toUpperCase().replace(/\s/g, '').replace(/\./g, '');
        document.getElementById(idCampo).value = t;
    };
    reco.onend = () => { document.getElementById(idCampo).style.backgroundColor = "#fff"; };
    reco.start();
}

document.addEventListener('DOMContentLoaded', () => {
    const reloj = document.getElementById('reloj');
    const formHigiene = document.getElementById('formulario-higiene');
    const formTraza = document.getElementById('formulario-trazabilidad');
    const btnImprimir = document.getElementById('btn-imprimir-traza');

    setInterval(() => { reloj.textContent = new Date().toLocaleTimeString('es-ES'); }, 1000);

    // MÓDULO 1: HIGIENE
    formHigiene.addEventListener('submit', async (e) => {
        e.preventDefault();
        const datos = {
            cloro: parseFloat(document.getElementById('cloro').value),
            organoleptico: document.querySelector('input[name="organoleptico"]:checked').value,
            temperatura: parseFloat(document.getElementById('temperatura').value),
            firma: "Paqui"
        };
        const res = await fetch(`${SUPABASE_URL}/rest/v1/registro_higiene`, {
            method: 'POST',
            headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(datos)
        });
        if (res.ok) { alert('✅ Higiene guardada.'); formHigiene.reset(); }
    });

    // MÓDULO 2: TRAZABILIDAD
    formTraza.addEventListener('submit', async (e) => {
        e.preventDefault();
        const datos = {
            lote_tomate: document.getElementById('lote-tomate').value,
            lote_vinagre: document.getElementById('lote-vinagre').value,
            lote_sal: document.getElementById('lote-sal').value,
            lote_ajo: document.getElementById('lote-ajo').value,
            lote_aceite: document.getElementById('lote-aceite').value,
            lote_limon: document.getElementById('lote-limon').value,
            lote_pimiento: document.getElementById('lote-pimiento').value,
            lote_envases: document.getElementById('lote-envase').value,
            litros: parseFloat(document.getElementById('litros-prod').value),
            lote_gazpacho_salida: document.getElementById('lote-salida').value,
            firma: "Paqui"
        };
        const res = await fetch(`${SUPABASE_URL}/rest/v1/registro_trazabilidad`, {
            method: 'POST',
            headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(datos)
        });
        if (res.ok) { alert('✅ Lote sellado.'); formTraza.reset(); }
    });

    // MÓDULO 3: INFORME MAESTRO (PDF UNIFICADO)
    btnImprimir.addEventListener('click', async () => {
        btnImprimir.textContent = "⏳ CRUZANDO DATOS...";
        
        try {
            // 1. Peticiones paralelas para ahorrar tiempo
            const [resH, resT] = await Promise.all([
                fetch(`${SUPABASE_URL}/rest/v1/registro_higiene?select=*&order=fecha_hora.asc`, { headers: { 'apikey': SUPABASE_ANON_KEY }}),
                fetch(`${SUPABASE_URL}/rest/v1/registro_trazabilidad?select=*&order=fecha_hora.asc`, { headers: { 'apikey': SUPABASE_ANON_KEY }})
            ]);

            const higiene = await resH.json();
            const traza = await resT.json();

            // 2. Mapear higiene por fecha para búsqueda rápida
            const mapaHigiene = {};
            higiene.forEach(h => {
                const fechaStr = new Date(h.fecha_hora).toLocaleDateString('es-ES');
                mapaHigiene[fechaStr] = h; // Guardamos el registro de ese día
            });

            // 3. Generar PDF
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF('landscape');
            doc.setFontSize(14);
            doc.text("REGISTRO UNIFICADO: HIGIENE Y TRAZABILIDAD - EL HORTELANO", 14, 15);

            // 4. Construir filas cruzadas
            const filas = traza.map(t => {
                const f = new Date(t.fecha_hora).toLocaleDateString('es-ES');
                const h = mapaHigiene[f] || {}; // Buscamos si hay higiene ese día
                
                return [
                    f,
                    h.cloro || '-', 
                    h.temperatura || '-',
                    h.organoleptico || '-',
                    t.lote_tomate, t.lote_vinagre, t.lote_sal, t.lote_ajo, t.lote_aceite,
                    t.lote_limon, t.lote_pimiento, t.lote_envases, t.litros, t.lote_gazpacho_salida
                ];
            });

            doc.autoTable({
                startY: 25,
                head: [['Fecha', 'Cloro', 'ºC', 'Org.', 'Tom.', 'Vin.', 'Sal', 'Ajo', 'Ace.', 'Lim.', 'Pim.', 'Env.', 'Lit.', 'Sal.']],
                body: filas,
                theme: 'grid',
                styles: { fontSize: 7, halign: 'center', cellPadding: 1.5 },
                headStyles: { fillColor: [230, 230, 230], textColor: [0,0,0], fontStyle: 'bold' }
            });

            doc.save('Informe_Unificado_El_Hortelano.pdf');
        } catch (err) {
            alert('Error al generar el informe unificado.');
        } finally {
            btnImprimir.textContent = "🖨️ IMPRIMIR REGISTRO PDF";
        }
    });
});