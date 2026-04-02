-- Link reply tracking to outbound broadcast rows and treat "sent" as
-- follow-up eligible for pilot deployments without delivery webhooks.

CREATE OR REPLACE FUNCTION public.get_sms_followup_list(
    p_barangay_id     UUID,
    p_broadcast_id    UUID,
    p_minutes_threshold INTEGER DEFAULT 30
)
RETURNS TABLE (
    household_id      UUID,
    household_head    TEXT,
    purok             TEXT,
    phone_number      TEXT,
    vulnerability_flags public.vulnerability_flag[],
    sms_sent_at       TIMESTAMPTZ,
    minutes_since_sent DOUBLE PRECISION
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT
        h.id AS household_id,
        h.household_head,
        h.purok,
        h.phone_number,
        h.vulnerability_flags,
        sl.sent_at,
        EXTRACT(EPOCH FROM (now() - sl.sent_at)) / 60.0 AS minutes_since_sent
    FROM public.sms_logs sl
    JOIN public.households h ON h.phone_number = sl.phone_number
    WHERE sl.barangay_id = p_barangay_id
        AND sl.broadcast_id = p_broadcast_id
        AND sl.direction = 'outbound'
        AND sl.delivery_status IN ('sent', 'delivered')
        AND sl.replied_at IS NULL
        AND sl.sent_at < now() - (p_minutes_threshold || ' minutes')::INTERVAL
    ORDER BY
        cardinality(h.vulnerability_flags) DESC,
        sl.sent_at ASC;
$$;
