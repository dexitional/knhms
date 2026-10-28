-- Hall pages (Home menu): Hall Council, Hall Management and Hall Tutors are
-- directory entries in their own categories, managed in Admin → Yellow
-- Pages and shown only on their hall pages. Hall Executives (JCRC) reuse
-- the existing 'executive' category.
ALTER TABLE directory_entries
MODIFY COLUMN category ENUM('personnel', 'business', 'executive', 'page_personnel', 'alumni', 'council', 'management', 'tutor') NOT NULL;
