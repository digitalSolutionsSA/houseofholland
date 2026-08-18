import { useEffect, useRef, useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, Alert, TextInput } from 'react-native'
import { WebView } from 'react-native-webview'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { BrandBackground } from '../../components/shared/BrandBackground'
import { PageHeader } from '../../components/shared/PageHeader'
import { InputField } from '../../components/shared/InputField'
import { GradientButton } from '../../components/shared/GradientButton'
import { Colors } from '../../constants/colors'

const CONSENT_ITEMS = [
  'I confirm I am 18 years of age or older.',
  'I have not consumed alcohol or drugs in the last 24 hours.',
  'I do not have any skin conditions or allergies affecting tattooing.',
  'I understand tattooing is a permanent procedure.',
  'I agree to follow all aftercare instructions provided.',
  'I acknowledge touch-ups may incur additional costs.',
  'I release House of Holland Tattoos from liability for aftercare-related complications.',
]

const SIG_HTML = `<!DOCTYPE html><html><head><style>*{margin:0;padding:0;box-sizing:border-box;}body{background:#272729;}canvas{display:block;width:100%;height:180px;touch-action:none;}button{position:fixed;top:8px;right:8px;background:#d4af37;color:#111;border:none;padding:6px 14px;border-radius:20px;font-weight:700;font-size:13px;}</style></head><body><canvas id="c"></canvas><button onclick="cl()">Clear</button><script>const c=document.getElementById('c');const ctx=c.getContext('2d');c.width=window.innerWidth;c.height=180;ctx.strokeStyle='#fff';ctx.lineWidth=2;ctx.lineCap='round';let d=false,lx=0,ly=0;function p(e){const r=c.getBoundingClientRect();const t=e.touches?e.touches[0]:e;return[(t.clientX-r.left)*(c.width/r.width),(t.clientY-r.top)*(c.height/r.height)];}c.addEventListener('mousedown',e=>{d=true;[lx,ly]=p(e);});c.addEventListener('mousemove',e=>{if(!d)return;const[x,y]=p(e);ctx.beginPath();ctx.moveTo(lx,ly);ctx.lineTo(x,y);ctx.stroke();[lx,ly]=[x,y];e.preventDefault();});c.addEventListener('mouseup',()=>{d=false;window.ReactNativeWebView.postMessage(c.toDataURL());});c.addEventListener('touchstart',e=>{d=true;[lx,ly]=p(e);e.preventDefault();},{passive:false});c.addEventListener('touchmove',e=>{if(!d)return;const[x,y]=p(e);ctx.beginPath();ctx.moveTo(lx,ly);ctx.lineTo(x,y);ctx.stroke();[lx,ly]=[x,y];e.preventDefault();},{passive:false});c.addEventListener('touchend',()=>{d=false;window.ReactNativeWebView.postMessage(c.toDataURL());});function cl(){ctx.clearRect(0,0,c.width,c.height);window.ReactNativeWebView.postMessage('');};</script></body></html>`

type PastForm = { id: string; created_at: string }

