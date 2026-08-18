import { ScrollView, TouchableOpacity, Text } from 'react-native'
import { Colors } from '../../constants/colors'

type Props = {
  options: string[]
  selected: string
  onSelect: (value: string) => void
}

export function CategoryChips({ options, selected, onSelect }: Props) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 18, gap: 8, flexDirection: 'row' }}
      style={{ flexGrow: 0 }}
    >
      {options.map(option => {
        const active = option === selected
        return (
          <TouchableOpacity
            key={option}
            onPress={() => onSelect(option)}
            style={{
              paddingHorizontal: 16,
              paddingVertical: 8,
              borderRadius: 999,
              backgroundColor: active ? Colors.gold : Colors.bgChip,
              borderWidth: 1,
              borderColor: active ? Colors.gold : 'transparent',
            }}
          >
            <Text style={{
              color: active ? Colors.textOnGold : Colors.text,
              fontSize: 13,
              fontWeight: active ? '700' : '400',
            }}>
              {option}
            </Text>
          </TouchableOpacity>
        )
      })}
    </ScrollView>
  )
}
