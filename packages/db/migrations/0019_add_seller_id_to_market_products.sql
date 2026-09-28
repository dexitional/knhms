ALTER TABLE market_products
  ADD COLUMN seller_id INT UNSIGNED NULL AFTER category_id,
  ADD KEY idx_market_products_seller (seller_id),
  ADD CONSTRAINT fk_market_products_seller FOREIGN KEY (seller_id) REFERENCES sellers (id) ON DELETE CASCADE ON UPDATE CASCADE;
