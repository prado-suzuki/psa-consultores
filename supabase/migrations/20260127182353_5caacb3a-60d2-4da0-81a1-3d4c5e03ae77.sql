-- Add tool_type column to differentiate between EFD and XML export profiles
ALTER TABLE public.export_profiles 
ADD COLUMN tool_type text NOT NULL DEFAULT 'xml';

-- Add index for faster filtering by user and tool type
CREATE INDEX idx_export_profiles_user_tool ON public.export_profiles(user_id, tool_type);

-- Add comment explaining the column
COMMENT ON COLUMN public.export_profiles.tool_type IS 'Type of export tool: xml, efd';