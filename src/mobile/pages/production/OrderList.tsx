import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { PullToRefresh, InfiniteScroll, Toast, Dialog } from 'antd-mobile'
import { AddOutline, SearchOutline } from 'antd-mobile-icons'
import api from '../../../utils/api'
import { formatDateTime } from '../../../utils'
import dayjs from 'dayjs'

const STATUS_FILTERS = [
  { label: '全部', value: '' },
  { label: '开立', value: '开立' },
  { label: '下发', value: '下发' },
  { label: '开工', value: '开工' },
  { label: '完工', value: '完工' },
  { label: '关闭', value: '关闭' },
]

// 订单状态徽章样式
const getStatusStyle = (status) => {
  switch (status) {
    case '开立': return { bg: '#e6f7ff', color: '#1890ff', cls: 'open' }
    case '下发': return { bg: '#fff7e6', color: '#fa8c16', cls: 'released' }
    case '开工': return { bg: '#f6ffed', color: '#52c41a', cls: 'started' }
    case '部分完工': return { bg: '#fff1f0', color: '#fa541c', cls: 'partial' }
    case '完工': return { bg: '#f0f0f0', color: '#595959', cls: 'done' }
    case '关闭': return { bg: '#fff1f0', color: '#cf1322', cls: 'closed' }
    default: return { bg: '#f0f0f0', color: '#595959', cls: 'done' }
  }
}

