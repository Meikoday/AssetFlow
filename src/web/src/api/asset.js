import axios from 'axios'

// 创建axios实例
const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// 获取所有资产
export function getAssets() {
  return api.get('/assets')
}

// 获取单个资产详情
export function getAssetById(id) {
  return api.get(`/assets/${id}`)
}

// 创建新资产
export function createAsset(data) {
  return api.post('/assets', data)
}

// 更新资产
export function updateAsset(id, data) {
  return api.put(`/assets/${id}`, data)
}

// 删除资产
export function deleteAsset(id) {
  return api.delete(`/assets/${id}`)
}

// 导出资产为JSON
export function exportAssetsAsJson() {
  return api.get('/assets/export/json', {
    responseType: 'blob'
  })
}

// 导出资产为Excel
export function exportAssetsAsExcel() {
  return api.get('/assets/export/excel', {
    responseType: 'blob'
  })
}

// 导入JSON数据
export function importAssetsFromJson(file) {
  const formData = new FormData()
  formData.append('file', file)
  
  return api.post('/assets/import/json', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  })
}

// 导入Excel数据
export function importAssetsFromExcel(file) {
  const formData = new FormData()
  formData.append('file', file)
  
  return api.post('/assets/import/excel', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  })
}

export default {
  getAssets,
  getAssetById,
  createAsset,
  updateAsset,
  deleteAsset,
  exportAssetsAsJson,
  exportAssetsAsExcel,
  importAssetsFromJson,
  importAssetsFromExcel
} 