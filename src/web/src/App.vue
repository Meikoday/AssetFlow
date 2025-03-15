<template>
  <div class="app-container">
    <div class="sidebar">
      <div class="logo">
        <h2>电脑资产管理</h2>
      </div>
      <el-menu
        router
        background-color="#304156"
        text-color="#bfcbd9"
        active-text-color="#409EFF"
        :default-active="$route.path"
      >
        <el-menu-item index="/">
          <el-icon><el-icon-monitor /></el-icon>
          <span>仪表盘</span>
        </el-menu-item>
        <el-menu-item index="/assets">
          <el-icon><el-icon-document /></el-icon>
          <span>资产列表</span>
        </el-menu-item>
      </el-menu>
    </div>
    <div class="content-container">
      <div class="github-icon">
        <a href="https://github.com/Meikoday/" target="_blank" title="访问GitHub主页">
          <svg height="24" width="24" viewBox="0 0 16 16" fill="currentColor">
            <path fill-rule="evenodd" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"></path>
          </svg>
        </a>
      </div>
      <router-view />
    </div>
  </div>
</template>

<script>
export default {
  name: 'App'
}
</script>

<style>
.app-container {
  height: 100%;
}

.logo {
  height: 50px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  background-color: #263445;
}

.logo h2 {
  margin: 0;
  font-size: 18px;
}

.github-icon {
  position: fixed;
  top: 15px;
  right: 20px;
  z-index: 1000;
}

.github-icon a {
  color: #333;
  transition: color 0.3s;
}

.github-icon a:hover {
  color: #409EFF;
}
</style> 