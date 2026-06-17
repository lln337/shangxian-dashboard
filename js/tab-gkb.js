/* ===== Tab2：排序零件GKB查询 ===== */

function initPartTable() {
    // 如果数据已加载，直接渲染
    if (window.PART_DATA) {
        renderPartTable();
        return;
    }
    // 否则显示空状态
    const container = document.getElementById('part-container');
    if (container) {
        container.innerHTML =
            '<div class="empty-state">暂无排序零件GKB查询数据<br>请先在工具中导入零件属性 ZIP 文件</div>';
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
    tbody.innerHTML = '';

    for (let i = 0; i < data.length; i++) {
        const row = data[i];
        const code = (row['零件编码'] || '').trim();
        const name = (row['零件名称'] || '').trim();
        const gkb = (row['GKB'] || '').trim();
        const tr = document.createElement('tr');
        tr.setAttribute('data-code', code.toLowerCase());
        tr.setAttribute('data-name', name);
        tr.setAttribute('data-gkb', gkb);
        tr.innerHTML = '<td>' + (i + 1) + '</td>' +
            '<td class="part-code-cell">' + escapeHtml(code) + '</td>' +
            '<td>' + escapeHtml(name) + '</td>' +
            '<td>' + escapeHtml(gkb) + '</td>';
        tbody.appendChild(tr);
    }

    const totalEl = document.getElementById('part-total-count');
    const visibleEl = document.getElementById('part-visible-count');
    if (totalEl) totalEl.textContent = data.length;
    if (visibleEl) visibleEl.textContent = data.length;
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
        const gkb = rows[i].getAttribute('data-gkb') || '';

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

// 页面加载时不自动初始化，由 switchMainTab() 触发
    //（DOMContentLoaded 监听已统一放在 index.html 末尾）
