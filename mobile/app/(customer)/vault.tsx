import { View, Text } from 'react-native'
import { BrandBackground } from '../../components/shared/BrandBackground'
import { PageHeader } from '../../components/shared/PageHeader'
import { Colors } from '../../constants/colors'

// TODO: Implement Tattoo Vault screen
export default function Screen() {
  return (
    <BrandBackground>
      <PageHeader title="Tattoo Vault" showBack />
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: Colors.textMuted, fontSize: 16 }}>Coming soon</Text>
      </View>
    </BrandBackground>
  )
}

