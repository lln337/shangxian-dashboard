/* ===== Tab1：上线流量（适配 fetch 按需加载 + 原始 JSON 结构）===== */

// 当前子Tab（big=大件，small=小件）
var currentFlowSubTab = 'big';

function initFlowTab() {
    if (window.LINE_DATA) {
        renderFlow();
        return;
    }
    showFlowEmpty();
}

function showFlowEmpty() {
    var elEmpty = document.getElementById('flow-empty');
    var elStats = document.getElementById('flow-stats');
    if (elEmpty) elEmpty.style.display = 'block';
    if (elStats) elStats.style.display = 'none';
}

function renderFlow() {
    var data = window.LINE_DATA;

    // 兼容检查：原始JSON格式 { big: { data:[...], shifts:[...] }, small:{...} }
    var hasData = data && (
        (data.big && data.big.data && data.big.data.length > 0) ||
        (data.small && data.small.data && data.small.data.length > 0)
    );
    if (!hasData) {
        showFlowEmpty();
        return;
    }

    // 有数据：隐藏空状态
    var elEmpty = document.getElementById('flow-empty');
    var elStats = document.getElementById('flow-stats');
    if (elEmpty) elEmpty.style.display = 'none';
    if (elStats) elStats.style.display = '';

    currentFlowSubTab = 'big';

    // 更新日期信息
    updateFlowDateInfo(data);

    renderFlowStats();
    try { renderFlowCharts(); } catch(e) { console.warn('图表渲染异常:', e); }
    renderFlowTables();

    // 默认激活大件按钮
    document.querySelectorAll('.flow-subtab-btn').forEach(function(b) {
        b.classList.remove('active');
    });
    var btn = document.querySelector('.flow-subtab-btn[data-subtab="big"]');
    if (btn) btn.classList.add('active');
}

function updateFlowDateInfo(data) {
    var typeData = data[currentFlowSubTab] || data.big || {};
    var dateRange = typeData.date_range || '';
    var el = document.getElementById('flow-date-info');
    if (el) el.innerHTML = dateRange ? '数据日期：' + dateRange : '';

    // 更新数据更新时间
    var updateTime = data.update_time || '';
    var elTime = document.getElementById('flow-update-time');
    if (elTime) elTime.textContent = updateTime ? '数据更新：' + updateTime : '';
}

/* ========== 统计卡片 ========== */
function renderFlowStats() {
    var data = window.LINE_DATA;
    if (!data) return;

    var typeKey = currentFlowSubTab; // 'big' or 'small'
    var typeData = data[typeKey];
    if (!typeData || !typeData.data) return;

    var lines = typeData.data;
    var totalLines = lines.length;
    var highCount = 0;  // >85%
    var severeCount = 0; // >95%

    for (var i = 0; i < lines.length; i++) {
        var shifts = lines[i].shifts || [];
        for (var j = 0; j < shifts.length; j++) {
            var sat = parseFloat(shifts[j].saturation) || 0;
            if (sat > 95) severeCount++;
            else if (sat > 85) highCount++;
        }
    }

    setElText('flow-total', totalLines);
    setElText('flow-high', highCount);
    setElText('flow-severe', severeCount);
}

function setElText(id, val) {
    var el = document.getElementById(id);
    if (el) el.textContent = val !== undefined && val !== null ? val : '--';
}

/* ========== 图表渲染（按团队分组）========== */
function renderFlowCharts() {
    var data = window.LINE_DATA;
    if (!data) return;

    // 只在大件tab显示柱状图
    var containerBig = document.getElementById('flow-charts-big');
    var containerSmall = document.getElementById('flow-charts-small');
    if (containerSmall) containerSmall.innerHTML = '';
    if (currentFlowSubTab === 'small') {
        if (containerBig) containerBig.innerHTML = '';
        return;
    }

    if (!containerBig) return;
    var typeData = data['big'];
    if (!typeData || !typeData.data) return;

    containerBig.innerHTML = '';

    // 按 team 分组
    var teams = {};
    var teamOrder = [];
    for (var i = 0; i < typeData.data.length; i++) {
        var line = typeData.data[i];
        var teamName = line.team || '未分组';
        if (!teams[teamName]) {
            teams[teamName] = [];
            teamOrder.push(teamName);
        }
        teams[teamName].push(line);
    }

    var shiftNames = typeData.shifts || [];

    teamOrder.forEach(function(teamName) {
        var teamLines = teams[teamName];

        var chartDiv = document.createElement('div');
        chartDiv.className = 'chart-box';

        var title = document.createElement('h3');
        title.textContent = teamName + '（' + teamLines.length + '条线路）';
        chartDiv.appendChild(title);

        var chartContainer = document.createElement('div');
        chartContainer.className = 'chart-container';
        chartContainer.style.height = Math.max(300, teamLines.length * 28) + 'px';

        var canvasId = 'chart-big-' + teamName.replace(/\s/g, '-');
        var canvas = document.createElement('canvas');
        canvas.id = canvasId;
        chartContainer.appendChild(canvas);
        chartDiv.appendChild(chartContainer);
        containerBig.appendChild(chartDiv);

        // 构建图表数据：每个班次一个 dataset
        var labels = [];
        teamLines.sort(function(a, b) { return (a.line || '').localeCompare(b.line || ''); });
        for (var k = 0; k < teamLines.length; k++) {
            labels.push(teamLines[k].line || '');
        }

        // 为每个班次创建一个 dataset（饱和度）
        var datasets = [];
        for (var s = 0; s < shiftNames.length; s++) {
            var shiftName = shiftNames[s];
            var satData = [];
            for (var k = 0; k < teamLines.length; k++) {
                var shifts = teamLines[k].shifts || [];
                var sat = 0;
                for (var j = 0; j < shifts.length; j++) {
                    if (shifts[j].shift_name === shiftName) {
                        sat = parseFloat(shifts[j].saturation) || 0;
                        break;
                    }
                }
                satData.push(sat);
            }

            datasets.push({
                label: shiftName + ' 饱和度(%)',
                data: satData,
                backgroundColor: satData.map(function(v) {
                    if (v > 95) return 'rgba(220, 53, 69, 0.7)';
                    if (v > 85) return 'rgba(255, 193, 7, 0.7)';
                    return 'rgba(40, 167, 69, 0.7)';
                }),
                borderColor: satData.map(function(v) {
                    if (v > 95) return 'rgb(220, 53, 69)';
                    if (v > 85) return 'rgb(255, 193, 7)';
                    return 'rgb(40, 167, 69)';
                }),
                borderWidth: 1,
                barPercentage: 0.7,
            });
        }

        // 添加流量数据集（每个班次一个）
        for (var s = 0; s < shiftNames.length; s++) {
            var shiftName = shiftNames[s];
            var flowData = [];
            for (var k = 0; k < teamLines.length; k++) {
                var shifts = teamLines[k].shifts || [];
                var flow = 0;
                for (var j = 0; j < shifts.length; j++) {
                    if (shifts[j].shift_name === shiftName) {
                        flow = parseFloat(shifts[j].flow) || 0;
                        break;
                    }
                }
                flowData.push(flow);
            }
            datasets.push({
                label: shiftName + '(流量)',
                data: flowData,
                backgroundColor: 'rgba(0, 123, 255, 0.5)',
                borderColor: 'rgb(0, 123, 255)',
                borderWidth: 1,
                barPercentage: 0.7,
                yAxisID: 'y1',
            });
        }

        if (datasets.length > 0) {
            createChart(canvasId, labels, datasets);
        }
    });
}

