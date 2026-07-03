/* ===== Tab2：排序零件GKB查询（密码保护） ===== */

var GKB_PASSWORD = 'Smpv2';

function initPartTable() {
    var tabContent = document.getElementById('main-tab-part');
    if (!tabContent) return;

    // 密码未验证：清空内容，显示密码遮罩（占满整个Tab区域）
    if (sessionStorage.getItem('gkb_verified') !== 'true') {
        tabContent.innerHTML =
            '<div class="plan-password-overlay">' +
                '<div class="plan-password-box">' +
                    '<div class="plan-password-icon">&#128274;</div>' +
                    '<h3>排序零件GKB查询</h3>' +
                    '<p style="font-size:13px;color:#999;margin-bottom:20px;">请输入密码查看数据</p>' +
                    '<div class="plan-password-input-wrap">' +
                        '<input type="password" id="gkb-password-input" placeholder="请输入密码" ' +
                            'onkeydown="if(event.key===\'Enter\')checkGkbPassword()">' +
                    '</div>' +
                    '<button class="plan-password-btn" onclick="checkGkbPassword()">确认</button>' +
                    '<div id="gkb-password-error" class="plan-password-error"></div>' +
                '</div>' +
            '</div>';

        // 聚焦
        setTimeout(function() {
            var inp = document.getElementById('gkb-password-input');
            if (inp) inp.focus();
        }, 100);
        return;
    }

    // 已验证：重建完整UI（搜索栏 + 表格）
    buildGkbFullUi(tabContent);
    bindPartSearch();

    if (window.PART_DATA && window.PART_DATA.data) {
        renderPartTable();
    } else {
        var tb = document.getElementById('part-tbody');
        if (tb) tb.innerHTML =
            '<tr><td colspan="4" class="empty-state">暂无排序零件GKB查询数据<br>请先在工具中导入零件属性 ZIP 文件</td></tr>';
    }
}

// 重建完整UI
function buildGkbFullUi(parent) {
    parent.innerHTML =
        '<div id="part-update-time" style="font-size:12px;color:#999;margin-bottom:8px;"></div>' +
        '<div class="search-bar">' +
            '<div class="search-input-wrapper">' +
                '<input type="text" id="part-search-input" placeholder="输入零件编码 / 名称 / GKB 进行搜索...">' +
                '<span class="search-icon" id="gkb-search-icon">&#128269;</span>' +
            '</div>' +
            '<div class="search-stats">共 <strong id="part-total-count">0</strong> 条，显示 <strong id="part-visible-count">0</strong> 条</div>' +
        '</div>' +
        '<div class="part-table-container" id="part-container">' +
            '<div class="part-table-header"><h2>排序零件 GKB 查询结果</h2><span class="data-badge" id="part-source-badge"></span></div>' +
            '<div class="part-table-wrapper">' +
                '<table class="part-table">' +
                    '<thead><tr><th style="width:50px;">#</th><th style="width:140px;">零件编码</th><th>零件名称</th><th style="width:100px;">GKB</th></tr></thead>' +
                    '<tbody id="part-tbody"></tbody>' +
                '</table>' +
            '</div>' +
        '</div>';

    // 更新时间
    if (window.PART_DATA && window.PART_DATA.generated_at) {
        document.getElementById('part-update-time').innerHTML = '数据更新：' + window.PART_DATA.generated_at;
    }
}

function checkGkbPassword() {
    var input = document.getElementById('gkb-password-input');
    var error = document.getElementById('gkb-password-error');
    if (!input || !error) return;

    if (input.value === GKB_PASSWORD) {
        sessionStorage.setItem('gkb_verified', 'true');
        initPartTable();  // 重建完整UI
    } else {
        error.textContent = '密码错误，请重试';
        input.value = '';
        input.focus();
    }
}

function bindPartSearch() {
    var searchInput = document.getElementById('part-search-input');
    if (searchInput && !searchInput._inputListenerAdded) {
        searchInput.addEventListener('input', searchParts);
        searchInput._inputListenerAdded = true;
    }
    var searchIcon = document.querySelector('#main-tab-part .search-icon');
    if (searchIcon && !searchIcon._clickListenerAdded) {
        searchIcon.addEventListener('click', function() { searchParts(); if (searchInput) searchInput.focus(); });
        searchIcon._clickListenerAdded = true;
        searchIcon.style.cursor = 'pointer';
    }
}

function renderPartTable() {
    if (!window.PART_DATA || !window.PART_DATA.data) { initPartTable(); return; }
    var data = window.PART_DATA.data;
    var tbody = document.getElementById('part-tbody');
    if (!tbody) return;

    var badge = document.getElementById('part-source-badge');
    if (badge && window.PART_DATA.source_file) badge.textContent = '来源: ' + window.PART_DATA.source_file;

    tbody.innerHTML = '';
    var BATCH = 50, idx = 0;
    function appendBatch() {
        var frag = document.createDocumentFragment(), end = Math.min(idx + BATCH, data.length);
        for (; idx < end; idx++) {
            var row = data[idx], code = (row['零件编码'] || '').trim(),
                name = (row['零件名称'] || '').trim(), gkb = (row['GKB'] || '').trim();
            var tr = document.createElement('tr');
            tr.setAttribute('data-code', code.toLowerCase());
            tr.setAttribute('data-name', name);
            tr.setAttribute('data-gkb', gkb);
            tr.innerHTML = '<td>' + (idx + 1) + '</td><td class="part-code-cell">' + escapeHtml(code) +
                '</td><td>' + escapeHtml(name) + '</td><td>' + escapeHtml(gkb) + '</td>';
            frag.appendChild(tr);
        }
        tbody.appendChild(frag);
        var te = document.getElementById('part-total-count'), ve = document.getElementById('part-visible-count');
        if (te) te.textContent = data.length; if (ve) ve.textContent = idx;
        if (idx < data.length) setTimeout(appendBatch, 0);
    }
    appendBatch();
}

function searchParts() {
    var q = (document.getElementById('part-search-input').value || '').trim().toLowerCase();
    var tbody = document.getElementById('part-tbody'); if (!tbody) return;
    var rows = tbody.getElementsByTagName('tr'), visible = 0;
    for (var i = 0; i < rows.length; i++) {
        var c = rows[i].getAttribute('data-code') || '', n = rows[i].getAttribute('data-name') || '',
            g = rows[i].getAttribute('data-gkb') || '';
        if (!q || c.indexOf(q) !== -1 || n.toLowerCase().indexOf(q) !== -1 || g.toLowerCase().indexOf(q) !== -1) {
            rows[i].style.display = ''; visible++;
        } else { rows[i].style.display = 'none'; }
    }
    var v = document.getElementById('part-visible-count'); if (v) v.textContent = visible;
}
