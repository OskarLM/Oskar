
// --- Mis Gastos: app.js (Edge fix) ---
console.log('[MisGastos] app.js cargado');

// ==== Utilidades DOM ====
const qs  = (s, r=document) => r.querySelector(s);
const qsa = (s, r=document) => Array.from(r.querySelectorAll(s));
function el(tag, props={}, children=[]) {
  const node = document.createElement(tag);
  if (props.class) node.className = props.class;
  if (props.style) node.setAttribute('style', props.style);
  if (props.text !== undefined) node.textContent = props.text;
  Object.entries(props).forEach(([k,v])=>{
    if(['class','style','text'].includes(k)) return;
    if (k==='onClick' && typeof v==='function') node.addEventListener('click', v);
    else node.setAttribute(k,v);
  });
  children.forEach(c => node.appendChild(c));
  return node;
}
function addOption(sel, value, selected=false){ const o=document.createElement('option'); o.value=value; o.textContent=value; if(selected) o.selected=true; sel.appendChild(o); }
function fmtEuro(n){ return `${n.toFixed(2)} €`; }

// ==== Datos base ====
const subBase = ["Accesorios","Agua","Aita","Ajuar / Electrodomésticos","Alojamiento","Apuestas y juegos","Atracciones","Ayuntamiento","Barco","Cajero","Casa","Comida","Comisiones","Comunidad","Copas","Efectivo","Electrónica","Extraescolar","Farmacia","Filamento","Garaje","Gas","Gasolina","Herramientas","Ikastola","Impresora","Impuestos","Juguetes / Regalos","Libros / Material escolar","Luz","Mantenimiento","Medicamentos","Parking","Peaje","Préstamo","Reforma","Ropa","Septiembre","Seguro","Suscripción","Suscripciones","Teléfono","Tren","Varios"];
const catBase = ["Casa","Caravana","Coche","Compras","Efectivo","Escolar","Garaje","Restaurante","Vacaciones"]; 
const mesesLabel=["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"]; 
const origenBase=["Ingreso","Gasto","Nómina"];

// ==== Estado ====
let movimientos = JSON.parse(localStorage.getItem('movimientos')||'[]');
let catExtra = JSON.parse(localStorage.getItem('categoriaExtra')||'[]');
let subMaestra = JSON.parse(localStorage.getItem('subMaestra_v2')||JSON.stringify(subBase));
let nBackup = parseInt(localStorage.getItem('nBackup')||'1');
let registrosVisibles = 25;
let filtradosGlobal = [];
let pinActual = '';
let casaOculta = false;

// ==== Seguridad: PIN con hash (Web Crypto) ====
async function sha256(txt){ const buf=await crypto.subtle.digest('SHA-256', new TextEncoder().encode(txt)); return [...new Uint8Array(buf)].map(b=>b.toString(16).padStart(2,'0')).join(''); }
async function ensurePin(){ if(localStorage.getItem('pinHash')) return; const p = prompt('Crea un PIN (4 dígitos)'); if(!/^\d{4}$/.test(p||'')) return alert('PIN no válido'); localStorage.setItem('pinHash', await sha256(p)); }
function updateDots(){ qsa('.dot').forEach((d,i)=> d.classList.toggle('filled', i < pinActual.length)); }
function clearPin(){ pinActual=''; updateDots(); }
async function pressPin(n){ if(pinActual.length<4){ pinActual+=String(n); updateDots(); if(pinActual.length===4){ const ok = (await sha256(pinActual))===localStorage.getItem('pinHash'); if(ok) unlock(); else { alert('PIN incorrecto'); clearPin(); } } } }
function unlock(){ const ov=qs('#authOverlay'); if(ov) ov.style.display='none'; const mov=qs('#movimientos'); if(mov){ mov.classList.remove('hidden'); mov.dataset.permiso='OK'; } init(); }
// La función biometricAuth se inyecta desde index.html (WebAuthn). Si no, ofrecemos fallback
async function biometricAuth(){ alert('Pulsa 🧬 de nuevo; si no funciona, usa PIN.'); }

