/* ===== Tab5：每日数据统计 ===== */

var DAILY_INDICATOR_COLORS = {
    '到货箱数': { border: '#4285f4', bg: 'rgba(66,133,244,0.1)', point: '#4285f4' },
    '上架箱数': { border: '#34a853', bg: 'rgba(52,168,83,0.1)', point: '#34a853' },
    '拣货数量': { border: '#fbbc04', bg: 'rgba(251,188,4,0.1)', point: '#fbbc04' },
    '出库箱数': { border: '#ea4335', bg: 'rgba(234,67,53,0.1)', point: '#ea4335' },
};

// 映射 key：指标名称 → 对应的DOM元素id
var DAILY_METRIC_IDS = {
    '到货箱数': 'daily-incoming',
    '上架箱数': 'daily-shelving',
    '拣货数量': 'daily-picking',
    '出库箱数': 'daily-outgoing',
};

function renderDailyTab() {
    var data = window.DAILY_STATS;
    if (!data || !data.indicators || Object.keys(data.indicators).length === 0) {
        showDailyEmpty();
        return;
    }

    // 隐藏空状态
    var elEmpty = document.getElementById('daily-empty');
    var elStats = document.getElementById('daily-stats');
    var elChart = document.getElementById('daily-chart-section');
    var elTable = document.getElementById('daily-table-section');
    if (elEmpty) elEmpty.style.display = 'none';
    if (elStats) elStats.style.display = '';
    if (elChart) elChart.style.display = '';
    if (elTable) elTable.style.display = '';

    // 渲染4个统计卡片（取最新值）
    renderDailyStats(data);

    // 渲染折线图
    try { renderDailyChart(data); } catch(e) { console.warn('图表渲染异常:', e); }

    // 渲染数据表
    renderDailyTable(data);
}

function showDailyEmpty() {
    var elEmpty = document.getElementById('daily-empty');
    var elStats = document.getElementById('daily-stats');
    var elChart = document.getElementById('daily-chart-section');
    var elTable = document.getElementById('daily-table-section');
    if (elEmpty) {
        elEmpty.style.display = 'block';
        // 如果是 file:// 协议打开，提示用 http server
        if (window.location.protocol === 'file:') {
            elEmpty.innerHTML = '暂无每日数据统计<br>本地双击打开无法加载数据，请用本地服务器访问：' +
                '<br><code>python -m http.server 8080</code>（在 dashboard 目录运行）' +
                '<br>然后访问 <code>http://localhost:8080/index_v14.html</code>';
        }
    }
    if (elStats) elStats.style.display = 'none';
    if (elChart) elChart.style.display = 'none';
    if (elTable) elTable.style.display = 'none';
}

function renderDailyStats(data) {
    for (var key in DAILY_METRIC_IDS) {
        var id = DAILY_METRIC_IDS[key];
        var vals = data.indicators[key];
        var el = document.getElementById(id);
        if (el && vals && vals.length > 0) {
            // 取最新值（数组最后一个是最近期）
            var lastVal = vals[vals.length - 1];
            el.textContent = lastVal !== null && lastVal !== undefined ? formatNumber(lastVal) : '--';
        } else if (el) {
            el.textContent = '--';
        }
    }
}

