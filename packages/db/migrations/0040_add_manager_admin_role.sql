ALTER TABLE admins
MODIFY COLUMN role ENUM('super_admin', 'admin', 'staff', 'tutor', 'technician', 'stores', 'supervisor', 'editor', 'manager') NOT NULL DEFAULT 'staff';
