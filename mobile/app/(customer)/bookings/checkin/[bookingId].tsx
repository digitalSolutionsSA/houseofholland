import { useRef, useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native'
import { useLocalSearchParams, router } from 'expo-router'
import { WebView } from 'react-native-webview'
import { useAuth } from '../../../../context/AuthContext'
import { supabase } from '../../../../lib/supabase'
import { BrandBackground } from '../../../../components/shared/BrandBackground'
import { PageHeader } from '../../../../components/shared/PageHeader'
import { GradientButton } from '../../../../components/shared/GradientButton'
import { Colors } from '../../../../constants/colors'

const CONSENT_ITEMS = [
  'I confirm I am 18 years of age or older.',
  'I have not consumed alcohol or drugs in the last 24 hours.',
  'I do not have any skin conditions or allergies that may affect the tattooing process.',
  'I understand that tattooing is a permanent procedure.',
  'I agree to follow all aftercare instructions provided by the artist.',
  'I acknowledge that touch-ups may be required and are not always free of charge.',
  'I release House of Holland Tattoos from any liability for complications arising from failure to follow aftercare instructions.',
]

const SIG_HTML = `
<!DOCTYPE html>
<html>
<head>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { background:#272729; }
  canvas { display:block; width:100%; height:200px; touch-action:none; cursor:crosshair; }
  button { position:fixed; top:8px; right:8px; background:#d4af37; color:#111; border:none; padding:6px 14px; border-radius:20px; font-weight:700; }
</style>
</head>
<body>
<canvas id="c"></canvas>
<button onclick="clear_()">Clear</button>
<script>
const c = document.getElementById('c');
const ctx = c.getContext('2d');
c.width = window.innerWidth;
c.height = 200;
ctx.strokeStyle = '#fff';
ctx.lineWidth = 2;
ctx.lineCap = 'round';
let drawing = false, lx=0, ly=0;
function pos(e){ const r=c.getBoundingClientRect(); const t=e.touches?e.touches[0]:e; return [(t.clientX-r.left)*(c.width/r.width),(t.clientY-r.top)*(c.height/r.height)]; }
function start(e){ drawing=true; [lx,ly]=pos(e); e.preventDefault(); }
function move(e){ if(!drawing)return; const[x,y]=pos(e); ctx.beginPath(); ctx.moveTo(lx,ly); ctx.lineTo(x,y); ctx.stroke(); [lx,ly]=[x,y]; e.preventDefault(); }
function end(){ drawing=false; window.ReactNativeWebView.postMessage(c.toDataURL()); }
function clear_(){ ctx.clearRect(0,0,c.width,c.height); window.ReactNativeWebView.postMessage(''); }
c.addEventListener('mousedown',start); c.addEventListener('mousemove',move); c.addEventListener('mouseup',end);
c.addEventListener('touchstart',start,{passive:false}); c.addEventListener('touchmove',move,{passive:false}); c.addEventListener('touchend',end);
</script>
</body>
</html>
`

export default function CheckInScreen() {
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>()
  const { profile } = useAuth()
  const [checked, setChecked] = useState<boolean[]>(new Array(CONSENT_ITEMS.length).fill(false))
  const [sigData, setSigData] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const allChecked = checked.every(Boolean) && sigData.length > 10

  function toggle(i: number) {
    setChecked(prev => { const n = [...prev]; n[i] = !n[i]; return n })
  }

  async function submit() {
    if (!profile) return
    setSubmitting(true)

    // Upload signature
    const base64 = sigData.replace(/^data:image\/png;base64,/, '')
    const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0))
    const path = `signatures/${profile.id}/${bookingId}.png`
    await supabase.storage.from('avatars').upload(path, bytes, { contentType: 'image/png', upsert: true })
    const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path)

    // Save consent form
    await supabase.from('consent_forms').upsert({
      profile_id: profile.id,
      booking_id: bookingId,
      signature_url: urlData.publicUrl,
      check_in_at: new Date().toISOString(),
    }, { onConflict: 'booking_id' })

    // Mark booking as checked in
    await supabase.from('bookings').update({ status: 'confirmed', checked_in_at: new Date().toISOString() }).eq('id', bookingId)

    setSubmitting(false)
    Alert.alert('Checked In!', 'You have successfully checked in. Your artist will be with you shortly.', [
      { text: 'OK', onPress: () => router.replace('/(customer)/bookings') },
    ])
  }

  return (
    <BrandBackground>
      <PageHeader title="Check In" showBack />
      <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 40 }}>
        <Text style={{ color: Colors.text, fontWeight: '700', fontSize: 18, marginBottom: 4 }}>Consent & Waiver</Text>
        <Text style={{ color: Colors.textMuted, fontSize: 13, marginBottom: 20 }}>
          Please read and initial each item, then sign below.
        </Text>

        {CONSENT_ITEMS.map((item, i) => (
          <TouchableOpacity
            key={i}
            onPress={() => toggle(i)}
            style={{
              flexDirection: 'row', alignItems: 'flex-start', gap: 12,
              backgroundColor: Colors.bgCard, borderRadius: 12, padding: 14,
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
              {checked[i] && <Text style={{ color: Colors.textOnGold, fontSize: 14, fontWeight: '900' }}>✓</Text>}
            </View>
            <Text style={{ color: Colors.text, fontSize: 13, flex: 1, lineHeight: 20 }}>{item}</Text>
          </TouchableOpacity>
        ))}

        <TouchableOpacity
          onPress={() => setChecked(new Array(CONSENT_ITEMS.length).fill(true))}
          style={{ alignSelf: 'flex-end', marginTop: 4, marginBottom: 20 }}
        >
          <Text style={{ color: Colors.gold, fontSize: 13 }}>Check all</Text>
        </TouchableOpacity>

        <Text style={{ color: Colors.text, fontWeight: '700', fontSize: 16, marginBottom: 8 }}>Signature</Text>
        <Text style={{ color: Colors.textMuted, fontSize: 12, marginBottom: 8 }}>Draw your signature in the box below</Text>
        <View style={{ borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: Colors.borderSubtle, marginBottom: 20, height: 200 }}>
          <WebView
            source={{ html: SIG_HTML }}
            onMessage={e => setSigData(e.nativeEvent.data)}
            scrollEnabled={false}
            style={{ backgroundColor: Colors.bgCard }}
          />
        </View>

        <GradientButton
          label={submitting ? 'Submitting…' : 'Complete Check-In'}
          onPress={submit}
          disabled={!allChecked}
          loading={submitting}
        />
        {!allChecked && (
          <Text style={{ color: Colors.textMuted, fontSize: 12, textAlign: 'center', marginTop: 8 }}>
            Please check all items and sign before continuing
          </Text>
        )}
      </ScrollView>
    </BrandBackground>
  )
}
