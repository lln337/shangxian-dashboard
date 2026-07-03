/* ===== Tab4：零件计划查询（密码保护） ===== */

// 密码常量（区分大小写）
var PLAN_PASSWORD = 'Smpv2';

function initPlanTab() {
    var container = document.getElementById('plan-container');
    if (!container) return;

    // 检查是否已验证密码
    if (sessionStorage.getItem('plan_verified') === 'true') {
        renderPlanContainer();
        return;
    }

    // 显示密码界面
    container.innerHTML =
        '<div class="plan-password-overlay">' +
            '<div class="plan-password-box">' +
                '<div class="plan-password-icon">&#128274;</div>' +
                '<h3>零件计划查询</h3>' +
                '<p>请输入密码查看数据</p>' +
                '<div class="plan-password-input-wrap">' +
                    '<input type="password" id="plan-password-input" placeholder="请输入密码" ' +
                        'onkeydown="if(event.key===\'Enter\')checkPlanPassword()">' +
                '</div>' +
                '<button class="plan-password-btn" onclick="checkPlanPassword()">确认</button>' +
                '<div id="plan-password-error" class="plan-password-error"></div>' +
            '</div>' +
        '</div>';

    // 自动聚焦输入框
    setTimeout(function() {
        var input = document.getElementById('plan-password-input');
        if (input) input.focus();
    }, 100);
}

function checkPlanPassword() {
    var input = document.getElementById('plan-password-input');
    var error = document.getElementById('plan-password-error');
    if (!input || !error) return;

    if (input.value === PLAN_PASSWORD) {
        sessionStorage.setItem('plan_verified', 'true');
        renderPlanContainer();
    } else {
        error.textContent = '密码错误，请重试';
        input.value = '';
        input.focus();
    }
}

function renderPlanContainer() {
    var container = document.getElementById('plan-container');
    if (!container) return;

    // 渲染表格框架
    container.innerHTML =
        '<div id="plan-update-time" style="font-size:12px;color:#999;margin-bottom:8px;"></div>' +
        '<div class="search-bar">' +
            '<div class="search-input-wrapper">' +
                '<input type="text" id="plan-search-input" placeholder="输入供应商名称 / 代码 / 负责人进行搜索...">' +
                '<span class="search-icon" id="plan-search-icon">&#128269;</span>' +
            '</div>' +
            '<div class="search-stats">' +
                '共 <strong id="plan-total-count">0</strong> 条，' +
                '显示 <strong id="plan-visible-count">0</strong> 条' +
            '</div>' +
        '</div>' +
        '<div class="plan-table-container">' +
            '<div class="plan-table-header">' +
                '<h2>基地计划执行分工</h2>' +
                '<span class="data-badge" id="plan-source-badge"></span>' +
            '</div>' +
            '<div class="plan-table-wrapper">' +
                '<table class="plan-table">' +
                    '<thead>' +
                        '<tr>' +
                            '<th style="width:50px;">#</th>' +
                            '<th style="width:120px;">供应商代码</th>' +
                            '<th>供应商名称</th>' +
                            '<th style="width:100px;">负责人</th>' +
                        '</tr>' +
                    '</thead>' +
                    '<tbody id="plan-tbody"></tbody>' +
                '</table>' +
            '</div>' +
        '</div>';

    // 绑定搜索事件
    bindPlanSearch();

    // 加载数据
    if (typeof dataLoader !== 'undefined') {
        dataLoader.loadPlanData().then(function(data) {
            if (data && data.data) {
                renderPlanTable();
            } else {
                var tbody = document.getElementById('plan-tbody');
                if (tbody) {
                    tbody.innerHTML = '<tr><td colspan="4" class="empty-state">暂无数据</td></tr>';
                }
            }
        });
    }
}

