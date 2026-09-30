ALTER TABLE alumni_memberships
  ADD COLUMN directory_entry_id INT UNSIGNED NULL AFTER notes,
  ADD CONSTRAINT fk_alumni_memberships_directory_entry FOREIGN KEY (directory_entry_id) REFERENCES directory_entries (id) ON DELETE SET NULL ON UPDATE CASCADE;
