import { useEffect, useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { BrandBackground } from '../../components/shared/BrandBackground'
import { PageHeader } from '../../components/shared/PageHeader'
import { InputField } from '../../components/shared/InputField'
import { GradientButton } from '../../components/shared/GradientButton'
import { Colors } from '../../constants/colors'

type Payment = { id: string; amount: number; month: string; paid_at: string; status: string }

const STATUS_COLOR: Record<string, string> = { paid: '#4ade80', pending: '#fbbf24', overdue: '#f87171' }

export default function BoothRentScreen() {
  const { profile } = useAuth()
  const [payments, setPayments] = useState<Payment[]>([])
  const [amount, setAmount] = useState('')
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7))
  const [submitting, setSubmitting] = useState(false)
  const [totalOwed, setTotalOwed] = useState(0)

  async function load() {
    if (!profile) return
    const { data } = await supabase
      .from('booth_rent_payments')
      .select('id, amount, month, paid_at, status')
      .eq('artist_id', profile.artist_id ?? profile.id)
      .order('month', { ascending: false })
    setPayments(data ?? [])
    setTotalOwed((data ?? []).filter((p: any) => p.status !== 'paid').reduce((s: number, p: any) => s + p.amount, 0))
  }

  useEffect(() => { load() }, [profile])

  async function submit() {
    if (!profile) return
    const val = parseFloat(amount)
    if (isNaN(val) || val <= 0) { Alert.alert('Invalid amount'); return }

    setSubmitting(true)
    await supabase.from('booth_rent_payments').insert({
      artist_id: profile.artist_id ?? profile.id,
      amount: val,
      month,
      status: 'pending',
    })
    setSubmitting(false)
    setAmount('')
    load()
    Alert.alert('Submitted', 'Your payment has been submitted and is pending admin confirmation.')
  }

  return (
    <BrandBackground>
      <PageHeader title="Booth Rent" showBack />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        {totalOwed > 0 && (
          <View style={{
            backgroundColor: '#f8712220', borderRadius: 14, padding: 14, marginBottom: 16,
            flexDirection: 'row', alignItems: 'center', gap: 10,
            borderWidth: 1, borderColor: '#f87122',
          }}>
            <Ionicons name="alert-circle" size={22} color="#f87122" />
            <Text style={{ color: Colors.text, fontSize: 14, fontWeight: '600' }}>
              Outstanding: R{totalOwed.toFixed(2)}
            </Text>
          </View>
        )}

        <View style={{ backgroundColor: Colors.bgCard, borderRadius: 14, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: Colors.borderSubtle }}>
          <Text style={{ color: Colors.text, fontWeight: '700', fontSize: 16, marginBottom: 12 }}>Submit Payment</Text>
          <InputField label="Amount (R)" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="e.g. 3500" />
          <View style={{ marginBottom: 16 }}>
            <Text style={{ color: Colors.textMuted, fontSize: 13, marginBottom: 8 }}>Month</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {[-1, 0, 1].map(offset => {
                const d = new Date()
                d.setMonth(d.getMonth() + offset)
                const val = d.toISOString().slice(0, 7)
                const label = d.toLocaleDateString('en-ZA', { month: 'short', year: 'numeric' })
                return (
                  <TouchableOpacity
                    key={val}
                    onPress={() => setMonth(val)}
                    style={{
                      flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: 'center',
                      backgroundColor: month === val ? Colors.gold : Colors.bgChip,
                      borderWidth: 1, borderColor: month === val ? Colors.gold : Colors.borderSubtle,
                    }}
                  >
                    <Text style={{ color: month === val ? Colors.textOnGold : Colors.textMuted, fontSize: 12, fontWeight: '600' }}>{label}</Text>
                  </TouchableOpacity>
                )
              })}
            </View>
          </View>
          <GradientButton label={submitting ? 'Submitting…' : 'Submit Payment'} onPress={submit} loading={submitting} />
        </View>

        <Text style={{ color: Colors.text, fontWeight: '700', fontSize: 16, marginBottom: 12 }}>Payment History</Text>
        {payments.length === 0 ? (
          <Text style={{ color: Colors.textMuted }}>No payments recorded</Text>
        ) : (
          payments.map(p => (
            <View key={p.id} style={{
              backgroundColor: Colors.bgCard, borderRadius: 12, padding: 14, marginBottom: 8,
              flexDirection: 'row', alignItems: 'center', gap: 12,
              borderWidth: 1, borderColor: Colors.borderSubtle,
            }}>
              <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: STATUS_COLOR[p.status] ?? Colors.textDim }} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: Colors.text, fontWeight: '600' }}>
                  {new Date(p.month + '-01').toLocaleDateString('en-ZA', { month: 'long', year: 'numeric' })}
                </Text>
                <Text style={{ color: Colors.textMuted, fontSize: 12 }}>
                  {p.status.charAt(0).toUpperCase() + p.status.slice(1)} · {new Date(p.paid_at).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })}
                </Text>
              </View>
              <Text style={{ color: Colors.gold, fontWeight: '700', fontSize: 15 }}>R{p.amount.toFixed(2)}</Text>
            </View>
          ))
        )}
      </ScrollView>
    </BrandBackground>
  )
}
