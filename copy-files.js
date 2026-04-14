import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// 获取当前文件所在目录
const __filename = fileURLToPath(import.meta.url), __dirname = path.dirname(__filename),

    // 要拷贝和写入的文件名和目标（项目根目录）
    fileName = 'Mail.js', targetDir = path.resolve(__dirname, '../..'),

    // 源文件和目标文件路径
    sourceFile = path.join(__dirname, fileName), targetFile = path.join(targetDir, fileName);

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
if (process.argv[1] === __filename) copyFile();
export { copyFile };