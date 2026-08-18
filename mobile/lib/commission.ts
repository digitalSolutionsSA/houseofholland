import type { MembershipPlan } from './supabase'

export const PLAN_PRICES: Record<MembershipPlan, number> = {
  free: 0,
  premium: 4.99,
  'black-card': 6.99,
}

export function getCommissionRate(paidCustomers: number): number {
  if (paidCustomers >= 50) return 0.10
  if (paidCustomers >= 25) return 0.075
  if (paidCustomers >= 10) return 0.05
  return 0.025
}

export function getTierLabel(rate: number): string {
  const pct = Math.round(rate * 100)
  return `${pct}% Commission`
}

export function getTierColor(rate: number): string {
  if (rate >= 0.10) return '#d4af37'
  if (rate >= 0.075) return '#c0c0c0'
  if (rate >= 0.05) return '#cd7f32'
  return '#9a9a9a'
}

export function nextTierThreshold(paidCustomers: number): number | null {
  if (paidCustomers < 10) return 10
  if (paidCustomers < 25) return 25
  if (paidCustomers < 50) return 50
  return null
}

export function calcCommission(paidCustomers: number, totalRevenue: number): number {
  return totalRevenue * getCommissionRate(paidCustomers)
}

export function monthsInPeriod(start: string, end: string): number {
  const s = new Date(start)
  const e = new Date(end)
  return (e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth()) + 1
}
