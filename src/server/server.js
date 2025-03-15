const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const os = require('os');
const excel = require('exceljs'); // 需要安装：npm install exceljs
const multer = require('multer'); // 需要安装：npm install multer

const app = express();
const PORT = process.env.PORT || 80;
const HOST = '0.0.0.0'; // 监听所有网络接口，允许局域网访问

// 设置文件上传
const upload = multer({ 
  dest: path.join(__dirname, 'uploads/'),
  limits: { fileSize: 10 * 1024 * 1024 } // 限制10MB
});

// 获取本机内网IP地址
function getLocalIP() {
  const interfaces = os.networkInterfaces();
  const addresses = [];
  const virtualAdapterKeywords = ['vmware', 'virtual', 'virtualbox', 'docker', 'mihomo', 'hyper-v'];
  const physicalAdapterKeywords = ['ethernet', '以太网', 'wlan', 'wi-fi', '无线网络', 'lan'];
  
  // 首先收集所有地址
  for (const interfaceName in interfaces) {
    const networkInterface = interfaces[interfaceName];
    
    for (const iface of networkInterface) {
      // 跳过非IPv4和内部回环地址
      if (iface.family !== 'IPv4' || iface.internal) {
        continue;
      }
      
      // 检查是否是以.1结尾的地址（通常是虚拟网卡或网关）
      const isLikelyVirtual = iface.address.endsWith('.1');
      
      // 检查网卡名称是否包含虚拟网卡关键词
      const lowerInterfaceName = interfaceName.toLowerCase();
      const isVirtualByName = virtualAdapterKeywords.some(keyword => 
        lowerInterfaceName.includes(keyword)
      );
      
      // 检查是否可能是物理网卡
      const isLikelyPhysical = physicalAdapterKeywords.some(keyword => 
        lowerInterfaceName.includes(keyword)
      );
      
      addresses.push({
        name: interfaceName,
        address: iface.address,
        isLikelyVirtual: isLikelyVirtual || isVirtualByName,
        isLikelyPhysical
      });
    }
  }
  
  // 对地址进行排序，优先返回物理网卡地址
  addresses.sort((a, b) => {
    // 首先优先考虑物理网卡
    if (a.isLikelyPhysical && !b.isLikelyPhysical) return -1;
    if (!a.isLikelyPhysical && b.isLikelyPhysical) return 1;
    
    // 然后排除虚拟网卡
    if (!a.isLikelyVirtual && b.isLikelyVirtual) return -1;
    if (a.isLikelyVirtual && !b.isLikelyVirtual) return 1;
    
    return 0;
  });
  
  return addresses;
}

// 中间件
app.use(cors());
app.use(morgan('dev'));
app.use(bodyParser.json());

// 确保数据目录存在
const dataDir = path.join(__dirname, '../../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir);
}
const assetsFile = path.join(dataDir, 'assets.json');

// 如果assets.json不存在，则创建
if (!fs.existsSync(assetsFile)) {
  fs.writeFileSync(assetsFile, JSON.stringify([], null, 2));
}

// API 路由
const apiRouter = express.Router();

