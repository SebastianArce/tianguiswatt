import * as echarts from 'echarts'
import { useEffect, useRef } from 'react'
import { useChartTheme } from '@/lib/theme'

/** Mount an ECharts instance on a div and keep it in sync with `option`. */
export function useECharts(option: echarts.EChartsOption) {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<echarts.ECharts | null>(null)
  const tokens = useChartTheme()

  useEffect(() => {
    if (!containerRef.current) return
    const chart = echarts.init(containerRef.current)
    chartRef.current = chart
    const handleResize = () => chart.resize()
    window.addEventListener('resize', handleResize)
    // keep the chart in sync with its container (e.g. a flex-grown height)
    const observer = new ResizeObserver(handleResize)
    observer.observe(containerRef.current)
    return () => {
      window.removeEventListener('resize', handleResize)
      observer.disconnect()
      chart.dispose()
    }
  }, [])

  useEffect(() => {
    // Base text style so every chart inherits the design fonts/colours; re-applied on
    // theme toggle (a chart may override textStyle in its own option, which wins).
    const base: echarts.EChartsOption = {
      textStyle: { fontFamily: tokens.font, color: tokens.slate },
    }
    chartRef.current?.setOption({ ...base, ...option }, true)
  }, [option, tokens])

  return containerRef
}
