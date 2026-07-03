/* ===== 现场信息看板 - 公共函数 ===== */

// 全局图表管理
const allCharts = {};

// Tab 切换
function switchMainTab(tab) {
    document.querySelectorAll('.main-tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.main-tab-content').forEach(c => c.classList.remove('active'));
    const targetBtn = document.querySelector('.main-tab-btn[data-tab="' + tab + '"]');
    const targetContent = document.getElementById('main-tab-' + tab);
    if (targetBtn) targetBtn.classList.add('active');
    if (targetContent) targetContent.classList.add('active');

    // 按需加载数据
    if (tab === 'flow') {
        if (typeof dataLoader !== 'undefined') {
            dataLoader.loadFlowData().then(function(data) {
                if (typeof renderFlow === 'function') renderFlow();
            });
        }
        setTimeout(() => resizeChartsByPrefix('chart-big-', 'chart-small-'), 100);
    }
    if (tab === 'part') {
        if (typeof dataLoader !== 'undefined') {
            dataLoader.loadPartData().then(function(data) {
                if (typeof initPartTable === 'function') initPartTable();
            });
        }
    }
    if (tab === 'daokou') {
        if (typeof dataLoader !== 'undefined') {
            dataLoader.loadDaokouData().then(function(data) {
                if (typeof renderDaokouCharts === 'function') renderDaokouCharts();
            });
        }
    }
    if (tab === 'audit') {
        if (typeof renderAuditTab === 'function') renderAuditTab();
    }
    if (tab === 'plan') {
        if (typeof dataLoader !== 'undefined') {
            dataLoader.loadPlanData().then(function(data) {
                if (typeof initPlanTab === 'function') initPlanTab();
            });
        }
    }
}


function resizeChartsByPrefix(...prefixes) {
    Object.keys(allCharts).forEach(function(id) {
        let match = false;
        prefixes.forEach(function(p) {
            if (id.startsWith(p)) match = true;
        });
        if (match) {
            try { allCharts[id].resize(); } catch (e) {}
        }
    });
}

// 通用工具
function round2(v) {
    if (v === null || v === undefined) return null;
    return Math.round(v * 100) / 100;
}

function escapeHtml(str) {
    const div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
}

// Chart.js 通用创建函数
function createChart(canvasId, labels, datasets) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return null;
    const context = ctx.getContext('2d');

    // 销毁已有图表
    if (allCharts[canvasId]) {
        try { allCharts[canvasId].destroy(); } catch (e) {}
    }

    const chart = new Chart(context, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: datasets.map(function(ds) {
                return {
                    label: ds.label,
                    data: ds.data,
                    backgroundColor: ds.backgroundColor,
                    borderColor: ds.borderColor,
                    borderWidth: ds.borderWidth || 1,
                    barPercentage: ds.barPercentage || 0.7,
                    type: ds.type || 'bar',
                };
            })
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                    labels: { font: { size: 12 }, usePointStyle: true, pointStyle: 'rectRounded' }
                },
                tooltip: {
                    callbacks: {
                        label: function(ctx) {
                            const v = ctx.raw;
                            if (v === null || v === undefined) return ctx.dataset.label + ': 无数据';
                            return ctx.dataset.label + ': ' + v + '%';
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: { display: true, text: '饱和度 (%)' },
                    ticks: { font: { size: 11 } }
                },
                x: {
                    ticks: { font: { size: 10 }, maxRotation: 45 }
                }
            }
        }
    });

    allCharts[canvasId] = chart;
    return chart;
}

// 道口专用图表创建函数
function createDaokouChart(canvasId, labels, data, type, minY, maxY) {
    if (allCharts[canvasId]) { try { allCharts[canvasId].destroy(); } catch(e) {} }
    const colors = data.map(function(v) {
        if (v === null) return '#cccccc';
        return v >= 95 ? '#34a853' : v >= 90 ? '#fbbc04' : '#ea4335';
    });
    const ctx = document.getElementById(canvasId).getContext('2d');
    const chart = new Chart(ctx, {
        type: type || 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: '合格率(%)',
                data: data,
                backgroundColor: colors,
                borderWidth: 0,
                borderRadius: 6,
            }, {
                label: '95%合格线',
                data: Array(labels.length).fill(95),
                type: 'line',
                borderColor: '#ea4335',
                borderDash: [6, 3],
                borderWidth: 2,
                pointRadius: 0,
                fill: false,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: true, position: 'top' } },
            scales: {
                y: {
                    beginAtZero: false,
                    min: minY || 80,
                    max: maxY || 100,
                    title: { display: true, text: '合格率(%)' }
                },
            }
        }
    });
    allCharts[canvasId] = chart;
}

function createDaokouLineChart(canvasId, labels, data) {
    if (allCharts[canvasId]) { try { allCharts[canvasId].destroy(); } catch(e) {} }
    const ctx = document.getElementById(canvasId).getContext('2d');
    const chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: '合格率(%)',
                data: data,
                borderColor: '#4285f4',
                backgroundColor: 'rgba(66,133,244,0.1)',
                fill: true,
                tension: 0.3,
            }, {
                label: '95%合格线',
                data: Array(labels.length).fill(95),
                type: 'line',
                borderColor: '#ea4335',
                borderDash: [6, 3],
                borderWidth: 2,
                pointRadius: 0,
                fill: false,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: true, position: 'top' } },
            scales: {
                y: { beginAtZero: false, min: 80, max: 100 }
            }
        }
    });
    allCharts[canvasId] = chart;
}

function createDaokouShiftChart(canvasId, labels, data, colors) {
    if (allCharts[canvasId]) { try { allCharts[canvasId].destroy(); } catch(e) {} }
    const ctx = document.getElementById(canvasId).getContext('2d');
    const chart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: '合格率(%)',
                data: data,
                backgroundColor: colors,
                borderRadius: 6,
            }, {
                label: '95%合格线',
                data: Array(labels.length).fill(95),
                type: 'line',
                borderColor: '#ea4335',
                borderDash: [6, 3],
                borderWidth: 2,
                pointRadius: 0,
                fill: false,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: true, position: 'top' },
                tooltip: {
                    callbacks: {
                        label: function(ctx) {
                            const raw = ctx.raw;
                            if (raw === null) return ctx.label.replace(/\n/g, '') + ': 无数据';
                            return '合格率: ' + raw + '%';
                        }
                    }
                }
            },
            scales: {
                y: { beginAtZero: false, min: 80, max: 100, title: { display: true, text: '合格率(%)' } }
            }
        }
    });
    allCharts[canvasId] = chart;
}
