import { SectionCard, TextField } from "@/shared/components/ui";

type Props = {
  value: string;
  onChange: (value: string) => void;
};

export function RegistrySearchCard({ value, onChange }: Props) {
  return (
    <SectionCard title="Search" subtitle="Full-text search runs across household head, purok, and address.">
      <TextField
        label="Search households"
        value={value}
        onChangeText={onChange}
        placeholder="Household head, purok, or address"
        helperText="Type at least two characters to search the registry."
      />
    </SectionCard>
  );
}
