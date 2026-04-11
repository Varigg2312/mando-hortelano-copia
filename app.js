const SUPABASE_URL = 'https://sesrmzxwpgxobfrmuaix.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_JWQLt7yJm0bw406beocZAQ_-t28acp3';
let tokenSeguridad = null; 

// --- LOGIN ---
document.getElementById('btn-login').addEventListener('click', async () => {
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-pass').value;
    const btn = document.getElementById('btn-login');
    const errorMsg = document.getElementById('login-error');
    
    btn.textContent = "VERIFICANDO...";
    errorMsg.style.display = 'none';

    try {
        const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
            method: 'POST',
            headers: { 'apikey': SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await res.json();
        
        if (res.ok && data.access_token) {
            tokenSeguridad = data.access_token;
            // Usamos la clase para ocultar con fuerza bruta
            document.getElementById('pantalla-login').classList.add('oculto');
            iniciarMaquinaria();
        } else {
            throw new Error(data.error_description || "Credenciales inválidas");
        }
    } catch (err) {
        errorMsg.textContent = "ERROR: " + err.message;
        errorMsg.style.display = 'block';
        btn.textContent = "DESBLOQUEAR SISTEMA";
    }
});

function iniciarMaquinaria() {
    // --- VOZ ---
    function limpiarTextoVoz(t) {
        let x = t.toUpperCase().replace(/\b(EL|LA|DE|DEL|LETRA|NÚMERO|NUMERO|LOTE|RAYA|ESPACIO)\b/g, '');
        const c = { "ÉLE":"L", "ELE":"L", "GUION":"-", "GUIÓN":"-", "MENOS":"-", "BARRA":"/", "PARTIDO":"/", "PUNTO":".", "CERO":"0", "UNO":"1", "DOS":"2", "TRES":"3", "CUATRO":"4", "CINCO":"5", "SEIS":"6", "SIETE":"7", "OCHO":"8", "NUEVE":"9" };
        for (const [p, s] of Object.entries(c)) x = x.replace(new RegExp(`\\b${p}\\b`, 'g'), s);
        return x.replace(/\s+/g, '').replace(/[^A-Z0-9\-\/\.]/g, '');
    }

    window.dictarLote = (id) => {
        const R = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!R) return alert("Sordo.");
        const reco = new R(); reco.lang = 'es-ES';
        reco.onstart = () => { document.getElementById(id).style.backgroundColor = "#fff3cd"; };
        reco.onresult = (e) => { document.getElementById(id).value = limpiarTextoVoz(e.results[0][0].transcript); };
        reco.onend = () => { document.getElementById(id).style.backgroundColor = "#fff"; };
        reco.start();
    };

    // --- FIRMA ---
    const canvas = document.getElementById('lienzo-firma');
    const ctx = canvas.getContext('2d');
    let dibujando = false, lienzoEstaDibujado = false;
    const iniciarT = (e) => { dibujando = true; ctx.beginPath(); const r = canvas.getBoundingClientRect(); const ev = e.touches ? e.touches[0] : e; ctx.moveTo(ev.clientX - r.left, ev.clientY - r.top); lienzoEstaDibujado = true; e.preventDefault(); };
    const dibujarT = (e) => { if (!dibujando) return; const r = canvas.getBoundingClientRect(); const ev = e.touches ? e.touches[0] : e; ctx.lineTo(ev.clientX - r.left, ev.clientY - r.top); ctx.stroke(); e.preventDefault(); };
    canvas.addEventListener('mousedown', iniciarT); canvas.addEventListener('mousemove', dibujarT); canvas.addEventListener('mouseup', () => dibujando = false);
    canvas.addEventListener('touchstart', iniciarT); canvas.addEventListener('touchmove', dibujarT); canvas.addEventListener('touchend', () => dibujando = false);
    document.getElementById('btn-limpiar-firma').addEventListener('click', () => { ctx.clearRect(0,0,canvas.width,canvas.height); lienzoEstaDibujado = false; });

    // --- MEMORIA ---
    const campos = ['lote-vinagre', 'lote-sal', 'lote-ajo', 'lote-aceite', 'lote-limon', 'lote-pimiento', 'lote-envase'];
    campos.forEach(id => { if(localStorage.getItem(id)) document.getElementById(id).value = localStorage.getItem(id); });

    // --- GRÁFICAS ---
    setInterval(() => { document.getElementById('reloj').textContent = new Date().toLocaleTimeString('es-ES'); }, 1000);
    async function cargarG() {
        try {
            const res = await fetch(`${SUPABASE_URL}/rest/v1/registro_higiene?select=fecha_hora,temperatura,cloro&order=fecha_hora.desc&limit=15`, { headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${tokenSeguridad}` }});
            const d = await res.json(); d.reverse();
            const labels = d.map(x => new Date(x.fecha_hora).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' }));
            new Chart(document.getElementById('grafica-temperatura').getContext('2d'), { type: 'line', data: { labels, datasets: [{ label: 'ºC Cámara', data: d.map(x => x.temperatura), borderColor: '#2980b9' }] }});
            new Chart(document.getElementById('grafica-cloro').getContext('2d'), { type: 'line', data: { labels, datasets: [{ label: 'Cloro (mg/L)', data: d.map(x => x.cloro), borderColor: '#27ae60' }] }});
        } catch(e) {}
    }
    cargarG();

    // --- ENVÍOS ---
    document.getElementById('formulario-higiene').addEventListener('submit', async (e) => {
        e.preventDefault();
        const body = JSON.stringify({ cloro: parseFloat(document.getElementById('cloro').value), organoleptico: document.querySelector('input[name="organoleptico"]:checked').value, temperatura: parseFloat(document.getElementById('temperatura').value), firma: "Manual" });
        const r = await fetch(`${SUPABASE_URL}/rest/v1/registro_higiene`, { method: 'POST', headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${tokenSeguridad}`, 'Content-Type': 'application/json' }, body });
        if (r.ok) { alert('✅ Higiene OK.'); location.reload(); }
    });

    document.getElementById('formulario-trazabilidad').addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!lienzoEstaDibujado) return alert("Firma obligatoria.");
        campos.forEach(id => localStorage.setItem(id, document.getElementById(id).value));
        const body = JSON.stringify({ lote_tomate: document.getElementById('lote-tomate').value, lote_vinagre: document.getElementById('lote-vinagre').value, lote_sal: document.getElementById('lote-sal').value, lote_ajo: document.getElementById('lote-ajo').value, lote_aceite: document.getElementById('lote-aceite').value, lote_limon: document.getElementById('lote-limon').value, lote_pimiento: document.getElementById('lote-pimiento').value, lote_envases: document.getElementById('lote-envase').value, litros: parseFloat(document.getElementById('litros-prod').value), lote_gazpacho_salida: document.getElementById('lote-salida').value, firma: canvas.toDataURL() });
        const r = await fetch(`${SUPABASE_URL}/rest/v1/registro_trazabilidad`, { method: 'POST', headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${tokenSeguridad}`, 'Content-Type': 'application/json' }, body });
        if (r.ok) alert('✅ Lote sellado.');
    });

    document.getElementById('btn-imprimir-traza').addEventListener('click', async () => {
        const [rh, rt] = await Promise.all([fetch(`${SUPABASE_URL}/rest/v1/registro_higiene?select=*&order=fecha_hora.asc`, { headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${tokenSeguridad}` }}), fetch(`${SUPABASE_URL}/rest/v1/registro_trazabilidad?select=*&order=fecha_hora.asc`, { headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${tokenSeguridad}` }})]);
        const h = await rh.json(), t = await rt.json();
        const mapH = {}; h.forEach(x => { mapH[new Date(x.fecha_hora).toLocaleDateString('es-ES')] = x; });
        const { jsPDF } = window.jspdf; const doc = new jsPDF('landscape');
        const filas = t.map(x => { const f = new Date(x.fecha_hora).toLocaleDateString('es-ES'), y = mapH[f] || {}; return [f, y.cloro || '-', y.temperatura || '-', y.organoleptico || '-', x.lote_tomate, x.lote_vinagre, x.lote_sal, x.lote_ajo, x.lote_aceite, x.lote_limon, x.lote_pimiento, x.lote_envases, x.litros, x.lote_gazpacho_salida, ""]; });
        doc.autoTable({ head: [['Fecha', 'Cloro', 'ºC', 'Org.', 'Tom.', 'Vin.', 'Sal', 'Ajo', 'Ace.', 'Lim.', 'Pim.', 'Env.', 'Lit.', 'Sal.', 'Firma']], body: filas, didDrawCell: (d) => { if (d.column.index === 14 && d.section === 'body') { const f = t[d.row.index].firma; if (f) doc.addImage(f, 'PNG', d.cell.x+2, d.cell.y+1, 15, 6); } } });
        doc.save('Informe_El_Hortelano.pdf');
    });
}
