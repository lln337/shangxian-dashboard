/* ===== 密码门模块 - 登录认证 + 会话管理 ===== */
/* 依赖: password-config.js, crypto-client.js（需先加载）*/

(function() {
    'use strict';

    var MAX_ATTEMPTS = 5;
    var LOCKOUT_TIME = 30000; // 锁定30秒
    var attemptCount = 0;
    var lockoutTimer = null;

    /**
     * 计算 SHA-256 哈希
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
     * 创建登录覆盖层 DOM
     */
    function createLoginOverlay() {
        // 如果已存在则跳过
        if (document.getElementById('login-overlay')) return;

        var overlay = document.createElement('div');
        overlay.id = 'login-overlay';
        overlay.innerHTML = [
            '<div class="login-box">',
            '  <div class="login-icon">&#128274;</div>',
            '  <h2>现场信息看板</h2>',
            '  <p class="login-subtitle">请输入密码访问</p>',
            '  <div class="login-input-group">',
            '    <input type="password" id="login-password" placeholder="输入密码" autofocus>',
            '    <button id="login-btn">登录</button>',
            '  </div>',
            '  <p id="login-error" class="login-error"></p>',
            '</div>'
        ].join('\n');

        // 样式
        var style = document.createElement('style');
        style.textContent = [
            '#login-overlay {',
            '  position: fixed; top: 0; left: 0; width: 100%; height: 100%;',
            '  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);',
            '  z-index: 999999; display: flex; align-items: center; justify-content: center;',
            '  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;',
            '}',
            '.login-box {',
            '  background: #ffffff; border-radius: 16px; padding: 40px 36px;',
            '  width: 360px; box-shadow: 0 20px 60px rgba(0,0,0,0.3);',
            '  text-align: center;',
            '}',
            '.login-icon { font-size: 48px; margin-bottom: 8px; }',
            '.login-box h2 { margin: 0 0 4px; color: #1a1a2e; font-size: 22px; }',
            '.login-subtitle { color: #888; margin: 0 0 24px; font-size: 14px; }',
            '.login-input-group { display: flex; gap: 8px; }',
            '#login-password {',
            '  flex: 1; padding: 12px 16px; border: 2px solid #e0e0e0; border-radius: 8px;',
            '  font-size: 15px; outline: none; transition: border-color 0.2s;',
            '}',
            '#login-password:focus { border-color: #4285f4; }',
            '#login-btn {',
            '  padding: 12px 24px; background: #4285f4; color: #fff; border: none;',
            '  border-radius: 8px; font-size: 15px; cursor: pointer; white-space: nowrap;',
            '  transition: background 0.2s;',
            '}',
            '#login-btn:hover { background: #3367d6; }',
            '#login-btn:disabled { background: #999; cursor: not-allowed; }',
            '.login-error { color: #ea4335; font-size: 13px; margin: 12px 0 0; min-height: 20px; }',
            '@media (prefers-color-scheme: dark) {',
            '  .login-box { background: #2d2d3f; }',
            '  .login-box h2 { color: #eee; }',
            '  .login-subtitle { color: #aaa; }',
            '  #login-password { background: #3d3d52; border-color: #4a4a5e; color: #eee; }',
            '}'
        ].join('\n');
        document.head.appendChild(style);

        document.body.insertBefore(overlay, document.body.firstChild);

        // 绑定事件
        var passwordInput = document.getElementById('login-password');
        var loginBtn = document.getElementById('login-btn');
        var errorEl = document.getElementById('login-error');

        function attemptLogin() {
            var password = passwordInput.value;
            if (!password) {
                errorEl.textContent = '请输入密码';
                return;
            }

            loginBtn.disabled = true;
            loginBtn.textContent = '验证中...';

            sha256(password).then(function(hash) {
                if (hash === window.DASHBOARD_PASSWORD_HASH) {
                    // 密码正确
                    errorEl.textContent = '';
                    onLoginSuccess(password);
                } else {
                    attemptCount++;
                    var remaining = MAX_ATTEMPTS - attemptCount;
                    if (remaining <= 0) {
                        errorEl.textContent = '错误次数过多，请30秒后重试';
                        loginBtn.disabled = true;
                        passwordInput.disabled = true;
                        lockoutTimer = setTimeout(function() {
                            attemptCount = 0;
                            loginBtn.disabled = false;
                            passwordInput.disabled = false;
                            passwordInput.value = '';
                            passwordInput.focus();
                            errorEl.textContent = '';
                        }, LOCKOUT_TIME);
                    } else {
                        errorEl.textContent = '密码错误，还剩 ' + remaining + ' 次机会';
                        loginBtn.disabled = false;
                        loginBtn.textContent = '登录';
                        passwordInput.value = '';
                        passwordInput.focus();
                    }
                }
            });
        }

        passwordInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') attemptLogin();
        });
        loginBtn.addEventListener('click', attemptLogin);

        setTimeout(function() { passwordInput.focus(); }, 100);
    }

    /**
     * 登录成功后的处理
     */
    function onLoginSuccess(password) {
        // 标记认证状态 + 保存密码（用于后续数据解密）
        sessionStorage.setItem('dashboard_auth', 'true');
        sessionStorage.setItem('dashboard_password', password);

        // 移除登录覆盖层
        var overlay = document.getElementById('login-overlay');
        if (overlay) {
            overlay.style.transition = 'opacity 0.3s';
            overlay.style.opacity = '0';
            setTimeout(function() {
                overlay.parentNode.removeChild(overlay);
            }, 300);
        }
    }

    /**
     * 检查是否需要显示密码门
     */
    function checkAuth() {
        // 配置未加载时直接放行（开发环境）
        if (!window.DASHBOARD_PASSWORD_HASH) {
            return;
        }

        // 已认证 → 放行
        if (sessionStorage.getItem('dashboard_auth') === 'true') {
            return;
        }

        // 显示密码门
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', createLoginOverlay);
        } else {
            createLoginOverlay();
        }
    }

    // 立即执行（尽早拦截页面渲染）
    checkAuth();
})();
