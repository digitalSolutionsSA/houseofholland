import { View, StyleSheet, type ViewProps } from 'react-native'
import { Colors } from '../../constants/colors'

export function BrandBackground({ children, style, ...props }: ViewProps) {
  return (
    <View style={[styles.container, style]} {...props}>
      {children}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
})
