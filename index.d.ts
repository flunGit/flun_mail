// index.d.ts
/**
 * 邮件发送模块 主要功能：
 * ```js
 * createTransport();   // 创建邮件传输器
 * validateConfig();    // 验证配置
 * ```
 * ---
 *   -
 * ```js
 *  // 发送邮件示例
 *  const mail = require('flun-mail'),
 *  { env } = require('flun-env'), // 注意:flun-env需自行安装
 *
 *  // 请根据您的邮箱服务商修改以下配置
 *  transporter = mail.createTransport({
 *      host: 'smtp.189.cn',  // 邮箱服务商SMTP服务器地址
 *      port: 465,            // 端口号
 *      secure: true,         // 是否使用SSL/TLS
 *      // 认证信息
 *      auth: {
 *          user: 'abc@189.cn', // 你的邮箱地址
 *          pass: env.MAIL_PWD  // 邮箱密码
 *      }
 *  });
 *
 *  // 发送
 *  transporter.sendMail({
 *      from: 'abc@189.cn',        // 发件人
 *      to: 'xyz@189.cn',          // 收件人
 *      subject: '测试邮件',        // 邮件主题
 *      text: '纯文本测试',         // 纯文本内容
 *      html: '<b>html格式测试</b>' // HTML内容（可选;注:html内容优先级高于纯文本内容）
 *  }, (error, info) => {
 *      if (error) console.error('发送失败:', error);
 *      else console.log('发送成功:', info.response);
 *  });
 * ```
 *   -
 */
declare module 'flun-mail' {
    // ==================== 模块依赖 ====================
    import { EventEmitter } from 'events';

    // ==================== 核心导出函数 ====================

    /**
     * 创建邮件传输器
     *
     * 根据配置自动选择合适的传输器类型：
     * - 启用连接池: pool=true -> SmtpPool
     * - 启用sendmail: sendmail=true或字符串 -> SendmailTransport
     * - 启用流传输: streamTransport=true -> StreamTransport
     * - 启用JSON传输: jsonTransport=true -> JsonTransport
     * - 配置SES: SES对象存在 -> SesTransport
     * - 默认: 标准SMTP传输器
     *
     * @param transporter 传输器配置对象、连接URL字符串或已创建的传输器实例
     * @param defaults 默认邮件选项
     * @returns Mail实例
     *
     * @example
     * ```javascript
     * // SMTP传输器
     * const smtpTransporter = createTransport({
     *     host: 'smtp.example.com',
     *     port: 465,
     *     secure: true,
     *     auth: {
     *         user: 'user@example.com',
     *         pass: 'password'
     *     }
     * });
     *
     * // 连接URL方式
     * const urlTransporter = createTransport('smtps://user:pass@smtp.example.com:465');
     * ```
     */
    export function createTransport(transporter: TransportConfig, defaults?: MailData): Mail;

    /**
     * 验证邮件配置
     *
     * 验证传入的配置对象是否有效，返回包含验证状态、错误和警告信息的对象
     *
     * @param config 要验证的配置对象或URL字符串
     * @returns 验证结果对象
     *
     * @example
     * ```javascript
     * const result = validateConfig({
     *     host: 'smtp.example.com',
     *     port: 465,
     *     auth: { user: 'test@example.com' }
     * });
     *
     * if (result.valid) {
     *     console.log('配置有效');
     * } else {
     *     console.error('配置错误:', result.errors);
     * }
     * ```
     */
    export function validateConfig(config: any): ValidationResult;

    // ==================== 通用类型定义 ====================

    /**
     * 传输器配置类型
     * 可以是：连接URL字符串、具体的配置对象或已创建的传输器实例
     */
    export type TransportConfig = string | SpecificTransportConfig | Transporter;

    /**
     * 所有具体传输器配置的联合类型
     * 用于区分不同类型的传输器配置
     */
    export type SpecificTransportConfig = | SmtpConfig | SmtpPoolConfig | SendmailConfig | StreamTransportConfig
        | JsonTransportConfig | SesTransportConfig;

    /**
     * 传输器接口
     */
    export interface Transporter {
        /** 发送邮件方法 */
        send(mail: MailMessage, callback: (err: Error | null, info: SentMessageInfo) => void): void;
        /** 事件监听方法 */
        on(event: string, listener: (...args: any[]) => void): this;
        /** 关闭连接方法 */
        close?(): void | Promise<void>;
        /** 检查是否空闲 */
        isIdle?(): boolean;
        /** 验证连接 */
        verify?(callback?: (error: Error | null, success?: boolean) => void): void | Promise<boolean>;
        /** 传输器名称 */
        name?: string;
        /** 传输器版本 */
        version?: string;
        /** 关联的Mail实例 */
        mailer?: Mail;
        /** 配置选项 */
        options?: SpecificTransportConfig;
        /** 日志记录器 */
        logger?: Logger;
    }