// ==== Render principal ====
function mostrar(){
  const movDiv = qs('#movimientos'); if(!movDiv || movDiv.dataset.permiso!=="OK") return;
  const fs = ['filtroMes','filtroAño','filtroCat','filtroSub','filtroOri'].map(id=>qs('#'+id).value);
  let t = 0;
  filtradosGlobal = movimientos.filter(m=>{
    const d=m.f.split('-');
    const cM = fs[0]==='TODOS' || (parseInt(d[1])-1).toString()===fs[0];
    const cA = fs[1]==='TODOS' || d[0]===fs[1];
    const cC = fs[2]==='TODAS' || m.c===fs[2];
    const cS = fs[3]==='TODAS' || m.s===fs[3];
    const cO = fs[4]==='TODOS' || m.o===fs[4];
    return cM&&cA&&cC&&cS&&cO;
  }).sort((a,b)=> new Date(b.f)-new Date(a.f));
  filtradosGlobal.forEach(m=> t+= m.imp);

  const factor = (fs[0]==='TODOS') ? 12 : 1;
  const bD = qs('#balance'); if(bD){ bD.textContent = fmtEuro(t);
    if (t < 0) bD.style.color = 'var(--danger)';
    else if (t <= (750*factor)) bD.style.color = 'var(--warning)';
    else if (t <= (1400*factor)) bD.style.color = 'var(--success)';
    else bD.style.color = 'var(--electric-blue)';
  }

  if (movDiv.dataset.modo === 'graficos') {
    renderGraficos(factor);
  } else {
    const lista = qs('#lista'); const frag = document.createDocumentFragment();
    filtradosGlobal.slice(0, registrosVisibles).forEach(m=> frag.appendChild(renderCard(m)) );
    if (lista){ lista.innerHTML=''; lista.appendChild(frag); }
    const ld = qs('#loader'); if (ld) ld.style.display='none';
  }
}

function renderCard(m){
  const card = el('div',{class:'card', style:`border-left-color:${m.imp>=0?'var(--success)':'var(--danger)'}`});
  const meta = el('div',{class:'meta',text:`${m.f.split('-').reverse().join('/')} • ${m.o}`});
  const title = el('b',{text:`${m.c} - ${m.s}`});
  if(m.d){ card.append(meta, title, el('div',{style:'font-size:12px;opacity:0.8', text:m.d})); }
  else { card.append(meta, title); }
  const monto = el('div',{class:'monto', style:`color:${m.imp>=0?'var(--success)':'var(--danger)'}`, text:fmtEuro(Math.abs(m.imp))});
  card.appendChild(monto);
  card.addEventListener('click', ()=> abrirFormulario(m.id));
  return card;
}

