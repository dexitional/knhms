CREATE TABLE IF NOT EXISTS inventory_request_items (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  request_id INT UNSIGNED NOT NULL,
  item_id INT UNSIGNED NOT NULL,
  quantity INT UNSIGNED NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_inventory_request_items (request_id, item_id),
  CONSTRAINT fk_inventory_request_items_request FOREIGN KEY (request_id) REFERENCES inventory_requests (id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_inventory_request_items_item FOREIGN KEY (item_id) REFERENCES inventory_items (id) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
