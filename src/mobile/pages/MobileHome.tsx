import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  FileOutline, UserOutline, CheckShieldOutline, SetOutline,
  SearchOutline, ClockCircleOutline, ExclamationOutline, EditSOutline,
} from 'antd-mobile-icons'
import { useApp } from '../../contexts/AppContext'
import { useTodoStats } from '../../hooks/useTodoStats'
import './home.css'

// 首页菜单
const menuItems = [
  { key: '/mobile/orders', name: '生产订单', icon: <FileOutline />, color: '#1890ff', enabled: true },
  { key: '/mobile/reporting', name: '移动报工', icon: <UserOutline />, color: '#52c41a', enabled: true },
  { key: '/mobile/quality', name: '质量检验', icon: <CheckShieldOutline />, color: '#722ed1', enabled: false },
  { key: '/mobile/inspection', name: '设备巡检', icon: <SetOutline />, color: '#13c2c2', enabled: false },
  { key: '/mobile/craft', name: '工艺查询', icon: <SearchOutline />, color: '#fa8c16', enabled: false },
  { key: '/mobile/trace', name: '工单追踪', icon: <ClockCircleOutline />, color: '#eb2f96', enabled: false },
  { key: '/mobile/exception', name: '异常上报', icon: <ExclamationOutline />, color: '#f5222d', enabled: false },
  { key: '/mobile/archive', name: '档案更新', icon: <EditSOutline />, color: '#faad14', enabled: false },
]

/** 根据屏幕宽度自动计算列数 */
function autoColumns(w: number): number {
  if (w <= 360) return 3
  if (w < 480) return 4
  return 5
}

