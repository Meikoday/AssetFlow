<template>
  <div class="asset-list-container">
    <div class="header-section">
      <h1 class="page-title">资产列表</h1>
      <!-- 功能按钮区域 -->
      <div class="action-buttons">
        <el-dropdown @command="handleExport" split-button type="primary" size="small">
          导出
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="json">导出为JSON</el-dropdown-item>
              <el-dropdown-item command="excel">导出为Excel</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
        
        <el-dropdown @command="handleImport" split-button type="success" size="small">
          导入
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="json">导入JSON</el-dropdown-item>
              <el-dropdown-item command="excel">导入Excel</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
        
        <el-button type="primary" @click="showAddForm = true">
          <i class="el-icon-plus"></i> 新增资产
        </el-button>
      </div>
    </div>
    
    <!-- 文件导入对话框 -->
    <el-dialog
      v-model="showImportDialog"
      :title="`导入${importType === 'json' ? 'JSON' : 'Excel'}文件`"
      width="500px"
    >
      <div class="import-dialog-content">
        <el-alert
          title="警告：导入将会清空现有的所有数据！"
          type="warning"
          :closable="false"
          show-icon
        />
        
        <el-upload
          class="upload-area"
          drag
          :action="null"
          :auto-upload="false"
          :on-change="handleFileChange"
          :limit="1"
          :file-list="importFileList"
        >
          <i class="el-icon-upload"></i>
          <div class="el-upload__text">
            将文件拖到此处，或<em>点击上传</em>
          </div>
          <template #tip>
            <div class="el-upload__tip">
              {{ importType === 'json' ? '请上传JSON格式文件' : '请上传Excel格式文件(.xlsx)' }}
            </div>
          </template>
        </el-upload>
      </div>
      
      <template #footer>
        <span>
          <el-button @click="cancelImport">取消</el-button>
          <el-button 
            type="danger" 
            @click="confirmImport" 
            :disabled="!selectedFile"
            :loading="importing"
          >
            确认导入
          </el-button>
        </span>
      </template>
    </el-dialog>
    
    <el-card class="filter-card">
      <el-input
        v-model="searchQuery"
        placeholder="输入名称或型号搜索"
        clearable
        prefix-icon="el-icon-search"
        @input="handleSearch"
      />
    </el-card>
    
    <el-table
      v-loading="loading"
      :data="filteredAssets"
      border
      style="width: 100%"
      stripe
      row-key="id"
    >
      <el-table-column prop="name" label="资产名称" min-width="120">
        <template #default="scope">
          <router-link :to="`/assets/${scope.row.id}`">{{ scope.row.name }}</router-link>
        </template>
      </el-table-column>
      <el-table-column prop="cpu.model" label="处理器" min-width="200" />
      <el-table-column prop="memory.total" label="内存" min-width="80" />
      <el-table-column label="操作系统" min-width="180">
        <template #default="scope">
          {{ scope.row.os?.name }}
        </template>
      </el-table-column>
      <el-table-column label="创建日期" min-width="100">
        <template #default="scope">
          {{ formatDate(scope.row.createdAt) }}
        </template>
      </el-table-column>
      <el-table-column label="操作" width="200" fixed="right">
        <template #default="scope">
          <el-button
            type="primary"
            size="small"
            @click="$router.push(`/assets/${scope.row.id}`)"
          >
            详情
          </el-button>
          <el-button
            type="danger"
            size="small"
            @click="handleDelete(scope.row)"
          >
            删除
          </el-button>
        </template>
      </el-table-column>
    </el-table>
    
    <div class="empty-placeholder" v-if="!loading && assets.length === 0">
      <el-empty description="暂无资产数据" />
      <div class="empty-actions">
        <p class="hint-text">您可以使用系统采集工具添加资产，或点击"新增资产"按钮手动创建</p>
        <el-button type="primary" @click="showAddForm = true">新增资产</el-button>
      </div>
    </div>
    
    <!-- 添加资产对话框 -->
    <el-dialog
      v-model="showAddForm"
      title="新增资产"
      width="80%"
      destroy-on-close
    >
      <el-form 
        v-if="addForm" 
        :model="addForm" 
        label-width="120px" 
        label-position="left"
        :rules="formRules"
        ref="addFormRef"
      >
        <!-- 基本信息 -->
        <el-divider content-position="left">基本信息</el-divider>
        <el-form-item label="资产名称" prop="name">
          <el-input v-model="addForm.name" placeholder="请输入资产名称" />
        </el-form-item>
        <el-form-item label="显示器型号">
          <el-input v-model="addForm.monitor" placeholder="请输入显示器型号（可选）" />
        </el-form-item>
        
        <!-- CPU信息 -->
        <el-divider content-position="left">处理器信息</el-divider>
        <el-form-item label="处理器型号">
          <el-input v-model="addForm.cpu.model" placeholder="请输入处理器型号" />
        </el-form-item>
        <el-form-item label="核心数">
          <el-input-number v-model="addForm.cpu.cores" :min="1" />
        </el-form-item>
        <el-form-item label="线程数">
          <el-input-number v-model="addForm.cpu.threads" :min="1" />
        </el-form-item>
        
        <!-- 主板信息 -->
        <el-divider content-position="left">主板信息</el-divider>
        <el-form-item label="制造商">
          <el-input v-model="addForm.motherboard.manufacturer" placeholder="请输入主板制造商" />
        </el-form-item>
        <el-form-item label="型号">
          <el-input v-model="addForm.motherboard.model" placeholder="请输入主板型号" />
        </el-form-item>
        <el-form-item label="序列号">
          <el-input v-model="addForm.motherboard.serial" placeholder="请输入主板序列号" />
        </el-form-item>
        
        <!-- 内存信息 -->
        <el-divider content-position="left">内存信息</el-divider>
        <el-form-item label="总容量">
          <el-input v-model="addForm.memory.total" placeholder="请输入内存总容量，例如：16GB" />
        </el-form-item>
        
        <!-- 内存插槽 -->
        <el-form-item label="内存插槽" v-if="addForm.memory.slots">
          <div v-for="(slot, index) in addForm.memory.slots" :key="index" class="memory-slot-form">
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
        <el-form-item label="存储设备" v-if="addForm.disks">
          <div v-for="(disk, index) in addForm.disks" :key="index" class="disk-form">
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
        <el-form-item label="显卡" v-if="addForm.gpus">
          <div v-for="(gpu, index) in addForm.gpus" :key="index" class="gpu-form">
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
          <el-input v-model="addForm.os.name" />
        </el-form-item>
        <el-form-item label="系统版本">
          <el-input v-model="addForm.os.version" />
        </el-form-item>
        <el-form-item label="架构">
          <el-input v-model="addForm.os.architecture" />
        </el-form-item>
        <el-form-item label="安装日期">
          <el-input v-model="addForm.os.install_date" />
        </el-form-item>
      </el-form>
      
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="showAddForm = false">取消</el-button>
          <el-button type="primary" @click="createAsset" :loading="saving">创建资产</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script>
