-- Create mutation_history table for idempotency
CREATE TABLE IF NOT EXISTS public.mutation_history (
  client_mutation_id TEXT PRIMARY KEY,
  user_id UUID NOT NULL,
  mutation_type TEXT NOT NULL,
  result_payload TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add index for faster lookups by user and type
CREATE INDEX IF NOT EXISTS mutation_history_user_id_idx ON public.mutation_history(user_id);
CREATE INDEX IF NOT EXISTS mutation_history_mutation_type_idx ON public.mutation_history(mutation_type);
CREATE INDEX IF NOT EXISTS mutation_history_created_at_idx ON public.mutation_history(created_at);

-- Enable RLS
ALTER TABLE public.mutation_history ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see their own mutation history
CREATE POLICY "Users can view own mutation history"
  ON public.mutation_history
  FOR SELECT
  USING (auth.uid() = user_id);

-- RLS Policy: Service role can insert (API will handle this)
CREATE POLICY "Service role can insert mutation history"
  ON public.mutation_history
  FOR INSERT
  WITH CHECK (true);

-- Cleanup policy: Auto-delete mutations older than 7 days (optional, for cleanup)
-- This helps keep the table size manageable
COMMENT ON TABLE public.mutation_history IS 'Tracks processed mutations for idempotency. Mutations older than 7 days can be safely deleted.';
