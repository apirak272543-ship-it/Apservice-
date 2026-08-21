-- The role-access Edge Function authenticates the caller as an Admin before using
-- the trusted service-role client for compliance review. Keep direct clients blocked.
CREATE OR REPLACE FUNCTION private.protect_rider_compliance_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
BEGIN
  IF TG_OP = 'UPDATE'
    AND COALESCE(auth.role(), '') <> 'service_role'
    AND NOT private.has_role('admin')
    AND (
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

NOTIFY pgrst, 'reload schema';
