-- Prevent role-controlled search_path for the error log redaction helper.
ALTER FUNCTION private.redact_error_text(text)
SET search_path = pg_catalog, public, pg_temp;