    /**
     * 邮件发送结果
     */
    export interface SentMessageInfo {
        /** 消息ID */
        messageId: string;
        /** 响应消息 */
        message?: string | object;
        /** 原始响应 */
        response?: string;
        /** 收件人列表 */
        accepted?: string[];
        /** 被拒绝的收件人列表 */
        rejected?: string[];
        /** 等待的收件人列表 */
        pending?: string[];
        /** 信封信息 */
        envelope?: {
            from: string;
            to: string[];
        };
    }

    /**
     * 配置验证结果
     */
    export interface ValidationResult {
        /** 验证是否通过 */
        valid: boolean;
        /** 错误信息列表 */
        errors: string[];
        /** 警告信息列表 */
        warnings?: string[];
    }

    // ==================== 核心类定义 ====================

    /**
     * 邮件主类
     *
     * 邮件发送的核心类，管理传输器实例并提供邮件发送功能
     */
    export class Mail {
        constructor(transporter: Transporter, options?: SpecificTransportConfig, defaults?: MailData);

        /** 选项配置 */
        options: SpecificTransportConfig;
        /** 默认配置 */
        _defaults: MailData;
        /** 传输器实例 */
        transporter: Transporter;
        /** 日志记录器 */
        logger: Logger;
        /** DKIM实例 */
        dkim: DKIM;
        /** 元数据存储 */
        meta: Map<string, any>;

        /**
         * 发送邮件
         * @param data 邮件数据
         * @param callback 回调函数（可选）
         * @returns Promise<SentMessageInfo>
         */
        sendMail(data: MailData, callback?: (err: Error | null, info: SentMessageInfo) => void): Promise<SentMessageInfo>;

        /** 使用插件 */
        use(step: 'compile' | 'stream', plugin: (mail: MailMessage, callback: (err?: Error) => void) => void): this;
        /** 获取版本字符串 */
        getVersionString(): string;
        /** 设置代理 */
        setupProxy(proxyUrl: string): void;
        /** 设置元数据 */
        set(key: string, value: any): this;
        /** 获取元数据 */
        get(key: string): any;
        /** 关闭传输器 */
        close(): void | boolean | Promise<void>;
        /** 检查是否空闲 */
        isIdle(): boolean;
        /** 验证传输器 */
        verify(): void | boolean | Promise<boolean>;
    }

    /**
     * 邮件消息类
     */
    export class MailMessage {
        constructor(mailer: Mail, data: MailData);
        /** 邮件数据 */
        data: MailData;
        /** 邮件消息对象 */
        message: MailComposer;
        /** 设置邮件头 */
        setMailerHeader(): void;
        /** 设置优先级头 */
        setPriorityHeaders(): void;
        /** 设置列表头 */
        setListHeaders(): void;
        /** 解析内容 */
        resolveContent(obj: any, key: string, callback: (err: Error | null, content: any) => void): void;
    }

    /**
     * 邮件组合器类
     */
    export class MailComposer {
        constructor(data: MailData);
        /** 编译邮件 */
        compile(): MailComposer;
        /** 处理函数 */
        processFunc(handler: (input: any) => any): void;
        /** 获取消息ID */
        messageId(): string;
    }

    /**
     * DKIM类
     */
    export class DKIM {
        constructor(options: DKIMOptions);
        /** 签名 */
        sign(input: any): any;
        /** 密钥列表 */
        keys: DKIMKey[];
    }

    // ==================== 邮件数据相关接口 ====================

    /**
     * 邮件数据接口
     */
    export interface MailData {
        /** 发件人 */
        from?: string;
        /** 收件人 */
        to?: string | string[];
        /** 抄送 */
        cc?: string | string[];
        /** 密送 */
        bcc?: string | string[];
        /** 回复地址 */
        replyTo?: string | string[];
        /** 主题 */
        subject?: string;
        /** 纯文本内容 */
        text?: string;
        /** HTML内容 */
        html?: string;
        /** 附件 */
        attachments?: Attachment[];
        /** DKIM配置 */
        dkim?: DKIMOptions;
        /** 是否附加数据URL图片 */
        attachDataUrls?: boolean;
        /** 优先级 */
        priority?: 'high' | 'normal' | 'low';
        /** 邮件头 */
        headers?: Record<string, string | string[]>;
        /** 消息ID */
        messageId?: string;
    }

