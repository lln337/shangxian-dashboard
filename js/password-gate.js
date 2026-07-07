/* ===== 密码门模块 - 按需认证（仅敏感Tab需要） ===== */
/* 依赖: password-config.js, crypto-client.js（需先加载）*/

var PasswordGate = (function() {
    'use strict';

    var MAX_ATTEMPTS = 5;
    var LOCKOUT_TIME = 30000;
    var attemptCount = 0;
    var lockoutTimer = null;
    var pendingCallback = null;

    /**
     * SHA-256 哈希
     */
    function sha256(str) {
        var enc = new TextEncoder();
        return crypto.subtle.digest('SHA-256', enc.encode(str)).then(function(hash) {
            return Array.from(new Uint8Array(hash)).map(function(b) {
                return b.toString(16).padStart(2, '0');
            }).join('');
        });
    }

    /**
     * 检查是否已认证
     */
    function isAuthenticated() {
        return sessionStorage.getItem('dashboard_auth') === 'true';
    }

    /**
     * 创建密码弹窗
     */
    function createModal(callback) {
        if (document.getElementById('login-modal')) return;

        pendingCallback = callback;

        var modal = document.createElement('div');
        modal.id = 'login-modal';
        modal.innerHTML = [
            '<div class="modal-mask"></div>',
            '<div class="modal-box">',
            '  <div class="modal-inner">',
            '    <div class="modal-icon">&#128274;</div>',
            '    <h3>需要身份验证</h3>',
            '    <p>该Tab包含敏感数据，请输入密码</p>',
            '    <div class="modal-input-group">',
            '      <input type="password" id="modal-password" placeholder="输入密码" autofocus>',
            '      <button id="modal-btn">验证</button>',
            '    </div>',
            '    <p id="modal-error" class="modal-error"></p>',
            '  </div>',
            '</div>'
        ].join('\n');

        var style = document.createElement('style');
        style.textContent = [
            '#login-modal { position: fixed; top:0; left:0; width:100%; height:100%; z-index:99999; display:flex; align-items:center; justify-content:center; }',
            '.modal-mask { position:absolute; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.4); }',
            '.modal-box { position:relative; background:#fff; border-radius:12px; padding:32px; width:340px; box-shadow:0 12px 40px rgba(0,0,0,0.2); text-align:center; }',
            '.modal-icon { font-size:40px; margin-bottom:8px; }',
            '.modal-box h3 { margin:0 0 4px; color:#1a1a2e; font-size:18px; }',
            '.modal-box p { color:#888; margin:0 0 20px; font-size:13px; }',
            '.modal-input-group { display:flex; gap:8px; }',
            '#modal-password { flex:1; padding:10px 14px; border:2px solid #e0e0e0; border-radius:8px; font-size:14px; outline:none; }',
            '#modal-password:focus { border-color:#4285f4; }',
            '#modal-btn { padding:10px 20px; background:#4285f4; color:#fff; border:none; border-radius:8px; font-size:14px; cursor:pointer; }',
            '#modal-btn:hover { background:#3367d6; }',
            '#modal-btn:disabled { background:#999; cursor:not-allowed; }',
            '.modal-error { color:#ea4335; font-size:12px; margin:10px 0 0; min-height:18px; }',
            '@media (prefers-color-scheme: dark) {',
            '  .modal-box { background:#2d2d3f; }',
            '  .modal-box h3 { color:#eee; }',
            '  .modal-box p { color:#aaa; }',
            '  #modal-password { background:#3d3d52; border-color:#4a4a5e; color:#eee; }',
            '}'
        ].join('\n');
        document.head.appendChild(style);

        document.body.appendChild(modal);

        var input = document.getElementById('modal-password');
        var btn = document.getElementById('modal-btn');
        var err = document.getElementById('modal-error');

        function attemptLogin() {
            var pwd = input.value;
            if (!pwd) { err.textContent = '请输入密码'; return; }

            btn.disabled = true;
            btn.textContent = '验证中...';

            sha256(pwd).then(function(hash) {
                if (hash === window.DASHBOARD_PASSWORD_HASH) {
                    err.textContent = '';
                    sessionStorage.setItem('dashboard_auth', 'true');
                    sessionStorage.setItem('dashboard_password', pwd);
                    document.body.removeChild(modal);
                    if (typeof pendingCallback === 'function') {
                        var cb = pendingCallback;
                        pendingCallback = null;
                        cb();
                    }
                } else {
                    attemptCount++;
                    var remaining = MAX_ATTEMPTS - attemptCount;
                    if (remaining <= 0) {
                        err.textContent = '错误次数过多，请30秒后重试';
                        btn.disabled = true;
                        input.disabled = true;
                        lockoutTimer = setTimeout(function() {
                            attemptCount = 0;
                            btn.disabled = false;
                            input.disabled = false;
                            input.value = '';
                            input.focus();
                            err.textContent = '';
                        }, LOCKOUT_TIME);
                    } else {
                        err.textContent = '密码错误，还剩 ' + remaining + ' 次机会';
                        btn.disabled = false;
                        btn.textContent = '验证';
                        input.value = '';
                        input.focus();
                    }
                }
            });
        }

        input.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') attemptLogin();
        });
        btn.addEventListener('click', attemptLogin);
        setTimeout(function() { input.focus(); }, 100);
    }

    /**
     * 公开API：需要认证时调用
     * 已认证 → 立即执行callback
     * 未认证 → 弹出密码窗 → 成功后执行callback
     */
    function requireAuth(callback) {
        if (!window.DASHBOARD_PASSWORD_HASH) {
            if (callback) callback();
            return;
        }
        if (isAuthenticated()) {
            if (callback) callback();
            return;
        }
        createModal(callback);
    }

    return {
        requireAuth: requireAuth,
        isAuthenticated: isAuthenticated
    };
})();
