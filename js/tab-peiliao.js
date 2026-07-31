/* ===== Tab：配料需求 ===== */

// 筛选状态（'ALL' = 全部）
var PL_STATE = { area: 'ALL', shift: 'ALL' };

// 格式化数值：整数直接显示，小数保留1位
function peiliaoFmt(v) {
    if (v === null || v === undefined) return '-';
    if (typeof v === 'number') {
        if (Number.isInteger(v)) return v.toLocaleString('zh-CN');
        return v.toLocaleString('zh-CN', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
    }
    return String(v);
}

function peiliaoSetText(id, val) {
    var el = document.getElementById(id);
    if (el) el.textContent = val;
}

function round1(v) {
    return Math.round((v || 0) * 10) / 10;
}

function renderPeiliaoTab() {
    var data = window.PEILIAO_DATA;
    var container = document.getElementById('peiliao-content');
    if (!container) return;

    if (!data || !data.areas || data.areas.length === 0) {
        showPeiliaoEmpty();
        return;
    }

    var elEmpty = document.getElementById('peiliao-empty');
    if (elEmpty) elEmpty.style.display = 'none';
    var elStats = document.getElementById('peiliao-stats');
    if (elStats) elStats.style.display = '';
    var elFilter = document.getElementById('peiliao-filter-wrap');
    if (elFilter) elFilter.style.display = '';
    var elBar = document.getElementById('peiliao-filterbar');
    if (elBar) elBar.style.display = '';
    var elChart = document.getElementById('peiliao-chart-wrap');
    if (elChart) elChart.style.display = (data.shift_summary && data.shift_summary.length) ? '' : 'none';

    buildPeiliaoFilterBar(data);
    applyPeiliaoFilters(data);
}

// ============ 筛选按钮栏 ============
function buildPeiliaoFilterBar(data) {
    var bar = document.getElementById('peiliao-filterbar');
    if (!bar) return;

    var areas = data.areas.map(function (a) { return a.area; });
    var shifts = data.shifts || [];

    var html = '<div class="pl-filter-group"><span class="pl-filter-label">配料区：</span>';
    html += plChip('area', 'ALL', '全部', PL_STATE.area === 'ALL');
    areas.forEach(function (a) {
        html += plChip('area', a, a, PL_STATE.area === a);
    });
    html += '</div>';

    if (shifts.length) {
        html += '<div class="pl-filter-group"><span class="pl-filter-label">班次：</span>';
        html += plChip('shift', 'ALL', '全部', PL_STATE.shift === 'ALL');
        shifts.forEach(function (s) {
            html += plChip('shift', s, s.replace('2026-', ''), PL_STATE.shift === s);
        });
        html += '</div>';
    }
    bar.innerHTML = html;

    // 绑定点击
    Array.prototype.forEach.call(bar.querySelectorAll('.pl-chip'), function (btn) {
        btn.onclick = function () {
            var kind = btn.getAttribute('data-kind');
            var val = btn.getAttribute('data-val');
            PL_STATE[kind] = val;
            buildPeiliaoFilterBar(data);
            applyPeiliaoFilters(data);
        };
    });
}

function plChip(kind, val, label, active) {
    return '<button class="pl-chip' + (active ? ' active' : '') + '" data-kind="' + kind +
        '" data-val="' + escapeHtml(val) + '">' + escapeHtml(label) + '</button>';
}

// ============ 班次×工位 视图构建 ============
// 用 station_shift 按当前筛选聚合出 与旧 areas 相同结构 的视图
// 班次=ALL 时取各班次平均（每小时需求为速率，跨班次求均值）
function buildShiftView(data) {
    var allShifts = data.shifts || [];
    var selShifts = PL_STATE.shift === 'ALL' ? allShifts : [PL_STATE.shift];
    var nSh = selShifts.length || 1;
    var selSet = {};
    selShifts.forEach(function (s) { selSet[s] = true; });

    // 配料区元信息（人数等）与顺序
    var metaByArea = {}, areaOrder = [];
    (data.areas || []).forEach(function (a) {
        metaByArea[a.area] = a;
        areaOrder.push(a.area);
    });

    // 聚合：area -> 工位|大小件 -> {sps, sort}（与固定表同粒度：每工位 大件/小件 各一行）
    var agg = {};
    (data.station_shift || []).forEach(function (r) {
        if (PL_STATE.area !== 'ALL' && r.area !== PL_STATE.area) return;
        if (!selSet[r.shift]) return;
        if (!agg[r.area]) agg[r.area] = {};
        var key = r.station + '|' + (r.size || '小件');
        var s = agg[r.area][key];
        if (!s) {
            s = agg[r.area][key] = { station: r.station, size: r.size || '小件', sps: 0, sort: 0 };
        }
        s.sps += r.sps || 0;
        s.sort += r.sort_sps || 0;
    });

    function segSortKey(st) {
        var m = /^(\d+)(.*)$/.exec(String(st));
        return m ? [parseInt(m[1], 10), m[2]] : [999, String(st)];
    }

    var view = { areas: [], totals: { SPS: 0, sort_sps: 0, total: 0, stations: 0, people: 0 } };
    var areas = Object.keys(agg);
    areas.sort(function (a, b) {
        var ia = areaOrder.indexOf(a), ib = areaOrder.indexOf(b);
        return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
    });
    areas.forEach(function (area) {
        var entries = Object.keys(agg[area]).map(function (k) { return agg[area][k]; });
        entries.sort(function (x, y) {
            var kx = segSortKey(x.station), ky = segSortKey(y.station);
            if (kx[0] !== ky[0]) return kx[0] - ky[0];
            if (kx[1] !== ky[1]) return kx[1] < ky[1] ? -1 : 1;
            // 大件在前（与固定表一致）
            return x.size === y.size ? 0 : (x.size === '大件' ? -1 : 1);
        });
        var stList = [], sub = { SPS: 0, sort_sps: 0, total: 0 };
        var uniqueStations = {};
        entries.forEach(function (v) {
            var sps = v.sps / nSh, sort = v.sort / nSh;
            var tot = sps + sort;
            stList.push({
                station: v.station, '大小件': v.size,
                SPS: round1(sps), sort_sps: round1(sort),
                total: round1(tot)
            });
            sub.SPS += sps; sub.sort_sps += sort; sub.total += tot;
            uniqueStations[v.station] = true;
        });
        var meta = metaByArea[area] || {};
        var stationCnt = Object.keys(uniqueStations).length;
        view.areas.push({
            area: area,
            stations: stList,
            person_count: meta.person_count,
            station_count: stationCnt,
            subtotal: sub
        });
        view.totals.SPS += sub.SPS; view.totals.sort_sps += sub.sort_sps;
        view.totals.total += sub.total;
        view.totals.stations += stationCnt;
        if (meta.person_count) view.totals.people += meta.person_count;
    });
    return view;
}

// ============ 应用筛选：卡片 + 图表 + 表格 ============
function applyPeiliaoFilters(data) {
    var hasShiftStation = !!(data.station_shift && data.station_shift.length);
    var fAreas = data.areas.filter(function (a) {
        return PL_STATE.area === 'ALL' || a.area === PL_STATE.area;
    });

    var view = null;
    var sps = 0, sort = 0, tot = 0, stationCount = 0, peopleCount = 0, areaCount = 0;

    if (hasShiftStation) {
        // ---- 班次×工位 动态数据（随 配料区+班次 筛选）----
        view = buildShiftView(data);
        sps = view.totals.SPS; sort = view.totals.sort_sps;
        tot = view.totals.total;
        stationCount = view.totals.stations;
        peopleCount = view.totals.people;
        areaCount = view.areas.length;
    } else {
        // ---- 兼容旧数据：固定数据卡片（仅随配料区筛选）----
        fAreas.forEach(function (a) {
            var st = a.subtotal || {};
            sps += st.SPS || 0; sort += st.sort_sps || 0;
            tot += st.total || 0;
            stationCount += (a.station_count !== null && a.station_count !== undefined)
                ? a.station_count : (a.stations || []).length;
            if (a.person_count) peopleCount += a.person_count;
        });
        if (PL_STATE.area === 'ALL' && data.grand_total) {
            var gt = data.grand_total;
            sps = gt.SPS; sort = gt.sort_sps; tot = gt.total;
            if (gt.station_count) stationCount = gt.station_count;
        }
        areaCount = fAreas.length;
    }
    peiliaoSetText('peiliao-total-sps', peiliaoFmt(round1(sps)));
    peiliaoSetText('peiliao-total-sort', peiliaoFmt(round1(sort)));
    peiliaoSetText('peiliao-total-all', peiliaoFmt(round1(tot)));
    peiliaoSetText('peiliao-area-count', areaCount);
    peiliaoSetText('peiliao-station-count', stationCount);
    peiliaoSetText('peiliao-people-count', peopleCount);

    // 平均人效（随配料区筛选）
    var rxAll = (data.renxiao || []).filter(function (r) { return r.area !== '汇总'; });
    var rxSel = rxAll.filter(function (r) {
        return PL_STATE.area === 'ALL' || r.area === PL_STATE.area;
    });
    var avgRx = rxSel.length
        ? rxSel.reduce(function (s, r) { return s + (r.人效 || 0); }, 0) / rxSel.length
        : 0;
    peiliaoSetText('peiliao-renxiao-avg', peiliaoFmt(round1(avgRx)));

    // ---- 每小时需求卡（随 配料区+班次 筛选，来自班次汇总）----
    var ss = data.shift_summary || [];
    var fRows = ss.filter(function (r) {
        return (PL_STATE.area === 'ALL' || r.area === PL_STATE.area) &&
               (PL_STATE.shift === 'ALL' || r.shift === PL_STATE.shift);
    });
    var hourly = 0;
    if (fRows.length) {
        var sum = fRows.reduce(function (s, r) { return s + (r.total || 0); }, 0);
        if (PL_STATE.shift === 'ALL') {
            var nShift = (data.shifts || []).length || 1;
            hourly = sum / nShift;   // 全部班次 → 各班次平均
        } else {
            hourly = sum;            // 单班次 → 该班次合计
        }
    }
    peiliaoSetText('peiliao-hourly', peiliaoFmt(round1(hourly)));
    peiliaoSetText('peiliao-hourly-label',
        PL_STATE.shift === 'ALL' ? '每小时需求（个/小时·班次均值）' : '每小时需求（个/小时）');

    // ---- 堆积柱状图 ----
    renderPeiliaoChart(data);

    // ---- 明细表 + 人均表 ----
    var container = document.getElementById('peiliao-content');
    if (container) {
        var scopeLabel = '';
        if (hasShiftStation) {
            scopeLabel = '<h3 class="pl-section-title">配料区配料工段每小时配料数量（个/小时）</h3>';
        }
        container.innerHTML = scopeLabel + buildPeiliaoTable(data) +
            buildRenxiaoTable({ renxiao: (data.renxiao || []).filter(function (r) {
                return PL_STATE.area === 'ALL' || r.area === PL_STATE.area || r.area === '汇总';
            }) });
        bindPeiliaoFilter(data);
    }
}

// ============ 堆积柱状图 ============
var PL_CATS = [
    { key: 'big_sps',    label: '大件SPS',  color: '#7b1fa2' },
    { key: 'small_sps',  label: '小件SPS',  color: '#ce93d8' },
    { key: 'big_sort',   label: '大件排序', color: '#00897b' },
    { key: 'small_sort', label: '小件排序', color: '#80cbc4' }
];

function stationSortCmp(a, b) {
    var ma = /^(\d+)(.*)$/.exec(String(a));
    var mb = /^(\d+)(.*)$/.exec(String(b));
    var na = ma ? parseInt(ma[1], 10) : 999;
    var nb = mb ? parseInt(mb[1], 10) : 999;
    if (na !== nb) return na - nb;
    var sa = ma ? ma[2] : String(a);
    var sb = mb ? mb[2] : String(b);
    return sa < sb ? -1 : (sa > sb ? 1 : 0);
}

function renderPeiliaoChart(data) {
    var canvas = document.getElementById('chart-peiliao-shift');
    if (!canvas || typeof Chart === 'undefined') return;

    var shifts = (data.shifts || []).filter(function (s) {
        return PL_STATE.shift === 'ALL' || s === PL_STATE.shift;
    });
    if (!shifts.length) return;

    var isSingleArea = PL_STATE.area !== 'ALL';
    var labels = [];
    var idx = {}; // {shift: {label: {big_sps, small_sps, big_sort, small_sort}}}

    if (!isSingleArea) {
        // ---- 配料区视图（汇总级）----
        var ss = data.shift_summary || [];
        if (!ss.length) return;
        data.areas.forEach(function (a) {
            if (PL_STATE.area === 'ALL' || a.area === PL_STATE.area) labels.push(a.area);
        });
        ss.forEach(function (r) {
            if (!idx[r.shift]) idx[r.shift] = {};
            idx[r.shift][r.area] = {
                big_sps: r.big_sps || 0,
                small_sps: r.small_sps || 0,
                big_sort: r.big_sort || 0,
                small_sort: r.small_sort || 0
            };
        });
    } else {
        // ---- 工段级视图：单个配料区 × 各工段 × 各班次 ----
        var area = PL_STATE.area;
        var stationSet = {};
        (data.station_shift || []).forEach(function (r) {
            if (r.area !== area) return;
            if (shifts.indexOf(r.shift) < 0) return;
            stationSet[r.station] = true;
            if (!idx[r.shift]) idx[r.shift] = {};
            var cell = idx[r.shift][r.station];
            if (!cell) cell = idx[r.shift][r.station] = { big_sps: 0, small_sps: 0, big_sort: 0, small_sort: 0 };
            if (r.size === '大件') {
                cell.big_sps += r.sps || 0;
                cell.big_sort += r.sort_sps || 0;
            } else {
                cell.small_sps += r.sps || 0;
                cell.small_sort += r.sort_sps || 0;
            }
        });
        labels = Object.keys(stationSet).sort(stationSortCmp);
    }

    if (!labels.length) return;

    // 按当前视图下各类型总和从大到小排序，使每个 stack 从下到上从大到小堆积
    var catTotals = PL_CATS.map(function (cat) {
        var sum = 0;
        shifts.forEach(function (sh) {
            labels.forEach(function (lab) {
                var r = (idx[sh] || {})[lab];
                sum += r ? (r[cat.key] || 0) : 0;
            });
        });
        return { cat: cat, total: sum };
    });
    catTotals.sort(function (a, b) { return b.total - a.total; });

    // 每个班次一个 stack，每类一个 dataset → 分组堆积
    var datasets = [];
    shifts.forEach(function (sh) {
        catTotals.forEach(function (item) {
            var cat = item.cat;
            datasets.push({
                label: cat.label,
                _shift: sh,
                data: labels.map(function (lab) {
                    var r = (idx[sh] || {})[lab];
                    return r ? (r[cat.key] || 0) : 0;
                }),
                backgroundColor: cat.color,
                stack: sh,
                barPercentage: 0.9,
                categoryPercentage: 0.85
            });
        });
    });

    if (window._peiliaoChart) { window._peiliaoChart.destroy(); }
    window._peiliaoChart = new Chart(canvas, {
        type: 'bar',
        data: { labels: labels, datasets: datasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: { stacked: true, grid: { display: false } },
                y: { stacked: true, title: { display: true, text: '每小时需求（个/小时）' } }
            },
            plugins: {
                legend: {
                    labels: {
                        filter: function (item, chartData) {
                            var first = {};
                            chartData.datasets.forEach(function (d, i) {
                                if (first[d.label] === undefined) first[d.label] = i;
                            });
                            return first[item.text] === item.datasetIndex;
                        }
                    }
                },
                tooltip: {
                    callbacks: {
                        title: function (items) {
                            if (!items.length) return '';
                            var d = items[0].chart.data.datasets[items[0].datasetIndex];
                            return items[0].label + '  ' + (d._shift || '');
                        },
                        label: function (item) {
                            var d = item.chart.data.datasets[item.datasetIndex];
                            return d.label + ': ' + round1(item.raw);
                        },
                        footer: function (items) {
                            if (!items.length) return '';
                            var it = items[0];
                            var sh = it.chart.data.datasets[it.datasetIndex]._shift;
                            var sum = 0;
                            it.chart.data.datasets.forEach(function (d) {
                                if (d._shift === sh) sum += d.data[it.dataIndex] || 0;
                            });
                            return '班次合计: ' + round1(sum);
                        }
                    }
                }
            }
        }
    });

    // 标题
    var title = document.getElementById('peiliao-chart-title');
    if (title) {
        var scope;
        if (isSingleArea) {
            scope = PL_STATE.area + ' × 各配料工段' +
                (PL_STATE.shift === 'ALL' ? ' × 全部班次' : ' × ' + PL_STATE.shift);
        } else {
            scope = (PL_STATE.area === 'ALL' ? '各配料区' : PL_STATE.area) +
                (PL_STATE.shift === 'ALL' ? ' × 全部班次' : ' × ' + PL_STATE.shift);
        }
        title.textContent = '班次每小时需求堆积图（' + scope + '）';
    }
}