    /**
     * 附件接口
     */
    export interface Attachment {
        /** 文件路径 */
        path?: string;
        /** 内容ID（用于内联附件） */
        cid?: string;
        /** 文件名 */
        filename?: string;
        /** 文件内容 */
        content?: string | Buffer;
        /** 内容类型 */
        contentType?: string;
        /** 编码 */
        encoding?: string;
    }

    // ==================== 基础配置接口 ====================

    /**
     * 基础传输器配置
     * 包含所有传输器通用的配置选项
     */
    export interface BaseTransportConfig {
        /** 连接URL（优先级高于其他配置） */
        url?: string;
        /** 代理配置 */
        proxy?: string;
        /** 日志配置 */
        logger?: boolean | LoggerOptions;
        /** 组件名称（用于日志记录） */
        component?: string;
    }

    /**
     * 认证选项
     */
    export interface AuthOptions {
        /** 用户名(邮箱地址) */
        user: string;
        /** 密码(邮箱密码) */
        pass?: string;
        /** OAuth2配置 */
        oauth2?: object;
        /** XOAuth2配置 */
        xoauth2?: object;
    }

    /**
     * DKIM配置选项
     */
    export interface DKIMOptions {
        /** 域名 */
        domainName?: string;
        /** 密钥选择器 */
        keySelector?: string;
        /** 私钥 */
        privateKey?: string;
        /** DKIM密钥列表 */
        keys?: DKIMKey[];
    }

    /**
     * DKIM密钥
     */
    export interface DKIMKey {
        /** 密钥选择器 */
        keySelector: string;
        /** 域名 */
        domainName: string;
    }

    /**
     * 日志配置选项
     */
    export interface LoggerOptions {
        /** 日志级别 */
        level?: string;
        /** 组件名称 */
        component?: string;
    }

    /**
     * 认证配置结果类型
     */
    export type AuthConfig = '' | {
        /** 认证类型 */
        type: string;
        /** 用户邮箱 */
        user: string;
        /** 认证方法 */
        method?: string;
        /** OAuth2实例 */
        oauth2?: EventEmitter & {
            provisionCallback?: Function;
            removeAllListeners?: () => void;
        };
        /** 凭证信息 */
        credentials?: {
            user: string;
            pass?: string;
            options?: any;
        };
    };

    /**
     * 日志记录器接口
     */
    export interface Logger {
        debug(meta: object, message: string, ...args: any[]): void;
        info(meta: object, message: string, ...args: any[]): void;
        warn(meta: object, message: string, ...args: any[]): void;
        error(meta: object, message: string, ...args: any[]): void;
    }

    // ==================== SMTP传输器配置 ====================
    // 用于标准SMTP邮件发送，适用于大多数邮件服务商

    /**
     * SMTP传输器配置接口
     *
     * @example
     * ```javascript
     * // 基本SMTP配置
     * {
     *     host: 'smtp.189.cn',
     *     port: 465,
     *     secure: true,
     *     auth: {
     *         user: 'abc@189.cn',
     *         pass: 'password'
     *     }
     * }
     * ```
     */
    export interface SmtpConfig extends BaseTransportConfig {
        /** 主机地址(SMTP服务器地址) */
        host?: string;
        /** 服务名称(邮箱服务商名称) */
        service?: string;
        /** 端口号(SMTP服务器端口) */
        port?: number;
        /** 是否使用SSL/TLS */
        secure?: boolean;
        /** 认证信息 */
        auth?: AuthOptions;
        /** TLS配置 */
        tls?: object | boolean;
        /** DKIM配置 */
        dkim?: DKIMOptions;
    }

    /**
     * SMTP传输器
     */
    export class SmtpTransport extends EventEmitter implements Transporter {
        constructor(options: SmtpConfig);
        /** 认证配置 */
        auth?: AuthConfig;

        /** 获取认证信息 */
        getAuth(authOpts?: any): AuthConfig;
        /** 发送邮件 */
        send(mail: MailMessage, callback: (err: Error | null, info: SentMessageInfo) => void): void;
        /** 事件监听方法 */
        on(event: string, listener: (...args: any[]) => void): this;
        /** 关闭连接方法 */
        close?(): void | Promise<void>;
        /** 检查是否空闲 */
        isIdle?(): boolean;
        /** 验证连接 */
        verify(callback: (error: Error | null, success?: boolean) => void): void;
        /** 传输器名称 */
        name: string;
        /** 版本号 */
        version: string;
        /** 选项配置 */
        options: SmtpConfig;
        /** 日志记录器 */
        logger?: Logger;
        /** 关联的Mail实例 */
        mailer?: Mail;
    }

