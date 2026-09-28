ALTER TABLE directory_entries
MODIFY COLUMN category ENUM('personnel', 'business', 'executive', 'page_personnel') NOT NULL;
