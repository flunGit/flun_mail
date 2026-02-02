
    const mail = require('flun-mail');
    // 邮箱配置示例 - 请根据您的邮箱服务商修改以下配置
    const transporter = mail.createTransport({
        // 步骤1:填写服务器地址,端口和是否启用SSL/TLS
           // 常见邮箱,填写服务商名称(如:Gmail, QQ; 163,139等等)或域名后缀即可
              service: 'your-email-provider',
           // 非常见邮箱须填写如下项:
           // host: 'smtp.your-email-provider.com', // 邮箱服务商SMTP服务器地址
           // port: 587,                            // 端口号(如:465,587,465等等)
           // secure: true,                         // 是否使用SSL/TLS

       // 步骤2:填写SMTP服务器的账号和密码
            auth: {
                user: 'your-email@example.com',       // 您的邮箱地址
                pass: 'your-password-or-app-password' // 您的邮箱密码或授权码(Gmail需要应用专用密码，QQ邮箱需要授权码)
            }
    });

    // 发送邮件示例
    transporter.sendMail({
        from: 'your-email@example.com',     // 发件人
        to: 'recipient@example.com',        // 收件人
        subject: '测试邮件',                 // 邮件主题
        text: '这是一封测试邮件(text)',       // 纯文本内容
        html: '<b>这是一封测试邮件(html)</b>' // HTML内容（可选;注:html内容优先级高于纯文本内容)
    }, (error, info) => {
        if (error)  console.error('发送失败:', error);
        else console.log('发送成功:', info.response);
    });

    // 也可以使用async/await方式
    // async function sendEmail() {
        // try {
            // const info = await transporter.sendMail({
                // from: 'your-email@example.com',
                // to: 'recipient@example.com',
                // subject: '异步测试邮件',
                // text: '这是一封使用async/await发送的测试邮件'
            // });
            // console.log('异步发送成功:', info.response);
        // } catch (error) {
            // console.error('异步发送失败:', error);
        // }
    // }

    module.exports = transporter; // 导出transporter以便在其他文件中使用