import { View, Text, TouchableOpacity } from 'react-native'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { Colors } from '../../constants/colors'

type Props = {
  title: string
  showBack?: boolean
  right?: React.ReactNode
}

export function PageHeader({ title, showBack, right }: Props) {
  return (
    <View style={{
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 18,
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: Colors.borderSubtle,
    }}>
      {showBack && (
        <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 12 }}>
          <Ionicons name="arrow-back" size={22} color={Colors.gold} />
        </TouchableOpacity>
      )}
      <Text style={{
        flex: 1,
        color: Colors.text,
        fontSize: 18,
        fontWeight: '700',
        letterSpacing: 0.3,
      }}>
        {title}
      </Text>
      {right}
    </View>
  )
}
