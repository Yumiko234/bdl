-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('student', 'bdl_member', 'president');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  class_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_roles table (separate from profiles for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  assigned_by UUID REFERENCES auth.users(id),
  UNIQUE(user_id, role)
);

-- Create clubs table
CREATE TABLE public.clubs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('cultural', 'sport')),
  president_name TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'pending', 'inactive')),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create news/actualites table
CREATE TABLE public.news (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  content TEXT NOT NULL,
  is_important BOOLEAN DEFAULT FALSE,
  author_id UUID REFERENCES auth.users(id) NOT NULL,
  published_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create documents table
CREATE TABLE public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  file_url TEXT,
  file_size TEXT,
  uploaded_by UUID REFERENCES auth.users(id) NOT NULL,
  is_public BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create audience requests table
CREATE TABLE public.audience_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  requester_name TEXT NOT NULL,
  requester_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  request_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by UUID REFERENCES auth.users(id),
  review_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reviewed_at TIMESTAMP WITH TIME ZONE
);

-- Create class forums table
CREATE TABLE public.class_forums (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create forum messages table
CREATE TABLE public.forum_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  forum_id UUID REFERENCES public.class_forums(id) ON DELETE CASCADE NOT NULL,
  author_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  author_name TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clubs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.news ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audience_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_forums ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_messages ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Create function to check if user is BDL member or president
CREATE OR REPLACE FUNCTION public.is_bdl_staff(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id 
    AND role IN ('bdl_member', 'president')
  )
$$;

-- Profiles policies
CREATE POLICY "Users can view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- User roles policies (only BDL staff can manage roles)
CREATE POLICY "Everyone can view user roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only BDL staff can insert roles"
  ON public.user_roles FOR INSERT
  TO authenticated
  WITH CHECK (public.is_bdl_staff(auth.uid()));

CREATE POLICY "Only BDL staff can delete roles"
  ON public.user_roles FOR DELETE
  TO authenticated
  USING (public.is_bdl_staff(auth.uid()));

-- Clubs policies
CREATE POLICY "Everyone can view active clubs"
  ON public.clubs FOR SELECT
  TO authenticated
  USING (status = 'active' OR public.is_bdl_staff(auth.uid()));

CREATE POLICY "BDL staff can insert clubs"
  ON public.clubs FOR INSERT
  TO authenticated
  WITH CHECK (public.is_bdl_staff(auth.uid()));

CREATE POLICY "BDL staff can update clubs"
  ON public.clubs FOR UPDATE
  TO authenticated
  USING (public.is_bdl_staff(auth.uid()));

CREATE POLICY "BDL staff can delete clubs"
  ON public.clubs FOR DELETE
  TO authenticated
  USING (public.is_bdl_staff(auth.uid()));

-- News policies
CREATE POLICY "Everyone can view news"
  ON public.news FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "BDL staff can create news"
  ON public.news FOR INSERT
  TO authenticated
  WITH CHECK (public.is_bdl_staff(auth.uid()));

CREATE POLICY "BDL staff can update news"
  ON public.news FOR UPDATE
  TO authenticated
  USING (public.is_bdl_staff(auth.uid()));

CREATE POLICY "BDL staff can delete news"
  ON public.news FOR DELETE
  TO authenticated
  USING (public.is_bdl_staff(auth.uid()));

-- Documents policies
CREATE POLICY "Everyone can view public documents"
  ON public.documents FOR SELECT
  TO authenticated
  USING (is_public = true OR public.is_bdl_staff(auth.uid()));

CREATE POLICY "BDL staff can insert documents"
  ON public.documents FOR INSERT
  TO authenticated
  WITH CHECK (public.is_bdl_staff(auth.uid()));

CREATE POLICY "BDL staff can update documents"
  ON public.documents FOR UPDATE
  TO authenticated
  USING (public.is_bdl_staff(auth.uid()));

CREATE POLICY "BDL staff can delete documents"
  ON public.documents FOR DELETE
  TO authenticated
  USING (public.is_bdl_staff(auth.uid()));

-- Audience requests policies
CREATE POLICY "Users can view their own requests"
  ON public.audience_requests FOR SELECT
  TO authenticated
  USING (requester_id = auth.uid() OR public.is_bdl_staff(auth.uid()));

CREATE POLICY "Authenticated users can create requests"
  ON public.audience_requests FOR INSERT
  TO authenticated
  WITH CHECK (requester_id = auth.uid());

CREATE POLICY "Only president can update requests"
  ON public.audience_requests FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'president'));

-- Class forums policies
CREATE POLICY "Everyone can view forums"
  ON public.class_forums FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "BDL staff can create forums"
  ON public.class_forums FOR INSERT
  TO authenticated
  WITH CHECK (public.is_bdl_staff(auth.uid()));

-- Forum messages policies
CREATE POLICY "Users can view messages in their class forum"
  ON public.forum_messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.class_forums cf
      JOIN public.profiles p ON p.class_name = cf.class_name
      WHERE cf.id = forum_messages.forum_id
      AND p.id = auth.uid()
    )
    OR public.is_bdl_staff(auth.uid())
  );

CREATE POLICY "Users can post in their class forum"
  ON public.forum_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.class_forums cf
      JOIN public.profiles p ON p.class_name = cf.class_name
      WHERE cf.id = forum_id
      AND p.id = auth.uid()
    )
    AND author_id = auth.uid()
  );

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Utilisateur'),
    NEW.email
  );
  
  -- Assign default student role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'student');
  
  RETURN NEW;
END;
$$;

-- Create trigger for new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Add triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_clubs_updated_at
  BEFORE UPDATE ON public.clubs
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_news_updated_at
  BEFORE UPDATE ON public.news
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Insert some initial data
INSERT INTO public.class_forums (class_name, description) VALUES
  ('Seconde A', 'Forum de la classe Seconde A'),
  ('Seconde B', 'Forum de la classe Seconde B'),
  ('Première A', 'Forum de la classe Première A'),
  ('Première B', 'Forum de la classe Première B'),
  ('Terminale A', 'Forum de la classe Terminale A'),
  ('Terminale B', 'Forum de la classe Terminale B');