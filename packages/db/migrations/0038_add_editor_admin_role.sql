ALTER TABLE admins
MODIFY COLUMN role ENUM('super_admin', 'admin', 'staff', 'tutor', 'technician', 'stores', 'supervisor', 'editor') NOT NULL DEFAULT 'staff';
