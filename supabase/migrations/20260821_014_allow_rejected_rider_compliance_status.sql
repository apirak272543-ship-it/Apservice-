-- The Admin review UI and Rider app expose a rejected state for returned documents.
-- Keep all existing states and add rejected explicitly to the database contract.
ALTER TABLE public.riders DROP CONSTRAINT IF EXISTS riders_compliance_status_check;
ALTER TABLE public.riders ADD CONSTRAINT riders_compliance_status_check
  CHECK (compliance_status IN ('pending', 'approved', 'rejected', 'suspended', 'expired'));
NOTIFY pgrst, 'reload schema';