function renderGraficos(f){
  const lista = qs('#lista');
  let datos = [...filtradosGlobal];
  if (casaOculta) datos = datos.filter(m=> !m.c.toLowerCase().includes('compra casa'));
  const fCat = qs('#filtroCat').value;
  let agrupado = {}; let titulo = 'ANÁLISIS DE GASTO';
  const gastos = datos.filter(m=> m.imp < 0);
  if (fCat === 'TODAS') gastos.forEach(m=>{ agrupado[m.c] = (agrupado[m.c]||0) + Math.abs(m.imp); });
  else { gastos.forEach(m=>{ agrupado[m.s] = (agrupado[m.s]||0) + Math.abs(m.imp); }); titulo = `${fCat.toUpperCase()} (DESGLOSE)`; }
  const max = Math.max(...Object.values(agrupado), 1);
  const header = el('div',{},[
    el('h2',{style:'color:var(--primary); font-size:18px; text-align:center; margin-bottom:5px;', text:titulo}),
    el('div',{style:'display:flex; justify-content:center; gap:12px; margin-bottom:25px; font-size:19px; font-weight:900;'},[
      el('span',{style:'color:var(--electric-blue);', text:`0-${50*f}€`} ),
      el('span',{style:'color:var(--success);',      text:`${200*f}€`} ),
      el('span',{style:'color:var(--warning);',      text:`${500*f}€`} ),
      el('span',{style:'color:var(--danger);',       text:`+${500*f}€`} )
    ])
  ]);
  if (lista){ lista.innerHTML=''; lista.appendChild(header); }
  Object.entries(agrupado).sort((a,b)=> b[1]-a[1]).forEach(([nombre,val])=>{
    const esCasa = nombre.toLowerCase().includes('compra casa');
    const t1=Math.min(val,50*f), t2= val>50*f?Math.min(val-50*f,150*f):0, t3= val>200*f?Math.min(val-200*f,300*f):0, t4= val>500*f?val-500*f:0;
    const card = el('div',{class:'card', style:'border:none; background:transparent; margin-bottom:15px;'});
    const top = el('div',{style:'display:flex; justify-content:space-between; font-size:13px; margin-bottom:5px;'});
    top.append(el('span',{style:'color:#94a3b8;', text:nombre}), el('b',{style:'color:#fff;', text:fmtEuro(val)}));
    const bar = el('div',{style:`width:${(val/max)*100}%; height:14px; display:flex; background:#000; border-radius:7px; overflow:hidden; border:1px solid rgba(212,175,55,0.1);`});
    if(esCasa){ bar.append(el('div',{style:'width:100%; background:var(--success);'})); }
    else{
      if(t1>0) bar.append(el('div',{style:`width:${(t1/val)*100}%; background:var(--electric-blue);`}));
      if(t2>0) bar.append(el('div',{style:`width:${(t2/val)*100}%; background:var(--success);`}));
      if(t3>0) bar.append(el('div',{style:`width:${(t3/val)*100}%; background:var(--warning);`}));
      if(t4>0) bar.append(el('div',{style:`width:${(t4/val)*100}%; background:var(--danger);`}));
    }
    card.append(top, bar); if (lista) lista.appendChild(card);
  });
}

// ==== Formulario ====
function abrirFormulario(id=null){
  const f = qs('#form'), mDiv=qs('#movimientos'), btnD=qs('#btnEliminarRegistro');
  if(id){
    const m = movimientos.find(x=> String(x.id)===String(id)); if(!m) return;
    qs('#editId').value = m.id; qs('#fecha').value = m.f;
    llenar(qs('#origen'), origenBase, [], m.o);
    if(["Oskar","Josune"].includes(m.c)){
      llenar(qs('#categoria'), catBase, catExtra); addOption(qs('#categoria'), m.c, true);
    } else { llenar(qs('#categoria'), catBase, catExtra, m.c); }
    if(m.o === 'Nómina'){ qs('#subcategoria').innerHTML=''; addOption(qs('#subcategoria'), m.s, true); }
    else { llenar(qs('#subcategoria'), subMaestra, [], m.s); }
    qs('#importe').value = Math.abs(m.imp); qs('#descripcion').value = m.d || '';
    btnD.classList.remove('hidden');
  } else {
    qs('#editId').value=''; qs('#importe').value=''; qs('#descripcion').value='';
    qs('#fecha').value = new Date().toISOString().split('T')[0];
    llenar(qs('#origen'), origenBase, []); llenar(qs('#categoria'), catBase, catExtra); llenar(qs('#subcategoria'), subMaestra, []);
    btnD.classList.add('hidden');
  }
  f.classList.remove('hidden'); mDiv.classList.add('hidden');
}

function guardar(){
  const ids=['editId','origen','categoria','subcategoria','fecha','descripcion','importe'];
  const v = ids.reduce((acc,id)=> (acc[id]=qs('#'+id).value, acc), {});
  const imp = parseFloat(v.importe);
  if(!v.origen || !v.categoria || Number.isNaN(imp)) return alert('Faltan datos');
  const m = { id: v.editId || `id_${Date.now()}`, f: v.fecha, o: v.origen, c: v.categoria, s: v.subcategoria, imp: v.origen==='Gasto'? -Math.abs(imp): Math.abs(imp), d: v.descripcion };
  if(v.editId){ const idx = movimientos.findIndex(x=> String(x.id)===String(v.editId)); if(idx!==-1) movimientos[idx]=m; }
  else { movimientos.push(m); if(movimientos.length % 15 === 0) ejecutarBackupRotativo(); }
  localStorage.setItem('movimientos', JSON.stringify(movimientos)); volver();
}