function showPeiliaoEmpty() {
    var elEmpty = document.getElementById('peiliao-empty');
    var elStats = document.getElementById('peiliao-stats');
    var elFilter = document.getElementById('peiliao-filter-wrap');
    var elBar = document.getElementById('peiliao-filterbar');
    var elChart = document.getElementById('peiliao-chart-wrap');
    var container = document.getElementById('peiliao-content');
    if (elEmpty) {
        elEmpty.style.display = 'block';
        if (window.location.protocol === 'file:') {
            elEmpty.innerHTML = '暂无配料需求数据<br>本地双击打开无法加载数据，请用本地服务器访问：' +
                '<br><code>python -m http.server 8080</code>（在 dashboard 目录运行）' +
                '<br>然后访问 <code>http://localhost:8080/index_official_v15.html</code>';
        }
    }
    if (elStats) elStats.style.display = 'none';
    if (elFilter) elFilter.style.display = 'none';
    if (elBar) elBar.style.display = 'none';
    if (elChart) elChart.style.display = 'none';
    if (container) container.innerHTML = '';
}

// 构建按配料区分组的明细表（上线流量式：每个班次横向展开）
function buildPeiliaoTable(data) {
    // 兼容旧数据：没有 station_shift 时回退到旧版单列表
    if (!data.station_shift || !data.station_shift.length) {
        return buildLegacyPeiliaoTable(data);
    }

    var allShifts = data.shifts || [];
    var showShifts = PL_STATE.shift === 'ALL' ? allShifts : [PL_STATE.shift];
    if (!showShifts.length) {
        return '<p style="padding:20px;color:#999;">暂无班次数据</p>';
    }

    // 区域顺序与元信息
    var metaByArea = {}, areaOrder = [];
    (data.areas || []).forEach(function (a) {
        metaByArea[a.area] = a;
        if (areaOrder.indexOf(a.area) < 0) areaOrder.push(a.area);
    });

    // 过滤并聚合：area -> station|size -> shift -> {sps,sort,qty,total}
    var agg = {};
    data.station_shift.forEach(function (r) {
        if (PL_STATE.area !== 'ALL' && r.area !== PL_STATE.area) return;
        if (showShifts.indexOf(r.shift) < 0) return;
        if (!agg[r.area]) agg[r.area] = {};
        var key = r.station + '|' + (r.size || '小件');
        var s = agg[r.area][key];
        if (!s) {
            s = agg[r.area][key] = { station: r.station, size: r.size || '小件', values: {} };
        }
        s.values[r.shift] = {
            sps: r.sps || 0,
            sort: r.sort_sps || 0,
            total: r.total || 0
        };
    });

    function segSortKey(st) {
        var m = /^(\d+)(.*)$/.exec(String(st));
        return m ? [parseInt(m[1], 10), m[2]] : [999, String(st)];
    }

    var areas = Object.keys(agg);
    areas.sort(function (a, b) {
        var ia = areaOrder.indexOf(a), ib = areaOrder.indexOf(b);
        return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
    });

    // 表头：首两列固定窄宽，数据列自适应剩余宽度
    var headTop = '<th rowspan="2" class="peiliao-col-fixed">配料区 / 工位</th>' +
        '<th rowspan="2" class="peiliao-col-size">大小件</th>';
    var headSub = '';
    showShifts.forEach(function (sh) {
        headTop += '<th colspan="3">' + escapeHtml(sh.replace('2026-', '')) + '</th>';
        headSub += '<th>SPS</th><th>排序</th><th>合计</th>';
    });

    // 表体
    var rows = '';
    areas.forEach(function (area) {
        var meta = metaByArea[area] || {};
        var entries = Object.keys(agg[area]).map(function (k) { return agg[area][k]; });
        entries.sort(function (x, y) {
            var kx = segSortKey(x.station), ky = segSortKey(y.station);
            if (kx[0] !== ky[0]) return kx[0] - ky[0];
            if (kx[1] !== ky[1]) return kx[1] < ky[1] ? -1 : 1;
            return x.size === y.size ? 0 : (x.size === '大件' ? -1 : 1);
        });

        var uniqueStations = {};
        entries.forEach(function (e) { uniqueStations[e.station] = true; });
        var wk = Object.keys(uniqueStations).length;
        var personLabel = (meta.person_count !== null && meta.person_count !== undefined)
            ? '（' + wk + ' 工位 / ' + meta.person_count + ' 人）'
            : '（' + wk + ' 工位）';

        rows += '<tr class="pl-area-row" data-area="' + escapeHtml(area) + '">' +
            '<td colspan="' + (2 + showShifts.length * 3) + '">' +
            '<span class="pl-area-name">配料区 ' + escapeHtml(area) + '</span>' +
            '<span class="pl-area-person">' + personLabel + '</span></td></tr>';

        // 小计累加器
        var sub = {};
        showShifts.forEach(function (sh) {
            sub[sh] = { sps: 0, sort: 0, total: 0 };
        });

        entries.forEach(function (e) {
            rows += '<tr class="pl-station-row" data-station="' + escapeHtml(e.station) + '" data-area="' + escapeHtml(area) + '">' +
                '<td class="pl-station-name peiliao-col-fixed">' + escapeHtml(e.station) + '</td>' +
                '<td class="peiliao-col-size">' + escapeHtml(e.size) + '</td>';
            showShifts.forEach(function (sh) {
                var v = e.values[sh] || { sps: 0, sort: 0, total: 0 };
                rows += '<td>' + peiliaoFmt(round1(v.sps)) + '</td>' +
                    '<td>' + peiliaoFmt(round1(v.sort)) + '</td>' +
                    '<td>' + peiliaoFmt(round1(v.total)) + '</td>';
                sub[sh].sps += v.sps; sub[sh].sort += v.sort;
                sub[sh].total += v.total;
            });
            rows += '</tr>';
        });

        // 小计行
        rows += '<tr class="pl-subtotal-row" data-area="' + escapeHtml(area) + '">' +
            '<td class="pl-sub-label peiliao-col-fixed">小计</td><td class="peiliao-col-size"></td>';
        showShifts.forEach(function (sh) {
            var v = sub[sh];
            rows += '<td>' + peiliaoFmt(round1(v.sps)) + '</td>' +
                '<td>' + peiliaoFmt(round1(v.sort)) + '</td>' +
                '<td>' + peiliaoFmt(round1(v.total)) + '</td>';
        });
        rows += '</tr>';
    });

    return '<div class="table-container">' +
        '<table class="data-table peiliao-table">' +
        '<thead><tr>' + headTop + '</tr><tr>' + headSub + '</tr></thead>' +
        '<tbody>' + rows + '</tbody></table></div>';
}

