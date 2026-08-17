-- Add code column to processes table for storing process codes like "PROC-FISCAL-008"
ALTER TABLE processes ADD COLUMN IF NOT EXISTS code VARCHAR(50);