    // ==================== SMTP连接池传输器配置 ====================
    // 用于高并发邮件发送，支持连接复用

    /**
     * SMTP连接池配置接口
     *
     * @example
     * ```javascript
     * // SMTP连接池配置
     * {
     *     pool: true,
     *     host: 'smtp.example.com',
     *     port: 465,
     *     secure: true,
     *     auth: { user: 'user@example.com', pass: 'password' },
     *     maxConnections: 5,
     *     maxMessages: 100
     * }
     * ```
     */
    export interface SmtpPoolConfig extends SmtpConfig {
        /** 启用连接池 */
        pool: true;
        /** 最大连接数 */
        maxConnections?: number;
        /** 每个连接最大邮件数 */
        maxMessages?: number;
    }

    /**
     * SMTP连接池传输器
     */
    export class SmtpPool extends EventEmitter implements Transporter {
        constructor(options: SmtpPoolConfig);
        /** 发送邮件 */
        send(mail: MailMessage, callback: (err: Error | null, info: SentMessageInfo) => void): void;
        /** 事件监听方法 */
        on(event: string, listener: (...args: any[]) => void): this;
        /** 关闭连接方法 */
        close?(): void | Promise<void>;
        /** 检查是否空闲 */
        isIdle?(): boolean;
        /** 验证连接 */
        verify(callback?: (error: Error | null, success?: boolean) => void): void | Promise<boolean>;
        /** 传输器名称 */
        name: string;
        /** 版本号 */
        version: string;
        /** 日志记录器 */
        logger: Logger;
        /** 选项配置 */
        options: SmtpPoolConfig;
        /** 关联的Mail实例 */
        mailer?: Mail;
    }

    // ==================== Sendmail传输器配置 ====================
    // 使用系统sendmail命令发送邮件，适用于Linux/Unix系统

    /**
     * Sendmail传输器配置接口
     *
     * @example
     * ```javascript
     * // Sendmail配置
     * {
     *     sendmail: true,
     *     path: '/usr/sbin/sendmail',
     *     args: ['-t', '-i']
     * }
     * ```
     */
    export interface SendmailConfig extends BaseTransportConfig {
        /** 启用sendmail传输器 */
        sendmail: true | string;
        /** sendmail二进制文件路径 */
        path?: string;
        /** 命令行参数 */
        args?: string[];
        /** 换行符类型 */
        newline?: string;
    }

    /**
     * Sendmail传输器
     */
    export class SendmailTransport implements Transporter {
        constructor(options?: string | SendmailConfig);
        /** 事件监听方法 */
        on(event: string, listener: (...args: any[]) => void): this;
        /** 关闭连接方法 */
        close?(): void | Promise<void>;
        /** 检查是否空闲 */
        isIdle?(): boolean;
        /** 验证连接 */
        verify?(callback?: (error: Error | null, success?: boolean) => void): void | Promise<boolean>;

        /** 发送邮件 */
        send(mail: MailMessage, done: (err: Error | null, info: SentMessageInfo) => void): void;

        /** 传输器名称 */
        name: string;
        /** 版本号 */
        version: string;
        /** 日志记录器 */
        logger: Logger;
        /** 选项配置 */
        options: SendmailConfig;
        /** sendmail路径 */
        path: string;
        /** 命令行参数 */
        args: string[] | false;
        /** 是否使用Windows换行符 */
        winbreak: boolean;
        /** 子进程创建函数 */
        _spawn: typeof import('child_process')['spawn'];
        /** 关联的Mail实例 */
        mailer?: Mail;

        // 注意：SendmailTransport不实现on、close、isIdle、verify方法
    }

    // ==================== 流传输器配置 ====================
    // 主要用于测试，将邮件输出为流格式

    /**
     * 流传输器配置接口
     *
     * @example
     * ```javascript
     * // 流传输器配置
     * {
     *     streamTransport: true,
     *     buffer: true,
     *     newline: 'unix'
     * }
     * ```
     */
    export interface StreamTransportConfig extends BaseTransportConfig {
        /** 启用流传输 */
        streamTransport: true;
        /** 是否将消息作为Buffer对象 */
        buffer?: boolean;
        /** 换行符类型 */
        newline?: string;
    }