// 旧版单列表格（无 station_shift 时回退）
function buildLegacyPeiliaoTable(data) {
    var rows = '';
    data.areas.forEach(function (a, ai) {
        var area = a.area || ('区域' + (ai + 1));
        var wk = (a.station_count !== null && a.station_count !== undefined)
            ? a.station_count : (a.stations || []).length;
        var personLabel = (a.person_count !== null && a.person_count !== undefined)
            ? '（' + wk + ' 工位 / ' + a.person_count + ' 人）'
            : '（' + wk + ' 工位）';

        rows += '<tr class="pl-area-row" data-area="' + escapeHtml(area) + '">' +
            '<td colspan="5"><span class="pl-area-name">配料区 ' + escapeHtml(area) + '</span>' +
            '<span class="pl-area-person">' + personLabel + '</span></td></tr>';

        (a.stations || []).forEach(function (s) {
            rows += '<tr class="pl-station-row" data-station="' + escapeHtml(s.station) + '">' +
                '<td class="pl-station-name">' + escapeHtml(s.station) + '</td>' +
                '<td>' + escapeHtml(s.大小件 || '') + '</td>' +
                '<td>' + peiliaoFmt(s.SPS) + '</td>' +
                '<td>' + peiliaoFmt(s.sort_sps) + '</td>' +
                '<td>' + peiliaoFmt(s.total) + '</td></tr>';
        });

        var sps = a.subtotal ? a.subtotal.SPS : 0;
        var sort = a.subtotal ? a.subtotal.sort_sps : 0;
        var tot = a.subtotal ? a.subtotal.total : 0;
        rows += '<tr class="pl-subtotal-row" data-area="' + escapeHtml(area) + '">' +
            '<td class="pl-sub-label">小计</td>' +
            '<td></td>' +
            '<td>' + peiliaoFmt(round1(sps)) + '</td>' +
            '<td>' + peiliaoFmt(round1(sort)) + '</td>' +
            '<td>' + peiliaoFmt(round1(tot)) + '</td></tr>';
    });

    return '<div class="table-container">' +
        '<table class="data-table peiliao-table">' +
        '<thead><tr>' +
        '<th>配料区 / 工位</th>' +
        '<th style="width:90px;">大小件</th>' +
        '<th style="width:120px;">SPS</th>' +
        '<th style="width:140px;">排序</th>' +
        '<th style="width:120px;">合计</th>' +
        '</tr></thead><tbody>' + rows + '</tbody></table></div>';
}