function volver(){ qs('#form').classList.add('hidden'); qs('#movimientos').classList.remove('hidden'); actualizarListas(); mostrar(); }

function llenar(selectEl, base, extra, pre=""){
  selectEl.innerHTML=''; addOption(selectEl, '', false); selectEl.options[0].textContent='Seleccionar...'; selectEl.options[0].disabled=true; if(!pre) selectEl.options[0].selected=true;
  [...new Set([...base, ...extra])].sort((a,b)=> a.localeCompare(b,'es')).forEach(v=> addOption(selectEl, v, v===pre));
  if(selectEl.id !== 'origen') addOption(selectEl, '+', false);
}

function manejarNuevo(el, tipo){ if(el.value === '+'){ lanzarPopupPremium(el, tipo); } }
function abrirGraficos(){ const m = qs('#movimientos'); m.dataset.modo = (m.dataset.modo === 'graficos') ? 'lista' : 'graficos'; mostrar(); qs('#btnFiltroCasa').hidden = m.dataset.modo !== 'graficos'; }
function resetPagina(){ registrosVisibles = 25; window.scrollTo({top:0, behavior:'smooth'}); }

function actualizarListas(){
  const fC = qs('#filtroCat'), fS = qs('#filtroSub'), fO = qs('#filtroOri');
  fC.innerHTML=''; addOption(fC,'TODAS', true); [...new Set([...catBase, ...catExtra])].sort().forEach(c=> addOption(fC,c));
  fS.innerHTML=''; addOption(fS,'TODAS', true); [...new Set(subMaestra)].sort().forEach(s=> addOption(fS,s));
  fO.innerHTML=''; addOption(fO,'TODOS', true); origenBase.forEach(o=> addOption(fO,o));
}

function init(){
  const fM = qs('#filtroMes'), fA = qs('#filtroAño'), hoy = new Date();
  if (fM){ fM.innerHTML=''; addOption(fM,'TODOS', false); mesesLabel.forEach((m,i)=> addOption(fM, String(i), i===hoy.getMonth())); if(fM.value==='') fM.value=String(hoy.getMonth()); }
  if (fA){ fA.innerHTML=''; addOption(fA,'TODOS', false); for(let a=2020;a<=2030;a++) addOption(fA,String(a), a===hoy.getFullYear()); if(fA.value==='') fA.value=String(hoy.getFullYear()); }
  actualizarListas(); const tg=qs('#tagBackup'); if(tg) tg.textContent = 'PRÓX: #'+nBackup; mostrar();
}

function ejecutarBackupRotativo(){ const n = parseInt(localStorage.getItem('nBackup')||'1'); localStorage.setItem(`movimientos_backup_${n}`, JSON.stringify(movimientos)); const sig = n>=5 ? 1 : n+1; localStorage.setItem('nBackup', String(sig)); const t=qs('#tagBackup'); if(t) t.textContent='PRÓX: #'+sig; }

