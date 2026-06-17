/* ===== Tab3：道口卸货及时率 ===== */

// 初始化：检查数据是否已加载
function initDaokouTab() {
    if (window.DAOKOU_DATA) {
        renderDaokouCharts();
        return;
    }
    // 显示空状态
    const emptyEl = document.getElementById('daokou-empty');
    const kpiEl = document.getElementById('daokou-kpi');
    const chartsEl = document.getElementById('daokou-charts');
    if (emptyEl) emptyEl.style.display = 'block';
    if (kpiEl) kpiEl.style.display = 'none';
    if (chartsEl) chartsEl.style.display = 'none';
}

function renderDaokouCharts() {
    if (!window.DAOKOU_DATA || !window.DAOKOU_DATA.current_month) {
        const emptyEl = document.getElementById('daokou-empty');
        const kpiEl = document.getElementById('daokou-kpi');
        const chartsEl = document.getElementById('daokou-charts');
        if (emptyEl) emptyEl.style.display = 'block';
        if (kpiEl) kpiEl.style.display = 'none';
        if (chartsEl) chartsEl.style.display = 'none';
        return;
    }

    const emptyEl = document.getElementById('daokou-empty');
    const kpiEl = document.getElementById('daokou-kpi');
    const chartsEl = document.getElementById('daokou-charts');
    if (emptyEl) emptyEl.style.display = 'none';
    if (kpiEl) kpiEl.style.display = 'flex';
    if (chartsEl) chartsEl.style.display = 'grid';

    const cur = window.DAOKOU_DATA.current_month;
    const curPass = round2(100 - (cur.rate || 0));

    const passEl = document.getElementById('dk-pass-rate');
    const totalEl = document.getElementById('dk-total');
    const timeoutEl = document.getElementById('dk-timeout');
    if (passEl) passEl.textContent = curPass + '%';
    if (totalEl) totalEl.textContent = cur.total;
    if (timeoutEl) timeoutEl.textContent = cur.timeout;

    // 较上月变化
    const deltaEl = document.getElementById('dk-delta');
    if (deltaEl && cur.delta !== undefined) {
        const deltaStr = (cur.delta <= 0 ? '+' : '-') + round2(Math.abs(cur.delta)) + '%';
        const deltaColor = cur.delta > 0 ? '#ea4335' : '#34a853';
        deltaEl.textContent = deltaStr;
        deltaEl.style.color = deltaColor;
    }

    // 月度趋势
    if (window.DAOKOU_DATA.monthly_trend && window.DAOKOU_DATA.monthly_trend.length > 0) {
        const ml = window.DAOKOU_DATA.monthly_trend.map(m => m.month);
        const mp = window.DAOKOU_DATA.monthly_trend.map(m => round2(100 - m.rate));
        createDaokouChart('chart-dk-monthly', ml, mp, 'bar', 80, 100);
    }

    // 周度趋势
    if (window.DAOKOU_DATA.weekly_trend && window.DAOKOU_DATA.weekly_trend.length > 0) {
        const wl = window.DAOKOU_DATA.weekly_trend.map(w => w.week);
        const wp = window.DAOKOU_DATA.weekly_trend.map(w => round2(100 - w.rate));
        createDaokouLineChart('chart-dk-weekly', wl, wp);
    }

    // 天级趋势
    if (window.DAOKOU_DATA.daily_trend && window.DAOKOU_DATA.daily_trend.length > 0) {
        const dl = window.DAOKOU_DATA.daily_trend.map(d => d.date.slice(5));
        const dp = window.DAOKOU_DATA.daily_trend.map(d => round2(100 - d.rate));
        createDaokouChart('chart-dk-daily', dl, dp, 'bar', 80, 100);
    }

    // 道口排名表格
    if (window.DAOKOU_DATA.berth_rank && window.DAOKOU_DATA.berth_rank.length > 0) {
        const tbody = document.querySelector('#dk-berth-table tbody');
        if (tbody) {
            tbody.innerHTML = '';
            window.DAOKOU_DATA.berth_rank.forEach(function(b, i) {
                const pass = round2(100 - b.rate);
                const tr = document.createElement('tr');
                tr.innerHTML = '<td>' + (i + 1) + '</td><td>' +
                    escapeHtml(b.berth) + '</td><td>' +
                    pass + '%</td><td>' + b.total + '</td>';
                tbody.appendChild(tr);
            });
        }
    }

    // 班次对比
    if (window.DAOKOU_DATA.shift_compare && window.DAOKOU_DATA.shift_compare.length > 0) {
        const sl = window.DAOKOU_DATA.shift_compare.map(s => s.shift.replace('-', '\n'));
        const sp = window.DAOKOU_DATA.shift_compare.map(s => s.pass_rate);
        const sc = window.DAOKOU_DATA.shift_compare.map(function(s) {
            if (!s.has_data) return '#cccccc';
            return s.pass_rate >= 95 ? '#34a853' : s.pass_rate >= 90 ? '#fbbc04' : '#ea4335';
        });
        createDaokouShiftChart('chart-dk-shift', sl, sp, sc);
    }

    // 调整图表大小
    setTimeout(function() {
        Object.keys(allCharts).forEach(function(id) {
            if (id.startsWith('chart-dk-')) {
                try { allCharts[id].resize(); } catch (e) {}
            }
        });
    }, 100);
}

// 页面加载时不自动初始化，由 switchMainTab() 触发
