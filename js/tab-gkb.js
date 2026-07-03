/* ===== Tab2：排序零件GKB查询（密码保护） ===== */

var GKB_PASSWORD = 'Smpv2';

function initPartTable() {
    var container = document.getElementById('part-container');
    if (!container) return;

    // 密码未验证：确保密码遮罩存在且显示
    if (sessionStorage.getItem('gkb_verified') !== 'true') {
        // 如果还没有密码遮罩，创建它（只创建一次）
        var overlay = document.getElementById('gkb-password-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'gkb-password-overlay';
            overlay.className = 'plan-password-overlay';
            overlay.style.cssText =
                'position:absolute;top:0;left:0;right:0;bottom:0;' +
                'background:white;z-index:10;display:flex;' +
                'justify-content:center;align-items:center;border-radius:12px;';
            overlay.innerHTML =
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
                '</div>';
            container.style.position = 'relative';
            container.appendChild(overlay);
        } else {
            overlay.style.display = 'flex';
        }
        return;
    }

    // 已验证：隐藏密码遮罩，显示数据
    var overlay = document.getElementById('gkb-password-overlay');
    if (overlay) overlay.style.display = 'none';

    // 绑定搜索 + 渲染
    bindPartSearch();

    if (window.PART_DATA && window.PART_DATA.data) {
        renderPartTable();
    } else {
        var tbody = document.getElementById('part-tbody');
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="4" class="empty-state">' +
                '暂无排序零件GKB查询数据<br>请先在工具中导入零件属性 ZIP 文件</td></tr>';
        }
    }

    if (window.PART_DATA && window.PART_DATA.generated_at) {
        var el = document.getElementById('part-update-time');
        if (el) el.innerHTML = '数据更新：' + window.PART_DATA.generated_at;
    }
}

function checkGkbPassword() {
    var input = document.getElementById('gkb-password-input');
    var error = document.getElementById('gkb-password-error');
    if (!input || !error) return;

    if (input.value === GKB_PASSWORD) {
        sessionStorage.setItem('gkb_verified', 'true');
        // 重新初始化（这次会走已验证分支）
        initPartTable();
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
        searchIcon.addEventListener('click', function() {
            searchParts();
            if (searchInput) searchInput.focus();
        });
        searchIcon._clickListenerAdded = true;
        searchIcon.style.cursor = 'pointer';
    }
}

function renderPartTable() {
    if (!window.PART_DATA || !window.PART_DATA.data) {
        initPartTable();
        return;
    }

    var data = window.PART_DATA.data;
    var tbody = document.getElementById('part-tbody');
    if (!tbody) return;

    var badge = document.getElementById('part-source-badge');
    if (badge && window.PART_DATA.source_file) {
        badge.textContent = '来源: ' + window.PART_DATA.source_file;
    }

    tbody.innerHTML = '';
    var BATCH = 50;
    var idx = 0;

    function appendBatch() {
        var frag = document.createDocumentFragment();
        var end = Math.min(idx + BATCH, data.length);
        for (; idx < end; idx++) {
            var row = data[idx];
            var code = (row['零件编码'] || '').trim();
            var name = (row['零件名称'] || '').trim();
            var gkb = (row['GKB'] || '').trim();
            var tr = document.createElement('tr');
            tr.setAttribute('data-code', code.toLowerCase());
            tr.setAttribute('data-name', name);
            tr.setAttribute('data-gkb', gkb);
            tr.innerHTML =
                '<td>' + (idx + 1) + '</td>' +
                '<td class="part-code-cell">' + escapeHtml(code) + '</td>' +
                '<td>' + escapeHtml(name) + '</td>' +
                '<td>' + escapeHtml(gkb) + '</td>';
            frag.appendChild(tr);
        }
        tbody.appendChild(frag);

        var totalEl = document.getElementById('part-total-count');
        var visibleEl = document.getElementById('part-visible-count');
        if (totalEl) totalEl.textContent = data.length;
        if (visibleEl) visibleEl.textContent = idx;

        if (idx < data.length) {
            setTimeout(appendBatch, 0);
        }
    }

    appendBatch();
}

function searchParts() {
    var query = document.getElementById('part-search-input');
    if (!query) return;
    var q = query.value.trim().toLowerCase();
    var tbody = document.getElementById('part-tbody');
    if (!tbody) return;
    var rows = tbody.getElementsByTagName('tr');
    var visible = 0;

    for (var i = 0; i < rows.length; i++) {
        var code = rows[i].getAttribute('data-code') || '';
        var name = rows[i].getAttribute('data-name') || '';
        var gkb = rows[i].getAttribute('data-gkb') || '';

        if (!q || code.indexOf(q) !== -1 ||
            name.toLowerCase().indexOf(q) !== -1 ||
            gkb.toLowerCase().indexOf(q) !== -1) {
            rows[i].style.display = '';
            visible++;
        } else {
            rows[i].style.display = 'none';
        }
    }

    var visibleEl = document.getElementById('part-visible-count');
    if (visibleEl) visibleEl.textContent = visible;
}

// 安全网
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindPartSearch);
} else {
    bindPartSearch();
}
