/* ===== Tab1：上线流量 ===== */

// 当前子Tab（big=大件，small=小件）
var currentFlowSubTab = 'big';

function initFlowTab() {
    var data = window.LINE_DATA;
    var elEmpty = document.getElementById('flow-empty');
    var elStats = document.getElementById('flow-stats');

    if (!data || !data.has_data) {
        if (elEmpty) elEmpty.style.display = 'block';
        if (elStats) elStats.style.display = 'none';
        return;
    }

    // 有数据：隐藏空状态，显示内容
    if (elEmpty) elEmpty.style.display = 'none';
    if (elStats) elStats.style.display = '';

    // 默认显示大件
    currentFlowSubTab = 'big';

    renderFlowStats();
    try { renderFlowCharts(); } catch(e) { console.warn('图表渲染异常（可能Chart.js未加载）:', e); }
    renderFlowTables();

    // 确保正确的子Tab按钮状态
    document.querySelectorAll('.flow-subtab-btn').forEach(function(b) {
        b.classList.remove('active');
    });
    var defaultBtn = document.querySelector('.flow-subtab-btn[data-subtab="big"]');
    if (defaultBtn) defaultBtn.classList.add('active');
}

function switchFlowSubTab(tab) {
    currentFlowSubTab = tab;

    // 切换按钮状态
    document.querySelectorAll('.flow-subtab-btn').forEach(function(b) {
        b.classList.remove('active');
    });
    var btn = document.querySelector('.flow-subtab-btn[data-subtab="' + tab + '"]');
    if (btn) btn.classList.add('active');

    // 切换图表容器显示/隐藏
    document.querySelectorAll('.flow-subtab').forEach(function(c) {
        c.classList.remove('active');
    });
    var chartBox = document.getElementById('flow-charts-' + tab);
    if (chartBox) chartBox.classList.add('active');

    // 切换表格容器显示/隐藏
    document.querySelectorAll('#main-tab-flow .sheet-section').forEach(function(c) {
        c.style.display = 'none';
    });
    var tableBox = document.getElementById('flow-table-' + tab);
    if (tableBox) tableBox.style.display = '';

    // 更新统计卡片
    renderFlowStats();

    // resize 当前Tab的图表
    var prefix = tab === 'big' ? 'chart-big-' : 'chart-small-';
    setTimeout(function() { resizeChartsByPrefix(prefix); }, 100);
}

function renderFlowStats() {
    var data = window.LINE_DATA;
    if (!data) return;

    // 根据当前子Tab选择对应的summary
    var key = currentFlowSubTab === 'big' ? 'big_summary' : 'small_summary';
    var s = data[key] || data.summary || {};

    var elTotal = document.getElementById('flow-total');
    var elHigh = document.getElementById('flow-high');
    var elSevere = document.getElementById('flow-severe');
    if (elTotal) elTotal.textContent = s.total_lines || '--';
    if (elHigh) elHigh.textContent = s.high_sat_lines || '--';
    if (elSevere) elSevere.textContent = s.severe_sat_lines || '--';
}

function renderFlowCharts() {
    var data = window.LINE_DATA;
    if (!data || !data.charts) return;

    ['big', 'small'].forEach(function(type) {
        var containerId = 'flow-charts-' + type;
        var container = document.getElementById(containerId);
        if (!container) return;

        // 清空容器
        container.innerHTML = '';

        var groups = data.charts[type] || [];
        groups.forEach(function(group, idx) {
            var chartDiv = document.createElement('div');
            chartDiv.className = 'chart-box';

            var title = document.createElement('h3');
            title.textContent = group.team_name + '（' + group.line_count + '条线路）';
            chartDiv.appendChild(title);

            var chartContainer = document.createElement('div');
            chartContainer.className = 'chart-container';
            chartContainer.style.height = '300px';

            var canvasId = 'chart-' + type + '-' + idx;
            var canvas = document.createElement('canvas');
            canvas.id = canvasId;
            chartContainer.appendChild(canvas);
            chartDiv.appendChild(chartContainer);
            container.appendChild(chartDiv);

            // 创建图表
            var labels = group.labels || [];
            var datasets = (group.datasets || []).map(function(ds) {
                return {
                    label: ds.label,
                    data: ds.data,
                    backgroundColor: ds.backgroundColor,
                    borderColor: ds.borderColor,
                    borderWidth: 1,
                    barPercentage: ds.barPercentage || 0.7,
                };
            });
            if (datasets.length > 0) {
                createChart(canvasId, labels, datasets);
            }
        });
    });
}

function renderFlowTables() {
    var data = window.LINE_DATA;
    if (!data || !data.tables) return;

    ['big', 'small'].forEach(function(type) {
        var tableData = data.tables[type];
        if (!tableData) return;

        var wrapper = document.getElementById('flow-table-' + type);
        if (!wrapper) return;

        // tableData 是 HTML 字符串，直接注入
        wrapper.innerHTML = tableData || '';
        // 默认只显示大件表格，小件隐藏由CSS控制
        wrapper.style.display = type === 'big' ? '' : 'none';
    });
}

// 页面加载后初始化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initFlowTab);
} else {
    initFlowTab();
}
