/* ===== Tab4：零件计划查询（密码保护） ===== */

var PLAN_PASSWORD = 'Smpv2';

function initPlanTab() {
    var container = document.getElementById('plan-container');
    if (!container) return;

    // 密码未验证
    if (sessionStorage.getItem('plan_verified') !== 'true') {
        var overlay = document.getElementById('plan-password-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'plan-password-overlay';
            overlay.className = 'plan-password-overlay';
            overlay.style.cssText =
                'min-height:350px;display:flex;justify-content:center;' +
                'align-items:center;background:white;';
            overlay.innerHTML =
                '<div class="plan-password-box">' +
                    '<div class="plan-password-icon">&#128274;</div>' +
                    '<h3>零件计划查询</h3>' +
                    '<p style="font-size:13px;color:#999;margin-bottom:20px;">请输入密码查看数据</p>' +
                    '<div class="plan-password-input-wrap">' +
                        '<input type="password" id="plan-password-input" placeholder="请输入密码" ' +
                            'onkeydown="if(event.key===\'Enter\')checkPlanPassword()">' +
                    '</div>' +
                    '<button class="plan-password-btn" onclick="checkPlanPassword()">确认</button>' +
                    '<div id="plan-password-error" class="plan-password-error"></div>' +
                '</div>';
            container.appendChild(overlay);
        } else {
            overlay.style.display = '';
            // 隐藏数据区
            var dataArea = document.getElementById('plan-data-area');
            if (dataArea) dataArea.style.display = 'none';
        }
        return;
    }

    // 已验证
    var overlay = document.getElementById('plan-password-overlay');
    if (overlay) overlay.style.display = 'none';

    // 确保数据区域存在
    ensurePlanDataArea(container);
    bindPlanSearch();

    if (window.PLAN_DATA && window.PLAN_DATA.data) {
        renderPlanTable();
    }
}

function checkPlanPassword() {
    var input = document.getElementById('plan-password-input');
    var error = document.getElementById('plan-password-error');
    if (!input || !error) return;

    if (input.value === PLAN_PASSWORD) {
        sessionStorage.setItem('plan_verified', 'true');
        initPlanTab();
    } else {
        error.textContent = '密码错误，请重试';
        input.value = '';
        input.focus();
    }
}

function ensurePlanDataArea(container) {
    if (!container) return;
    if (!document.getElementById('plan-tbody')) {
        container.appendChild(
            (function() {
                var d = document.createElement('div');
                d.id = 'plan-data-area';
                d.innerHTML =
                    '<div id="plan-update-time" style="font-size:12px;color:#999;margin-bottom:8px;"></div>' +
                    '<div class="search-bar">' +
                        '<div class="search-input-wrapper">' +
                            '<input type="text" id="plan-search-input" placeholder="输入供应商名称 / 代码 / 负责人进行搜索...">' +
                            '<span class="search-icon" id="plan-search-icon">&#128269;</span>' +
                        '</div>' +
                        '<div class="search-stats">共 <strong id="plan-total-count">0</strong> 条，显示 <strong id="plan-visible-count">0</strong> 条</div>' +
                    '</div>' +
                    '<div class="plan-table-container">' +
                        '<div class="plan-table-header"><h2>基地计划执行分工</h2><span class="data-badge" id="plan-source-badge"></span></div>' +
                        '<div class="plan-table-wrapper">' +
                            '<table class="plan-table">' +
                                '<thead><tr><th style="width:50px;">#</th><th style="width:120px;">供应商代码</th><th>供应商名称</th><th style="width:100px;">负责人</th></tr></thead>' +
                                '<tbody id="plan-tbody"></tbody>' +
                            '</table>' +
                        '</div>' +
                    '</div>';
                return d;
            })()
        );
    } else {
        var dataArea = document.getElementById('plan-data-area');
        if (dataArea) dataArea.style.display = '';
    }

    if (window.PLAN_DATA && window.PLAN_DATA.generated_at) {
        var el = document.getElementById('plan-update-time');
        if (el) el.innerHTML = '数据更新：' + window.PLAN_DATA.generated_at;
    }
}

function bindPlanSearch() {
    var searchInput = document.getElementById('plan-search-input');
    if (searchInput && !searchInput._listenerAdded) {
        searchInput.addEventListener('input', searchPlan);
        searchInput._listenerAdded = true;
    }
    var searchIcon = document.getElementById('plan-search-icon');
    if (searchIcon && !searchIcon._clickListenerAdded) {
        searchIcon.addEventListener('click', function() { searchPlan(); if (searchInput) searchInput.focus(); });
        searchIcon._clickListenerAdded = true;
        searchIcon.style.cursor = 'pointer';
    }
}

function renderPlanTable() {
    if (!window.PLAN_DATA || !window.PLAN_DATA.data) { initPlanTab(); return; }
    var data = window.PLAN_DATA.data;
    var tbody = document.getElementById('plan-tbody');
    if (!tbody) return;

    var badge = document.getElementById('plan-source-badge');
    if (badge && window.PLAN_DATA.source_file) badge.textContent = '来源: ' + window.PLAN_DATA.source_file;

    tbody.innerHTML = '';
    var BATCH = 50, idx = 0;

    function appendBatch() {
        var frag = document.createDocumentFragment();
        var end = Math.min(idx + BATCH, data.length);
        for (; idx < end; idx++) {
            var row = data[idx];
            var code = (row['供应商代码'] || '').trim();
            var name = (row['供应商名称'] || '').trim();
            var resp = '';
            var keys = Object.keys(row);
            for (var k = 0; k < keys.length; k++) {
                if (keys[k] !== '序号' && keys[k] !== '供应商代码' && keys[k] !== '供应商名称') {
                    resp = (row[keys[k]] || '').trim(); break;
                }
            }
            var tr = document.createElement('tr');
            tr.setAttribute('data-code', code.toLowerCase());
            tr.setAttribute('data-name', name);
            tr.setAttribute('data-resp', resp);
            tr.innerHTML = '<td>' + (idx + 1) + '</td><td>' + escapeHtml(code) + '</td><td>' + escapeHtml(name) + '</td><td>' + escapeHtml(resp) + '</td>';
            frag.appendChild(tr);
        }
        tbody.appendChild(frag);
        var totalEl = document.getElementById('plan-total-count'), visibleEl = document.getElementById('plan-visible-count');
        if (totalEl) totalEl.textContent = data.length;
        if (visibleEl) visibleEl.textContent = idx;
        if (idx < data.length) setTimeout(appendBatch, 0);
    }
    appendBatch();
}

function searchPlan() {
    var input = document.getElementById('plan-search-input');
    if (!input) return;
    var q = input.value.trim().toLowerCase();
    var tbody = document.getElementById('plan-tbody');
    if (!tbody) return;
    var rows = tbody.getElementsByTagName('tr'), visible = 0;
    for (var i = 0; i < rows.length; i++) {
        var c = rows[i].getAttribute('data-code') || '', n = rows[i].getAttribute('data-name') || '', r = rows[i].getAttribute('data-resp') || '';
        if (!q || c.indexOf(q) !== -1 || n.toLowerCase().indexOf(q) !== -1 || r.toLowerCase().indexOf(q) !== -1) {
            rows[i].style.display = ''; visible++;
        } else { rows[i].style.display = 'none'; }
    }
    var ve = document.getElementById('plan-visible-count');
    if (ve) ve.textContent = visible;
}
