CREATE TABLE IF NOT EXISTS inventory_movements (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  item_id INT UNSIGNED NOT NULL,
  quantity_change INT NOT NULL,
  quantity_after INT UNSIGNED NOT NULL,
  reason ENUM('opening', 'restock', 'adjustment', 'release') NOT NULL,
  note VARCHAR(255) NULL,
  request_id INT UNSIGNED NULL,
  admin_id INT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_inventory_movements_item (item_id, created_at),
  CONSTRAINT fk_inventory_movements_item FOREIGN KEY (item_id) REFERENCES inventory_items (id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_inventory_movements_request FOREIGN KEY (request_id) REFERENCES inventory_requests (id) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT fk_inventory_movements_admin FOREIGN KEY (admin_id) REFERENCES admins (id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
