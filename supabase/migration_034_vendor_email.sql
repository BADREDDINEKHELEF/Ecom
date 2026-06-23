-- Migration: Add email column to vendors table for password reset
ALTER TABLE public.vendors
  ADD COLUMN IF NOT EXISTS email text;