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
    <View className="gap-3">
      {/* Search input */}
      <View className="flex-row items-center rounded-xl border border-slate-200 bg-slate-50 px-3.5">
        <Text className="mr-2 text-[15px] text-slate-400">&#x1F50D;</Text>
        <TextInput
          value={value}
          onChangeText={onChange}
          placeholder="Household, purok, address, phone..."
          className="min-h-[44px] flex-1 text-[15px] text-slate-900"
          placeholderTextColor="#94a3b8"
        />
      </View>

      {/* Filter chips — scrollable row */}
      <View className="flex-row gap-2">
        {filterChips.map((chip) => {
          const isActive = activeFilter === chip.value;

          return (
            <Pressable
              key={chip.value}
              onPress={() => onSelectFilter(chip.value)}
              className={`rounded-lg px-3.5 py-2 ${isActive ? "bg-slate-900" : "bg-slate-100"}`}
            >
              <Text
                className={`text-[13px] font-semibold ${isActive ? "text-white" : "text-slate-600"}`}
              >
                {chip.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
