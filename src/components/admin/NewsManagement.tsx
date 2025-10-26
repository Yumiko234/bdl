import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RichTextEditor } from "@/components/RichTextEditor";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Newspaper, Pin, Edit, Trash2 } from "lucide-react";

interface NewsArticle {
  id: string;
  title: string;
  content: string;
  category: string;
  is_important: boolean;
  is_pinned: boolean;
  published_at: string;
  author_name?: string | null;
  author_role?: string | null;
  author_avatar?: string | null;
}

interface NewsManagementProps {
  isPresident: boolean;
}

export const NewsManagement = ({ isPresident }: NewsManagementProps) => {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [editingArticle, setEditingArticle] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    category: "actualites",
    is_important: false,
    visibility: "public"
  });

  useEffect(() => {
    loadArticles();
  }, []);

  const loadArticles = async () => {
    const { data, error } = await supabase
      .from('news')
      .select('*')
      .order('is_pinned', { ascending: false })
      .order('published_at', { ascending: false });

    if (error) {
      toast.error("Erreur lors du chargement des articles");
    } else {
      setArticles(data || []);
    }
  };

  const handleSubmit = async () => {
    if (!formData.title || !formData.content) {
      toast.error("Veuillez remplir tous les champs");
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, avatar_url' as any)
      .eq('id', user.id)
      .single();

    const { data: roles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    const userRole = roles?.[0]?.role || 'bdl_member';

    if (editingArticle) {
      const { error } = await supabase
        .from('news')
        .update({
          title: formData.title,
          content: formData.content,
          category: formData.category,
          is_important: formData.is_important,
          visibility: formData.visibility
        })
        .eq('id', editingArticle);

      if (error) {
        toast.error("Erreur lors de la modification");
      } else {
        toast.success("Article modifié avec succès");
        resetForm();
        loadArticles();
      }
    } else {
      const { error } = await supabase
        .from('news')
        .insert({
          title: formData.title,
          content: formData.content,
          category: formData.category,
          is_important: formData.is_important,
          visibility: formData.visibility,
          author_id: user.id,
          author_name: (profile as any)?.full_name || null,
          author_role: userRole,
          author_avatar: (profile as any)?.avatar_url || null
        });

      if (error) {
        toast.error("Erreur lors de la création");
      } else {
        toast.success("Article publié avec succès");
        resetForm();
        loadArticles();
      }
    }
  };

  const handleEdit = (article: NewsArticle) => {
    setEditingArticle(article.id);
    setFormData({
      title: article.title,
      content: article.content,
      category: article.category,
      is_important: article.is_important,
      visibility: (article as any).visibility || "public"
    });
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cet article ?")) return;

    const { error } = await supabase
      .from('news')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error("Erreur lors de la suppression");
    } else {
      toast.success("Article supprimé");
      loadArticles();
    }
  };

  const handlePin = async (id: string, currentPinned: boolean) => {
    const { error } = await supabase
      .from('news')
      .update({ is_pinned: !currentPinned })
      .eq('id', id);

    if (error) {
      toast.error("Erreur lors de l'épinglage");
    } else {
      toast.success(currentPinned ? "Article désépinglé" : "Article épinglé");
      loadArticles();
    }
  };

  const resetForm = () => {
    setFormData({
      title: "",
      content: "",
      category: "actualites",
      is_important: false,
      visibility: "public"
    });
    setEditingArticle(null);
  };

  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Newspaper className="h-6 w-6" />
          Gestion des Articles
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="border rounded-lg p-6 space-y-4 bg-muted/30">
          <h3 className="font-semibold">
            {editingArticle ? "Modifier l'article" : "Nouvel article"}
          </h3>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Titre</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Titre de l'article"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="content">Contenu</Label>
              <RichTextEditor
                value={formData.content}
                onChange={(value) => setFormData({ ...formData, content: value })}
                placeholder="Contenu de l'article..."
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">Catégorie</Label>
                <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                  <SelectTrigger id="category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="actualites">Actualités</SelectItem>
                    <SelectItem value="evenements">Événements</SelectItem>
                    <SelectItem value="bdl">BDL</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="visibility">Visibilité</Label>
                <Select value={formData.visibility} onValueChange={(value) => setFormData({ ...formData, visibility: value })}>
                  <SelectTrigger id="visibility">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public">Public (tous)</SelectItem>
                    <SelectItem value="authenticated">Connectés uniquement</SelectItem>
                    <SelectItem value="bdl_only">BDL seulement</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="important"
                checked={formData.is_important}
                onCheckedChange={(checked) => setFormData({ ...formData, is_important: checked })}
              />
              <Label htmlFor="important">Article important</Label>
            </div>
            
            <div className="flex gap-2">
              <Button onClick={handleSubmit}>
                {editingArticle ? "Modifier" : "Publier"}
              </Button>
              {editingArticle && (
                <Button variant="outline" onClick={resetForm}>
                  Annuler
                </Button>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="font-semibold">Articles publiés</h3>
          
          {articles.map((article) => (
            <Card key={article.id} className="bg-muted/30">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium">{article.title}</h4>
                        {article.is_pinned && (
                          <Badge variant="default" className="flex items-center gap-1">
                            <Pin className="h-3 w-3" />
                            Épinglé
                          </Badge>
                        )}
                        {article.is_important && (
                          <Badge variant="secondary">Important</Badge>
                        )}
                      </div>
                      <div 
                        className="prose prose-sm max-w-none dark:prose-invert line-clamp-2"
                        dangerouslySetInnerHTML={{ __html: article.content }}
                      />
                      <p className="text-xs text-muted-foreground">
                        {new Date(article.published_at).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                  
                  <div className="flex gap-2">
                    {isPresident && (
                      <Button 
                        size="sm" 
                        variant={article.is_pinned ? "default" : "outline"}
                        onClick={() => handlePin(article.id, article.is_pinned)}
                      >
                        <Pin className="h-4 w-4" />
                      </Button>
                    )}
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleEdit(article)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button 
                      size="sm" 
                      variant="destructive"
                      onClick={() => handleDelete(article.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