export default function OrderList() {
  const navigate = useNavigate()
  const location = useLocation()
  const [list, setList] = useState([])
  const [loading, setLoading] = useState(false)
  const [keyword, setKeyword] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [syncing, setSyncing] = useState(false)

  const pageSize = 20

  const fetchList = useCallback(async (pageNum = 1, reset = false) => {
    setLoading(true)
    try {
      const params: any = { page: pageNum, pageSize }
      if (keyword.trim()) params.keyword = keyword.trim()
      if (statusFilter) {
        params.status = [statusFilter]
      } else {
        params.status = ['开立', '下发', '开工', '完工', '关闭']
      }

      const res = await api.get('/production/orders', { params })
      const newList = res.data || []
      setTotal(res.total || 0)
      if (reset || pageNum === 1) {
        setList(newList)
      } else {
        setList(prev => [...prev, ...newList])
      }
      setHasMore(newList.length >= pageSize)
      setPage(pageNum)
    } catch (err) {
      Toast.show({ icon: 'fail', content: err.message || '获取订单失败' })
    } finally {
      setLoading(false)
    }
  }, [keyword, statusFilter])

  useEffect(() => {
    fetchList(1, true)
  }, [fetchList])

  const loadMore = async () => {
    if (loading || !hasMore) return
    await fetchList(page + 1)
  }

  const handleStatusChange = (s) => {
    setStatusFilter(s)
    setHasMore(true)
    setTimeout(() => fetchList(1, true), 0)
  }

  const handleSearch = () => {
    setHasMore(true)
    fetchList(1, true)
  }

  const handleRelease = async (order) => {
    const confirmed = await Dialog.confirm({
      title: '确认下发',
      content: `确认下发订单 ${order.order_no}？下发后将不可修改`,
    })
    if (!confirmed) return
    try {
      const res = await api.post(`/production/orders/${order.order_id}/release`)
      Toast.show({ icon: 'success', content: res.message || '订单已下发' })
      fetchList(1, true)
    } catch (err) {
      Toast.show({ icon: 'fail', content: err.message || '下发失败' })
    }
  }

  const handleClose = async (order) => {
    const confirmed = await Dialog.confirm({
      title: '确认关闭',
      content: `确认关闭订单 ${order.order_no}？关闭后将不可恢复`,
    })
    if (!confirmed) return
    try {
      const res = await api.post(`/production/orders/${order.order_id}/close`)
      Toast.show({ icon: 'success', content: res.message || '订单已关闭' })
      fetchList(1, true)
    } catch (err) {
      Toast.show({ icon: 'fail', content: err.message || '关闭失败' })
    }
  }

  /** 订单同步（对齐 PC 端） */
  const handleSync = async () => {
    if (syncing) return
    try {
      setSyncing(true)
      Toast.show({ icon: 'loading', content: '正在同步，请稍候…', duration: 0 })
      const res = await api.post('/auto/sync-production-orders', {}, { timeout: 300000 })
      Toast.clear()
      const d = res.data || {}
      const msg = d.message
        || `同步完成：采集 ${d.collected ?? 0} 条，新增 ${d.inserted ?? 0}，更新 ${d.updated ?? 0}`
      Toast.show({ icon: 'success', content: msg })
      fetchList(1, true)
    } catch (err) {
      Toast.clear()
      Toast.show({ icon: 'fail', content: err.message || '同步失败' })
    } finally {
      setSyncing(false)
    }
  }

  /** 开工 / 补报剩余（对齐 PC 端策略） */
  const handleStart = (order) => {
    const planned = Number(order.planned_qty || 0)
    const finished = Number(order.finished_qty || order.completed_qty || 0)
    const isPartialDone = order.status === '完工' && finished < planned
    if (isPartialDone) {
      const remaining = planned - finished
      Dialog.confirm({
        title: '补报剩余',
        content: `订单 ${order.order_no} 已部分完工，剩余 ${remaining} 件，确认继续报工？`,
        confirmText: '继续报工',
        onConfirm: () => navigate(`/mobile/reporting?orderId=${order.order_id}`),
      })
      return
    }
    navigate(`/mobile/reporting?orderId=${order.order_id}`)
  }

  const renderStatusTag = (status) => {
    const s = getStatusStyle(status)
    return (
      <span className={`mobile-status-tag ${s.cls}`} style={{ background: s.bg, color: s.color }}>
        {status}
      </span>
    )
  }

  return (
    <div>
      {/* 顶部搜索栏 + 订单同步 */}
      <div className="mobile-search-bar">
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            className="mobile-search-input"
            placeholder="搜索订单号 / 料号"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            style={{ flex: 1 }}
          />
          <button
            onClick={handleSync}
            disabled={syncing}
            style={{
              flexShrink: 0,
              padding: '6px 12px',
              borderRadius: 6,
              border: 'none',
              background: syncing ? '#ccc' : '#1890ff',
              color: '#fff',
              fontSize: 12,
              fontWeight: 500,
              cursor: syncing ? 'not-allowed' : 'pointer',
              minHeight: 32,
            }}
          >
            {syncing ? '同步中…' : '订单同步'}
          </button>
        </div>
      </div>

      {/* 状态筛选 chip */}
      <div className="mobile-filter-chips">
        {STATUS_FILTERS.map(s => (
          <div
            key={s.value}
            className={`mobile-filter-chip ${statusFilter === s.value ? 'active' : ''}`}
            onClick={() => handleStatusChange(s.value)}
          >
            {s.label}
          </div>
        ))}
      </div>

      {/* 订单列表 */}
      <div className="mobile-page" style={{ paddingTop: 8 }}>
        <PullToRefresh
          onRefresh={async () => {
            setHasMore(true)
            await fetchList(1, true)
          }}
        >
        {list.length === 0 && !loading && (
          <div className="mobile-empty">暂无订单数据</div>
        )}

        {list.map(order => {
          const planned = Number(order.planned_qty || 0)
          const finished = Number(order.finished_qty || order.completed_qty || 0)
          const isPartialDone = order.status === '完工' && finished < planned
          return (
            <div
              key={order.order_id}
              className="mobile-list-item"
              onClick={() => navigate(`/mobile/orders/${order.order_id}`)}
            >
              <div className="mobile-list-item-header">
                <div className="mobile-list-item-title">{order.order_no}</div>
                {renderStatusTag(isPartialDone ? '部分完工' : order.status)}
              </div>
              <div className="mobile-list-item-body">
                <div className="mobile-flex-between" style={{ marginBottom: 4 }}>
                  <span style={{ color: '#757575' }}>料号</span>
                  <span>{order.material_code || '-'}</span>
                </div>
                <div className="mobile-flex-between" style={{ marginBottom: 4 }}>
                  <span style={{ color: '#757575' }}>料品</span>
                  <span style={{ maxWidth: '60%', textAlign: 'right' }}>
                    {order.material_name || '-'}
                  </span>
                </div>
                <div className="mobile-flex-between" style={{ marginBottom: 4 }}>
                  <span style={{ color: '#757575' }}>
                    {order.status === '开立' ? '计划数' : '完工 / 计划'}
                  </span>
                  <span style={{ fontWeight: 500 }}>
                    {order.status === '开立' ? (
                      <span style={{ color: '#212121' }}>{planned}</span>
                    ) : (
                      <>
                        <span style={{ color: isPartialDone ? '#fa8c16' : '#52c41a' }}>{finished}</span>
                        <span style={{ color: '#999' }}> / {planned}</span>
                      </>
                    )}
                  </span>
                </div>
                <div className="mobile-flex-between" style={{ marginBottom: 8 }}>
                  <span style={{ color: '#757575' }}>计划开始</span>
                  <span>{formatDateTime(order.plan_start_time)}</span>
                </div>
                {/* 操作按钮（阻止冒泡） */}
                <div
                  className="mobile-order-actions"
                  onClick={(e) => e.stopPropagation()}
                  style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}
                >
                  {order.status === '开立' && (
                    <button onClick={() => handleRelease(order)} className="mobile-action-btn primary">下发</button>
                  )}
                  {(order.status === '下发' || order.status === '开工') && (
                    <>
                      <button onClick={() => handleStart(order)} className="mobile-action-btn primary">
                        {order.status === '开工' ? '继续报工' : '开工报工'}
                      </button>
                      <button onClick={() => handleClose(order)} className="mobile-action-btn danger">关闭</button>
                    </>
                  )}
                  {isPartialDone && (
                    <>
                      <button onClick={() => handleStart(order)} className="mobile-action-btn warn">补报剩余</button>
                      <button onClick={() => handleClose(order)} className="mobile-action-btn danger">关闭</button>
                    </>
                  )}
                  {order.status === '完工' && !isPartialDone && (
                    <button onClick={() => handleClose(order)} className="mobile-action-btn danger">关闭</button>
                  )}
                </div>
              </div>
            </div>
          )
        })}

        <InfiniteScroll loadMore={loadMore} hasMore={hasMore} />
        </PullToRefresh>
      </div>
    </div>
  )
}