function exportarCSV(){
  const rows=[["id","fecha","origen","categoria","subcategoria","importe","descripcion"]];
  movimientos.forEach(m=> rows.push([m.id,m.f,m.o,m.c,m.s,m.imp,(m.d||'').replace(/
/g,' ')]));
  const csv = rows.map(r=> r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(',')).join('
');
  const blob = new Blob([csv],{type:'text/csv;charset=utf-8'});
  const a = document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=`movimientos_${new Date().toISOString().slice(0,10)}.csv`; a.click(); URL.revokeObjectURL(a.href);
}

// CSV parser sin regex (evita errores en Edge):
function parseCSVLine(line){
  const out=[]; let cur=''; let inQ=false; for(let i=0;i<line.length;i++){
    const ch=line[i];
    if(inQ){
      if(ch==='"'){
        if(line[i+1]==='"'){ cur+='"'; i++; } else { inQ=false; }
      } else { cur+=ch; }
    } else {
      if(ch===','){ out.push(cur); cur=''; }
      else if(ch==='"'){ inQ=true; }
      else { cur+=ch; }
    }
  }
  out.push(cur); return out;
}

function importarCSV(e){
  const file = e.target.files?.[0]; if(!file) return;
  const fr = new FileReader();
  fr.onload = ()=>{
    const lines = String(fr.result).split(/?
/).filter(Boolean);
    const data = lines.slice(1); // skip header
    data.forEach(line=>{
      const cols = parseCSVLine(line);
      const [id,f,o,c,s,imp,d] = cols; if(!id||!f) return;
      const obj={id,f,o,c,s,imp:Number(imp),d};
      const exist = movimientos.find(x=> String(x.id)===String(id));
      if(exist) Object.assign(exist,obj); else movimientos.push(obj);
    });
    localStorage.setItem('movimientos', JSON.stringify(movimientos)); resetPagina(); mostrar(); alert('Importación completada');
  };
  fr.readAsText(file);
}

function resetTotal(){ if(confirm('¿BORRAR TODO?')){ localStorage.clear(); location.reload(); } }

// ==== Popups Premium simplificados ====
function lanzarPopupPremium(el, tipo){
  const overlay = el('div',{class:'premium-overlay'});
  const content = el('div',{class:'premium-content'});
  content.append(
    el('div',{class:'premium-title', text:'NUEVO VALOR'}),
    el('input',{id:'val_premium', class:'premium-input', placeholder:'...', autocomplete:'off'}),
    el('button',{id:'confirm_premium', class:'btn-gold', text:'AÑADIR'}),
    el('button',{id:'cancel_premium', class:'btn-silver', text:'CANCELAR'})
  );
  overlay.appendChild(content); document.body.appendChild(overlay);
  const input = qs('#val_premium'); input.focus();
  qs('#confirm_premium').onclick = ()=>{
    let n = input.value.trim(); if(n){ n = n.charAt(0).toUpperCase()+n.slice(1).toLowerCase();
      if(tipo==='categoria'){
        if(!catExtra.includes(n) && !catBase.includes(n)){ catExtra.push(n); localStorage.setItem('categoriaExtra', JSON.stringify(catExtra)); }
        llenar(qs('#categoria'), catBase, catExtra, n);
      } else {
        if(!subMaestra.includes(n)){ subMaestra.push(n); localStorage.setItem('subMaestra_v2', JSON.stringify(subMaestra)); }
        llenar(qs('#subcategoria'), subMaestra, [], n);
      }
    }
    overlay.remove();
  };
  qs('#cancel_premium').onclick = ()=>{ el.value=''; overlay.remove(); };
}

function lanzarPopupNomina(){
  const overlay = el('div',{class:'nomina-overlay', id:'popup_nomina_v091'});
  const content = el('div',{class:'nomina-content'});
  content.append(
    el('div',{class:'nomina-title', text:'¿QUIÉN COBRA?'}),
    el('button',{class:'btn-nomina btn-oskar', text:'OSKAR', onClick:()=>{ qs('#categoria').innerHTML=''; addOption(qs('#categoria'),'Oskar',true); overlay.remove(); }}),
    el('button',{class:'btn-nomina btn-josune', text:'JOSUNE', onClick:()=>{ qs('#categoria').innerHTML=''; addOption(qs('#categoria'),'Josune',true); overlay.remove(); }}),
    el('button',{class:'btn-nomina btn-cancel', text:'CANCELAR', onClick:()=>{ qs('#origen').value='Gasto'; overlay.remove(); }})
  );
  overlay.appendChild(content); document.body.appendChild(overlay);
}

function eliminarRegistroActual(){
  const idAEliminar = qs('#editId').value; if(!idAEliminar) return;
  if(confirm('¿ESTÁS SEGURO DE QUE DESEAS ELIMINAR ESTE REGISTRO?')){
    movimientos = movimientos.filter(m=> String(m.id)!==String(idAEliminar));
    localStorage.setItem('movimientos', JSON.stringify(movimientos));
    volver(); console.log('Registro eliminado correctamente.');
  }
}

// ==== Eventos ====
window.addEventListener('DOMContentLoaded', async ()=>{
  // Keypad PIN: iniciamos el PIN en el primer toque (gesto del usuario)
  let pinInicializado = false;
  qsa('.btn-pin[data-pin]').forEach(btn=> btn.addEventListener('click', async ()=>{
    if(!pinInicializado){ pinInicializado=true; try{ if(!localStorage.getItem('pinHash')) await ensurePin(); clearPin(); }catch(e){ console.error(e);} }
    pressPin(btn.getAttribute('data-pin')); }, {passive:true}));
  const clr = qs('#btnClear'); if (clr) clr.addEventListener('click', clearPin);
  const bio = qs('#btnBiometric'); if (bio) bio.addEventListener('click', (e)=>{ e.preventDefault(); if(typeof window.biometricAuth==='function') window.biometricAuth(); });

  // Form & acciones
  const nuevo = qs('#btnNuevo'); if(nuevo) nuevo.addEventListener('click', ()=> abrirFormulario());
  const g = qs('#btnGuardar'); if(g) g.addEventListener('click', guardar);
  const c = qs('#btnCancelar'); if(c) c.addEventListener('click', ()=> volver());
  const del = qs('#btnEliminar'); if(del) del.addEventListener('click', eliminarRegistroActual);
  const exp = qs('#btnExport'); if(exp) exp.addEventListener('click', exportarCSV);
  const imp = qs('#btnImport'); if(imp) imp.addEventListener('click', ()=> qs('#inputFile').click());
  const inp = qs('#inputFile'); if(inp) inp.addEventListener('change', importarCSV);
  const rst = qs('#btnReset'); if(rst) rst.addEventListener('click', resetTotal);
  const gra = qs('#btnGraficos'); if(gra) gra.addEventListener('click', ()=>{ abrirGraficos(); });

  ['filtroMes','filtroAño','filtroCat','filtroSub','filtroOri'].forEach(id=>{
    const s=qs('#'+id); if(!s) return; s.addEventListener('change', ()=>{ resetPagina(); mostrar(); });
  });

  const catSel = qs('#categoria'); if(catSel) catSel.addEventListener('change', e=> manejarNuevo(e.target,'categoria'));
  const subSel = qs('#subcategoria'); if(subSel) subSel.addEventListener('change', e=> manejarNuevo(e.target,'subcategoria'));

  const org = qs('#origen'); if(org) org.addEventListener('change', e=>{
    if(e.target.value==='Nómina'){
      const fVal = qs('#fecha').value || new Date().toISOString().split('T')[0];
      const mIdx = new Date(fVal + 'T00:00:00').getMonth();
      qs('#subcategoria').innerHTML=''; addOption(qs('#subcategoria'), mesesLabel[mIdx], true);
      lanzarPopupNomina();
    }
  });

  // Scroll infinito
  let cargando=false;
  window.addEventListener('scroll', ()=>{
    const m=qs('#movimientos'); if(!m||m.dataset.modo==='graficos') return;
    if(cargando) return;
    if((window.innerHeight + window.scrollY) >= document.body.offsetHeight - 200 && registrosVisibles < filtradosGlobal.length){
      cargando=true; const ld=qs('#loader'); if(ld) ld.style.display='block'; setTimeout(()=>{ registrosVisibles += 25; mostrar(); cargando=false; }, 200);
    }
  });

  // Botón Casa oro
  const btnCasa = qs('#btnFiltroCasa'); if(btnCasa) btnCasa.addEventListener('click', (e)=>{ e.preventDefault(); casaOculta=!casaOculta; btnCasa.classList.toggle('apagado', casaOculta); mostrar(); });

  // SW opcional
  if('serviceWorker' in navigator){ try{ navigator.serviceWorker.register('./sw.js'); }catch(e){ console.warn('SW no registrado', e);} }

  // Mostrar overlay PIN al cargar
  const overlay = qs('#authOverlay'); if(overlay) overlay.style.display='flex';
});
