UPDATE public.error_logs 
SET is_resolved = true, resolved_at = now(), resolved_by = '90579b85-bdea-4632-afc8-981b4120d2ba'
WHERE is_resolved = false OR is_resolved IS NULL;