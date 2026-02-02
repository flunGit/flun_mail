const fs = require('fs'), path = require('path'),

    // 要复制的文件位置和文件目标位置
    packageDir = __dirname, targetDir = path.resolve(packageDir, '../..'), fileName = 'Mail.js',

    // 要拷贝的文件和目标文件路径
    sourceFile = path.join(packageDir, fileName), targetFile = path.join(targetDir, fileName);

function copyFile() {
    console.log(`🔍 检查 ${fileName} 文件...`), console.log(`📁 项目根目录:${targetDir}`);
    try {
        if (fs.existsSync(targetFile)) return true;  // 如果目标文件存在,则返回true并结束函数
        console.log(`⚠️ 在项目根目录未找到 ${fileName} 文件，正在创建...`);

        fs.copyFileSync(sourceFile, targetFile);     // 复制源文件到项目根目录
        console.log(`✓ 已创建 ${fileName} 示例文件:${targetFile}`), console.log(`💡 请编辑 ${fileName} 文件,配置您的邮箱`);
        return true;
    } catch (error) {
        console.error(`✗ 创建 ${fileName} 文件失败:`, error.message);
        return false;
    }
}

// 执行脚本并导出函数
if (require.main === module) copyFile();
module.exports = { copyFile };