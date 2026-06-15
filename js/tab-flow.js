/* ===== Tab1：上线流量 ===== */

// 从全局变量获取数据（由 HTML 内嵌注入）
// 生成脚本会将 JSON 数据写入 window.LINE_DATA

function initFlowTab() {
    if (!window.LINE_DATA) {
        document.getElementById('flow-empty') &&
            (document.getElementById('flow-empty').style.display = 'block');
        return;
    }
    renderFlowStats();
    renderFlowCharts();
    renderFlowTables();
}

function renderFlowStats() {
    const data = window.LINE_DATA;
    if (!data || !data.summary) return;
    const s = data.summary;

    const elTotal = document.getElementById('flow-total');
    const elHigh = document.getElementById('flow-high');
    const elSevere = document.getElementById('flow-severe');
    if (elTotal) elTotal.textContent = s.total_lines || '--';
    if (elHigh) elHigh.textContent = s.high_sat_lines || '--';
    if (elSevere) elSevere.textContent = s.severe_sat_lines || '--';
}

function renderFlowCharts() {
    const data = window.LINE_DATA;
    if (!data || !data.charts) return;

    ['big', 'small'].forEach(function(type) {
        const groups = data.charts[type] || [];
        groups.forEach(function(group, idx) {
            const canvasId = 'chart-' + type + '-' + idx;
            if (!document.getElementById(canvasId)) return;

            const labels = group.lines || [];
            const datasets = (group.datasets || []).map(function(ds) {
                return {
                    label: ds.label,
                    data: ds.data,
                    backgroundColor: ds.backgroundColor,
                    borderColor: ds.borderColor,
                    borderWidth: 1,
                    barPercentage: 0.7,
                    legendColor: ds.legendColor,
                };
            });
            if (datasets.length > 0) {
                createChart(canvasId, labels, datasets);
            }
        });
    });
}

function renderFlowTables() {
    const data = window.LINE_DATA;
    if (!data || !data.tables) return;

    ['big', 'small'].forEach(function(type) {
        const tableData = data.tables[type];
        if (!tableData) return;

        const wrapper = document.getElementById('flow-table-' + type);
        if (!wrapper) return;

        // tableData 是 HTML 字符串，直接注入
        wrapper.innerHTML = tableData || '';
    });
}

// 页面加载后初始化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initFlowTab);
} else {
    initFlowTab();
}
