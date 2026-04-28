ALTER TABLE profiles ADD COLUMN IF NOT EXISTS age INTEGER CHECK (age > 0 AND age < 150);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS gender TEXT CHECK (gender IN ('male', 'female', 'prefer_not_to_say'));
