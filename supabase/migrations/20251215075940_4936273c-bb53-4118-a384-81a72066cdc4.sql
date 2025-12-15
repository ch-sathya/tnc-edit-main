-- Function to get pending changes for conflict resolution (fixed column alias)
CREATE OR REPLACE FUNCTION public.get_pending_changes(file_uuid UUID)
RETURNS TABLE (
    change_id UUID,
    change_user_id UUID,
    change_operation_type TEXT,
    change_position_start INTEGER,
    change_position_end INTEGER,
    change_content TEXT,
    change_version INTEGER,
    change_timestamp TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        fc.id,
        fc.user_id,
        fc.operation_type,
        fc.position_start,
        fc.position_end,
        fc.content,
        fc.version,
        fc.timestamp
    FROM public.file_changes fc
    WHERE fc.file_id = file_uuid
    AND fc.applied = false
    ORDER BY fc.timestamp ASC;
END;
$$;