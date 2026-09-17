import { useState, useEffect, createContext, useContext } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (
    email: string,
    password: string,
    firstName: string,
    lastName: string,
    className: string
  ) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  hasRole: (role: string) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      toast.error("Erreur de connexion: " + error.message);
    } else {
      toast.success("Connexion réussie!");
    }

    return { error };
  };

  const signUp = async (
    email: string,
    password: string,
    firstName: string,
    lastName: string,
    className: string
  ) => {
    const redirectUrl = `${window.location.origin}/`;

    // Le nom de famille est toujours stocké en majuscules
    const normalizedLastName = lastName.trim().toUpperCase();

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          first_name: firstName.trim(),
          last_name: normalizedLastName,
          // Conservé pour compatibilité avec le code existant qui lit full_name
          full_name: `${firstName.trim()} ${normalizedLastName}`.trim(),
          class_name: className,
        }
      }
    });

    if (error) {
      toast.error("Erreur d'inscription: " + error.message);
    } else {
      toast.success("Inscription réussie! Vérifiez votre email.");
    }

    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    toast.success("Déconnexion réussie");
    navigate('/');
  };

  const hasRole = async (role: 'student' | 'bdl_member' | 'president'): Promise<boolean> => {
    if (!user) return false;
    
    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', role)
      .maybeSingle();

    return !error && !!data;
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signIn, signUp, signOut, hasRole }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};