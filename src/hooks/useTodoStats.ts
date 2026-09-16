import { useState, useEffect, useCallback } from 'react'
import api from '../utils/api'

export interface TodoStats {
  // 生产订单
  orderRelease: number       // 待下发（开立状态）
  orderStart: number         // 已下发待开工
  orderRunning: number       // 进行中（开工状态）
  orderPartial: number       // 部分完工（需补报剩余）

  // 质量检验
  incomingInspection: number
  processInspection: number
  finishedInspection: number
  microbeInspection: number
  envInspection: number
  standardReview: number
  complaintPending: number

  // 设备
  deviceMaintenance: number

  // 汇总
  total: number
}

const defaultStats: TodoStats = {
  orderRelease: 0,
  orderStart: 0,
  orderRunning: 0,
  orderPartial: 0,
  incomingInspection: 0,
  processInspection: 0,
  finishedInspection: 0,
  microbeInspection: 0,
  envInspection: 0,
  standardReview: 0,
  complaintPending: 0,
  deviceMaintenance: 0,
  total: 0,
}

function extractTotal(res: any): number {
  if (!res) return 0
  return res.data?.total ?? res.total ?? 0
}

export function useTodoStats() {
  const [stats, setStats] = useState<TodoStats>(defaultStats)
  const [loading, setLoading] = useState(false)

  const fetchStats = useCallback(async () => {
    setLoading(true)
    try {
      const results = await Promise.allSettled([
        // 生产订单：按状态统计
        api.get('/production/orders', { params: { status: ['开立'], pageSize: 1 } }),
        api.get('/production/orders', { params: { status: ['下发'], pageSize: 1 } }),
        api.get('/production/orders', { params: { status: ['开工'], pageSize: 1 } }),
      ])

      const orderRelease = results[0].status === 'fulfilled' ? extractTotal(results[0].value) : 0
      const orderStart = results[1].status === 'fulfilled' ? extractTotal(results[1].value) : 0
      const orderRunning = results[2].status === 'fulfilled' ? extractTotal(results[2].value) : 0

      // 计算部分完工数量（单独拉一页数据过滤）
      let orderPartial = 0
      try {
        const partialRes: any = await api.get('/production/orders', {
          params: { status: ['完工'], pageSize: 200 },
        })
        const list = partialRes.data || []
        orderPartial = list.filter(
          (o: any) => Number(o.finished_qty || o.completed_qty || 0) < Number(o.planned_qty || 0),
        ).length
      } catch { /* ignore */ }

      const newStats: TodoStats = {
        orderRelease,
        orderStart,
        orderRunning,
        orderPartial,
        incomingInspection: 0,
        processInspection: 0,
        finishedInspection: 0,
        microbeInspection: 0,
        envInspection: 0,
        standardReview: 0,
        complaintPending: 0,
        deviceMaintenance: 0,
        total: orderRelease + orderStart + orderRunning + orderPartial,
      }

      setStats(newStats)
    } catch {
      setStats(defaultStats)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStats()
    // 每 30s 刷新一次
    const timer = setInterval(fetchStats, 30 * 1000)
    return () => clearInterval(timer)
  }, [fetchStats])

  return { stats, loading, refresh: fetchStats }
}
