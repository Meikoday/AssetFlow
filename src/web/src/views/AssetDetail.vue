<template>
  <div class="asset-detail-container">
    <div v-if="loading" class="loading-container">
      <el-skeleton animated :rows="10" />
    </div>
    
    <div v-else-if="asset" class="detail-content">
      <div class="header-actions">
        <h1 class="page-title">{{ asset.name }}</h1>
        <div class="action-buttons">
          <el-button type="primary" @click="$router.push('/assets')">返回列表</el-button>
          <el-button type="success" size="default" @click="openEditForm">
            <i class="el-icon-edit" style="margin-right: 5px;"></i> 编辑全部信息
          </el-button>
        </div>
      </div>
      
      <!-- 系统概览 -->
      <el-card class="detail-card">
        <template #header>
          <div class="card-header">
            <span>系统概览</span>
          </div>
        </template>
        <table class="detail-table">
          <tr>
            <td>资产名称</td>
            <td>{{ asset.name }}</td>
          </tr>
          <tr>
            <td>创建时间</td>
            <td>{{ formatDate(asset.createdAt) }}</td>
          </tr>
        </table>
      </el-card>
      
      <!-- 显示器信息 -->
      <el-card class="detail-card" v-if="asset.monitors && asset.monitors.length > 0">
        <template #header>
          <div class="card-header">
            <span>显示器信息</span>
          </div>
        </template>
        <el-table :data="asset.monitors" border size="small">
          <el-table-column prop="model" label="型号" min-width="200" />
          <el-table-column prop="size" label="尺寸" width="100" />
          <el-table-column prop="resolution" label="分辨率" width="150" />
          <el-table-column prop="manufacturer" label="制造商" min-width="120" />
        </el-table>
      </el-card>
      
      <!-- CPU信息 -->
      <el-card class="detail-card" v-if="asset.cpu">
        <template #header>
          <div class="card-header">
            <span>处理器信息</span>
          </div>
        </template>
        <table class="detail-table">
          <tr>
            <td>处理器型号</td>
            <td>{{ asset.cpu.model }}</td>
          </tr>
          <tr>
            <td>核心数</td>
            <td>{{ asset.cpu.cores }} 核心</td>
          </tr>
          <tr>
            <td>线程数</td>
            <td>{{ asset.cpu.threads }} 线程</td>
          </tr>
        </table>
      </el-card>
      
      <!-- 主板信息 -->
      <el-card class="detail-card" v-if="asset.motherboard">
        <template #header>
          <div class="card-header">
            <span>主板信息</span>
          </div>
        </template>
        <table class="detail-table">
          <tr>
            <td>制造商</td>
            <td>{{ asset.motherboard.manufacturer }}</td>
          </tr>
          <tr>
            <td>型号</td>
            <td>{{ asset.motherboard.model }}</td>
          </tr>
          <tr>
            <td>序列号</td>
            <td>{{ asset.motherboard.serial }}</td>
          </tr>
        </table>
      </el-card>
      
      <!-- 内存信息 -->
      <el-card class="detail-card" v-if="asset.memory">
        <template #header>
          <div class="card-header">
            <span>内存信息</span>
          </div>
        </template>
        <table class="detail-table">
          <tr>
            <td>总容量</td>
            <td>{{ asset.memory.total }}</td>
          </tr>
        </table>
        
        <div v-if="asset.memory.slots && asset.memory.slots.length > 0">
          <h4>内存插槽</h4>
          <el-table :data="asset.memory.slots" border size="small">
            <el-table-column prop="size" label="容量" width="100">
              <template #default="scope">
                {{ scope.row.size }} GB
              </template>
            </el-table-column>
            <el-table-column prop="type" label="类型" width="80" />
            <el-table-column prop="speed" label="频率" width="100">
              <template #default="scope">
                {{ scope.row.speed }} MHz
              </template>
            </el-table-column>
            <el-table-column prop="manufacturer" label="制造商" />
          </el-table>
        </div>
      </el-card>
      
      <!-- 存储设备 -->
      <el-card class="detail-card" v-if="asset.disks && asset.disks.length > 0">
        <template #header>
          <div class="card-header">
            <span>存储设备</span>
          </div>
        </template>
        <el-table :data="asset.disks" border size="small">
          <el-table-column prop="model" label="型号" min-width="200" />
          <el-table-column prop="size" label="容量" width="100" />
          <el-table-column prop="interface" label="接口" width="120" />
          <el-table-column prop="serial" label="序列号" min-width="120" />
        </el-table>
      </el-card>
      
      <!-- 显卡信息 -->
      <el-card class="detail-card" v-if="asset.gpus && asset.gpus.length > 0">
        <template #header>
          <div class="card-header">
            <span>显卡信息</span>
          </div>
        </template>
        <el-table :data="asset.gpus" border size="small">
          <el-table-column prop="model" label="型号" min-width="200" />
          <el-table-column prop="memory" label="显存" width="100" />
          <el-table-column prop="driver" label="驱动程序" min-width="120" />
          <el-table-column prop="resolution" label="分辨率" width="150" />
        </el-table>
      </el-card>
      
      <!-- 操作系统信息 -->
      <el-card class="detail-card" v-if="asset.os">
        <template #header>
          <div class="card-header">
            <span>操作系统信息</span>
          </div>
        </template>
        <table class="detail-table">
          <tr>
            <td>系统名称</td>
            <td>{{ asset.os.name }}</td>
          </tr>
          <tr>
            <td>系统版本</td>
            <td>{{ asset.os.version }}</td>
          </tr>
          <tr>
            <td>架构</td>
            <td>{{ asset.os.architecture }}</td>
          </tr>
          <tr>
            <td>安装日期</td>
            <td>{{ formatWmiDate(asset.os.install_date) }}</td>
          </tr>
        </table>
      </el-card>
      
      <!-- 修改历史记录 -->
      <el-card v-if="asset.changeLog && asset.changeLog.length > 0" class="detail-card" shadow="hover">
        <template #header>
          <div class="card-header">
            <h3>修改历史记录</h3>
          </div>
        </template>
        <el-timeline>
          <el-timeline-item
            v-for="(log, index) in asset.changeLog"
            :key="index"
            :timestamp="formatDate(log.timestamp)"
            placement="top"
            type="primary"
          >
            <el-card>
              <p>{{ log.message }}</p>
              <p class="log-user" v-if="log.user">操作人: {{ log.user }}</p>
            </el-card>
          </el-timeline-item>
        </el-timeline>
      </el-card>
      
      <!-- 编辑资产信息对话框 -->
      <el-dialog
        v-model="showEditForm"
        title="编辑资产全部信息"
        width="80%"
        destroy-on-close
      >
        <el-form 
          v-if="editForm" 
          :model="editForm" 
          label-width="120px" 
          label-position="left"
        >
          <!-- 基本信息 -->
          <el-divider content-position="left">基本信息</el-divider>
          <el-form-item label="资产名称">
            <el-input v-model="editForm.name" />
          </el-form-item>
          
          <!-- 显示器信息 -->
          <el-divider content-position="left">显示器信息</el-divider>
          <el-form-item label="显示器" v-if="editForm.monitors">
            <div v-for="(monitor, index) in editForm.monitors" :key="index" class="monitor-form">
              <el-card class="monitor-card">
                <div class="monitor-header">
                  <h4>显示器 {{ index + 1 }}</h4>
                  <el-button 
                    type="danger" 
                    size="small" 
                    circle 
                    @click="removeMonitor(index)"
                    icon="el-icon-delete"
                  ></el-button>
                </div>
                <el-form-item label="型号">
                  <el-input v-model="monitor.model" />
                </el-form-item>
                <el-form-item label="尺寸">
                  <el-input v-model="monitor.size" placeholder="例如：24英寸" />
                </el-form-item>
                <el-form-item label="分辨率">
                  <el-input v-model="monitor.resolution" placeholder="例如：1920x1080" />
                </el-form-item>
                <el-form-item label="制造商">
                  <el-input v-model="monitor.manufacturer" />
                </el-form-item>
              </el-card>
            </div>
            <el-button type="primary" @click="addMonitor">添加显示器</el-button>
          </el-form-item>
          
          <!-- CPU信息 -->
          <el-divider content-position="left">处理器信息</el-divider>
          <el-form-item label="处理器型号">
            <el-input v-model="editForm.cpu.model" />
          </el-form-item>
          <el-form-item label="核心数">
            <el-input-number v-model="editForm.cpu.cores" :min="1" />
          </el-form-item>
          <el-form-item label="线程数">
            <el-input-number v-model="editForm.cpu.threads" :min="1" />
          </el-form-item>
          
          <!-- 主板信息 -->
          <el-divider content-position="left">主板信息</el-divider>
          <el-form-item label="制造商">
            <el-input v-model="editForm.motherboard.manufacturer" />
          </el-form-item>
          <el-form-item label="型号">
            <el-input v-model="editForm.motherboard.model" />
          </el-form-item>
          <el-form-item label="序列号">
            <el-input v-model="editForm.motherboard.serial" />
          </el-form-item>
          
          <!-- 内存信息 -->
          <el-divider content-position="left">内存信息</el-divider>
          <el-form-item label="总容量">
            <el-input v-model="editForm.memory.total" />
          </el-form-item>
          
          <!-- 内存插槽 -->
          <el-form-item label="内存插槽" v-if="editForm.memory.slots">
            <div v-for="(slot, index) in editForm.memory.slots" :key="index" class="memory-slot-form">
              <el-card class="slot-card">
                <div class="slot-header">
                  <h4>插槽 {{ index + 1 }}</h4>
                  <el-button 
                    type="danger" 
                    size="small" 
                    circle 
                    @click="removeMemorySlot(index)"
                    icon="el-icon-delete"
                  ></el-button>
                </div>
                <el-form-item label="容量 (GB)">
                  <el-input v-model="slot.size" />
                </el-form-item>
                <el-form-item label="类型">
                  <el-input v-model="slot.type" />
                </el-form-item>
                <el-form-item label="频率 (MHz)">
                  <el-input v-model="slot.speed" />
                </el-form-item>
                <el-form-item label="制造商">
                  <el-input v-model="slot.manufacturer" />
                </el-form-item>
              </el-card>
            </div>
            <el-button type="primary" @click="addMemorySlot">添加内存插槽</el-button>
          </el-form-item>
          
          <!-- 存储设备 -->
          <el-divider content-position="left">存储设备</el-divider>
          <el-form-item label="存储设备" v-if="editForm.disks">
            <div v-for="(disk, index) in editForm.disks" :key="index" class="disk-form">
              <el-card class="disk-card">
                <div class="disk-header">
                  <h4>存储设备 {{ index + 1 }}</h4>
                  <el-button 
                    type="danger" 
                    size="small" 
                    circle 
                    @click="removeDisk(index)"
                    icon="el-icon-delete"
                  ></el-button>
                </div>
                <el-form-item label="型号">
                  <el-input v-model="disk.model" />
                </el-form-item>
                <el-form-item label="容量">
                  <el-input v-model="disk.size" />
                </el-form-item>
                <el-form-item label="接口">
                  <el-input v-model="disk.interface" />
                </el-form-item>
                <el-form-item label="序列号">
                  <el-input v-model="disk.serial" />
                </el-form-item>
              </el-card>
            </div>
            <el-button type="primary" @click="addDisk">添加存储设备</el-button>
          </el-form-item>
          
          <!-- 显卡信息 -->
          <el-divider content-position="left">显卡信息</el-divider>
          <el-form-item label="显卡" v-if="editForm.gpus">
            <div v-for="(gpu, index) in editForm.gpus" :key="index" class="gpu-form">
              <el-card class="gpu-card">
                <div class="gpu-header">
                  <h4>显卡 {{ index + 1 }}</h4>
                  <el-button 
                    type="danger" 
                    size="small" 
                    circle 
                    @click="removeGpu(index)"
                    icon="el-icon-delete"
                  ></el-button>
                </div>
                <el-form-item label="型号">
                  <el-input v-model="gpu.model" />
                </el-form-item>
                <el-form-item label="显存">
                  <el-input v-model="gpu.memory" />
                </el-form-item>
                <el-form-item label="驱动程序">
                  <el-input v-model="gpu.driver" />
                </el-form-item>
                <el-form-item label="分辨率">
                  <el-input v-model="gpu.resolution" />
                </el-form-item>
              </el-card>
            </div>
            <el-button type="primary" @click="addGpu">添加显卡</el-button>
          </el-form-item>
          
          <!-- 操作系统信息 -->
          <el-divider content-position="left">操作系统信息</el-divider>
          <el-form-item label="系统名称">
            <el-input v-model="editForm.os.name" />
          </el-form-item>
          <el-form-item label="系统版本">
            <el-input v-model="editForm.os.version" />
          </el-form-item>
          <el-form-item label="架构">
            <el-input v-model="editForm.os.architecture" />
          </el-form-item>
          <el-form-item label="安装日期">
            <el-input v-model="editForm.os.install_date" />
          </el-form-item>
          
          <!-- 修改日志 -->
          <el-divider content-position="left">修改日志</el-divider>
          <el-form-item label="修改原因" prop="logMessage">
            <el-input 
              v-model="logMessage" 
              type="textarea" 
              :rows="3" 
              placeholder="请输入本次修改的原因（可选）" 
            />
          </el-form-item>
        </el-form>
        
        <template #footer>
          <div class="dialog-footer">
            <el-button @click="showEditForm = false">取消</el-button>
            <el-button type="primary" @click="saveAsset" :loading="saving">保存</el-button>
          </div>
        </template>
      </el-dialog>
    </div>
    
    <div v-else class="error-container">
      <el-result
        icon="error"
        title="资产未找到"
        sub-title="请确认资产ID是否正确或返回资产列表"
      >
        <template #extra>
          <el-button type="primary" @click="$router.push('/assets')">返回资产列表</el-button>
        </template>
      </el-result>
    </div>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getAssetById, updateAsset } from '../api/asset'
