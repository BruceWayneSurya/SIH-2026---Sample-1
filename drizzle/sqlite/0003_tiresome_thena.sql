-- Retire the faculty email-verification suite: the one-time-code table is
-- dropped here; the retired user columns (email_verified, email_verified_at,
-- email_domain, verification_status, verified_by) are removed idempotently by
-- src/db/ensure-columns.ts so journal-less adoption re-runs stay safe.
DROP TABLE IF EXISTS `email_verifications`;
