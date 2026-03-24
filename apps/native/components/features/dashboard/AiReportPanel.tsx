import * as Clipboard from "expo-clipboard";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";

import { LoadingSkeleton } from "@/components/ui/LoadingSkeleton";
import { haptics } from "@/services/haptics";
import { supabase } from "@/services/supabase";

export function AiReportPanel({ barangayId }: { barangayId: string }) {
  const [report, setReport] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  return (
    <View className="rounded-[28px] bg-white px-5 py-5">
      <Text className="text-xl font-semibold text-slate-950">AI Report</Text>
      <Text className="mt-2 text-sm leading-6 text-slate-600">
        Generate a situational update from the latest barangay data.
      </Text>

      <Pressable
        className="mt-4 rounded-2xl bg-slate-950 px-4 py-4"
        onPress={() =>
          void (async () => {
            try {
              setIsGenerating(true);
              await haptics.medium();
              const { data, error } = await supabase.functions.invoke("generate-ai-report", {
                body: { barangay_id: barangayId },
              });

              if (error) {
                throw error;
              }

              setReport((data as { report?: string } | null)?.report ?? "");
            } finally {
              setIsGenerating(false);
            }
          })()
        }
      >
        <Text className="text-center font-semibold text-white">Generate Situational Report</Text>
      </Pressable>

      {isGenerating ? (
        <View className="mt-4">
          <LoadingSkeleton className="h-5 w-full" lines={3} />
        </View>
      ) : null}

      {report ? (
        <View className="mt-4 gap-3 rounded-2xl bg-slate-50 px-4 py-4">
          <Text className="text-sm leading-6 text-slate-700">{report}</Text>
          <Pressable
            className="rounded-2xl bg-blue-600 px-4 py-3"
            onPress={() =>
              void (async () => {
                await Clipboard.setStringAsync(report);
                setCopied(true);
                await haptics.success();
              })()
            }
          >
            <Text className="text-center font-semibold text-white">
              {copied ? "Copied" : "Copy to Clipboard"}
            </Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}
