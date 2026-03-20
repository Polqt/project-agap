import { useEffect } from "react";

import { supabase } from "@/services/supabase";

export function useRealtimeSubscription<T>(
  channel: string,
  table: string,
  filter: string,
  onData: (payload: T) => void,
) {
  useEffect(() => {
    const realtimeChannel = supabase
      .channel(channel)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table, filter },
        (payload) => onData(payload.new as T),
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(realtimeChannel);
    };
  }, [channel, filter, onData, table]);
}
