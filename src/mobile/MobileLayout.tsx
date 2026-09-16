import React, { useEffect, useState } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { TabBar, Badge, Avatar, ActionSheet } from 'antd-mobile'
import {
  AppOutline,
  UnorderedListOutline,
  SetOutline,
  MessageOutline,
  UserOutline,
  AddOutline,
  CheckOutline,
  BellOutline,
  EditSOutline,
} from 'antd-mobile-icons'
import { useApp } from '../contexts/AppContext'
import { useTodoStats } from '../hooks/useTodoStats'
import api from '../utils/api'
import './mobile.css'

const SYSTEM_VERSION = 'V1.0.1.722'

const tabs = [
  { key: '/mobile/home', title: '首页', icon: <AppOutline /> },
  { key: '__production__', title: '生产', icon: <EditSOutline /> },
  { key: '/mobile/device', title: '设备', icon: <SetOutline /> },
  { key: '/mobile/messages', title: '消息', icon: <MessageOutline /> },
  { key: '/mobile/profile', title: '我的', icon: <UserOutline /> },
]

/** "生产"二级菜单 */
const PRODUCTION_ITEMS = [
  { text: '📋 生产订单', key: 'orders', route: '/mobile/orders' },
  { text: '🏭 移动报工', key: 'reporting', route: '/mobile/reporting' },
]

const DEVICE_TYPES = [
  { value: 'default', label: 'iPhone 13' },
  { value: 'iphone-se', label: 'iPhone SE' },
  { value: 'iphone-14-pro', label: 'iPhone 14 Pro' },
  { value: 'android-s', label: 'Android S' },
  { value: 'android-xl', label: 'Android XL' },
]

export default function MobileLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const { currentUser, systemConfig, loadSystemConfig } = useApp()
  const { stats } = useTodoStats()
  const [activeKey, setActiveKey] = useState('/mobile/home')
  const [isLandscape, setIsLandscape] = useState(false)
  const [deviceType, setDeviceType] = useState('default')
  const [showControls, setShowControls] = useState(false)

  useEffect(() => {
    const checkDesktop = () => {
      setShowControls(window.innerWidth >= 768)
    }
    checkDesktop()
    window.addEventListener('resize', checkDesktop)
    return () => window.removeEventListener('resize', checkDesktop)
  }, [])

  useEffect(() => {
    const path = location.pathname
    // "生产"家族路径高亮
    if (path === '/mobile/orders' || path === '/mobile/reporting') {
      setActiveKey('__production__')
      return
    }
    const matched = tabs.find(t => t.key === path || path.startsWith(t.key + '/'))
    if (matched) setActiveKey(matched.key)
  }, [location.pathname])

  useEffect(() => {
    if (!systemConfig.system_name) loadSystemConfig()
  }, [systemConfig.system_name, loadSystemConfig])

  const handleTabChange = (key) => {
    if (key === '__production__') {
      // 点击"生产"Tab → 弹出二级菜单
      ActionSheet.show({
        actions: PRODUCTION_ITEMS.map(it => ({ text: it.text, key: it.key })),
        cancelText: '取消',
        onAction: (action) => {
          const target = PRODUCTION_ITEMS.find(it => it.key === action.key)
          if (target) {
            setActiveKey('__production__')
            navigate(target.route)
          }
        },
      })
      return
    }
    setActiveKey(key)
    navigate(key)
  }

  const handleOrientationChange = () => {
    setIsLandscape(!isLandscape)
  }

  const handleDeviceChange = (e) => {
    setDeviceType(e.target.value)
  }

  const handleBackToPC = () => {
    navigate('/dashboard')
  }

  const systemName = systemConfig.system_name || 'MES工作台'

  const shellClass = `mobile-shell ${isLandscape ? 'landscape' : ''} ${deviceType !== 'default' ? deviceType : ''}`

  return (
    <>
      <div className={shellClass}>
        <header className="mobile-header">
          <div className="mobile-header-left">
            <div className="mobile-header-logo">
              <span className="mobile-header-logo-en">DM</span>
            </div>
            <div className="mobile-header-brand">
              <div className="mobile-header-system">{systemName}</div>
              <div className="mobile-header-ver">{SYSTEM_VERSION}</div>
            </div>
          </div>
          <div className="mobile-header-right">
            <div
              className="mobile-header-icon"
              onClick={() => navigate('/mobile/messages')}
            >
              <Badge content={stats.total > 0 ? (stats.total > 99 ? '99+' : stats.total) : null}>
                <BellOutline fontSize={20} />
              </Badge>
            </div>
            <div
              className="mobile-header-avatar"
              onClick={() => navigate('/mobile/profile')}
            >
              {currentUser?.avatar_url ? (
                <img src={currentUser.avatar_url} alt="" />
              ) : (
                <UserOutline fontSize={18} />
              )}
            </div>
          </div>
        </header>

        <main className="mobile-content">
          <Outlet />
        </main>

        <footer className="mobile-footer">
          <TabBar activeKey={activeKey} onChange={handleTabChange} safeArea>
            {tabs.map(tab => (
              <TabBar.Item key={tab.key} icon={tab.icon} title={tab.title} />
            ))}
          </TabBar>
        </footer>
      </div>

      {showControls && (
        <div className="mobile-simulator-controls">
          <div className="mobile-sim-label">屏幕方向</div>
          <div className="mobile-sim-orient-row">
            <button
              className={`mobile-sim-btn ${!isLandscape ? 'active' : ''}`}
              onClick={handleOrientationChange}
            >
              <AddOutline fontSize={14} />
              <span>竖屏</span>
            </button>
            <button
              className={`mobile-sim-btn ${isLandscape ? 'active' : ''}`}
              onClick={handleOrientationChange}
            >
              <CheckOutline fontSize={14} />
              <span>横屏</span>
            </button>
          </div>
          <div className="mobile-sim-divider" />
          <div className="mobile-sim-label">机型</div>
          <select className="mobile-sim-select" value={deviceType} onChange={handleDeviceChange}>
            {DEVICE_TYPES.map(d => (
              <option key={d.value} value={d.value}>{d.label}</option>
            ))}
          </select>
          <div className="mobile-sim-divider" />
          <button className="mobile-sim-btn pc-btn" onClick={handleBackToPC}>
            <CheckOutline fontSize={14} />
            <span>返回PC主页</span>
          </button>
        </div>
      )}
    </>
  )
}