import { ElMessage } from 'element-plus'

export default {
  name: 'AssetDetail',
  setup() {
    const route = useRoute()
    const router = useRouter()
    const asset = ref(null)
    const loading = ref(true)
    const showEditForm = ref(false)
    const editForm = ref(null)
    const saving = ref(false)
    const logMessage = ref("")
    
    // 格式化日期
    const formatDate = (dateString) => {
      const date = new Date(dateString)
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
    }
    
    // 格式化WMI日期
    const formatWmiDate = (wmiDate) => {
      if (!wmiDate) return '未知'
      
      try {
        // WMI日期格式通常是：20220315123456.000000+480
        const year = wmiDate.substring(0, 4)
        const month = wmiDate.substring(4, 6)
        const day = wmiDate.substring(6, 8)
        
        return `${year}-${month}-${day}`
      } catch (e) {
        return wmiDate
      }
    }
    
    // 初始化编辑表单
    const initEditForm = () => {
      if (!asset.value) return null
      
      // 创建深拷贝以避免直接修改原始数据
      const form = JSON.parse(JSON.stringify(asset.value))
      
      // 确保每个对象都存在，即使原数据中不存在
      if (!form.cpu) form.cpu = { model: '', cores: 1, threads: 1 }
      if (!form.motherboard) form.motherboard = { manufacturer: '', model: '', serial: '' }
      if (!form.memory) form.memory = { total: '', slots: [] }
      if (!form.memory.slots) form.memory.slots = []
      if (!form.monitors) form.monitors = []
      if (!form.disks) form.disks = []
      if (!form.gpus) form.gpus = []
      if (!form.os) form.os = { name: '', version: '', architecture: '', install_date: '' }
      
      return form
    }
    
    // 获取资产详情
    const fetchAssetDetail = async () => {
      loading.value = true
      const assetId = route.params.id
      
      try {
        const response = await getAssetById(assetId)
        asset.value = response.data
        editForm.value = initEditForm()
      } catch (error) {
        console.error('获取资产详情失败:', error)
        
        if (error.response && error.response.status === 404) {
          asset.value = null
        } else {
          ElMessage.error('获取资产详情失败')
        }
      } finally {
        loading.value = false
      }
    }
    
    // 添加显示器
    const addMonitor = () => {
      editForm.value.monitors.push({
        model: '',
        size: '',
        resolution: '',
        manufacturer: ''
      })
    }
    
    // 删除显示器
    const removeMonitor = (index) => {
      editForm.value.monitors.splice(index, 1)
    }
    
    // 添加内存插槽
    const addMemorySlot = () => {
      editForm.value.memory.slots.push({
        size: '0',
        type: '',
        speed: '0',
        manufacturer: ''
      })
    }
    
    // 移除内存插槽
    const removeMemorySlot = (index) => {
      editForm.value.memory.slots.splice(index, 1)
    }
    
    // 添加存储设备
    const addDisk = () => {
      editForm.value.disks.push({
        model: '',
        size: '0GB',
        interface: '',
        serial: ''
      })
    }
    
    // 移除存储设备
    const removeDisk = (index) => {
      editForm.value.disks.splice(index, 1)
    }
    
    // 添加显卡
    const addGpu = () => {
      editForm.value.gpus.push({
        model: '',
        memory: '0GB',
        driver: '',
        resolution: ''
      })
    }
    
    // 移除显卡
    const removeGpu = (index) => {
      editForm.value.gpus.splice(index, 1)
    }
    
    // 保存资产
    const saveAsset = async () => {
      if (!editForm.value) return
      
      saving.value = true
      try {
        // 将日志消息添加到请求中
        const payload = {
          ...editForm.value,
          logEntry: logMessage.value ? {
            message: logMessage.value,
            timestamp: new Date().toISOString()
          } : null
        }
        
        const response = await updateAsset(asset.value.id, payload)
        asset.value = response.data
        showEditForm.value = false
        ElMessage.success('资产信息保存成功')
        
        // 清空日志消息
        logMessage.value = ""
      } catch (error) {
        console.error('保存资产信息失败:', error)
        ElMessage.error('保存资产信息失败')
      } finally {
        saving.value = false
      }
    }
    
    const openEditForm = () => {
      editForm.value = initEditForm()
      logMessage.value = "" // 清空日志输入
      showEditForm.value = true
    }
    
    onMounted(fetchAssetDetail)
    
    return {
      asset,
      loading,
      formatDate,
      formatWmiDate,
      showEditForm,
      editForm,
      saving,
      logMessage,
      addMonitor,
      removeMonitor,
      addMemorySlot,
      removeMemorySlot,
      addDisk,
      removeDisk,
      addGpu,
      removeGpu,
      saveAsset,
      openEditForm
    }
  }
}
</script>

<style scoped>
.asset-detail-container {
  padding: 20px;
}

.header-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.detail-card {
  margin-bottom: 20px;
}

.loading-container {
  padding: 20px;
}

.error-container {
  margin-top: 40px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.log-user {
  color: #909399;
  font-size: 0.9em;
  margin-top: 8px;
}

.memory-slot-form,
.disk-form,
.gpu-form,
.monitor-form {
  margin-bottom: 15px;
}

.slot-card,
.disk-card,
.gpu-card,
.monitor-card {
  margin-bottom: 10px;
}

.slot-header,
.disk-header,
.gpu-header,
.monitor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.slot-header h4,
.disk-header h4,
.gpu-header h4,
.monitor-header h4 {
  margin: 0;
}

.action-buttons {
  display: flex;
  gap: 10px;
}

:deep(.el-dialog__body) {
  max-height: 70vh;
  overflow-y: auto;
}
</style> 