// 人均 / 人效 表
function buildRenxiaoTable(data) {
    var rx = data.renxiao || [];
    if (!rx.length) return '';
    var rows = '';
    rx.forEach(function (r) {
        var isTotal = (r.area === '汇总');
        rows += '<tr class="' + (isTotal ? 'pl-total-row' : '') + '">' +
            '<td>' + escapeHtml(r.area) + '</td>' +
            '<td>' + peiliaoFmt(round1(r.配料)) + '</td>' +
            '<td>' + peiliaoFmt(r.人数) + '</td>' +
            '<td>' + peiliaoFmt(round1(r.人效)) + '</td></tr>';
    });
    return '<h3 class="pl-section-title">人均 / 人效</h3>' +
        '<div class="table-container">' +
        '<table class="data-table peiliao-renxiao-table">' +
        '<thead><tr>' +
        '<th>配料区</th><th>配料</th><th>人数</th><th>人效</th>' +
        '</tr></thead><tbody>' + rows + '</tbody></table></div>';
}

// 搜索过滤：匹配配料区或工位
function bindPeiliaoFilter(data) {
    var input = document.getElementById('peiliao-filter');
    if (!input) return;
    input.oninput = function () {
        var q = (input.value || '').trim().toLowerCase();
        var tbody = document.querySelector('#peiliao-content .peiliao-table tbody');
        if (!tbody) return;
        var areaHasVisible = {};
        var stationAreas = {};

        // 用 station_shift 建立匹配关系（受当前区/班次筛选约束）
        (data.station_shift || []).forEach(function (r) {
            if (PL_STATE.area !== 'ALL' && r.area !== PL_STATE.area) return;
            if (PL_STATE.shift !== 'ALL' && r.shift !== PL_STATE.shift) return;
            var areaKey = (r.area || '').toLowerCase();
            var stKey = (r.station || '').toLowerCase();
            var amatch = q === '' || areaKey.indexOf(q) >= 0;
            var smatch = q === '' || stKey.indexOf(q) >= 0;
            if (amatch || smatch) areaHasVisible[r.area] = true;
            stationAreas[r.station] = r.area;
        });

        Array.prototype.forEach.call(tbody.rows, function (tr) {
            var area = tr.getAttribute('data-area');
            var station = tr.getAttribute('data-station');
            var show = true;
            if (q !== '') {
                if (area) {
                    show = !!areaHasVisible[area];
                } else if (station) {
                    var a = stationAreas[station];
                    show = !!areaHasVisible[a || ''];
                } else {
                    show = false;
                }
            }
            tr.style.display = show ? '' : 'none';
        });
    };
}

function findAreaByStation(data, station) {
    for (var i = 0; i < data.areas.length; i++) {
        var a = data.areas[i];
        for (var j = 0; j < (a.stations || []).length; j++) {
            if (a.stations[j].station === station) return a;
        }
    }
    return null;
}
