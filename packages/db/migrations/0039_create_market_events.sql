CREATE TABLE IF NOT EXISTS market_events (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  event_type ENUM('product_view', 'vendor_view', 'order_click') NOT NULL,
  channel ENUM('whatsapp', 'call') NULL,
  product_id INT UNSIGNED NULL,
  vendor_id INT UNSIGNED NULL,
  seller_id INT UNSIGNED NULL,
  target_key VARCHAR(40) NOT NULL,
  visitor_key CHAR(32) NOT NULL,
  event_date DATE NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_market_events_daily (visitor_key, event_date, event_type, target_key),
  KEY idx_market_events_seller (seller_id, event_date),
  CONSTRAINT fk_market_events_product FOREIGN KEY (product_id) REFERENCES market_products (id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_market_events_vendor FOREIGN KEY (vendor_id) REFERENCES food_vendors (id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_market_events_seller FOREIGN KEY (seller_id) REFERENCES sellers (id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
