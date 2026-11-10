-- ============================================================
-- Digital Identity Proofing Platform - PostgreSQL 16 setup
-- ============================================================
-- Hibernate creates and updates all tables automatically
-- (spring.jpa.hibernate.ddl-auto=update), so you only need to
-- create the empty database once.
--
-- Run in psql as a superuser:
--   psql -U postgres -f docs/database-setup.sql
-- ============================================================

-- 1. Create the database (skip if it already exists).
CREATE DATABASE identity_db;

-- 2. Connect to it (psql command, not SQL):
-- \c identity_db

-- 3. Start the application once. Tables created by Hibernate:
--      applications, vendor_responses, verification_decisions,
--      exception_queue, audit_logs

-- ------------------------------------------------------------
-- Handy queries while testing
-- ------------------------------------------------------------
-- SELECT id, application_reference, applicant_name, application_status FROM applications ORDER BY id;
-- SELECT application_id, vendor_name, verification_status, confidence_score, response_status FROM vendor_responses ORDER BY application_id, vendor_name;
-- SELECT application_id, vendor_a_status, vendor_b_status, final_decision, decision_reason FROM verification_decisions;
-- SELECT id, application_id, priority, queue_status, reviewer_name FROM exception_queue;
-- SELECT created_at, application_id, action, performed_by FROM audit_logs ORDER BY id DESC;

-- ------------------------------------------------------------
-- Reset all demo data (keeps the tables). Run inside identity_db.
-- ------------------------------------------------------------
-- TRUNCATE TABLE audit_logs, exception_queue, verification_decisions,
--                vendor_responses, applications RESTART IDENTITY CASCADE;

-- ------------------------------------------------------------
-- Drop everything and start from scratch (run as superuser, connected to another database):
-- ------------------------------------------------------------
-- DROP DATABASE identity_db;
-- CREATE DATABASE identity_db;