import { ref, computed, onMounted, reactive } from 'vue'
import { getAssets, deleteAsset, createAsset as apiCreateAsset, exportAssetsAsJson, exportAssetsAsExcel, importAssetsFromJson, importAssetsFromExcel } from '../api/asset'
import { ElMessage, ElMessageBox } from 'element-plus'

export default {
  name: 'AssetList',
  setup() {
    const assets = ref([])
    const loading = ref(true)
    const searchQuery = ref('')
    const showAddForm = ref(false)
    const saving = ref(false)
    const addFormRef = ref(null)
    
    // 表单规则
    const formRules = {
      name: [
        { required: true, message: '请输入资产名称', trigger: 'blur' },
        { min: 2, max: 50, message: '长度在 2 到 50 个字符', trigger: 'blur' }
      ]
    }
    
    // 初始化添加资产表单
    const addForm = ref({
      name: '',
      monitor: '',
      cpu: { model: '', cores: 1, threads: 2 },
      motherboard: { manufacturer: '', model: '', serial: '' },
      memory: { total: '', slots: [] },
      disks: [],
      gpus: [],
      os: { name: '', version: '', architecture: '', install_date: '' }
    })
    
    // 导入导出相关
    const showImportDialog = ref(false)
    const importType = ref('json')
    const selectedFile = ref(null)
    const importFileList = ref([])
    const importing = ref(false)
    
    // 格式化日期
    const formatDate = (dateString) => {
      const date = new Date(dateString)
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
    }
    
    // 根据搜索关键词过滤资产
    const filteredAssets = computed(() => {
      if (!searchQuery.value) {
        return assets.value
      }
      
      const query = searchQuery.value.toLowerCase()
      return assets.value.filter(asset => 
        asset.name.toLowerCase().includes(query) || 
        (asset.cpu?.model && asset.cpu.model.toLowerCase().includes(query)) ||
        (asset.os?.name && asset.os.name.toLowerCase().includes(query))
      )
    })
    
    // 获取资产数据
    const fetchAssets = async () => {
      loading.value = true
      try {
        const response = await getAssets()
        assets.value = response.data
      } catch (error) {
        console.error('获取资产数据失败:', error)
        ElMessage.error('获取资产数据失败')
      } finally {
        loading.value = false
      }
    }
    
    // 搜索处理
    const handleSearch = () => {
      // 搜索功能已通过计算属性实现
    }
    
    // 删除资产
    const handleDelete = (asset) => {
      ElMessageBox.confirm(
        `确定要删除资产"${asset.name}"吗？`,
        '删除确认',
        {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning'
        }
      ).then(async () => {
        try {
          await deleteAsset(asset.id)
          ElMessage.success('删除成功')
          await fetchAssets() // 重新加载资产列表
        } catch (error) {
          console.error('删除资产失败:', error)
          ElMessage.error('删除资产失败')
        }
      }).catch(() => {
        // 用户取消删除
      })
    }
    
    // 添加内存插槽
    const addMemorySlot = () => {
      addForm.value.memory.slots.push({
        size: '0',
        type: '',
        speed: '0',
        manufacturer: ''
      })
    }
    
    // 移除内存插槽
    const removeMemorySlot = (index) => {
      addForm.value.memory.slots.splice(index, 1)
    }
    
    // 添加存储设备
    const addDisk = () => {
      addForm.value.disks.push({
        model: '',
        size: '0GB',
        interface: '',
        serial: ''
      })
    }
    
    // 移除存储设备
    const removeDisk = (index) => {
      addForm.value.disks.splice(index, 1)
    }
    
    // 添加显卡
    const addGpu = () => {
      addForm.value.gpus.push({
        model: '',
        memory: '0GB',
        driver: '',
        resolution: ''
      })
    }
    
    // 移除显卡
    const removeGpu = (index) => {
      addForm.value.gpus.splice(index, 1)
    }
    
    // 创建新资产
    const createAsset = async () => {
      // 表单验证
      addFormRef.value.validate(async (valid) => {
        if (!valid) {
          ElMessage.warning('请填写必填项')
          return
        }
        
        saving.value = true
        try {
          const response = await apiCreateAsset(addForm.value)
          ElMessage.success('资产创建成功')
          showAddForm.value = false
          
          // 重置表单
          addForm.value = {
            name: '',
            monitor: '',
            cpu: { model: '', cores: 1, threads: 2 },
            motherboard: { manufacturer: '', model: '', serial: '' },
            memory: { total: '', slots: [] },
            disks: [],
            gpus: [],
            os: { name: '', version: '', architecture: '', install_date: '' }
          }
          
          // 重新加载资产列表
          await fetchAssets()
        } catch (error) {
          console.error('创建资产失败:', error)
          ElMessage.error('创建资产失败')
        } finally {
          saving.value = false
        }
      })
    }
    
    // 处理导出命令
    const handleExport = async (command) => {
      try {
        loading.value = true
        let response
        let filename
        
        if (command === 'json') {
          response = await exportAssetsAsJson()
          filename = 'assets.json'
        } else if (command === 'excel') {
          response = await exportAssetsAsExcel()
          filename = 'assets.xlsx'
        }
        
        // 创建下载链接
        const blob = new Blob([response.data])
        const link = document.createElement('a')
        link.href = URL.createObjectURL(blob)
        link.download = filename
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        
        ElMessage.success('导出成功')
      } catch (error) {
        console.error('导出失败:', error)
        ElMessage.error('导出失败')
      } finally {
        loading.value = false
      }
    }
    
    // 处理导入命令
    const handleImport = (command) => {
      importType.value = command
      selectedFile.value = null
      importFileList.value = []
      showImportDialog.value = true
    }
    
    // 处理文件选择
    const handleFileChange = (file) => {
      selectedFile.value = file.raw
      importFileList.value = [file]
    }
    
    // 取消导入
    const cancelImport = () => {
      showImportDialog.value = false
      selectedFile.value = null
      importFileList.value = []
    }
    
    // 确认导入
    const confirmImport = async () => {
      if (!selectedFile.value) {
        ElMessage.warning('请先选择文件')
        return
      }
      
      try {
        // 二次确认
        await ElMessageBox.confirm(
          '导入将覆盖所有现有数据，确定要继续吗？',
          '警告',
          {
            confirmButtonText: '确定',
            cancelButtonText: '取消',
            type: 'warning'
          }
        )
        
        importing.value = true
        
        // 执行导入
        let response
        if (importType.value === 'json') {
          response = await importAssetsFromJson(selectedFile.value)
        } else {
          response = await importAssetsFromExcel(selectedFile.value)
        }
        
        showImportDialog.value = false
        ElMessage.success(`导入成功，共导入 ${response.data.count} 条数据`)
        
        // 重新加载数据
        fetchAssets()
      } catch (error) {
        if (error === 'cancel') return
        
        console.error('导入失败:', error)
        let errorMsg = '导入失败'
        
        if (error.response && error.response.data && error.response.data.error) {
          errorMsg = `导入失败: ${error.response.data.error}`
        }
        
        ElMessage.error(errorMsg)
      } finally {
        importing.value = false
      }
    }
    
    // 初始化时获取数据
    onMounted(fetchAssets)
    
    return {
      assets,
      filteredAssets,
      loading,
      searchQuery,
      showAddForm,
      addForm,
      addFormRef,
      formRules,
      saving,
      formatDate,
      handleSearch,
      handleDelete,
      addMemorySlot,
      removeMemorySlot,
      addDisk,
      removeDisk,
      addGpu,
      removeGpu,
      createAsset,
      // 导入导出相关
      showImportDialog,
      importType,
      selectedFile,
      importFileList,
      importing,
      handleExport,
      handleImport,
      handleFileChange,
      cancelImport,
      confirmImport
    }
  }
}
</script>

<style scoped>
.asset-list-container {
  padding: 20px;
}

.header-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.page-title {
  margin: 0;
  font-size: 24px;
  color: #303133;
}

.action-buttons {
  display: flex;
  gap: 10px;
}

.filter-card {
  margin-bottom: 20px;
}

.empty-placeholder {
  margin-top: 40px;
  text-align: center;
}

.empty-actions {
  margin-top: 20px;
}

.hint-text {
  color: #909399;
  font-size: 14px;
  margin-bottom: 15px;
}

.memory-slot-form,
.disk-form,
.gpu-form {
  margin-bottom: 15px;
}

.slot-card,
.disk-card,
.gpu-card {
  margin-bottom: 10px;
}

.slot-header,
.disk-header,
.gpu-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.slot-header h4,
.disk-header h4,
.gpu-header h4 {
  margin: 0;
}

:deep(.el-dialog__body) {
  max-height: 70vh;
  overflow-y: auto;
}

.import-dialog-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.upload-area {
  margin-top: 20px;
}
</style> 