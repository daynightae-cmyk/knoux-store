alter table public.signal_numbers
  drop constraint if exists signal_numbers_phone_e164_check;

alter table public.signal_numbers
  add constraint signal_numbers_phone_e164_check
  check (phone_e164 ~ '^\+[1-9][0-9]{6,14}$');
