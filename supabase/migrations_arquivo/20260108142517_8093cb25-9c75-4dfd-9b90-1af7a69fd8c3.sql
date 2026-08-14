-- Create export_profiles table for saving user column preferences
CREATE TABLE public.export_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  columns TEXT[] NOT NULL,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.export_profiles ENABLE ROW LEVEL SECURITY;

-- Users can only manage their own profiles
CREATE POLICY "Users can view own export profiles"
  ON public.export_profiles
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own export profiles"
  ON public.export_profiles
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own export profiles"
  ON public.export_profiles
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own export profiles"
  ON public.export_profiles
  FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_export_profiles_updated_at
  BEFORE UPDATE ON public.export_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();