/* ========== 表格渲染 ========== */
function renderFlowTables() {
    var data = window.LINE_DATA;
    if (!data) return;

    ['big', 'small'].forEach(function(type) {
        var wrapper = document.getElementById('flow-table-' + type);
        if (!wrapper) return;

        var typeData = data[type];
        if (!typeData || !typeData.data) {
            wrapper.innerHTML = '<p style="padding:20px;color:#999;">暂无数据</p>';
            return;
        }

        var shiftNames = typeData.shifts || [];
        var lines = typeData.data;

        // 构建 HTML 表格
        var html = '<table class="data-table flow-table"><thead><tr>';
        html += '<th>序号</th><th>团队</th><th>线路</th><th>标准</th>';
        for (var s = 0; s < shiftNames.length; s++) {
            html += '<th>' + escapeHtml(shiftNames[s]) + '</th>';
        }
        html += '</tr></thead><tbody>';

        for (var i = 0; i < lines.length; i++) {
            var L = lines[i];
            html += '<tr>';
            html += '<td>' + (i + 1) + '</td>';
            html += '<td>' + escapeHtml(L.team || '') + '</td>';
            html += '<td>' + escapeHtml(L.line || '') + '</td>';
            html += '<td>' + (L.std || '') + '</td>';

            var shifts = L.shifts || [];
            for (var s = 0; s < shiftNames.length; s++) {
                var shiftData = null;
                for (var j = 0; j < shifts.length; j++) {
                    if (shifts[j].shift_name === shiftNames[s]) {
                        shiftData = shifts[j];
                        break;
                    }
                }
                if (shiftData) {
                    var sat = parseFloat(shiftData.saturation) || 0;
                    var cls = '';
                    if (sat > 95) cls = ' style="color:#dc3545;font-weight:bold;"';
                    else if (sat > 85) cls = ' style="color:#ffc107;font-weight:bold;"';
                    html += '<td' + cls + '>' +
                        (shiftData.flow || 0) + ' / ' + sat.toFixed(1) + '%</td>';
                } else {
                    html += '<td>-</td>';
                }
            }
            html += '</tr>';
        }
        html += '</tbody></table>';

        wrapper.innerHTML = html;
        wrapper.style.display = (type === currentFlowSubTab) ? '' : 'none';
    });
}

/* ========== 子Tab切换 ========== */
function switchFlowSubTab(tab) {
    currentFlowSubTab = tab;

    // 按钮
    document.querySelectorAll('.flow-subtab-btn').forEach(function(b) {
        b.classList.remove('active');
    });
    var btn = document.querySelector('.flow-subtab-btn[data-subtab="' + tab + '"]');
    if (btn) btn.classList.add('active');

    // 图表容器
    document.querySelectorAll('.flow-subtab').forEach(function(c) {
        c.classList.remove('active');
    });
    var chartBox = document.getElementById('flow-charts-' + tab);
    if (chartBox) chartBox.classList.add('active');

    // 表格容器
    document.querySelectorAll('#main-tab-flow .sheet-section').forEach(function(c) {
        c.style.display = 'none';
    });
    var tableBox = document.getElementById('flow-table-' + tab);
    if (tableBox) tableBox.style.display = '';

    // 更新统计和日期
    renderFlowStats();
    updateFlowDateInfo(window.LINE_DATA);

    // 图表resize
    var prefix = tab === 'big' ? 'chart-big-' : 'chart-small-';
    setTimeout(function() { resizeChartsByPrefix(prefix); }, 100);
}

/* ========== 工具函数 ========== */
function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