function renderDailyChart(data) {
    if (allCharts['chart-daily-trend']) {
        try { allCharts['chart-daily-trend'].destroy(); } catch (e) {}
    }

    var shifts = data.shifts || [];
    if (shifts.length === 0) return;

    var canvas = document.getElementById('chart-daily-trend');
    if (!canvas) return;

    var ctx = canvas.getContext('2d');

    var datasets = [];
    var labels = shifts;

    for (var key in DAILY_INDICATOR_COLORS) {
        var vals = data.indicators[key];
        if (!vals || vals.length === 0) continue;

        var colors = DAILY_INDICATOR_COLORS[key];
        datasets.push({
            label: key,
            data: vals,
            borderColor: colors.border,
            backgroundColor: colors.bg,
            pointBackgroundColor: colors.point,
            pointBorderColor: colors.point,
            pointRadius: 4,
            pointHoverRadius: 6,
            borderWidth: 2,
            fill: true,
            tension: 0.3,
        });
    }

    if (datasets.length === 0) return;

    var chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                intersect: false,
                mode: 'index',
            },
            plugins: {
                legend: {
                    position: 'top',
                    labels: { font: { size: 12 }, usePointStyle: true, padding: 16 }
                },
                tooltip: {
                    callbacks: {
                        label: function(ctx) {
                            var v = ctx.raw;
                            if (v === null || v === undefined) return ctx.dataset.label + ': 无数据';
                            return ctx.dataset.label + ': ' + formatNumber(v);
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: { display: true, text: '数量' },
                    ticks: { font: { size: 11 }, callback: function(v) { return formatNumber(v); } }
                },
                x: {
                    ticks: { font: { size: 10 }, maxRotation: 45, minRotation: 30 }
                }
            }
        }
    });

    allCharts['chart-daily-trend'] = chart;
}

function renderDailyTable(data) {
    var shifts = data.table_shifts || data.shifts || [];
    if (!shifts || shifts.length === 0) return;

    var table = document.getElementById('daily-table');
    if (!table) return;

    var thead = table.querySelector('thead');
    var tbody = table.querySelector('tbody');
    if (!thead || !tbody) return;

    // 表头
    var headerHtml = '<tr><th>指标</th>';
    for (var i = 0; i < shifts.length; i++) {
        headerHtml += '<th>' + escapeHtml(shifts[i]) + '</th>';
    }
    headerHtml += '</tr>';
    thead.innerHTML = headerHtml;

    // 数据行：4个主要指标 + 3个额外行
    var rowKeys = ['到货箱数', '上架箱数', '拣货数量', '出库箱数',
                   '生产体制', '小时级箱量', '车型配置'];

    // 行着色（主要指标用背景色区分，额外行用不同背景）
    var rowStyles = {
        '到货箱数': ' style="background:#e8f4fd;"',
        '上架箱数': ' style="background:#e6f4ea;"',
        '拣货数量': ' style="background:#fef7e0;"',
        '出库箱数': ' style="background:#fce8e6;"',
        '生产体制': ' style="background:#f3e8fd;color:#7b1fa2;font-weight:bold;"',
        '小时级箱量': ' style="background:#e0f7fa;color:#00695c;font-weight:bold;"',
        '车型配置': ' style="background:#fff8e1;color:#e65100;font-weight:bold;"',
    };

    var indicators = data.table_data || data.indicators || {};

    var bodyHtml = '';
    for (var r = 0; r < rowKeys.length; r++) {
        var key = rowKeys[r];
        var vals = indicators[key];
        if (!vals || vals.length === 0) continue;

        var style = rowStyles[key] || '';
        bodyHtml += '<tr' + style + '>';
        bodyHtml += '<td style="font-weight:600;text-align:center;white-space:nowrap;">' + escapeHtml(key) + '</td>';
        for (var c = 0; c < Math.min(vals.length, shifts.length); c++) {
            var v = vals[c];
            var display = (v !== null && v !== undefined) ? formatNumber(v) : '-';
            bodyHtml += '<td>' + display + '</td>';
        }
        bodyHtml += '</tr>';
    }
    tbody.innerHTML = bodyHtml;
}

function formatNumber(v) {
    if (v === null || v === undefined) return '-';
    if (typeof v === 'number') {
        // 整数直接显示，小数保留1位
        if (Number.isInteger(v)) return v.toLocaleString('zh-CN');
        return v.toLocaleString('zh-CN', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
    }
    return String(v);
}

// 兼容 resize
function resizeDailyCharts() {
    if (allCharts['chart-daily-trend']) {
        try { allCharts['chart-daily-trend'].resize(); } catch(e) {}
    }
}
