'use strict';
// 引入必要的Node.js内置模块
import http from 'http';
import https from 'https';
import NET from 'net';
import zlib from 'zlib'; // 压缩解压模块
import PK from '../../package.json' with { type: 'json' };
import { PassThrough } from 'stream'; // 流处理模块
import { Cookies } from './cookies.js';

const MAX_REDIRECTS = 5;             // 最大重定向次数常量


// 错误处理函数(fetchRes: 响应流)
function _handleError(fetchRes, error, url) {
    error.type = 'FETCH', error.sourceUrl = url, fetchRes.emit('error', error);
}

// 标记请求完成并返回错误
function _markFinishedWithError(finishedFlag, fetchRes, error, url) {
    if (finishedFlag.value) return;
    finishedFlag.value = true, _handleError(fetchRes, error, url);
}

// 解析URL函数
function _parseUrl(url, fetchRes) {
    try {
        return { success: true, result: new URL(url) };
    } catch (error) {
        _handleError(fetchRes, error, url);
        return { success: false, error };
    }
}

// 处理请求体函数
function _processRequestBody(options, url, fetchRes, finishedFlag) {
    let processedBody = null;
    const { contentType, body, headers } = options;

    // 设置内容类型（除非明确禁止）
    if (contentType !== false) headers['Content-Type'] = contentType || 'application/x-www-form-urlencoded';

    // 流式数据处理
    if (typeof body?.pipe === 'function') {
        headers['Transfer-Encoding'] = 'chunked';
        processedBody = body;
        processedBody.on('error', err => _markFinishedWithError(finishedFlag, fetchRes, err, url));
    }
    // 非流式数据处理
    else {
        try {
            if (body instanceof Buffer) processedBody = body;
            else if (typeof body === 'object')
                // 对象转 URL 编码字符串
                processedBody = Buffer.from(Object.entries(body)
                    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v.toString().trim())}`).join('&'));
            else processedBody = Buffer.from(String(body).trim()); // 字符串处理

            headers['Content-Length'] = processedBody.length; // 设置内容长度
        } catch (error) {
            _handleError(fetchRes, error, url);
            return { success: false, error };
        }
    }

    return { success: true, body: processedBody };
}

// 处理重定向函数
function _handleRedirect(res, url, options, fetchRes, finishedFlag, req) {
    if (![301, 302, 303, 307, 308].includes(res.statusCode) || !res.headers.location) return false;

    options.redirects++;
    // 如果超过最大重定向次数, 则返回错误
    if (options.redirects > options.maxRedirects) {
        const err = new Error('超过最大重定向次数');
        _markFinishedWithError(finishedFlag, fetchRes, err, url), req.destroy();
        return true;
    }

    // 准备重定向请求（GET方法，无请求体）
    options.method = 'GET', options.body = false;

    try {
        const redirectUrl = new URL(res.headers.location, url).toString(); // 重定向URL为绝对URL
        nmfetch(redirectUrl, options);
        return true;
    } catch (error) {
        _markFinishedWithError(finishedFlag, fetchRes, error, url);
        return true;
    }
}

/**
 * 执行 HTTP/HTTPS 请求，支持重定向、Cookie 管理、请求体处理、响应解压等功能。
 *
 * @param {string} url - 请求的目标 URL。
 * @param {Object} [options={}] - 可选配置对象。
 * @param {stream.Writable} [options.fetchRes] - 用于写入响应数据的可写流，默认创建一个 PassThrough 流。
 * @param {Cookies|Array|string} [options.cookies] - Cookie 管理器实例、Cookie 字符串数组或单个 Cookie 字符串，用于自动管理请求和响应的 Cookie。
 * @param {number} [options.redirects=0] - 已发生的重定向次数（内部使用）。
 * @param {number} [options.maxRedirects] - 允许的最大重定向次数，默认为 MAX_REDIRECTS 常量。
 * @param {string} [options.method=''] - HTTP 请求方法（如 'GET'、'POST' 等），不提供时若存在请求体则默认为 'POST'，否则为 'GET'。
 * @param {Object} [options.headers] - 自定义请求头对象，键名会转为小写。
 * @param {string} [options.userAgent] - 自定义 User-Agent，会覆盖默认值。
 * @param {Object} [options.tls] - TLS/SSL 相关选项，直接传递给底层请求的 tls 配置。
 * @param {number} [options.timeout] - 请求超时时间（毫秒），超时后触发错误并销毁请求。
 * @param {*} [options.body] - 请求体内容，可以是字符串、Buffer 或可读流；若存在且 method 未指定，则方法自动设为 'POST'。
 * @param {boolean} [options.allowErrorResponse=false] - 是否允许状态码 ≥300 的响应被视为成功，若为 false 则触发错误。
 *
 * @returns {stream.Writable} 返回用于接收响应数据的可写流（通常为 PassThrough 实例），可通过监听 'finish' 或 'error' 事件获取结果。
 */
function nmfetch(url, options = {}) {
    const { fetchRes: fetchRes_, cookies, redirects = 0, maxRedirects, method = '', headers: headers_, userAgent, } = options,
        // 设置默认响应流、Cookie管理器和重定向计数器
        fetchRes = fetchRes_ || new PassThrough(), newCookies = cookies || new Cookies();
    options.redirects = redirects, options.maxRedirects = isNaN(maxRedirects) ? MAX_REDIRECTS : maxRedirects;

    // 处理传入的Cookie选项
    if (newCookies) [].concat(newCookies).forEach(cookie => newCookies.set(cookie, url)), options.cookies = false;

    // 解析URL
    const parsedResult = _parseUrl(url, fetchRes);
    if (!parsedResult.success) return fetchRes;
    const { protocol, hostname: host, pathname, search = '', port, username, password } = parsedResult.result;

    // 确定HTTP方法，默认为GET
    let newMethod = method.toString().trim().toUpperCase() || 'GET';
    const handler = protocol === 'https:' ? https : http,
        // 设置默认请求头
        headers = { 'accept-encoding': 'gzip,deflate', 'user-agent': 'flun-mail/' + PK.version };

    // 合并用户自定义头部
    Object.keys(headers_ || {}).forEach(key => headers[key.toLowerCase().trim()] = headers_[key]);

    if (userAgent) headers['user-agent'] = userAgent; // 设置自定义User-Agent（如果提供）
    // 如果URL中包含认证信息，则设置Authorization头
    if (username || password) {
        const auth = `${username}:${password}`;
        headers.Authorization = `Basic ${Buffer.from(auth).toString('base64')}`;
    }

    const cookie = newCookies.get(url);
    if (cookie) headers.cookie = cookie;              // 获取并设置Cookie(如果有)

    // 处理请求体(使用对象包装finished标志,便于在函数间传递引用)
    const finishedFlag = { value: false }, bodyResult = _processRequestBody(options, url, fetchRes, finishedFlag);
    if (!bodyResult.success) return fetchRes;
    newMethod = newMethod || 'POST'; // 默认 POST 方法
    const { tls, timeout } = options;
    let req;
    // 配置请求选项
    const reqOptions = {
        method: newMethod, host, path: pathname + search, port: port ? port : protocol === 'https:' ? 443 : 80, headers,
        rejectUnauthorized: false, agent: false // 不验证SSL证书,不使用连接池
    };

    if (tls) Object.assign(reqOptions, tls);    // 合并TLS选项
    // 处理HTTPS协议的SNI
    if (protocol === 'https:' && host && !NET.isIP(host) && !reqOptions.servername) reqOptions.servername = host;

    // 创建请求对象
    try {
        req = handler.request(reqOptions);
    } catch (error) {
        setImmediate(() => _markFinishedWithError(finishedFlag, fetchRes, error, url));
        return fetchRes;
    }

    // 设置超时处理
    if (timeout) {
        req.setTimeout(timeout, () => {
            const err = new Error('Request Timeout');
            _markFinishedWithError(finishedFlag, fetchRes, err, url), req.destroy();
        });
    }
    // 处理请求错误和响应
    req.on('error', err => _markFinishedWithError(finishedFlag, fetchRes, err, url))
    on('response', res => {
        let inflate; // 解压流
        if (finishedFlag.value) return;

        // 根据内容编码创建解压流
        switch (res.headers['content-encoding']) {
            case 'gzip':
            case 'deflate':
                inflate = zlib.createUnzip();
                break;
        }

        // 如果响应中的Set-Cookie头为真，则存储Cookie
        const setCookie = res.headers['set-cookie'];
        if (setCookie) [].concat(setCookie).forEach(cookie => newCookies.set(cookie, url));
        if (_handleRedirect(res, url, options, fetchRes, finishedFlag, req)) return; // 处理重定向

        fetchRes.statusCode = res.statusCode, fetchRes.headers = res.headers;       // 设置响应状态码和头部
        // 检查状态码是否允许
        if (res.statusCode >= 300 && !options.allowErrorResponse) {
            const err = new Error(`响应状态码无效:${res.statusCode}`);
            return _markFinishedWithError(finishedFlag, fetchRes, err, url), req.destroy();
        }

        // 处理响应错误
        res.on('error', err => {
            _markFinishedWithError(finishedFlag, fetchRes, err, url), req.destroy();
        });

        // 将响应流pipe到输出流，支持解压
        if (inflate) {
            res.pipe(inflate).pipe(fetchRes);
            inflate.on('error', err => {
                _markFinishedWithError(finishedFlag, fetchRes, err, url), req.destroy();
            });
        }
        else res.pipe(fetchRes);
    });

    // 发送请求体（如果有）
    setImmediate(() => {
        const body = bodyResult.body;
        if (body) {
            try {
                return (typeof body.pipe === 'function') ? body.pipe(req) : req.write(body);
            } catch (err) {
                return _markFinishedWithError(finishedFlag, fetchRes, err, url);
            }
        }
        req.end();
    });

    return fetchRes;
};

export { nmfetch };