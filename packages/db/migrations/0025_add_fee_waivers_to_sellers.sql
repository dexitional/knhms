ALTER TABLE sellers
  ADD COLUMN registration_fee_waived TINYINT(1) NOT NULL DEFAULT 0 AFTER paid_until,
  ADD COLUMN monthly_fee_waived TINYINT(1) NOT NULL DEFAULT 0 AFTER registration_fee_waived;
