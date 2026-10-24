const token = sessionStorage.getItem('gaia_token');
const role = sessionStorage.getItem('gaia_role');
const username = sessionStorage.getItem('gaia_user');

if (!token) {
  window.location.href = '/login';
} else {
  document.getElementById('dashUser').textContent = username;
  if (role === 'admin') {
    document.getElementById('geistTabBtn').style.display = 'flex';
  }

  const charts = {};
  let isOffline = false;
  let monthlyReport = null;

  function getThemeColors() {
    const isDark = document.documentElement.getAttribute("data-theme") === "dark";
    return {
      text: isDark ? '#f0f0f0' : '#1a1a1a',
      muted: isDark ? '#777777' : '#888888',
      grid: isDark ? '#333333' : '#e0e0e0',
      green: '#8eb63e',
      red: '#d94040',
      grey: '#666666'
    };
  }

  function updateChartColors() {
    const c = getThemeColors();
    Chart.defaults.color = c.muted;
    Chart.defaults.borderColor = c.grid;
    Object.values(charts).forEach(chart => {
      if (chart.options.scales) {
        Object.values(chart.options.scales).forEach(scale => {
          scale.grid.color = c.grid;
          scale.ticks.color = c.muted;
        });
      }
      chart.update();
    });
  }

  window.addEventListener('themechange', updateChartColors);

  async function fetchStats(tab) {
    const res = await fetch(`/api/stats/${tab}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.status === 401 || res.status === 403) {
      if (res.status === 401) window.location.href = '/login';
      return null;
    }
    return res.json();
  }

  function showToast(msg) {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = msg;
    container.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }

  function checkState() {
    fetch('/api/state').then(r => r.json()).then(data => {
      const offline = data.containment === 'OFFLINE';
      if (offline && !isOffline) {
        isOffline = true;
        document.getElementById('statusBanner').style.display = 'flex';
        document.getElementById('containBadge').classList.add('offline');
        document.getElementById('containBadge').innerHTML = '<span class="badge-dot"></span> Containment state: OFFLINE';
        const shutdownBtn = document.getElementById('shutdownBtn');
        shutdownBtn.disabled = true;
        shutdownBtn.classList.add('disabled');
        showToast('Upstream cognition provider unavailable');
        showToast('Inference cluster handshake failed');
      }
    });
  }

  document.querySelectorAll('.dash-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.dash-tab').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(`panel-${btn.dataset.tab}`).classList.add('active');
    });
  });

  document.getElementById('logoutBtn').addEventListener('click', () => {
    sessionStorage.removeItem('gaia_token');
    sessionStorage.removeItem('gaia_role');
    sessionStorage.removeItem('gaia_user');
    window.location.href = '/login';
  });

  const modal = document.getElementById('shutdownModal');
  document.getElementById('shutdownBtn').addEventListener('click', () => modal.classList.add('show'));
  document.getElementById('cancelShutdown').addEventListener('click', () => modal.classList.remove('show'));
  document.getElementById('confirmShutdown').addEventListener('click', async () => {
    modal.classList.remove('show');
    await fetch('/api/geist/shutdown', { method: 'POST', headers: { 'Authorization': `Bearer ${token}` } });
    checkState();
  });

  function createLineChart(ctx, label) {
    return new Chart(ctx, {
      type: 'line',
      data: { labels: [], datasets: [{ label, data: [], borderColor: '#8eb63e', backgroundColor: 'rgba(142, 182, 62, 0.1)', fill: true, tension: 0.4 }] },
      options: { responsive: true, maintainAspectRatio: false, animation: { duration: 500 }, scales: { x: { display: false }, y: { beginAtZero: true } } }
    });
  }

  charts.usage = createLineChart(document.getElementById('chartUsage').getContext('2d'), 'Throughput');
  charts.dist = new Chart(document.getElementById('chartDist').getContext('2d'), {
    type: 'doughnut',
    data: { labels: [], datasets: [{ data: [], backgroundColor: ['#8eb63e', '#91ab5e', '#a6d940', '#bdc88c', '#d4dab2'] }] },
    options: { responsive: true, maintainAspectRatio: false }
  });
  charts.vol = createLineChart(document.getElementById('chartVol').getContext('2d'), 'Volume');
  charts.lat = createLineChart(document.getElementById('chartLat').getContext('2d'), 'Latency');
  charts.clients = new Chart(document.getElementById('chartClients').getContext('2d'), {
    type: 'bar',
    data: { labels: [], datasets: [{ label: 'Requests', data: [], backgroundColor: '#8eb63e' }] },
    options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true } } }
  });
  charts.load = new Chart(document.getElementById('chartLoad').getContext('2d'), {
    type: 'doughnut',
    data: { labels: ['Allocated', 'Free'], datasets: [{ data: [0, 100], backgroundColor: ['#8eb63e', '#e0e0e0'] }] },
    options: { responsive: true, maintainAspectRatio: false, cutout: '80%' }
  });
  charts.radar = new Chart(document.getElementById('chartRadar').getContext('2d'), {
    type: 'radar',
    data: { labels: [], datasets: [{ label: 'Allocated', data: [], borderColor: '#8eb63e', backgroundColor: 'rgba(142, 182, 62, 0.2)' }] },
    options: { responsive: true, maintainAspectRatio: false, scales: { r: { suggestedMin: 0, suggestedMax: 100 } } }
  });
  charts.monthly = new Chart(document.getElementById('chartMonthly').getContext('2d'), {
    type: 'bar',
    data: { labels: [], datasets: [{ label: 'Requests', data: [], backgroundColor: '#8eb63e' }] },
    options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true } } }
  });
  charts.cog = createLineChart(document.getElementById('chartCog').getContext('2d'), 'Cognition');
  charts.recall = createLineChart(document.getElementById('chartRecall').getContext('2d'), 'Recall');

  function rand(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  const clientCaps = [79999, 71999, 63999, 56999, 49999, 42999];

  function jitterClients(arr) {
    return arr.map((v, i) => v === 0 ? 0 : Math.min(clientCaps[i], Math.max(0, v + rand(-500, 500))));
  }

  function jitterData(arr, min, max) {
    return arr.map(v => v === 0 ? 0 : Math.max(0, v + rand(-min, max)));
  }

  function loadCachedMonthly(labels) {
    try {
      const raw = localStorage.getItem('gaia_monthly_report');
      if (!raw) return null;
      const cached = JSON.parse(raw);
      if (cached && JSON.stringify(cached.labels) === JSON.stringify(labels)) {
        return cached;
      }
    } catch (e) {}
    return null;
  }

  async function updateOverview() {
    const data = await fetchStats('overview');
    if (!data) return;
    const c = getThemeColors();
    const kpiRow = document.getElementById('kpiRow');
    kpiRow.innerHTML = '';
    Object.entries(data.kpis).forEach(([key, val]) => {
      const display = val === null ? '—' : val;
      const color = val === null ? c.red : c.green;
      kpiRow.innerHTML += `<div class="kpi-card"><div class="kpi-value" style="color:${color}">${display}</div><div class="kpi-label">${key.replace(/_/g, ' ')}</div></div>`;
    });
    charts.usage.data.labels = data.usage.labels;
    charts.usage.data.datasets[0].data = jitterData(data.usage.throughput, 50, 150);
    charts.usage.data.datasets[0].borderColor = isOffline ? c.red : c.green;
    charts.usage.data.datasets[0].backgroundColor = isOffline ? 'rgba(217, 64, 64, 0.1)' : 'rgba(142, 182, 62, 0.1)';
    charts.usage.update();
    charts.dist.data.labels = data.distribution.labels;
    charts.dist.data.datasets[0].data = jitterData(data.distribution.data, 1, 3);
    charts.dist.update();
  }

  async function updateInference() {
    const data = await fetchStats('inference');
    if (!data) return;
    const c = getThemeColors();
    charts.vol.data.labels = data.volume.labels;
    charts.vol.data.datasets[0].data = jitterData(data.volume.data, 100, 300);
    charts.vol.data.datasets[0].borderColor = isOffline ? c.grey : c.green;
    charts.vol.update();
    charts.lat.data.labels = data.latency.labels;
    charts.lat.data.datasets[0].data = jitterData(data.latency.data, 2, 5);
    charts.lat.data.datasets[0].borderColor = isOffline ? c.red : c.green;
    charts.lat.update();
    const log = document.getElementById('inferenceLog');
    log.innerHTML = '';
    data.logs.forEach(item => {
      log.innerHTML += `<div class="log-line ${item.level}"><span class="log-time">${item.time}</span><span class="log-msg">${item.msg}</span></div>`;
    });
  }

  async function updateClients() {
    const data = await fetchStats('clients');
    if (!data) return;
    const jitteredRequests = jitterClients(data.bar.data);
    charts.clients.data.labels = data.bar.labels;
    charts.clients.data.datasets[0].data = jitteredRequests;
    charts.clients.update();
    const table = document.getElementById('clientsTable');
    table.innerHTML = `<thead><tr><th>Client</th><th>Requests</th><th>Latency</th><th>Status</th></tr></thead><tbody>`;
    data.table.forEach((row, i) => {
      const cls = row.status === 'Active' ? 'active' : row.status === 'DEGRADED' ? 'degraded' : 'unreachable';
      table.innerHTML += `<tr><td>${row.name}</td><td>${jitteredRequests[i].toLocaleString()}</td><td>${row.latency}</td><td><span class="status-pill ${cls}">${row.status}</span></td></tr>`;
    });
    table.innerHTML += `</tbody>`;
  }

  async function updateInfrastructure() {
    const data = await fetchStats('infrastructure');
    if (!data) return;
    const c = getThemeColors();
    charts.load.data.datasets[0].data = [rand(40, 80), 100 - 40];
    charts.load.data.datasets[0].backgroundColor = isOffline ? [c.red, c.grid] : [c.green, c.grid];
    charts.load.update();
    charts.radar.data.labels = data.radar.labels;
    charts.radar.data.datasets[0].data = jitterData(data.radar.data, 5, 10);
    charts.radar.update();
    const nodeGrid = document.getElementById('nodeGrid');
    nodeGrid.innerHTML = '';
    data.nodes.forEach(node => {
      const cls = node.status === 'ONLINE' ? 'online' : node.status === 'DEGRADED' ? 'degraded' : 'unreachable';
      nodeGrid.innerHTML += `<div class="node-card ${cls}"><div class="node-name">${node.name}</div><div class="node-load">${rand(30, 90)}%</div><div class="node-status">${node.status}</div></div>`;
    });
  }

  async function updateReports() {
    const data = await fetchStats('reports');
    if (!data) return;
    if (!monthlyReport) {
      monthlyReport = loadCachedMonthly(data.monthly.labels);
      if (!monthlyReport) {
        monthlyReport = { labels: data.monthly.labels, values: data.monthly.data.slice() };
        try {
          localStorage.setItem('gaia_monthly_report', JSON.stringify(monthlyReport));
        } catch (e) {}
      }
    }
    if (JSON.stringify(charts.monthly.data.datasets[0].data) !== JSON.stringify(monthlyReport.values) ||
        JSON.stringify(charts.monthly.data.labels) !== JSON.stringify(monthlyReport.labels)) {
      charts.monthly.data.labels = monthlyReport.labels;
      charts.monthly.data.datasets[0].data = monthlyReport.values;
      charts.monthly.update();
    }
    const log = document.getElementById('activityLog');
    log.innerHTML = '';
    data.activity.forEach(item => {
      log.innerHTML += `<div class="log-line ${item.level}"><span class="log-time">${item.time}</span><span class="log-msg">${item.event}</span></div>`;
    });
  }

  async function updateGeist() {
    if (role !== 'admin') return;
    const data = await fetchStats('geist');
    if (!data) return;
    const c = getThemeColors();
    charts.cog.data.labels = data.cognition.labels;
    charts.cog.data.datasets[0].data = jitterData(data.cognition.data, 5, 15);
    charts.cog.data.datasets[0].borderColor = isOffline ? c.red : c.green;
    charts.cog.update();
    charts.recall.data.labels = data.recall.labels;
    charts.recall.data.datasets[0].data = jitterData(data.recall.data, 2, 8);
    charts.recall.update();
    document.getElementById('breachVal').textContent = rand(0, 5);
    document.getElementById('anchorVal').textContent = data.anchors.toLocaleString();
    const log = document.getElementById('secLog');
    log.innerHTML = '';
    data.logs.forEach(item => {
      log.innerHTML += `<div class="log-line ${item.level}"><span class="log-time">${item.time}</span><span class="log-msg">${item.msg}</span></div>`;
    });
  }

  function updateAll() {
    updateOverview();
    updateInference();
    updateClients();
    updateInfrastructure();
    updateReports();
    updateGeist();
  }

  updateChartColors();
  updateAll();
  setInterval(() => {
    checkState();
    updateAll();
  }, 5000);
  checkState();
}