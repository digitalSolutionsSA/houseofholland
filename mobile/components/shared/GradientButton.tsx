import { TouchableOpacity, Text, ActivityIndicator, type ViewStyle } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { GoldGradientBtn } from '../../constants/colors'

type Props = {
  label: string
  onPress: () => void
  loading?: boolean
  disabled?: boolean
  style?: ViewStyle
}

export function GradientButton({ label, onPress, loading, disabled, style }: Props) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
      style={style}
    >
      <LinearGradient
        colors={[...GoldGradientBtn]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={{
          paddingVertical: 14,
          paddingHorizontal: 24,
          borderRadius: 999,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: disabled ? 0.5 : 1,
        }}
      >
        {loading ? (
          <ActivityIndicator color="#1a1a1a" />
        ) : (
          <Text style={{ color: '#1a1a1a', fontWeight: '700', fontSize: 15, letterSpacing: 0.5 }}>
            {label}
          </Text>
        )}
      </LinearGradient>
    </TouchableOpacity>
  )
}
