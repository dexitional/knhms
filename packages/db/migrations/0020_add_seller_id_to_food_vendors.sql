ALTER TABLE food_vendors
  ADD COLUMN seller_id INT UNSIGNED NULL AFTER id,
  ADD UNIQUE KEY uq_food_vendors_seller (seller_id),
  ADD CONSTRAINT fk_food_vendors_seller FOREIGN KEY (seller_id) REFERENCES sellers (id) ON DELETE CASCADE ON UPDATE CASCADE;
