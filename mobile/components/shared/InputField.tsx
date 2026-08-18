import { View, TextInput, Text, type TextInputProps } from 'react-native'
import { Colors } from '../../constants/colors'

type Props = TextInputProps & {
  label?: string
  error?: string
}

export function InputField({ label, error, style, ...props }: Props) {
  return (
    <View style={{ marginBottom: 14 }}>
      {label && (
        <Text style={{ color: Colors.textMuted, fontSize: 12, marginBottom: 6, letterSpacing: 0.5 }}>
          {label.toUpperCase()}
        </Text>
      )}
      <TextInput
        placeholderTextColor={Colors.textDim}
        style={[
          {
            backgroundColor: Colors.bgElevated,
            color: Colors.text,
            borderRadius: 12,
            paddingHorizontal: 16,
            paddingVertical: 13,
            fontSize: 15,
            borderWidth: 1,
            borderColor: error ? '#dc2626' : Colors.borderSubtle,
          },
          style,
        ]}
        {...props}
      />
      {error && (
        <Text style={{ color: '#ef4444', fontSize: 12, marginTop: 4 }}>{error}</Text>
      )}
    </View>
  )
}
