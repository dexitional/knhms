UPDATE sellers s JOIN food_vendors v ON v.seller_id = s.id SET s.logo_url = v.logo_url WHERE s.logo_url IS NULL AND v.logo_url IS NOT NULL;