export default function ConsentScreen() {
  const { profile } = useAuth()
  const [view, setView] = useState<'list' | 'form'>('list')
  const [pastForms, setPastForms] = useState<PastForm[]>([])
  const [checked, setChecked] = useState(new Array(CONSENT_ITEMS.length).fill(false))
  const [sigData, setSigData] = useState('')
  const [emergencyName, setEmergencyName] = useState('')
  const [emergencyPhone, setEmergencyPhone] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function load() {
    if (!profile) return
    const { data } = await supabase.from('consent_forms').select('id, created_at').eq('profile_id', profile.id).order('created_at', { ascending: false })
    setPastForms(data ?? [])
  }

  useEffect(() => { load() }, [profile])

  function toggle(i: number) {
    setChecked(prev => { const n = [...prev]; n[i] = !n[i]; return n })
  }

  async function submit() {
    if (!profile) return
    if (!checked.every(Boolean)) { Alert.alert('Incomplete', 'Please check all consent items.'); return }
    if (sigData.length < 10) { Alert.alert('Signature Required', 'Please sign the consent form.'); return }

    setSubmitting(true)

    // Upload signature
    const base64 = sigData.replace(/^data:image\/png;base64,/, '')
    const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0))
    const path = `signatures/${profile.id}/consent-${Date.now()}.png`
    await supabase.storage.from('avatars').upload(path, bytes, { contentType: 'image/png', upsert: true })
    const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path)

    await supabase.from('consent_forms').upsert({
      profile_id: profile.id,
      signature_url: urlData.publicUrl,
      emergency_contact_name: emergencyName,
      emergency_contact_phone: emergencyPhone,
      consented_at: new Date().toISOString(),
    }, { onConflict: 'profile_id' })

    setSubmitting(false)
    setView('list')
    load()
    Alert.alert('Submitted', 'Your consent form has been saved.')
  }

  if (view === 'form') {
    return (
      <BrandBackground>
        <PageHeader title="Consent Form" showBack />
        <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 60 }}>
          <Text style={{ color: Colors.text, fontWeight: '700', fontSize: 18, marginBottom: 16 }}>Tattoo Consent & Waiver</Text>

          <InputField label="Emergency Contact Name" value={emergencyName} onChangeText={setEmergencyName} placeholder="Full name" autoCapitalize="words" />
          <InputField label="Emergency Contact Phone" value={emergencyPhone} onChangeText={setEmergencyPhone} placeholder="+27 ..." keyboardType="phone-pad" />

          <Text style={{ color: Colors.text, fontWeight: '700', fontSize: 15, marginTop: 8, marginBottom: 12 }}>I agree to the following:</Text>

          {CONSENT_ITEMS.map((item, i) => (
            <TouchableOpacity
              key={i}
              onPress={() => toggle(i)}
              style={{
                flexDirection: 'row', alignItems: 'flex-start', gap: 12,
                backgroundColor: Colors.bgCard, borderRadius: 12, padding: 12,
                marginBottom: 8, borderWidth: 1,
                borderColor: checked[i] ? Colors.gold : Colors.borderSubtle,
              }}
            >
              <View style={{
                width: 22, height: 22, borderRadius: 6,
                backgroundColor: checked[i] ? Colors.gold : Colors.bgChip,
                alignItems: 'center', justifyContent: 'center',
                borderWidth: 1, borderColor: checked[i] ? Colors.gold : Colors.borderSubtle,
                flexShrink: 0, marginTop: 1,
              }}>
                {checked[i] && <Text style={{ color: Colors.textOnGold, fontSize: 13, fontWeight: '900' }}>✓</Text>}
              </View>
              <Text style={{ color: Colors.text, fontSize: 13, flex: 1, lineHeight: 20 }}>{item}</Text>
            </TouchableOpacity>
          ))}

          <TouchableOpacity onPress={() => setChecked(new Array(CONSENT_ITEMS.length).fill(true))} style={{ alignSelf: 'flex-end', marginBottom: 20 }}>
            <Text style={{ color: Colors.gold, fontSize: 13 }}>Check all</Text>
          </TouchableOpacity>

          <Text style={{ color: Colors.text, fontWeight: '700', fontSize: 15, marginBottom: 8 }}>Signature</Text>
          <View style={{ height: 180, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: Colors.borderSubtle, marginBottom: 20 }}>
            <WebView source={{ html: SIG_HTML }} onMessage={e => setSigData(e.nativeEvent.data)} scrollEnabled={false} style={{ backgroundColor: Colors.bgCard }} />
          </View>

          <GradientButton label={submitting ? 'Submitting…' : 'Submit Consent Form'} onPress={submit} loading={submitting} />
        </ScrollView>
      </BrandBackground>
    )
  }

  return (
    <BrandBackground>
      <PageHeader title="Consent Forms" showBack />
      <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 40 }}>
        <GradientButton label="Fill Out Consent Form" onPress={() => setView('form')} style={{ marginBottom: 24 }} />

        <Text style={{ color: Colors.text, fontWeight: '700', fontSize: 16, marginBottom: 12 }}>Previous Submissions</Text>
        {pastForms.length === 0
          ? <Text style={{ color: Colors.textMuted, fontSize: 14 }}>No consent forms submitted yet.</Text>
          : pastForms.map(f => (
            <View key={f.id} style={{
              backgroundColor: Colors.bgCard, borderRadius: 12, padding: 14,
              marginBottom: 8, borderWidth: 1, borderColor: Colors.borderSubtle,
              flexDirection: 'row', alignItems: 'center', gap: 10,
            }}>
              <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: '#4ade80' }} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: Colors.text, fontWeight: '600', fontSize: 14 }}>Consent Form</Text>
                <Text style={{ color: Colors.textMuted, fontSize: 12 }}>
                  Submitted {new Date(f.created_at).toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' })}
                </Text>
              </View>
            </View>
          ))
        }
      </ScrollView>
    </BrandBackground>
  )
}
