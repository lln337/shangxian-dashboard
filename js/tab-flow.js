/* ===== Tab1：上线流量 ===== */

// 从全局变量获取数据（由 HTML 内嵌注入）
// 生成脚本会将 JSON 数据写入 window.LINE_DATA

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

    renderFlowStats();
    renderFlowCharts();
    renderFlowTables();
}

function renderFlowStats() {
    var data = window.LINE_DATA;
    if (!data || !data.summary) return;
    var s = data.summary;

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
        // 获取图表容器
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
            var labels = group.lines || [];
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
        wrapper.style.display = '';
    });
}

// 页面加载后初始化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initFlowTab);
} else {
    initFlowTab();
}
