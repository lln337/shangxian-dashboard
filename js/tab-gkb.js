/* ===== Tab2：排序零件GKB查询（密码保护） ===== */

var GKB_PASSWORD = 'Smpv2';

function initPartTable() {
    var container = document.getElementById('part-container');
    if (!container) return;

    // 密码检查
    if (sessionStorage.getItem('gkb_verified') !== 'true') {
        showGkbPasswordOverlay();
        return;
    }

    // 已验证密码，正常渲染
    bindPartSearch();
    if (window.PART_DATA) {
        renderPartTable();
        return;
    }
    container.innerHTML =
        '<div class="empty-state">暂无排序零件GKB查询数据<br>请先在工具中导入零件属性 ZIP 文件</div>';
}

function showGkbPasswordOverlay() {
    var container = document.getElementById('part-container');
    if (!container) return;

    // 隐藏搜索栏
    var searchBar = document.querySelector('.search-bar');
    if (searchBar) searchBar.style.display = 'none';
    var updateTime = document.getElementById('part-update-time');
    if (updateTime) updateTime.style.display = 'none';

    container.innerHTML =
        '<div class="plan-password-overlay">' +
            '<div class="plan-password-box">' +
                '<div class="plan-password-icon">&#128274;</div>' +
                '<h3>排序零件GKB查询</h3>' +
                '<p>请输入密码查看数据</p>' +
                '<div class="plan-password-input-wrap">' +
                    '<input type="password" id="gkb-password-input" placeholder="请输入密码" ' +
                        'onkeydown="if(event.key===\'Enter\')checkGkbPassword()">' +
                '</div>' +
                '<button class="plan-password-btn" onclick="checkGkbPassword()">确认</button>' +
                '<div id="gkb-password-error" class="plan-password-error"></div>' +
            '</div>' +
        '</div>';

    setTimeout(function() {
        var input = document.getElementById('gkb-password-input');
        if (input) input.focus();
    }, 100);
}

function checkGkbPassword() {
    var input = document.getElementById('gkb-password-input');
    var error = document.getElementById('gkb-password-error');
    if (!input || !error) return;

    if (input.value === GKB_PASSWORD) {
        sessionStorage.setItem('gkb_verified', 'true');
        // 恢复搜索栏显示
        var searchBar = document.querySelector('.search-bar');
        if (searchBar) searchBar.style.display = '';
        var updateTime = document.getElementById('part-update-time');
        if (updateTime) updateTime.style.display = '';
        // 重新初始化
        initPartTable();
    } else {
        error.textContent = '密码错误，请重试';
        input.value = '';
        input.focus();
    }
}

function bindPartSearch() {
    // 搜索框 input 事件
    const searchInput = document.getElementById('part-search-input');
    if (searchInput && !searchInput._inputListenerAdded) {
        searchInput.addEventListener('input', searchParts);
        searchInput._inputListenerAdded = true;
    }
    // 搜索图标点击事件：触发搜索（等价于 input 事件）
    const searchIcon = document.querySelector('.search-icon');
    if (searchIcon && !searchIcon._clickListenerAdded) {
        searchIcon.addEventListener('click', function() {
            searchParts();
            // 同时聚焦输入框
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

    const data = window.PART_DATA.data;
    const tbody = document.getElementById('part-tbody');
    if (!tbody) return;

    // 惰性渲染：每批 50 条，避免阻塞主线程
    tbody.innerHTML = '';
    const BATCH = 50;
    let idx = 0;

    function appendBatch() {
        const frag = document.createDocumentFragment();
        const end = Math.min(idx + BATCH, data.length);
        for (; idx < end; idx++) {
            const row  = data[idx];
            const code = (row['零件编码'] || '').trim();
            const name = (row['零件名称'] || '').trim();
            const gkb  = (row['GKB'] || '').trim();
            const tr   = document.createElement('tr');
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

        // 更新计数
        const totalEl   = document.getElementById('part-total-count');
        const visibleEl = document.getElementById('part-visible-count');
        if (totalEl)   totalEl.textContent   = data.length;
        if (visibleEl) visibleEl.textContent = idx;   // 已渲染条数

        if (idx < data.length) {
            setTimeout(appendBatch, 0);   // 让出主线程
        }
    }

    appendBatch();
}


function searchParts() {
    const query = document.getElementById('part-search-input');
    if (!query) return;
    const q = query.value.trim().toLowerCase();
    const tbody = document.getElementById('part-tbody');
    if (!tbody) return;
    const rows = tbody.getElementsByTagName('tr');
    let visible = 0;

    for (let i = 0; i < rows.length; i++) {
        const code = rows[i].getAttribute('data-code') || '';
        const name = rows[i].getAttribute('data-name') || '';
        const gkb  = rows[i].getAttribute('data-gkb') || '';

        if (!q || code.indexOf(q) !== -1 ||
            name.toLowerCase().indexOf(q) !== -1 ||
            gkb.toLowerCase().indexOf(q) !== -1) {
            rows[i].style.display = '';
            visible++;
        } else {
            rows[i].style.display = 'none';
        }
    }

    const visibleEl = document.getElementById('part-visible-count');
    if (visibleEl) visibleEl.textContent = visible;
}

// 安全网：脚本加载后立即绑定搜索（防止 initPartTable 未触发时搜索失效）
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindPartSearch);
} else {
    bindPartSearch();
}

// 页面加载时不自动初始化，由 switchMainTab() 触发
    //（DOMContentLoaded 监听已统一放在 index.html 末尾）
