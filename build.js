const fs = require('fs-extra');
const path = require('path');
const { execSync } = require('child_process');

// 定义路径
const rootDir = __dirname;
const webDir = path.join(rootDir, 'src/web');
const serverDir = path.join(rootDir, 'src/server');
const distDir = path.join(rootDir, 'public');
const dataDir = path.join(rootDir, 'data');

console.log('========== 电脑资产管理系统构建脚本 ==========');

try {
  // 步骤1: 安装项目依赖
  console.log('\n步骤1: 安装项目依赖...');
  console.log('安装根目录依赖...');
  execSync('npm install', { stdio: 'inherit' });
  
  // 步骤2: 构建前端
  console.log('\n步骤2: 构建前端...');
  console.log('进入前端目录...');
  process.chdir(webDir);
  
  console.log('构建生产版本...');
  execSync('npm run build', { stdio: 'inherit' });
  
  // 步骤3: 复制构建文件到public目录
  console.log('\n步骤3: 复制前端构建文件到public目录...');
  
  // 确保public目录存在
  if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
  } else {
    // 清空目录但保留目录本身
    fs.emptyDirSync(distDir);
  }
  
  // 复制构建文件
  fs.copySync(path.join(webDir, 'dist'), distDir);
  console.log(`已成功复制文件到 ${distDir}`);
  
  // 确保data目录存在
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
    console.log(`创建数据目录: ${dataDir}`);
  }
  
  // 返回根目录
  process.chdir(rootDir);
  
  console.log('\n========== 构建完成 ==========');
  console.log('现在可以通过以下命令启动服务器:');
  console.log('npm start');
  
} catch (error) {
  console.error('构建过程中出现错误:', error);
  process.exit(1);
} 