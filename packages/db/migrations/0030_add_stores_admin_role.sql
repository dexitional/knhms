ALTER TABLE admins
MODIFY COLUMN role ENUM('super_admin', 'admin', 'staff', 'tutor', 'technician', 'stores') NOT NULL DEFAULT 'staff';
