import { createRouter, createWebHistory } from 'vue-router'

// 导入页面组件
import AssetList from '../views/AssetList.vue'
import AssetDetail from '../views/AssetDetail.vue'
import Dashboard from '../views/Dashboard.vue'

// 定义路由
const routes = [
  {
    path: '/',
    name: 'Dashboard',
    component: Dashboard,
    meta: { title: '仪表盘' }
  },
  {
    path: '/assets',
    name: 'AssetList',
    component: AssetList,
    meta: { title: '资产列表' }
  },
  {
    path: '/assets/:id',
    name: 'AssetDetail',
    component: AssetDetail,
    meta: { title: '资产详情' }
  }
]

// 创建路由器
const router = createRouter({
  history: createWebHistory(),
  routes
})

// 路由前置守卫：设置页面标题
router.beforeEach((to, from, next) => {
  document.title = to.meta.title ? `${to.meta.title} - 电脑资产管理系统` : '电脑资产管理系统'
  next()
})

export default router 