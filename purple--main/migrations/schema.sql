-- Supabase Database Migration Schema
-- Run this in the SQL Editor of your Supabase project.

-- Enable UUID-OSSP extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Create categories table
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Create users table for role-based access
CREATE TABLE IF NOT EXISTS public.users (
    id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'user'::CHARACTER VARYING NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Create content table (portfolio items and testimonials)
CREATE TABLE IF NOT EXISTS public.content (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    category_slug VARCHAR(255) REFERENCES public.categories(slug) ON DELETE CASCADE NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    media_url TEXT,
    thumbnail_url TEXT,
    metadata JSONB DEFAULT '{}'::JSONB NOT NULL,
    status VARCHAR(50) DEFAULT 'active'::CHARACTER VARYING NOT NULL, -- 'active', 'draft', 'pending_review'
    is_featured BOOLEAN DEFAULT false NOT NULL,
    order_index INTEGER DEFAULT 0 NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Create media table
CREATE TABLE IF NOT EXISTS public.media (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    filename VARCHAR(255) NOT NULL,
    file_path VARCHAR(255) NOT NULL,
    file_type VARCHAR(100) NOT NULL,
    size_bytes BIGINT NOT NULL,
    uploaded_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Create settings table
CREATE TABLE IF NOT EXISTS public.settings (
    key VARCHAR(255) PRIMARY KEY,
    value JSONB DEFAULT '{}'::JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. Create analytics table
CREATE TABLE IF NOT EXISTS public.analytics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    event_type VARCHAR(100) NOT NULL, -- 'page_view', 'click', 'submission'
    page_path VARCHAR(255),
    ip_hash VARCHAR(64),
    metadata JSONB DEFAULT '{}'::JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Insert Default Categories
INSERT INTO public.categories (name, slug) VALUES
('Thumbnail', 'thumbnail'),
('Graphic Design', 'graphic-design'),
('Short Form Video', 'short-form'),
('Long Form Video', 'long-form'),
('Testimonial', 'testimonial')
ON CONFLICT (slug) DO NOTHING;

-- Insert Default Settings
INSERT INTO public.settings (key, value) VALUES
('whatsapp_number', '"919542785647"'),
('contact_email', '"contact@klyperix.com"'),
('pricing_details', '{"basic": "$99", "pro": "$199"}'),
('cta_text', '"Let’s Grow Your Content"')
ON CONFLICT (key) DO NOTHING;

-- Enable Row Level Security (RLS)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics ENABLE ROW LEVEL SECURITY;

-- 8. RLS Policies

-- Users Policies
CREATE POLICY "Allow public read users" ON public.users 
    FOR SELECT USING (true);

CREATE POLICY "Allow admin all users" ON public.users 
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
    );

-- Categories Policies
CREATE POLICY "Allow public read categories" ON public.categories 
    FOR SELECT USING (true);

CREATE POLICY "Allow admin all categories" ON public.categories 
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
    );

-- Content Policies
CREATE POLICY "Allow public read active content" ON public.content 
    FOR SELECT USING (status = 'active');

CREATE POLICY "Allow public insert pending testimonials" ON public.content 
    FOR INSERT WITH CHECK (category_slug = 'testimonial' AND status = 'pending_review');

CREATE POLICY "Allow admin all content" ON public.content 
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
    );

-- Media Policies
CREATE POLICY "Allow public read media" ON public.media 
    FOR SELECT USING (true);

CREATE POLICY "Allow admin all media" ON public.media 
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
    );

-- Settings Policies
CREATE POLICY "Allow public read settings" ON public.settings 
    FOR SELECT USING (true);

CREATE POLICY "Allow admin all settings" ON public.settings 
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
    );

-- Analytics Policies
CREATE POLICY "Allow public insert analytics" ON public.analytics 
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow admin read analytics" ON public.analytics 
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
    );

-- 9. Trigger to sync auth users into public users table
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, role)
  VALUES (
    new.id,
    new.email,
    CASE
      -- First user or specific email can be default admin
      WHEN new.email = 'admin@klyperix.com' THEN 'admin'
      ELSE 'user'
    END
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
