-- Rider compliance fields are administered centrally. The platform stores verification status,
-- document references, and vehicle details needed to determine AP Ride eligibility.

ALTER TABLE public.riders
  ADD COLUMN IF NOT EXISTS vehicle_type text,
  ADD COLUMN IF NOT EXISTS vehicle_make_model text,
  ADD COLUMN IF NOT EXISTS vehicle_plate text,
  ADD COLUMN IF NOT EXISTS vehicle_color text,
  ADD COLUMN IF NOT EXISTS license_class text,
  ADD COLUMN IF NOT EXISTS license_number text,
  ADD COLUMN IF NOT EXISTS license_expiry date,
  ADD COLUMN IF NOT EXISTS license_image_url text,
  ADD COLUMN IF NOT EXISTS vehicle_registration_image_url text,
  ADD COLUMN IF NOT EXISTS insurance_expiry date,
  ADD COLUMN IF NOT EXISTS insurance_image_url text,
  ADD COLUMN IF NOT EXISTS tax_expiry date,
  ADD COLUMN IF NOT EXISTS tax_image_url text,
  ADD COLUMN IF NOT EXISTS compulsory_insurance_expiry date,
  ADD COLUMN IF NOT EXISTS compulsory_insurance_image_url text,
  ADD COLUMN IF NOT EXISTS identity_verified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS identity_document_image_url text,
  ADD COLUMN IF NOT EXISTS criminal_record_checked boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS criminal_record_checked_at timestamptz,
  ADD COLUMN IF NOT EXISTS compliance_status text NOT NULL DEFAULT 'pending' CHECK (compliance_status IN ('pending','approved','suspended','expired')),
  ADD COLUMN IF NOT EXISTS compliance_note text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS compliance_reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS compliance_reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS ap_ride_approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS ap_ride_approved_at timestamptz;

CREATE INDEX IF NOT EXISTS riders_compliance_status_idx ON public.riders(compliance_status, ride_service_enabled, rating);

CREATE OR REPLACE FUNCTION private.protect_rider_compliance_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NOT private.has_role('admin') AND (
    NEW.rating IS DISTINCT FROM OLD.rating OR
    NEW.review_count IS DISTINCT FROM OLD.review_count OR
    NEW.identity_verified IS DISTINCT FROM OLD.identity_verified OR
    NEW.criminal_record_checked IS DISTINCT FROM OLD.criminal_record_checked OR
    NEW.criminal_record_checked_at IS DISTINCT FROM OLD.criminal_record_checked_at OR
    NEW.compliance_status IS DISTINCT FROM OLD.compliance_status OR
    NEW.compliance_note IS DISTINCT FROM OLD.compliance_note OR
    NEW.compliance_reviewed_by IS DISTINCT FROM OLD.compliance_reviewed_by OR
    NEW.compliance_reviewed_at IS DISTINCT FROM OLD.compliance_reviewed_at OR
    NEW.ride_license_class_2_verified IS DISTINCT FROM OLD.ride_license_class_2_verified OR
    NEW.ride_safety_clearance IS DISTINCT FROM OLD.ride_safety_clearance OR
    NEW.ride_service_enabled IS DISTINCT FROM OLD.ride_service_enabled OR
    NEW.ap_ride_approved_by IS DISTINCT FROM OLD.ap_ride_approved_by OR
    NEW.ap_ride_approved_at IS DISTINCT FROM OLD.ap_ride_approved_at
  ) THEN
    RAISE EXCEPTION 'Only administrators can change Rider verification, rating, or AP Ride permissions';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_rider_compliance_fields ON public.riders;
CREATE TRIGGER protect_rider_compliance_fields
  BEFORE UPDATE ON public.riders
  FOR EACH ROW EXECUTE FUNCTION private.protect_rider_compliance_fields();

CREATE OR REPLACE VIEW public.public_ap_ride_riders
WITH (security_invoker = true)
AS
SELECT id, name, profile_image_url, rating, review_count
FROM public.riders
WHERE status = 'พร้อมรับงาน'
  AND compliance_status = 'approved'
  AND ride_available = true
  AND ride_service_enabled = true
  AND ride_license_class_2_verified = true
  AND ride_safety_clearance = true
  AND COALESCE(rating,0) >= 4;

NOTIFY pgrst, 'reload schema';