function bindPlanSearch() {
    var searchInput = document.getElementById('plan-search-input');
    if (searchInput && !searchInput._listenerAdded) {
        searchInput.addEventListener('input', searchPlan);
        searchInput._listenerAdded = true;
    }
    var searchIcon = document.getElementById('plan-search-icon');
    if (searchIcon && !searchIcon._listenerAdded) {
        searchIcon.addEventListener('click', function() {
            searchPlan();
            var inp = document.getElementById('plan-search-input');
            if (inp) inp.focus();
        });
        searchIcon._listenerAdded = true;
        searchIcon.style.cursor = 'pointer';
    }
}

function renderPlanTable() {
    if (!window.PLAN_DATA || !window.PLAN_DATA.data) {
        initPlanTab();
        return;
    }

    var data = window.PLAN_DATA.data;
    var tbody = document.getElementById('plan-tbody');
    if (!tbody) return;

    // 更新统计
    var totalEl = document.getElementById('plan-total-count');
    if (totalEl) totalEl.textContent = data.length;

    // 更新数据源信息
    var badge = document.getElementById('plan-source-badge');
    if (badge && window.PLAN_DATA.source_file) {
        badge.textContent = '来源: ' + window.PLAN_DATA.source_file;
    }
    var timeEl = document.getElementById('plan-update-time');
    if (timeEl && window.PLAN_DATA.generated_at) {
        timeEl.innerHTML = '数据更新：' + window.PLAN_DATA.generated_at;
    }

    // 惰性渲染：每批 50 条
    tbody.innerHTML = '';
    var BATCH = 50;
    var idx = 0;

    function appendBatch() {
        var frag = document.createDocumentFragment();
        var end = Math.min(idx + BATCH, data.length);
        for (; idx < end; idx++) {
            var row = data[idx];
            var code = (row['供应商代码'] || '').trim();
            var name = (row['供应商名称'] || '').trim();
            // 负责人列的 key 是动态日期列名（如 "20260701"），取不在前三列的列
            var resp = '';
            var keys = Object.keys(row);
            for (var k = 0; k < keys.length; k++) {
                if (keys[k] !== '序号' && keys[k] !== '供应商代码' && keys[k] !== '供应商名称') {
                    resp = (row[keys[k]] || '').trim();
                    break;
                }
            }

            var tr = document.createElement('tr');
            tr.setAttribute('data-code', code.toLowerCase());
            tr.setAttribute('data-name', name);
            tr.setAttribute('data-resp', resp);
            tr.innerHTML =
                '<td>' + (idx + 1) + '</td>' +
                '<td>' + escapeHtml(code) + '</td>' +
                '<td>' + escapeHtml(name) + '</td>' +
                '<td>' + escapeHtml(resp) + '</td>';
            frag.appendChild(tr);
        }
        tbody.appendChild(frag);

        var visibleEl = document.getElementById('plan-visible-count');
        if (visibleEl) visibleEl.textContent = idx;

        if (idx < data.length) {
            setTimeout(appendBatch, 0);
        }
    }

    appendBatch();
}

function searchPlan() {
    var input = document.getElementById('plan-search-input');
    if (!input) return;
    var q = input.value.trim().toLowerCase();
    var tbody = document.getElementById('plan-tbody');
    if (!tbody) return;
    var rows = tbody.getElementsByTagName('tr');
    var visible = 0;

    for (var i = 0; i < rows.length; i++) {
        var code = rows[i].getAttribute('data-code') || '';
        var name = rows[i].getAttribute('data-name') || '';
        var resp = rows[i].getAttribute('data-resp') || '';

        if (!q ||
            code.indexOf(q) !== -1 ||
            name.toLowerCase().indexOf(q) !== -1 ||
            resp.toLowerCase().indexOf(q) !== -1) {
            rows[i].style.display = '';
            visible++;
        } else {
            rows[i].style.display = 'none';
        }
    }

    var visibleEl = document.getElementById('plan-visible-count');
    if (visibleEl) visibleEl.textContent = visible;
}

// 安全网：脚本加载后立即绑定搜索
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindPlanSearch);
} else {
    bindPlanSearch();
}

// 页面加载时不自动初始化，由 switchMainTab() 触发
