function procColor(i, total) {
  const hue   = (200 + (i * 360 / Math.max(total, 1))) % 360;
  const hex   = hslToHex(hue, 70, 65);
  const fill  = `hsla(${hue},65%,55%,0.32)`;
  return { hex, fill };
}

function hslToHex(h, s, l) {
  s /= 100; l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = n => {
    const k = (n + h / 30) % 12;
    const c = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * c).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

const ADESC = {
  fcfs: { name: 'FIRST-COME, FIRST-SERVED (FCFS)',  desc: 'Executes processes strictly in the order they arrive in the ready queue.' },
  sjf:  { name: 'SHORTEST JOB FIRST (SJF)',          desc: 'Non-preemptive. Picks the process with the shortest burst time from the ready queue.' },
  npp:  { name: 'NON-PREEMPTIVE PRIORITY (NPP)',     desc: 'Selects the process with the highest priority (lowest number). No preemption.' },
  srt:  { name: 'SHORTEST REMAINING TIME (SRT)',     desc: 'Preemptive SJF. CPU switches to any newly arrived process with shorter remaining time.' }
};

let algo = 'fcfs';

function selAlgo(a, btn) {
  algo = a;
  document.querySelectorAll('.abtn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('algoName').textContent = ADESC[a].name;
  document.getElementById('algoDesc').textContent = ADESC[a].desc;
  const dis = a !== 'npp';
  document.querySelectorAll('.pcell').forEach(i => i.disabled = dis);
  document.getElementById('priTh').style.color = dis ? 'var(--dim)' : 'var(--amber)';
  clearResults();
}

function genTable() {
  const n = Math.max(1, parseInt(document.getElementById('numJobs').value) || 1);
  const tb = document.getElementById('tbody');
  tb.innerHTML = '';
  for (let i = 0; i < n; i++) {
    const { hex } = procColor(i, n);
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><span class="plabel" style="color:${hex}">P${i+1}</span></td>
      <td><input type="number" class="cinput" id="at${i}" value="0" min="0"></td>
      <td><input type="number" class="cinput" id="bt${i}" value="${(i % 7) + 1}" min="1"></td>
      <td><input type="number" class="cinput pcell" id="pri${i}" value="${(i % 9) + 1}" min="1" ${algo !== 'npp' ? 'disabled' : ''}></td>
    `;
    tb.appendChild(tr);
  }
  clearResults();
}

function stepJobs(delta) {
  const el = document.getElementById('numJobs');
  const v  = Math.max(1, (parseInt(el.value) || 1) + delta);
  el.value = v;
  genTable();
}

function fillSample() {
  const ats = [0, 2, 3, 5, 1, 0, 4, 2, 6, 1];
  const bts = [5, 2, 6, 3, 4, 7, 2, 5, 3, 8];
  const prs = [3, 1, 4, 2, 5, 1, 3, 2, 4, 1];
  const n = parseInt(document.getElementById('numJobs').value) || 4;
  for (let i = 0; i < n; i++) {
    const el_at  = document.getElementById(`at${i}`);
    const el_bt  = document.getElementById(`bt${i}`);
    const el_pri = document.getElementById(`pri${i}`);
    if (el_at)  el_at.value  = ats[i % ats.length];
    if (el_bt)  el_bt.value  = bts[i % bts.length];
    if (el_pri) el_pri.value = prs[i % prs.length];
  }
}

function readJobs() {
  const n = Math.max(1, parseInt(document.getElementById('numJobs').value) || 1);
  const js = [];
  for (let i = 0; i < n; i++) {
    const at  = parseInt(document.getElementById(`at${i}`).value)  || 0;
    const bt  = parseInt(document.getElementById(`bt${i}`).value)  || 1;
    const pri = parseInt(document.getElementById(`pri${i}`).value) || 1;
    if (bt < 1) return null;
    const { hex, fill } = procColor(i, n);
    js.push({ id: i, name: `P${i+1}`, at, bt, pri, color: hex, fill });
  }
  return js;
}

function iSeg(s, e) {
  return { pid: -1, name: 'IDLE', start: s, end: e, color: '#282d3a', fill: '#0d0f14' };
}

function runFCFS(js) {
  const sorted = [...js].sort((a, b) => a.at - b.at || a.id - b.id);
  const tl = []; let t = 0;
  for (const j of sorted) {
    if (t < j.at) { tl.push(iSeg(t, j.at)); t = j.at; }
    tl.push({ pid: j.id, name: j.name, start: t, end: t + j.bt, color: j.color, fill: j.fill });
    t += j.bt;
  }
  return tl;
}

function runSJF(js) {
  const r = js.map(j => ({ ...j, done: false }));
  const tl = []; let t = 0, d = 0;
  while (d < js.length) {
    const av = r.filter(j => !j.done && j.at <= t);
    if (!av.length) {
      const nx = r.filter(j => !j.done).sort((a, b) => a.at - b.at)[0];
      tl.push(iSeg(t, nx.at)); t = nx.at; continue;
    }
    av.sort((a, b) => a.bt - b.bt || a.at - b.at || a.id - b.id);
    const j = av[0];
    tl.push({ pid: j.id, name: j.name, start: t, end: t + j.bt, color: j.color, fill: j.fill });
    t += j.bt; j.done = true; d++;
  }
  return tl;
}

function runNPP(js) {
  const r = js.map(j => ({ ...j, done: false }));
  const tl = []; let t = 0, d = 0;
  while (d < js.length) {
    const av = r.filter(j => !j.done && j.at <= t);
    if (!av.length) {
      const nx = r.filter(j => !j.done).sort((a, b) => a.at - b.at)[0];
      tl.push(iSeg(t, nx.at)); t = nx.at; continue;
    }
    av.sort((a, b) => a.pri - b.pri || a.at - b.at || a.id - b.id);
    const j = av[0];
    tl.push({ pid: j.id, name: j.name, start: t, end: t + j.bt, color: j.color, fill: j.fill });
    t += j.bt; j.done = true; d++;
  }
  return tl;
}

function runSRT(js) {
  const r = js.map(j => ({ ...j, rem: j.bt, done: false }));
  const tl = []; let t = 0, d = 0, last = null;
  const maxT = js.reduce((s, j) => s + j.bt, 0) + Math.max(...js.map(j => j.at)) + 2;
  while (d < js.length && t <= maxT) {
    const av = r.filter(j => !j.done && j.at <= t);
    if (!av.length) {
      const nx = r.filter(j => !j.done).sort((a, b) => a.at - b.at)[0];
      if (!nx) break;
      if (last && last.pid === -1) last.end = nx.at;
      else { last = iSeg(t, nx.at); tl.push(last); }
      t = nx.at; continue;
    }
    av.sort((a, b) => a.rem - b.rem || a.at - b.at || a.id - b.id);
    const j = av[0];
    if (last && last.pid === j.id) last.end = t + 1;
    else { last = { pid: j.id, name: j.name, start: t, end: t + 1, color: j.color, fill: j.fill }; tl.push(last); }
    j.rem--; t++;
    if (j.rem === 0) { j.done = true; d++; }
  }
  return tl;
}

function calcMetrics(js, tl) {
  const m = {};
  js.forEach(j => m[j.id] = { ...j, ct: 0 });
  for (const s of tl) {
    if (s.pid === -1) continue;
    if (s.end > m[s.pid].ct) m[s.pid].ct = s.end;
  }
  let totT = 0, totW = 0;
  for (const id in m) {
    m[id].tat = m[id].ct - m[id].at;
    m[id].wt  = m[id].tat - m[id].bt;
    totT += m[id].tat; totW += m[id].wt;
  }
  const n     = js.length;
  const burst = js.reduce((s, j) => s + j.bt, 0);
  const idle  = tl.filter(s => s.pid === -1).reduce((s, x) => s + (x.end - x.start), 0);
  const span  = tl[tl.length - 1].end - tl[0].start;
  return {
    m, totT, totW,
    avgT: (totT / n).toFixed(2),
    avgW: (totW / n).toFixed(2),
    util: span > 0 ? ((burst / (burst + idle)) * 100).toFixed(1) : '100.0',
    burst, idle, span, n
  };
}

function calcUnit(endTime) {
  const available = Math.max(400, window.innerWidth - 420); // rough right-panel width
  const U = Math.max(28, Math.min(60, Math.floor(available / (endTime + 2))));
  return U;
}

function renderTimeline(js, tl) {
  const endTime = tl[tl.length - 1].end;
  const U  = calcUnit(endTime);
  const W  = endTime * U + U; // extra U for arrow overhang
  const AXIS_Y  = 34;         // y of the horizontal line
  const LABEL_Y = 14;         // y of process name text
  const TICK_Y  = AXIS_Y + 14; // y of time number below axis
  const H  = TICK_Y + 8;

  let svg = `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg" style="display:block;overflow:visible">`;

  /* axis line */
  svg += `<line x1="0" y1="${AXIS_Y}" x2="${endTime * U}" y2="${AXIS_Y}" stroke="#3a3f50" stroke-width="1.5"/>`;

  /* tick marks + time numbers at each integer time unit */
  for (let t = 0; t <= endTime; t++) {
    const x = t * U;
    svg += `<line x1="${x}" y1="${AXIS_Y - 4}" x2="${x}" y2="${AXIS_Y + 4}" stroke="#3a3f50" stroke-width="1.5"/>`;
    svg += `<text x="${x}" y="${TICK_Y}" font-family="Share Tech Mono" font-size="10" fill="#4a5068" text-anchor="middle">${t}</text>`;
  }

  /* process entry markers — one drop-line + label per process start */
  const shown = new Set();
  for (const s of tl) {
    if (s.pid === -1) continue;
    const key = `${s.pid}_${s.start}`;
    if (shown.has(key)) continue;
    shown.add(key);
    const x = s.start * U;
    svg += `<line x1="${x}" y1="${LABEL_Y + 4}" x2="${x}" y2="${AXIS_Y}" stroke="${s.color}" stroke-width="1.5"/>`;
    svg += `<text x="${x}" y="${LABEL_Y}" font-family="Rajdhani,sans-serif" font-size="13" font-weight="700" fill="${s.color}" text-anchor="middle">${s.name}</text>`;
  }

  svg += `</svg>`;
  document.getElementById('tlwrap').innerHTML = svg;
}

/* ════════════════════════════
   RENDER — GANTT CHART
   Three rows: burst durations / bars / tick numbers.
   All widths = (duration * U) px — same U as Timeline.
   Tick numbers are placed at segment *boundaries*,
   matching the Timeline's per-integer tick positions.
════════════════════════════ */
function renderGantt(tl) {
  const endTime = tl[tl.length - 1].end;
  const U = calcUnit(endTime);

  /* ── burst duration row ── */
  let burstRow = '<div class="g-burst-row">';
  for (const s of tl) {
    const w = (s.end - s.start) * U;
    burstRow += `<div class="g-burst-cell" style="width:${w}px">${s.end - s.start}</div>`;
  }
  burstRow += '</div>';

  /* ── bar row ── */
  let barRow = '<div class="g-bar-row">';
  for (const s of tl) {
    const w = (s.end - s.start) * U;
    barRow += `<div class="g-seg${s.pid === -1 ? ' idle' : ''}"
      style="width:${w}px;background:${s.fill};color:${s.color};"
      title="${s.name}: ${s.start} → ${s.end}">${w >= 24 ? s.name : ''}</div>`;
  }
  barRow += '</div>';

  /* ── tick number row ──
     Place a number at every integer time unit from 0 to endTime.
     Each cell is exactly U px wide — mirrors the bar widths exactly.
     This keeps the numbers aligned with the bar boundaries.
  */
  let tickRow = '<div class="g-tick-row">';
  for (let t = 0; t <= endTime; t++) {
    tickRow += `<div class="g-tick" style="width:${U}px">${t}</div>`;
  }
  tickRow += '</div>';

  document.getElementById('ganttOuter').innerHTML =
    `<div class="gantt-inner">${burstRow}${barRow}${tickRow}</div>`;
}

/* ════════════════════════════
   RENDER — SOLUTION TABLE
════════════════════════════ */
function renderSolution(res) {
  const { m, totT, totW, avgT, avgW } = res;
  const ip = algo === 'npp';

  let h = `<thead><tr>
    <th>Job</th><th>Arrival</th><th>Burst</th>
    ${ip ? '<th>Priority</th>' : ''}
    <th>Completion</th><th>TAT</th><th>WT</th>
  </tr></thead><tbody>`;

  for (const id in m) {
    const p = m[id];
    h += `<tr>
      <td style="color:${p.color};font-weight:700">${p.name}</td>
      <td>${p.at}</td><td>${p.bt}</td>
      ${ip ? `<td>${p.pri}</td>` : ''}
      <td class="cb">${p.ct}</td>
      <td><span class="cdim" style="font-size:10px">${p.ct}&minus;${p.at}&nbsp;=&nbsp;</span><span class="cw">${p.tat}</span></td>
      <td><span class="cdim" style="font-size:10px">${p.tat}&minus;${p.bt}&nbsp;=&nbsp;</span><span class="ca">${p.wt}</span></td>
    </tr>`;
  }

  const ip_cols = ip ? 4 : 3;
  h += `<tr class="sum-row">
    <td colspan="${ip_cols}" style="text-align:right;color:var(--dim);font-size:11px;letter-spacing:.06em">TOTAL / AVERAGE</td>
    <td></td>
    <td><span class="cw">${totT}</span><span class="cdim" style="font-size:10px"> / </span><span class="ct">${avgT}</span></td>
    <td><span class="ca">${totW}</span><span class="cdim" style="font-size:10px"> / </span><span class="cp">${avgW}</span></td>
  </tr></tbody>`;
  document.getElementById('stbl').innerHTML = h;
}

/* ════════════════════════════
   RENDER — UTIL FORMULA
════════════════════════════ */
function renderUtilFormula(res) {
  const { burst, idle, util } = res;
  const total = burst + idle;
  document.getElementById('utilFormulaBox').innerHTML = `
    <div class="uf-line">
      <span class="eq">CPU =</span>
      <span class="uf-frac">
        <span class="uf-num">${burst}</span>
        <span class="uf-den">${total}</span>
      </span>
    </div>
    <div class="uf-line">
      <span class="eq">CPU =</span>
      <span class="uf-frac">
        <span class="uf-num">${total}</span>
        <span class="uf-den">${total}</span>
      </span>
      <span class="eq">&nbsp;× 100</span>
    </div>
    <div class="uf-result">CPU = ${util}%</div>
  `;
}

/* ════════════════════════════
   SIMULATE
════════════════════════════ */
function simulate() {
  document.getElementById('errbox').innerHTML = '';
  const js = readJobs();
  if (!js) {
    document.getElementById('errbox').innerHTML =
      '<div class="err-msg">⚠ Burst time must be ≥ 1 for all jobs.</div>';
    return;
  }

  let tl;
  if      (algo === 'fcfs') tl = runFCFS(js);
  else if (algo === 'sjf')  tl = runSJF(js);
  else if (algo === 'npp')  tl = runNPP(js);
  else                      tl = runSRT(js);

  const res = calcMetrics(js, tl);

  document.getElementById('sTAT').textContent  = res.avgT + ' ms';
  document.getElementById('sWT').textContent   = res.avgW + ' ms';
  document.getElementById('sUtil').textContent = res.util + '%';

  renderTimeline(js, tl);
  renderGantt(tl);
  renderSolution(res);
  renderUtilFormula(res);

  document.getElementById('solSec').classList.add('show');
}

/* ════════════════════════════
   RESET
════════════════════════════ */
function doReset() {
  genTable();
  ['sTAT', 'sWT', 'sUtil'].forEach(id => document.getElementById(id).textContent = '—');
  document.getElementById('ganttOuter').innerHTML = '<div class="placeholder-msg">[ Run simulation to display ]</div>';
  document.getElementById('tlwrap').innerHTML     = '<div class="placeholder-msg">[ Run simulation to display ]</div>';
  document.getElementById('stbl').innerHTML       = '';
  document.getElementById('utilFormulaBox').innerHTML = '';
  document.getElementById('solSec').classList.remove('show');
}

function clearResults() {
  document.getElementById('errbox').innerHTML = '';
  document.getElementById('solSec').classList.remove('show');
  document.getElementById('stbl').innerHTML   = '';
  ['sTAT', 'sWT', 'sUtil'].forEach(id => document.getElementById(id).textContent = '—');
}

/* ════════════════════════════
   INIT
════════════════════════════ */
genTable();
