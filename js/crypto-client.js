/* ===== 前端加密模块 - AES-GCM 解密 ===== */
/* 依赖: password-config.js（需先加载）*/

const CryptoClient = (function() {
    'use strict';

    // 加密文件头标识（与 crypto_tool.py 一致）
    var ENC_HEADER = 'DASH';
    var SALT_SIZE = 16;
    var IV_SIZE = 12;

    /**
     * 从密码派生 AES-GCM 密钥
     * @param {string} password - 用户输入的密码
     * @param {Uint8Array} salt - PBKDF2 salt
     * @returns {Promise<CryptoKey>}
     */
    function deriveKey(password, salt) {
        var enc = new TextEncoder();
        var keyMaterial = enc.encode(password);
        return crypto.subtle.importKey(
            'raw', keyMaterial, 'PBKDF2', false, ['deriveKey']
        ).then(function(baseKey) {
            return crypto.subtle.deriveKey(
                {
                    name: 'PBKDF2',
                    salt: salt,
                    iterations: window.DASHBOARD_PBKDF2_ITER || 600000,
                    hash: 'SHA-256'
                },
                baseKey,
                { name: 'AES-GCM', length: 256 },
                false,
                ['decrypt']
            );
        });
    }

    /**
     * 解密 AES-GCM 加密数据
     * @param {ArrayBuffer} encryptedData - 完整加密数据（含header+salt+iv）
     * @param {string} password - 用户输入的密码
     * @returns {Promise<ArrayBuffer>} 解密后的明文
     */
    function decryptData(encryptedData, password) {
        var header = new Uint8Array(encryptedData, 0, 4);
        var headerStr = String.fromCharCode(header[0], header[1], header[2], header[3]);

        if (headerStr !== ENC_HEADER) {
            return Promise.reject(new Error('非加密数据'));
        }

        var salt = new Uint8Array(encryptedData, 4, SALT_SIZE);
        var iv = new Uint8Array(encryptedData, 4 + SALT_SIZE, IV_SIZE);
        var ciphertext = new Uint8Array(encryptedData, 4 + SALT_SIZE + IV_SIZE);

        return deriveKey(password, salt).then(function(key) {
            return crypto.subtle.decrypt(
                { name: 'AES-GCM', iv: iv },
                key,
                ciphertext
            );
        });
    }

    /**
     * 从 sessionStorage 获取密码
     * @returns {string|null}
     */
    function getPassword() {
        return sessionStorage.getItem('dashboard_password');
    }

    /**
     * 检查数据是否为加密格式
     * @param {ArrayBuffer} data
     * @returns {boolean}
     */
    function isEncrypted(data) {
        if (data.byteLength < 4) return false;
        var header = new Uint8Array(data, 0, 4);
        return String.fromCharCode(header[0], header[1], header[2], header[3]) === ENC_HEADER;
    }

    /**
     * 从 sessionStorage 获取已派生的密钥（避免重复推导）
     * @returns {string|null} base64 编码的密钥
     */
    function getStoredKey() {
        return sessionStorage.getItem('dashboard_crypto_key');
    }

    /**
     * 将密钥存入 sessionStorage
     * @param {string} keyBase64 - base64 编码的密钥
     */
    function storeKey(keyBase64) {
        sessionStorage.setItem('dashboard_crypto_key', keyBase64);
    }

    return {
        deriveKey: deriveKey,
        decryptData: decryptData,
        isEncrypted: isEncrypted,
        getPassword: getPassword
    };
})();
