import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { PieChart, Plus, Trash2, Edit, BarChart3, Lock, Unlock } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface Survey {
  id: string;
  title: string;
  description: string;
  status: "draft" | "open" | "closed";
  start_date: string | null;
  end_date: string | null;
  created_at: string;
}

interface Question {
  id: string;
  question_text: string;
  question_type: "qcm" | "text";
  display_order: number;
  options?: Option[];
}

interface Option {
  id: string;
  option_text: string;
  display_order: number;
}

export const SurveyManagement = () => {
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [editingSurvey, setEditingSurvey] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    start_date: "",
    end_date: "",
  });
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadSurveys();
  }, []);

  const loadSurveys = async () => {
    const { data, error } = await supabase
      .from("surveys")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Erreur lors du chargement");
      console.error(error);
    } else {
      setSurveys(data || []);
    }
  };

  const loadQuestions = async (surveyId: string) => {
    const { data: questionsData, error: qError } = await supabase
      .from("survey_questions")
      .select("*")
      .eq("survey_id", surveyId)
      .order("display_order");

    if (qError) {
      console.error(qError);
      return;
    }

    const questionsWithOptions = await Promise.all(
      (questionsData || []).map(async (q) => {
        if (q.question_type === "qcm") {
          const { data: options } = await supabase
            .from("survey_options")
            .select("*")
            .eq("question_id", q.id)
            .order("display_order");
          return { ...q, options: options || [] };
        }
        return q;
      })
    );

    setQuestions(questionsWithOptions);
  };

  const handleCreateSurvey = async () => {
    if (!formData.title) {
      toast.error("Le titre est requis");
      return;
    }

    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from("surveys")
      .insert({
        title: formData.title,
        description: formData.description,
        start_date: formData.start_date || null,
        end_date: formData.end_date || null,
        created_by: user?.id,
        status: "draft",
      })
      .select()
      .single();

    if (error) {
      toast.error("Erreur lors de la création");
      console.error(error);
    } else {
      toast.success("Sondage créé");
      setEditingSurvey(data.id);
      loadSurveys();
    }
    setLoading(false);
  };

  const handleUpdateStatus = async (surveyId: string, newStatus: "draft" | "open" | "closed") => {
    const { error } = await supabase
      .from("surveys")
      .update({ status: newStatus })
      .eq("id", surveyId);

    if (error) {
      toast.error("Erreur lors de la mise à jour");
      console.error(error);
    } else {
      toast.success(`Sondage ${newStatus === "open" ? "ouvert" : "fermé"}`);
      loadSurveys();
    }
  };

  const handleDeleteSurvey = async (surveyId: string) => {
    const { error } = await supabase
      .from("surveys")
      .delete()
      .eq("id", surveyId);

    if (error) {
      toast.error("Erreur lors de la suppression");
      console.error(error);
    } else {
      toast.success("Sondage supprimé");
      loadSurveys();
    }
  };

  const addQuestion = async (surveyId: string, type: "qcm" | "text") => {
    const questionText = prompt("Texte de la question :");
    if (!questionText) return;

    const { data, error } = await supabase
      .from("survey_questions")
      .insert({
        survey_id: surveyId,
        question_text: questionText,
        question_type: type,
        display_order: questions.length,
      })
      .select()
      .single();

    if (error) {
      toast.error("Erreur lors de l'ajout");
      console.error(error);
    } else {
      toast.success("Question ajoutée");
      if (type === "qcm") {
        // Add default options
        await supabase.from("survey_options").insert([
          { question_id: data.id, option_text: "Option 1", display_order: 0 },
          { question_id: data.id, option_text: "Option 2", display_order: 1 },
        ]);
      }
      loadQuestions(surveyId);
    }
  };

  const deleteQuestion = async (questionId: string, surveyId: string) => {
    const { error } = await supabase
      .from("survey_questions")
      .delete()
      .eq("id", questionId);

    if (error) {
      toast.error("Erreur lors de la suppression");
      console.error(error);
    } else {
      toast.success("Question supprimée");
      loadQuestions(surveyId);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "draft":
        return <Badge variant="secondary">Brouillon</Badge>;
      case "open":
        return <Badge className="bg-green-600">Ouvert</Badge>;
      case "closed":
        return <Badge variant="destructive">Fermé</Badge>;
      default:
        return null;
    }
  };

  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-6 w-6" />
          Gestion des Sondages
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Creation Form */}
        <div className="border rounded-lg p-6 space-y-4 bg-muted/30">
          <div className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            <h3 className="font-semibold">Créer un nouveau sondage</h3>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Titre du sondage</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Titre"
              />
            </div>

            <div className="space-y-2">
              <Label>Description (optionnel)</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                placeholder="Description du sondage..."
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Date de début (optionnel)</Label>
                <Input
                  type="datetime-local"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Date de fin (optionnel)</Label>
                <Input
                  type="datetime-local"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                />
              </div>
            </div>

            <Button onClick={handleCreateSurvey} disabled={loading}>
              <Plus className="h-4 w-4 mr-2" />
              Créer le sondage
            </Button>
          </div>
        </div>

        {/* List of Surveys */}
        <div className="space-y-4">
          <h3 className="font-semibold text-lg">Sondages existants</h3>

          {surveys.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Aucun sondage pour le moment
            </p>
          ) : (
            surveys.map((survey) => (
              <Card key={survey.id} className="bg-muted/30">
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-bold text-xl">{survey.title}</h4>
                        {getStatusBadge(survey.status)}
                      </div>
                      {survey.description && (
                        <p className="text-sm text-muted-foreground mb-2">
                          {survey.description}
                        </p>
                      )}
                      <div className="text-xs text-muted-foreground">
                        {survey.start_date && (
                          <span>
                            Début: {new Date(survey.start_date).toLocaleString("fr-FR")}
                          </span>
                        )}
                        {survey.end_date && (
                          <span className="ml-4">
                            Fin: {new Date(survey.end_date).toLocaleString("fr-FR")}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      {survey.status === "draft" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleUpdateStatus(survey.id, "open")}
                        >
                          <Unlock className="h-4 w-4 mr-2" />
                          Ouvrir
                        </Button>
                      )}
                      {survey.status === "open" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleUpdateStatus(survey.id, "closed")}
                        >
                          <Lock className="h-4 w-4 mr-2" />
                          Fermer
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditingSurvey(editingSurvey === survey.id ? null : survey.id);
                          if (editingSurvey !== survey.id) loadQuestions(survey.id);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
                            <AlertDialogDescription>
                              Supprimer ce sondage et toutes ses réponses ?
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Annuler</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDeleteSurvey(survey.id)}>
                              Supprimer
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>

                  {editingSurvey === survey.id && (
                    <div className="mt-4 p-4 border rounded-lg bg-background space-y-4">
                      <h4 className="font-semibold">Questions</h4>

                      {questions.map((q) => (
                        <div key={q.id} className="p-3 bg-muted/50 rounded">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <p className="font-medium">{q.question_text}</p>
                              <Badge variant="outline" className="text-xs mt-1">
                                {q.question_type === "qcm" ? "QCM" : "Texte libre"}
                              </Badge>
                              {q.options && (
                                <ul className="mt-2 space-y-1 text-sm">
                                  {q.options.map((opt) => (
                                    <li key={opt.id}>• {opt.option_text}</li>
                                  ))}
                                </ul>
                              )}
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => deleteQuestion(q.id, survey.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}

                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => addQuestion(survey.id, "qcm")}
                        >
                          <PieChart className="h-4 w-4 mr-2" />
                          Ajouter QCM
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => addQuestion(survey.id, "text")}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Ajouter Texte Libre
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};