// 获取所有资产
apiRouter.get('/assets', (req, res) => {
  try {
    const assets = JSON.parse(fs.readFileSync(assetsFile));
    res.json(assets);
  } catch (error) {
    console.error('获取资产列表失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 获取单个资产
apiRouter.get('/assets/:id', (req, res) => {
  try {
    const assets = JSON.parse(fs.readFileSync(assetsFile));
    const asset = assets.find(a => a.id === req.params.id);
    
    if (!asset) {
      return res.status(404).json({ error: '资产未找到' });
    }
    
    res.json(asset);
  } catch (error) {
    console.error('获取资产详情失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 添加新资产
apiRouter.post('/assets', (req, res) => {
  try {
    const assets = JSON.parse(fs.readFileSync(assetsFile));
    const newAsset = {
      ...req.body,
      id: Date.now().toString(),
      createdAt: new Date().toISOString()
    };
    
    assets.push(newAsset);
    fs.writeFileSync(assetsFile, JSON.stringify(assets, null, 2));
    
    res.status(201).json(newAsset);
  } catch (error) {
    console.error('添加资产失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 更新资产
apiRouter.put('/assets/:id', (req, res) => {
  try {
    const assets = JSON.parse(fs.readFileSync(assetsFile));
    const index = assets.findIndex(a => a.id === req.params.id);
    
    if (index === -1) {
      return res.status(404).json({ error: '资产未找到' });
    }
    
    // 保存原始资产数据，用于比较
    const originalAsset = assets[index];
    
    // 处理日志信息
    const logEntry = req.body.logEntry;
    // 删除请求体中的logEntry，避免将其存储为资产的属性
    const assetData = { ...req.body };
    delete assetData.logEntry;
    
    // 保存当前的changeLog
    const existingChangeLog = originalAsset.changeLog || [];
    
    // 比较原始资产和更新后的资产，生成修改内容记录
    const changes = generateChangesLog(originalAsset, assetData);
    
    // 如果有新的日志，添加到历史记录中
    if ((logEntry && logEntry.message) || changes.length > 0) {
      const changeMessage = logEntry && logEntry.message 
        ? `${logEntry.message}\n\n自动记录的修改内容：\n${changes.join('\n')}`
        : `自动记录的修改内容：\n${changes.join('\n')}`;
        
      existingChangeLog.push({
        message: changeMessage,
        timestamp: (logEntry && logEntry.timestamp) || new Date().toISOString(),
        user: req.body.user || '系统用户',
        autoDetectedChanges: changes
      });
    }
    
    const updatedAsset = {
      ...originalAsset,
      ...assetData,
      // 确保更新后的资产包含完整的changeLog
      changeLog: existingChangeLog,
      id: req.params.id,
      updatedAt: new Date().toISOString()
    };
    
    assets[index] = updatedAsset;
    fs.writeFileSync(assetsFile, JSON.stringify(assets, null, 2));
    
    res.json(updatedAsset);
  } catch (error) {
    console.error('更新资产失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 生成修改内容记录函数
function generateChangesLog(originalAsset, updatedAsset) {
  const changes = [];
  
  // 简单字段比较（排除monitors数组的比较，单独处理）
  compareSimpleProperties(changes, originalAsset, updatedAsset, '');
  
  // 特殊处理显示器信息
  const originalMonitors = originalAsset.monitors || [];
  const updatedMonitors = updatedAsset.monitors || [];
  
  if (originalMonitors.length > updatedMonitors.length) {
    changes.push(`删除了 ${originalMonitors.length - updatedMonitors.length} 个显示器`);
    // 显示被删除的显示器信息
    for (let i = updatedMonitors.length; i < originalMonitors.length; i++) {
      const monitor = originalMonitors[i];
      changes.push(`  - 删除的显示器: ${formatMonitor(monitor)}`);
    }
  } else if (originalMonitors.length < updatedMonitors.length) {
    changes.push(`添加了 ${updatedMonitors.length - originalMonitors.length} 个显示器`);
    // 显示新增的显示器信息
    for (let i = originalMonitors.length; i < updatedMonitors.length; i++) {
      const monitor = updatedMonitors[i];
      changes.push(`  + 新增的显示器: ${formatMonitor(monitor)}`);
    }
  }
  
  // 比较每个显示器的变化
  for (let i = 0; i < Math.min(originalMonitors.length, updatedMonitors.length); i++) {
    const originalMonitor = originalMonitors[i];
    const updatedMonitor = updatedMonitors[i];
    
    // 检查显示器是否有变化
    if (JSON.stringify(originalMonitor) !== JSON.stringify(updatedMonitor)) {
      changes.push(`修改了显示器 ${i+1}:`);
      compareObjects(changes, originalMonitor, updatedMonitor, `  显示器 ${i+1}`);
    }
  }
  
  // 特殊处理CPU信息
  if (originalAsset.cpu || updatedAsset.cpu) {
    compareObjects(changes, originalAsset.cpu || {}, updatedAsset.cpu || {}, '处理器');
  }
  
  // 特殊处理主板信息
  if (originalAsset.motherboard || updatedAsset.motherboard) {
    compareObjects(changes, originalAsset.motherboard || {}, updatedAsset.motherboard || {}, '主板');
  }
  
  // 特殊处理内存信息 - 总容量等基本信息
  if (originalAsset.memory || updatedAsset.memory) {
    // 提取memory中除slots以外的属性进行比较
    const originalMemoryBasic = { ...originalAsset.memory || {} };
    const updatedMemoryBasic = { ...updatedAsset.memory || {} };
    
    // 删除slots属性，单独处理
    delete originalMemoryBasic.slots;
    delete updatedMemoryBasic.slots;
    
    // 比较基本内存信息
    compareObjects(changes, originalMemoryBasic, updatedMemoryBasic, '内存');
    
    // 单独处理内存插槽
    const originalSlots = (originalAsset.memory && originalAsset.memory.slots) || [];
    const updatedSlots = (updatedAsset.memory && updatedAsset.memory.slots) || [];
    
    if (originalSlots.length > updatedSlots.length) {
      changes.push(`删除了 ${originalSlots.length - updatedSlots.length} 个内存插槽`);
      // 显示被删除的内存插槽信息
      for (let i = updatedSlots.length; i < originalSlots.length; i++) {
        const slot = originalSlots[i];
        changes.push(`  - 删除的插槽 ${i+1}: ${formatMemorySlot(slot)}`);
      }
    } else if (originalSlots.length < updatedSlots.length) {
      changes.push(`添加了 ${updatedSlots.length - originalSlots.length} 个内存插槽`);
      // 显示新增的内存插槽信息
      for (let i = originalSlots.length; i < updatedSlots.length; i++) {
        const slot = updatedSlots[i];
        changes.push(`  + 新增的插槽 ${i+1}: ${formatMemorySlot(slot)}`);
      }
    }
    
    // 比较共有的内存插槽变化
    for (let i = 0; i < Math.min(originalSlots.length, updatedSlots.length); i++) {
      const originalSlot = originalSlots[i];
      const updatedSlot = updatedSlots[i];
      
      // 检查内存插槽是否有变化
      if (JSON.stringify(originalSlot) !== JSON.stringify(updatedSlot)) {
        changes.push(`修改了内存插槽 ${i+1}:`);
        compareObjects(changes, originalSlot, updatedSlot, `  内存插槽 ${i+1}`);
      }
    }
  }
  
  // 特殊处理硬盘信息
  const originalDisks = originalAsset.disks || [];
  const updatedDisks = updatedAsset.disks || [];
  
  if (originalDisks.length > updatedDisks.length) {
    changes.push(`删除了 ${originalDisks.length - updatedDisks.length} 个存储设备`);
    // 显示被删除的设备信息
    for (let i = updatedDisks.length; i < originalDisks.length; i++) {
      const disk = originalDisks[i];
      changes.push(`  - 删除的存储设备: ${formatDisk(disk)}`);
    }
  } else if (originalDisks.length < updatedDisks.length) {
    changes.push(`添加了 ${updatedDisks.length - originalDisks.length} 个存储设备`);
    // 显示新增的设备信息
    for (let i = originalDisks.length; i < updatedDisks.length; i++) {
      const disk = updatedDisks[i];
      changes.push(`  + 新增的存储设备: ${formatDisk(disk)}`);
    }
  }
  
  // 比较每个硬盘的变化 (仅比较现有数量内的)
  for (let i = 0; i < Math.min(originalDisks.length, updatedDisks.length); i++) {
    const originalDisk = originalDisks[i];
    const updatedDisk = updatedDisks[i];
    
    // 检查硬盘是否有变化
    if (JSON.stringify(originalDisk) !== JSON.stringify(updatedDisk)) {
      changes.push(`修改了存储设备 ${i+1}:`);
      compareObjects(changes, originalDisk, updatedDisk, `  存储设备 ${i+1}`);
    }
  }
  
  // 特殊处理显卡信息
  const originalGpus = originalAsset.gpus || [];
  const updatedGpus = updatedAsset.gpus || [];
  
  if (originalGpus.length > updatedGpus.length) {
    changes.push(`删除了 ${originalGpus.length - updatedGpus.length} 个显卡`);
    // 显示被删除的显卡信息
    for (let i = updatedGpus.length; i < originalGpus.length; i++) {
      const gpu = originalGpus[i];
      changes.push(`  - 删除的显卡: ${formatGpu(gpu)}`);
    }
  } else if (originalGpus.length < updatedGpus.length) {
    changes.push(`添加了 ${updatedGpus.length - originalGpus.length} 个显卡`);
    // 显示新增的显卡信息
    for (let i = originalGpus.length; i < updatedGpus.length; i++) {
      const gpu = updatedGpus[i];
      changes.push(`  + 新增的显卡: ${formatGpu(gpu)}`);
    }
  }
  
  // 比较每个显卡的变化
  for (let i = 0; i < Math.min(originalGpus.length, updatedGpus.length); i++) {
    const originalGpu = originalGpus[i];
    const updatedGpu = updatedGpus[i];
    
    // 检查显卡是否有变化
    if (JSON.stringify(originalGpu) !== JSON.stringify(updatedGpu)) {
      changes.push(`修改了显卡 ${i+1}:`);
      compareObjects(changes, originalGpu, updatedGpu, `  显卡 ${i+1}`);
    }
  }
  
  // 特殊处理操作系统信息
  if (originalAsset.os || updatedAsset.os) {
    compareObjects(changes, originalAsset.os || {}, updatedAsset.os || {}, '操作系统');
  }
  
  return changes;
}

// 格式化显示器信息
function formatMonitor(monitor) {
  if (!monitor) return '无信息';
  
  let result = [];
  if (monitor.model) result.push(monitor.model);
  if (monitor.size) result.push(monitor.size);
  if (monitor.resolution) result.push(monitor.resolution);
  if (monitor.manufacturer) result.push(monitor.manufacturer);
  
  return result.length > 0 ? result.join(', ') : '无详细信息';
}

// 格式化内存插槽信息
function formatMemorySlot(slot) {
  if (!slot) return '无信息';
  
  let result = [];
  if (slot.size) result.push(`${slot.size}GB`);
  if (slot.type) result.push(slot.type);
  if (slot.speed) result.push(`${slot.speed}MHz`);
  if (slot.manufacturer) result.push(slot.manufacturer);
  
  return result.length > 0 ? result.join(', ') : '无详细信息';
}

// 格式化硬盘信息
function formatDisk(disk) {
  if (!disk) return '无信息';
  
  let result = [];
  if (disk.model) result.push(disk.model);
  if (disk.size) result.push(disk.size);
  if (disk.interface) result.push(disk.interface);
  if (disk.serial) result.push(`序列号:${disk.serial}`);
  
  return result.length > 0 ? result.join(', ') : '无详细信息';
}

// 格式化显卡信息
function formatGpu(gpu) {
  if (!gpu) return '无信息';
  
  let result = [];
  if (gpu.model) result.push(gpu.model);
  if (gpu.memory) result.push(`${gpu.memory}`);
  if (gpu.resolution) result.push(gpu.resolution);
  
  return result.length > 0 ? result.join(', ') : '无详细信息';
}

// 比较简单属性
function compareSimpleProperties(changes, originalObj, updatedObj, prefix) {
  // 只比较name属性，移除monitor的比较
  const simpleProps = ['name'];
  
  for (const prop of simpleProps) {
    if (originalObj[prop] !== updatedObj[prop]) {
      if (!originalObj[prop] && updatedObj[prop]) {
        changes.push(`添加了资产名称：${updatedObj[prop]}`);
      } else if (originalObj[prop] && !updatedObj[prop]) {
        changes.push(`删除了资产名称：${originalObj[prop]}`);
      } else {
        changes.push(`修改了资产名称：从 "${originalObj[prop]}" 改为 "${updatedObj[prop]}"`);
      }
    }
  }
}

// 比较对象
function compareObjects(changes, originalObj, updatedObj, objectName) {
  // 参数检查
  if (!originalObj) originalObj = {};
  if (!updatedObj) updatedObj = {};
  
  const allProps = [...new Set([...Object.keys(originalObj), ...Object.keys(updatedObj)])];
  
  for (const prop of allProps) {
    // 忽略一些不需要比较的属性
    if (['changeLog', 'id', 'createdAt', 'updatedAt', 'slots', 'monitors'].includes(prop)) {
      continue;
    }
    
    // 获取属性的显示名称
    const propDisplayName = getPropDisplayName(prop);
    const originalValue = originalObj[prop];
    const updatedValue = updatedObj[prop];
    
    // 如果都是对象，但不是数组，进行递归比较
    if (typeof originalValue === 'object' && typeof updatedValue === 'object' && 
        originalValue !== null && updatedValue !== null &&
        !Array.isArray(originalValue) && !Array.isArray(updatedValue)) {
      // 递归比较嵌套对象
      compareObjects(changes, originalValue, updatedValue, `${objectName} - ${propDisplayName}`);
    }
    // 如果两者都是数组，单独处理
    else if (Array.isArray(originalValue) && Array.isArray(updatedValue)) {
      // 数组的比较逻辑在generateChangesLog中针对特定类型的数组单独处理
      continue;
    }
    // 比较简单值或不同类型的值
    else if (originalValue !== updatedValue) {
      if (originalValue === undefined && updatedValue !== undefined) {
        changes.push(`添加了 ${objectName} - ${propDisplayName}：${safeValueToString(updatedValue)}`);
      } else if (originalValue !== undefined && updatedValue === undefined) {
        changes.push(`删除了 ${objectName} - ${propDisplayName}：${safeValueToString(originalValue)}`);
      } else {
        changes.push(`修改了 ${objectName} - ${propDisplayName}：从 "${safeValueToString(originalValue)}" 改为 "${safeValueToString(updatedValue)}"`);
      }
    }
  }
}

// 安全地将值转换为字符串，避免[object Object]问题
function safeValueToString(value) {
  if (value === null || value === undefined) {
    return '空';
  }
  
  if (typeof value === 'object') {
    if (Array.isArray(value)) {
      return value.length > 0 ? `[${value.map(v => safeValueToString(v)).join(', ')}]` : '[]';
    } else {
      try {
        // 对于对象，尝试格式化为JSON字符串
        return JSON.stringify(value);
      } catch (e) {
        return '复杂对象';
      }
    }
  }
  
  return String(value);
}

// 获取属性的显示名称
function getPropDisplayName(prop) {
  const propMap = {
    'model': '型号',
    'cores': '核心数',
    'threads': '线程数',
    'manufacturer': '制造商',
    'serial': '序列号',
    'total': '总容量',
    'size': '尺寸',
    'type': '类型',
    'speed': '频率',
    'interface': '接口',
    'memory': '显存',
    'driver': '驱动程序',
    'resolution': '分辨率',
    'name': '名称',
    'version': '版本',
    'architecture': '架构',
    'install_date': '安装日期'
  };
  
  return propMap[prop] || prop;
}

// 删除资产
apiRouter.delete('/assets/:id', (req, res) => {
  try {
    const assets = JSON.parse(fs.readFileSync(assetsFile));
    const filteredAssets = assets.filter(a => a.id !== req.params.id);
    
    if (filteredAssets.length === assets.length) {
      return res.status(404).json({ error: '资产未找到' });
    }
    
    fs.writeFileSync(assetsFile, JSON.stringify(filteredAssets, null, 2));
    
    res.status(204).end();
  } catch (error) {
    console.error('删除资产失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 导出所有资产为JSON
apiRouter.get('/assets/export/json', (req, res) => {
  try {
    const assets = JSON.parse(fs.readFileSync(assetsFile));
    res.setHeader('Content-Disposition', 'attachment; filename=assets.json');
    res.setHeader('Content-Type', 'application/json');
    res.json(assets);
  } catch (error) {
    console.error('导出JSON失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 导出所有资产为Excel
apiRouter.get('/assets/export/excel', async (req, res) => {
  try {
    const assets = JSON.parse(fs.readFileSync(assetsFile));
    
    // 创建Excel工作簿和工作表
    const workbook = new excel.Workbook();
    const worksheet = workbook.addWorksheet('资产列表');
    
    // 设置表头
    worksheet.columns = [
      { header: '资产名称', key: 'name', width: 20 },
      { header: '创建日期', key: 'createdAt', width: 20 },
      { header: '最后更新', key: 'updatedAt', width: 20 },
      { header: '操作系统', key: 'os', width: 20 },
      { header: '处理器', key: 'cpu', width: 30 },
      { header: '内存', key: 'memory', width: 15 },
      { header: '显示器', key: 'monitors', width: 30 },
      { header: '主板', key: 'motherboard', width: 20 },
      { header: '备注', key: 'notes', width: 40 }
    ];
    
    // 添加数据
    assets.forEach(asset => {
      worksheet.addRow({
        name: asset.name,
        createdAt: asset.createdAt,
        updatedAt: asset.updatedAt || '',
        os: asset.os ? `${asset.os.name || ''} ${asset.os.version || ''}` : '',
        cpu: asset.cpu ? asset.cpu.model : '',
        memory: asset.memory ? `${asset.memory.total}` : '',
        monitors: asset.monitors ? asset.monitors.map(m => m.model).join(', ') : '',
        motherboard: asset.motherboard ? asset.motherboard.model : '',
        notes: asset.notes || ''
      });
    });
    
    // 设置响应头
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=assets.xlsx');
    
    // 写入响应
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('导出Excel失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 导入JSON数据（会清空现有数据）
apiRouter.post('/assets/import/json', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '未提供文件' });
    }
    
    // 读取上传的JSON文件
    const fileData = fs.readFileSync(req.file.path);
    let importedAssets;
    
    try {
      importedAssets = JSON.parse(fileData);
      
      // 简单验证导入的数据
      if (!Array.isArray(importedAssets)) {
        return res.status(400).json({ error: '无效的数据格式，应为资产数组' });
      }
    } catch (parseError) {
      return res.status(400).json({ error: '无效的JSON格式' });
    }
    
    // 备份当前数据
    const backupPath = path.join(dataDir, `assets_backup_${Date.now()}.json`);
    fs.copyFileSync(assetsFile, backupPath);
    
    // 写入新数据
    fs.writeFileSync(assetsFile, JSON.stringify(importedAssets, null, 2));
    
    // 清理上传的临时文件
    fs.unlinkSync(req.file.path);
    
    res.json({ 
      message: '导入成功', 
      count: importedAssets.length,
      backup: backupPath 
    });
  } catch (error) {
    console.error('导入JSON失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 导入Excel数据（会清空现有数据）
apiRouter.post('/assets/import/excel', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '未提供文件' });
    }
    
    // 读取上传的Excel文件
    const workbook = new excel.Workbook();
    await workbook.xlsx.readFile(req.file.path);
    
    const worksheet = workbook.getWorksheet(1); // 获取第一个工作表
    if (!worksheet) {
      return res.status(400).json({ error: '无效的Excel文件格式' });
    }
    
    // 转换为资产数据
    const importedAssets = [];
    worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      // 跳过表头
      if (rowNumber > 1) {
        // 提取单元格值
        const asset = {
          id: Date.now() + rowNumber.toString(), // 生成唯一ID
          name: row.getCell(1).value || '未命名资产',
          createdAt: new Date().toISOString()
        };
        
        // 添加其他可选字段 (根据实际情况进行调整)
        if (row.getCell(4).value) {
          const osText = row.getCell(4).value.toString();
          asset.os = { name: osText };
        }
        
        if (row.getCell(5).value) {
          asset.cpu = { model: row.getCell(5).value.toString() };
        }
        
        if (row.getCell(6).value) {
          asset.memory = { total: row.getCell(6).value.toString() };
        }
        
        if (row.getCell(7).value) {
          const monitorsText = row.getCell(7).value.toString();
          asset.monitors = monitorsText.split(',').map(model => ({ model: model.trim() }));
        }
        
        if (row.getCell(8).value) {
          asset.motherboard = { model: row.getCell(8).value.toString() };
        }
        
        if (row.getCell(9).value) {
          asset.notes = row.getCell(9).value.toString();
        }
        
        importedAssets.push(asset);
      }
    });
    
    // 备份当前数据
    const backupPath = path.join(dataDir, `assets_backup_${Date.now()}.json`);
    fs.copyFileSync(assetsFile, backupPath);
    
    // 写入新数据
    fs.writeFileSync(assetsFile, JSON.stringify(importedAssets, null, 2));
    
    // 清理上传的临时文件
    fs.unlinkSync(req.file.path);
    
    res.json({ 
      message: '导入成功', 
      count: importedAssets.length,
      backup: backupPath 
    });
  } catch (error) {
    console.error('导入Excel失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 使用 /api 前缀的路由
app.use('/api', apiRouter);

// 设置静态文件目录，优先使用已构建的前端文件
const clientBuildPath = path.join(__dirname, '../../public');

// 提供静态文件服务
app.use(express.static(clientBuildPath));

// 所有其他请求重定向到前端应用
app.get('*', (req, res) => {
  res.sendFile(path.join(clientBuildPath, 'index.html'));
});

// 启动服务器
app.listen(PORT, HOST, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
  console.log(`API 接口地址: http://localhost:${PORT}/api`);
  
  // 显示内网IP
  const localIPs = getLocalIP();
  
  if (localIPs.length > 0) {
    console.log('\n局域网访问地址:');
    
    // 首先显示推荐的物理网卡地址
    const recommendedIPs = localIPs.filter(ip => !ip.isLikelyVirtual);
    if (recommendedIPs.length > 0) {
      console.log('\n✅ 推荐使用以下地址（物理网卡）:');
      recommendedIPs.forEach(ip => {
        console.log(`http://${ip.address}:${PORT} (${ip.name})`);
      });
      
      console.log('\n数据采集工具连接地址 (caiji.py):');
      console.log(`请在caiji.py中输入服务器地址: ${recommendedIPs[0].address}`);
    }
    
    // 然后显示其他网卡地址
    const otherIPs = localIPs.filter(ip => ip.isLikelyVirtual);
    if (otherIPs.length > 0) {
      console.log('\n⚠️ 其他可能的地址（可能是虚拟网卡）:');
      otherIPs.forEach(ip => {
        console.log(`http://${ip.address}:${PORT} (${ip.name})`);
      });
    }
  } else {
    console.log('\n未找到局域网IP地址');
  }
}); 