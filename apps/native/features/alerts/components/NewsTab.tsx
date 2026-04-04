import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useTranslation } from "react-i18next";

import type { PhNewsArticle, NewsCategory } from "../services/hazardFeeds";

type Props = {
  articles: PhNewsArticle[];
  isLoading: boolean;
};

const CATEGORY_LABELS: Record<NewsCategory | "all", string> = {
  all: "All",
  national: "National",
  business: "Business",
  regional: "Regional",
};

export function NewsTab({ articles, isLoading }: Props) {
  const { t } = useTranslation();
  const [filter, setFilter] = useState<NewsCategory | "all">("all");
  const [source, setSource] = useState<string | null>(null);

  function handleCategoryPress(cat: NewsCategory | "all") {
    setFilter(cat);
    setSource(null);
  }

  const sourcesInCategory = articles
    .filter((a) => filter === "all" || a.category === filter)
    .reduce<Array<{ source: string; color: string; count: number }>>((acc, a) => {
      const existing = acc.find((x) => x.source === a.source);
      if (existing) {
        existing.count++;
      } else {
        acc.push({ source: a.source, color: a.color, count: 1 });
      }
      return acc;
    }, []);

  const visibleArticles = articles.filter((a) => {
    if (source) return a.source === source;
    if (filter !== "all") return a.category === filter;
    return true;
  });

  return (
    <View className="mt-3">
      {/* Category pills */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="px-5"
        contentContainerStyle={{ gap: 8, paddingRight: 20 }}
      >
        {(["all", "national", "business", "regional"] as const).map((cat) => (
          <Pressable
            key={cat}
            onPress={() => handleCategoryPress(cat)}
            className={`rounded-full px-3.5 py-1.5 ${filter === cat && !source ? "bg-slate-900" : "bg-slate-100"}`}
          >
            <Text className={`text-[12px] font-semibold ${filter === cat && !source ? "text-white" : "text-slate-600"}`}>
              {CATEGORY_LABELS[cat]}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Source pills — visible when a category is selected */}
      {filter !== "all" && sourcesInCategory.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="mt-2 px-5"
          contentContainerStyle={{ gap: 6, paddingRight: 20 }}
        >
          {sourcesInCategory.map(({ source: src, color, count }) => (
            <Pressable
              key={src}
              onPress={() => setSource(source === src ? null : src)}
              className={`flex-row items-center gap-1.5 rounded-full px-3 py-1.5 ${source === src ? "bg-slate-900" : "bg-slate-100"}`}
            >
              <View className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
              <Text className={`text-[11px] font-semibold ${source === src ? "text-white" : "text-slate-600"}`}>
                {src}{source === src ? "" : ` ${count}`}
              </Text>
            </Pressable>
          ))}
          {source ? (
            <Pressable
              onPress={() => setSource(null)}
              className="flex-row items-center gap-1 rounded-full bg-slate-200 px-3 py-1.5"
            >
              <Ionicons name="close" size={11} color="#64748b" />
              <Text className="text-[11px] font-semibold text-slate-600">Clear</Text>
            </Pressable>
          ) : null}
        </ScrollView>
      ) : null}

      <View className="mt-3">
        {isLoading ? (
          <View className="mx-5 items-center py-10">
            <Text className="text-[13px] text-slate-400">{t("common.loading")}</Text>
          </View>
        ) : visibleArticles.length === 0 ? (
          <View className="mx-5 items-center rounded-xl border border-dashed border-slate-200 bg-slate-50 px-5 py-8">
            <Ionicons name="newspaper-outline" size={32} color="#94a3b8" />
            <Text className="mt-2 text-[14px] font-semibold text-slate-600">{t("alerts.noNews")}</Text>
            <Text className="mt-1 text-center text-[13px] text-slate-400">{t("alerts.noNewsBody")}</Text>
          </View>
        ) : null}

        {visibleArticles.map((article, i) => {
          const pubDate = article.pubDate ? new Date(article.pubDate) : null;
          const timeStr = pubDate
            ? pubDate.toLocaleDateString("en-PH", { month: "short", day: "numeric" }) +
              " · " +
              pubDate.toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit", hour12: true })
            : "";

          return (
            <View
              key={`${article.source}-${i}`}
              className="mx-5 mb-3 rounded-2xl border border-slate-100 bg-white px-4 py-3.5"
            >
              <View className="mb-1.5 flex-row items-center gap-2">
                <View className="flex-row items-center gap-1.5">
                  <View className="h-2 w-2 rounded-full" style={{ backgroundColor: article.color }} />
                  <Text className="text-[11px] font-bold text-slate-700">{article.source}</Text>
                </View>
                <Text className="text-[11px] text-slate-400">{timeStr}</Text>
              </View>
              <Text className="text-[14px] font-semibold leading-4.75 text-slate-900" numberOfLines={3}>
                {article.title}
              </Text>
              {article.description ? (
                <Text className="mt-1.5 text-[12px] leading-4.25 text-slate-500" numberOfLines={2}>
                  {article.description}
                </Text>
              ) : null}
            </View>
          );
        })}
      </View>
    </View>
  );
}
