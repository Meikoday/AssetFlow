@echo off
REM 解决批处理中文乱码问题，强制使用 UTF-8
chcp 65001 >nul
cls

REM 设置标题
title 电脑资产管理系统

REM 基本信息提示
echo ====================================
echo    电脑资产管理系统启动工具
echo ====================================
echo.

REM 检查参数（仅供内部使用）
if "%1"=="backend" goto start_backend_only

REM 默认启动完整应用
echo [信息] 正在启动完整应用（前端+后端）...
echo.

REM 检查前端依赖
echo [检查] 正在检查前端依赖...
if not exist "node_modules" (
  echo [信息] 未检测到前端依赖，正在安装...
  call npm install
  REM 不检查错误代码，直接继续执行
  echo [信息] 依赖安装过程已完成
) else (
  echo [成功] 前端依赖已安装
)
echo.

REM 检查后端依赖
echo [检查] 正在检查后端依赖...
if not exist "src\server\node_modules" (
  echo [信息] 未检测到后端依赖，正在安装...
  pushd src\server
  call npm install
  popd
  REM 不检查错误代码，直接继续执行
  echo [信息] 后端依赖安装过程已完成
) else (
  echo [成功] 后端依赖已安装
)
echo.

REM 检查并构建前端
echo [检查] 正在检查前端构建...
if not exist "public\index.html" (
  echo [信息] 未检测到前端构建文件，正在构建...
  call npm run build
  REM 不检查错误代码，直接继续执行
  echo [信息] 前端构建过程已完成
) else (
  echo [成功] 前端已构建
)
echo.

REM 二次检查前端构建是否真的存在
if not exist "public\index.html" (
  echo [警告] 前端构建可能未成功，但将继续尝试启动应用...
)
echo.

REM 启动服务
echo [信息] 准备工作已完成，正在启动应用...
echo.

REM 启动后端服务器（在新窗口中）
echo [启动] 正在启动后端服务器...
start "电脑资产管理系统 - 后端服务器" cmd /k "%~dpnx0" backend
timeout /t 3 >nul

REM 启动前端
echo ====================================
echo    正在启动前端应用
echo ====================================
echo.

echo [启动] 启动前端应用...
echo [提示] 按 Ctrl+C 可以停止应用
echo.
call npm start
goto end

:start_backend_only
echo ====================================
echo    正在启动后端服务器
echo ====================================
echo.

REM 进入服务器目录
cd /d "%~dp0src\server"

REM 启动服务器提示
echo [信息] 启动服务器...
echo [提示] 按 Ctrl+C 可以停止服务器
echo.

REM 直接使用 node 运行服务器
set "NODE_OPTIONS=--no-warnings"
echo [执行] node --no-warnings server.js
echo.
node --no-warnings server.js

REM 出错时显示错误信息
if %ERRORLEVEL% NEQ 0 (
  echo.
  echo [错误] 服务器启动失败，错误代码: %ERRORLEVEL%
  echo.
  pause
  exit /b %ERRORLEVEL%
)

:end
echo.
echo [信息] 程序已退出
pause
exit /b 0 