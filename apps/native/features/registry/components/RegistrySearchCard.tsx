import { Pressable, Text, TextInput, View } from "react-native";

type RegistryFilter = "all" | "vulnerable" | "unknown" | "sms_only";

type Props = {
  activeFilter: RegistryFilter;
  value: string;
  onChange: (value: string) => void;
  onSelectFilter: (value: RegistryFilter) => void;
};

const filterChips: Array<{ value: RegistryFilter; label: string }> = [
  { value: "all", label: "All" },
  { value: "vulnerable", label: "Vulnerable" },
  { value: "unknown", label: "Unknown" },
  { value: "sms_only", label: "SMS-only" },
];

export function RegistrySearchCard({ activeFilter, value, onChange, onSelectFilter }: Props) {
  return (
    <View className="gap-4">
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder="Search household head, purok, address, phone"
        className="min-h-14 rounded-3xl bg-white px-4 text-base text-slate-950"
        placeholderTextColor="#94a3b8"
      />

      <View className="flex-row flex-wrap gap-2">
        {filterChips.map((chip) => {
          const isActive = activeFilter === chip.value;

          return (
            <Pressable
              key={chip.value}
              onPress={() => onSelectFilter(chip.value)}
              className={`rounded-full px-4 py-2 ${isActive ? "bg-slate-950" : "bg-white"}`}
            >
              <Text className={`text-xs font-semibold ${isActive ? "text-white" : "text-slate-700"}`}>
                {chip.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
