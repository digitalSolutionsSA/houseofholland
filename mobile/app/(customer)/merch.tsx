import { View, Text } from 'react-native'
import { BrandBackground } from '../../components/shared/BrandBackground'
import { PageHeader } from '../../components/shared/PageHeader'
import { Colors } from '../../constants/colors'

// TODO: Implement Merch Shop screen
export default function Screen() {
  return (
    <BrandBackground>
      <PageHeader title="Merch Shop" showBack />
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: Colors.textMuted, fontSize: 16 }}>Coming soon</Text>
      </View>
    </BrandBackground>
  )
}

