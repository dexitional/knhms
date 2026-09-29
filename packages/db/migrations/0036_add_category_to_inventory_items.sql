ALTER TABLE inventory_items
  ADD COLUMN category_id INT UNSIGNED NULL AFTER description,
  ADD KEY idx_inventory_items_category (category_id),
  ADD CONSTRAINT fk_inventory_items_category FOREIGN KEY (category_id) REFERENCES inventory_categories (id) ON DELETE SET NULL ON UPDATE CASCADE;