export default function MobileHome() {
  const navigate = useNavigate()
  const { currentUser } = useApp()
  const { stats } = useTodoStats()
  const [columns, setColumns] = useState(4)

  useEffect(() => {
    const update = () => setColumns(autoColumns(window.innerWidth))
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  // ========== 待办事项（来自真实 API） ==========
  interface TodoItem { id: string; icon: string; label: string; count: number; color: string; path: string }
  const todos = useMemo<TodoItem[]>(() => {
    const arr: TodoItem[] = []
    if (stats.orderRelease > 0) arr.push({ id: 'release', icon: '📋', label: '待下发订单', count: stats.orderRelease, color: '#1890ff', path: '/mobile/orders' })
    if (stats.orderStart > 0) arr.push({ id: 'start', icon: '▶️', label: '已下发待开工', count: stats.orderStart, color: '#fa8c16', path: '/mobile/orders' })
    if (stats.orderRunning > 0) arr.push({ id: 'running', icon: '🏭', label: '进行中订单', count: stats.orderRunning, color: '#52c41a', path: '/mobile/reporting' })
    if (stats.orderPartial > 0) arr.push({ id: 'partial', icon: '🔧', label: '需补报剩余', count: stats.orderPartial, color: '#eb2f96', path: '/mobile/orders' })
    return arr
  }, [stats])

  // 九宫格角标：给有真实待办的菜单加 badge
  const getBadge = (menuKey: string): number => {
    if (!todos || todos.length === 0) return 0
    if (menuKey === '/mobile/orders') return stats.orderRelease + stats.orderStart + stats.orderPartial
    if (menuKey === '/mobile/reporting') return stats.orderRunning
    return 0
  }

  const name = currentUser?.real_name || currentUser?.username || '同事'
  const greeting = (() => {
    const h = new Date().getHours()
    if (h < 6) return '凌晨好'; if (h < 12) return '早上好'
    if (h < 14) return '中午好'; if (h < 18) return '下午好'
    return '晚上好'
  })()

  return (
    <div className="mobile-page home-page">
      {/* 欢迎区 */}
      <div style={{ marginBottom: 12, padding: '4px 4px 0' }}>
        <div style={{ fontSize: 13, color: '#888' }}>{greeting}，{name}</div>
        <div style={{ fontSize: 18, fontWeight: 600, color: '#222', marginTop: 2 }}>今天也要加油 💪</div>
      </div>

      {/* 待办事项卡（固定 3 行 + 自动滚动） */}
      <TodoCard todos={todos} onNav={(p) => p && navigate(p)} />

      {/* 功能菜单（自动列数） */}
      <div className="home-section-title">功能菜单</div>
      <div
        className="mobile-menu-grid"
        style={{
          gridTemplateColumns: `repeat(${columns}, 1fr)`,
        }}
      >
        {menuItems.map((item) => {
          const badge = getBadge(item.key)
          return (
            <div
              key={item.key}
              className={`mobile-menu-item ${item.enabled ? '' : 'disabled'}`}
              onClick={() => item.enabled && navigate(item.key)}
            >
              <div className="mobile-menu-icon-wrapper">
                <div className="mobile-menu-icon" style={{ color: item.color }}>
                  {item.icon}
                </div>
                {badge > 0 && (
                  <span className="mobile-menu-badge">
                    {badge > 99 ? '99+' : badge}
                  </span>
                )}
              </div>
              <div className="mobile-menu-name">{item.name}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ========== 待办事项卡组件 ==========
const ROW_HEIGHT = 52 // px

function TodoCard({ todos, onNav }: { todos: { id: string; icon: string; label: string; count: number; color: string; path: string }[]; onNav: (path?: string) => void }) {
  const shouldScroll = todos.length > 3
  const display = shouldScroll ? [...todos, ...todos] : todos
  const rowHeight = ROW_HEIGHT

  if (todos.length === 0) {
    return (
      <div style={{
        background: '#fff', borderRadius: 10, padding: '10px 14px',
        border: '1px solid #eef0f3', color: '#999', fontSize: 13, textAlign: 'center',
        height: rowHeight * 3, display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        ✨ 暂无待办，一切顺利
      </div>
    )
  }

  return (
    <div style={{
      background: 'linear-gradient(135deg, #1890ff 0%, #40a9ff 100%)',
      borderRadius: 12, padding: '10px 14px', color: '#fff', marginBottom: 4,
      boxShadow: '0 4px 12px rgba(24,144,255,0.2)',
    }}>
      <div style={{ fontSize: 12, opacity: 0.9, marginBottom: 6, display: 'flex', justifyContent: 'space-between' }}>
        <span>📌 待办事项</span>
        <span style={{ fontSize: 11, opacity: 0.7 }}>共 {todos.reduce((s, t) => s + t.count, 0)} 项待处理</span>
      </div>
      <div style={{ height: rowHeight * 3, overflow: 'hidden', position: 'relative' }}>
        <div style={shouldScroll ? { animation: `todoScroll ${todos.length * 2}s linear infinite` } : undefined}>
          {display.map((t, i) => (
            <div
              key={`${t.id}-${i}`}
              onClick={() => onNav(t.path)}
              style={{
                height: rowHeight, display: 'flex', alignItems: 'center', gap: 10,
                cursor: t.path ? 'pointer' : 'default',
              }}
            >
              <div style={{
                width: 32, height: 32, borderRadius: 8,
                background: 'rgba(255,255,255,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 16,
              }}>{t.icon}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{t.label}</div>
                <div style={{ fontSize: 11, opacity: 0.7 }}>点击前往处理</div>
              </div>
              <div style={{
                fontSize: 16, fontWeight: 700, color: '#fff',
                background: t.color, borderRadius: 10, padding: '2px 10px', minWidth: 32, textAlign: 'center',
              }}>{t.count}</div>
            </div>
          ))}
        </div>
      </div>
      {shouldScroll && <style>{`@keyframes todoScroll { 0%{transform:translateY(0)} 100%{transform:translateY(-${todos.length * rowHeight}px)} }`}</style>}
    </div>
  )
}
