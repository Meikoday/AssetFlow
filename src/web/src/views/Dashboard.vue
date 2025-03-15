<template>
  <div class="dashboard-container">
    <h1 class="page-title">系统仪表盘</h1>
    
    <el-row :gutter="20">
      <el-col :span="8">
        <el-card shadow="hover">
          <template #header>
            <div class="card-header">
              <span>资产总数</span>
            </div>
          </template>
          <div class="card-body">
            <div class="statistic">
              <h2>{{ assetCount }}</h2>
              <el-button type="primary" @click="$router.push('/assets')">查看资产</el-button>
            </div>
          </div>
        </el-card>
      </el-col>
      
      <el-col :span="8">
        <el-card shadow="hover">
          <template #header>
            <div class="card-header">
              <span>最近添加</span>
            </div>
          </template>
          <div class="card-body">
            <div v-if="recentAssets.length > 0">
              <ul class="recent-list">
                <li v-for="asset in recentAssets" :key="asset.id">
                  <router-link :to="`/assets/${asset.id}`">{{ asset.name }}</router-link>
                  <span class="date">{{ formatDate(asset.createdAt) }}</span>
                </li>
              </ul>
            </div>
            <div v-else class="empty-message">
              没有最近添加的资产
            </div>
          </div>
        </el-card>
      </el-col>
      
      <el-col :span="8">
        <el-card shadow="hover">
          <template #header>
            <div class="card-header">
              <span>快速操作</span>
            </div>
          </template>
          <div class="card-body">
            <div class="quick-actions">
              <el-button type="success" icon="el-icon-plus" @click="$router.push('/assets')">
                查看资产列表
              </el-button>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue'
import { getAssets } from '../api/asset'
import { ElMessage } from 'element-plus'

export default {
  name: 'Dashboard',
  setup() {
    const assetCount = ref(0)
    const recentAssets = ref([])
    
    // 格式化日期
    const formatDate = (dateString) => {
      const date = new Date(dateString)
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
    }
    
    // 获取资产数据
    const fetchData = async () => {
      try {
        const response = await getAssets()
        const assets = response.data
        
        assetCount.value = assets.length
        
        // 获取最近添加的5个资产
        recentAssets.value = assets
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
          .slice(0, 5)
      } catch (error) {
        console.error('获取资产数据失败:', error)
        ElMessage.error('获取资产数据失败')
      }
    }
    
    onMounted(fetchData)
    
    return {
      assetCount,
      recentAssets,
      formatDate
    }
  }
}
</script>

<style scoped>
.dashboard-container {
  padding: 20px;
}

.statistic {
  text-align: center;
}

.statistic h2 {
  font-size: 36px;
  margin: 0 0 20px 0;
  color: #409EFF;
}

.recent-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.recent-list li {
  padding: 8px 0;
  border-bottom: 1px solid #ebeef5;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.recent-list li:last-child {
  border-bottom: none;
}

.date {
  color: #909399;
  font-size: 12px;
}

.quick-actions {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.empty-message {
  color: #909399;
  text-align: center;
  padding: 20px 0;
}
</style> 