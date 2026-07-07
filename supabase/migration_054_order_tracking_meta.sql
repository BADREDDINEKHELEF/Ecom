-- Add tracking columns to orders table for Meta CAPI and TikTok server events
alter table public.orders 
  add column if not exists client_ip text,
  add column if not exists client_user_agent text;