    /**
     * 流传输器
     */
    export class StreamTransport implements Transporter {
        constructor(options: StreamTransportConfig);
        /** 发送邮件 */
        send(mail: MailMessage, callback: (err: Error | null, info: StreamSentMessageInfo) => void): void;
        /** 事件监听方法 */
        on(event: string, listener: (...args: any[]) => void): this;
        /** 关闭连接方法 */
        close?(): void | Promise<void>;
        /** 检查是否空闲 */
        isIdle?(): boolean;
        /** 验证连接 */
        verify?(): void | Promise<boolean>;
        /** 传输器名称 */
        name: string;
        /** 版本号 */
        version: string;
        /** 日志记录器 */
        logger: Logger;
        /** 选项配置 */
        options: StreamTransportConfig;
        /** 是否使用Windows换行符 */
        winbreak: boolean;
        /** 关联的Mail实例 */
        mailer?: Mail;

        // 注意：StreamTransport不实现on、close、isIdle、verify方法
    }

    /**
     * 流传输器发送结果
     */
    export interface StreamSentMessageInfo extends SentMessageInfo {
        /** 消息内容（根据buffer选项可能是流或缓冲区） */
        message: ReadableStream | Buffer | string;
    }

    // ==================== JSON传输器配置 ====================
    // 用于调试，将邮件转换为JSON格式输出

    /**
     * JSON传输器配置接口
     *
     * @example
     * ```javascript
     * // JSON传输器配置
     * {
     *     jsonTransport: true,
     *     skipEncoding: false
     * }
     * ```
     */
    export interface JsonTransportConfig extends BaseTransportConfig {
        /** 启用JSON传输 */
        jsonTransport: true;
        /** 是否跳过编码 */
        skipEncoding?: boolean;
    }

    /**
     * JSON传输器
     */
    export class JsonTransport implements Transporter {
        constructor(options: JsonTransportConfig);

        /** 发送邮件 */
        send(mail: MailMessage, callback: (err: Error | null, info: JsonSentMessageInfo) => void): void;
        /** 事件监听方法 */
        on(event: string, listener: (...args: any[]) => void): this;
        /** 关闭连接方法 */
        close?(): void | Promise<void>;
        /** 检查是否空闲 */
        isIdle?(): boolean;
        /** 验证连接 */
        verify?(): void | Promise<boolean>;
        /** 传输器名称 */
        name: string;
        /** 版本号 */
        version: string;
        /** 日志记录器 */
        logger: Logger;
        /** 选项配置 */
        options: JsonTransportConfig;
        /** 关联的Mail实例 */
        mailer?: Mail;

        // 注意：JsonTransport不实现on、close、isIdle、verify方法
    }

    /**
     * JSON传输器发送结果
     */
    export interface JsonSentMessageInfo extends SentMessageInfo {
        /** 消息内容（根据skipEncoding选项可能是JSON字符串或原始数据对象） */
        message: string | object;
    }

    // ==================== SES传输器配置 ====================
    // 用于通过AWS Simple Email Service发送邮件

    /**
     * SES传输器配置接口
     *
     * @example
     * ```javascript
     * // SES传输器配置
     * {
     *     SES: {
     *         sesClient: new SESClient({ region: 'us-east-1' }),
     *         SendEmailCommand: SendEmailCommand
     *     }
     * }
     * ```
     */
    export interface SesTransportConfig extends BaseTransportConfig {
        /** AWS SES客户端配置 */
        SES: {
            /** AWS SES客户端实例 */
            sesClient: any;
            /** SendEmailCommand构造函数 */
            SendEmailCommand: new (data: any) => any;
        };
    }

    /**
     * SES传输器
     */
    export class SesTransport extends EventEmitter implements Transporter {
        constructor(options: SesTransportConfig);

        /**
         * 发送邮件
         */
        send(mail: MailMessage, callback: (err: Error | null, info: SesSentMessageInfo) => void): void;

        /**
         * 验证SES配置
         */
        verify(callback?: (error: Error | null, success?: boolean) => void): Promise<boolean> | void;

        /** 事件监听方法 */
        on(event: string, listener: (...args: any[]) => void): this;
        /** 关闭连接方法 */
        close?(): void | Promise<void>;
        /** 检查是否空闲 */
        isIdle?(): boolean;

        /** AWS SES实例 */
        ses: any;
        /** 日志记录器 */
        logger: Logger;
        /** 选项配置 */
        options: SesTransportConfig;
        /** 传输器名称 */
        name: string;
        /** 版本号 */
        version: string;
        /** 关联的Mail实例 */
        mailer?: Mail;

        // 注意：SesTransport不实现on、close、isIdle方法
    }

    /**
     * SES传输器发送结果
     */
    export interface SesSentMessageInfo extends SentMessageInfo { }
}