import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  BarChart3,
  Plus,
  Trash2,
  Edit2,
  Lock,
  Unlock,
  ChevronDown,
  ChevronUp,
  Eye,
  ArrowLeft,
  FileText,
  PieChart as PieChartIcon,
  User,
  Clock,
} from "lucide-react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Survey {
  id: string;
  title: string;
  description: string;
  status: "draft" | "open" | "closed";
  start_date: string | null;
  end_date: string | null;
  allow_anonymous: boolean;
  is_form: boolean;
  created_at: string;
}

interface Question {
  id: string;
  survey_id: string;
  question_text: string;
  question_type: "qcm" | "text";
  display_order: number;
  is_required: boolean;
  options: Option[];
}

interface Option {
  id: string;
  question_id: string;
  option_text: string;
  display_order: number;
}

interface SurveyResponse {
  id: string;
  survey_id: string;
  respondent_name: string | null;
  is_anonymous: boolean;
  submitted_at: string;
}

interface SurveyAnswer {
  id: string;
  response_id: string;
  question_id: string;
  option_id: string | null;
  text_answer: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const StatusBadge = ({ status }: { status: string }) => {
  if (status === "draft") return <Badge variant="secondary">Brouillon</Badge>;
  if (status === "open") return <Badge className="bg-green-600 text-white">Ouvert</Badge>;
  if (status === "closed") return <Badge variant="destructive">Fermé</Badge>;
  return null;
};

// ─── Sub-view: Responses for one survey ──────────────────────────────────────

const ResponsesView = ({
  survey,
  questions,
  onBack,
}: {
  survey: Survey;
  questions: Question[];
  onBack: () => void;
}) => {
  const [responses, setResponses] = useState<SurveyResponse[]>([]);
  const [answers, setAnswers] = useState<Record<string, SurveyAnswer[]>>({});
  const [loading, setLoading] = useState(true);
  const [expandedResponse, setExpandedResponse] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("survey_responses")
      .select("*")
      .eq("survey_id", survey.id)
      .order("submitted_at", { ascending: false });

    setResponses(data || []);

    // bulk-load all answers for this survey's responses
    if (data && data.length > 0) {
      const responseIds = data.map((r: SurveyResponse) => r.id);
      const { data: allAnswers } = await supabase
        .from("survey_answers")
        .select("*")
        .in("response_id", responseIds);

      const grouped: Record<string, SurveyAnswer[]> = {};
      (allAnswers || []).forEach((a: SurveyAnswer) => {
        if (!grouped[a.response_id]) grouped[a.response_id] = [];
        grouped[a.response_id].push(a);
      });
      setAnswers(grouped);
    }
    setLoading(false);
  }, [survey.id]);

  useEffect(() => {
    load();
  }, [load]);

  const getOptionText = (optionId: string): string => {
    for (const q of questions) {
      const opt = q.options.find((o) => o.id === optionId);
      if (opt) return opt.option_text;
    }
    return optionId;
  };

  const getQuestionText = (questionId: string): string => {
    const q = questions.find((q) => q.id === questionId);
    return q?.question_text || questionId;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        Chargement des réponses...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour
        </Button>
        <span className="text-sm text-muted-foreground">
          {responses.length} réponse{responses.length !== 1 ? "s" : ""}
        </span>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <h4 className="font-bold text-lg">{survey.title}</h4>
        <StatusBadge status={survey.status} />
        {survey.is_form && (
          <Badge variant="outline" className="border-blue-500 text-blue-600">
            Formulaire
          </Badge>
        )}
      </div>

      {responses.length === 0 ? (
        <Card className="bg-muted/20">
          <CardContent className="py-12 text-center text-muted-foreground">
            Aucune réponse pour le moment.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {responses.map((resp) => {
            const isOpen = expandedResponse === resp.id;
            const respAnswers = answers[resp.id] || [];

            return (
              <Card key={resp.id} className="bg-muted/20 overflow-hidden">
                {/* Header row – always visible */}
                <button
                  className="w-full text-left"
                  onClick={() =>
                    setExpandedResponse(isOpen ? null : resp.id)
                  }
                >
                  <div className="flex items-center justify-between px-5 py-3 hover:bg-muted/40 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted">
                        <User className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="text-left">
                        <p className="font-medium text-sm">
                          {resp.is_anonymous
                            ? "Réponse anonyme"
                            : resp.respondent_name || "Sans nom"}
                        </p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {new Date(resp.submitted_at).toLocaleString("fr-FR")}
                        </p>
                      </div>
                    </div>
                    {isOpen ? (
                      <ChevronUp className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                </button>

                {/* Expanded answers */}
                {isOpen && (
                  <div className="px-5 pb-4 border-t border-muted/50 mt-0 pt-4 space-y-3">
                    {questions.map((q, idx) => {
                      const ans = respAnswers.find(
                        (a) => a.question_id === q.id
                      );
                      return (
                        <div key={q.id} className="space-y-1">
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                            {idx + 1}. {q.question_text}
                          </p>
                          <p className="text-sm pl-2 border-l-2 border-accent ml-1 py-1">
                            {ans
                              ? ans.option_id
                                ? getOptionText(ans.option_id)
                                : ans.text_answer || "—"
                              : "Non répondu"}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ─── Main component ──────────────────────────────────────────────────────────

export const SurveyManagement = () => {
  // ── state ─────────────────────────────────────────────────────────────────
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [loading, setLoading] = useState(false);

  // creation form
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    start_date: "",
    end_date: "",
    allow_anonymous: true,
    is_form: false,
  });

  // expanded survey editing
  const [editingSurveyId, setEditingSurveyId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);

  // new question form (per survey)
  const [newQuestionText, setNewQuestionText] = useState("");
  const [newQuestionType, setNewQuestionType] = useState<"qcm" | "text">("qcm");
  const [newQuestionRequired, setNewQuestionRequired] = useState(false);
  const [newOptions, setNewOptions] = useState<string[]>(["Option 1", "Option 2"]);

  // responses view
  const [viewingResponses, setViewingResponses] = useState<Survey | null>(null);
  const [viewingQuestions, setViewingQuestions] = useState<Question[]>([]);

  // ── load ──────────────────────────────────────────────────────────────────
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
    } else {
      setSurveys(data || []);
    }
  };

  const loadQuestions = async (surveyId: string): Promise<Question[]> => {
    const { data: qData } = await supabase
      .from("survey_questions")
      .select("*")
      .eq("survey_id", surveyId)
      .order("display_order");

    const result: Question[] = await Promise.all(
      (qData || []).map(async (q: any) => {
        const { data: opts } = await supabase
          .from("survey_options")
          .select("*")
          .eq("question_id", q.id)
          .order("display_order");
        return { ...q, options: opts || [] };
      })
    );

    setQuestions(result);
    return result;
  };

  // ── create survey ─────────────────────────────────────────────────────────
  const handleCreateSurvey = async () => {
    if (!formData.title.trim()) {
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
        allow_anonymous: formData.allow_anonymous,
        is_form: formData.is_form,
      })
      .select()
      .single();

    if (error) {
      toast.error("Erreur lors de la création");
    } else {
      toast.success("Sondage créé avec succès");
      setSurveys((prev) => [data, ...prev]);
      setShowCreateForm(false);
      setFormData({
        title: "",
        description: "",
        start_date: "",
        end_date: "",
        allow_anonymous: true,
        is_form: false,
      });
      // auto-open the new survey for editing
      setEditingSurveyId(data.id);
      await loadQuestions(data.id);
    }
    setLoading(false);
  };

  // ── update survey fields ──────────────────────────────────────────────────
  const patchSurvey = async (
    surveyId: string,
    patch: Partial<Survey>
  ) => {
    const { error } = await supabase
      .from("surveys")
      .update(patch)
      .eq("id", surveyId);

    if (error) {
      toast.error("Erreur lors de la mise à jour");
    } else {
      setSurveys((prev) =>
        prev.map((s) => (s.id === surveyId ? { ...s, ...patch } : s))
      );
    }
  };

  // ── delete survey ─────────────────────────────────────────────────────────
  const handleDeleteSurvey = async (surveyId: string) => {
    const { error } = await supabase.from("surveys").delete().eq("id", surveyId);
    if (error) {
      toast.error("Erreur lors de la suppression");
    } else {
      toast.success("Sondage supprimé");
      setSurveys((prev) => prev.filter((s) => s.id !== surveyId));
      if (editingSurveyId === surveyId) setEditingSurveyId(null);
    }
  };

  // ── add question ──────────────────────────────────────────────────────────
  const handleAddQuestion = async (surveyId: string) => {
    if (!newQuestionText.trim()) {
      toast.error("Le texte de la question est requis");
      return;
    }
    if (newQuestionType === "qcm" && newOptions.filter(Boolean).length < 2) {
      toast.error("Au moins 2 options sont requises pour un QCM");
      return;
    }

    setLoading(true);
    const { data: q, error } = await supabase
      .from("survey_questions")
      .insert({
        survey_id: surveyId,
        question_text: newQuestionText,
        question_type: newQuestionType,
        display_order: questions.length,
        is_required: newQuestionRequired,
      })
      .select()
      .single();

    if (error) {
      toast.error("Erreur lors de l'ajout de la question");
      setLoading(false);
      return;
    }

    // insert options if QCM
    if (newQuestionType === "qcm") {
      const optionRows = newOptions
        .filter(Boolean)
        .map((text, idx) => ({
          question_id: q.id,
          option_text: text,
          display_order: idx,
        }));
      await supabase.from("survey_options").insert(optionRows);
    }

    toast.success("Question ajoutée");
    await loadQuestions(surveyId);

    // reset form
    setNewQuestionText("");
    setNewQuestionType("qcm");
    setNewQuestionRequired(false);
    setNewOptions(["Option 1", "Option 2"]);
    setLoading(false);
  };

  // ── delete question ───────────────────────────────────────────────────────
  const handleDeleteQuestion = async (questionId: string, surveyId: string) => {
    const { error } = await supabase
      .from("survey_questions")
      .delete()
      .eq("id", questionId);

    if (error) {
      toast.error("Erreur lors de la suppression");
    } else {
      toast.success("Question supprimée");
      await loadQuestions(surveyId);
    }
  };

  // ── update option text inline ─────────────────────────────────────────────
  const handleUpdateOption = async (optionId: string, newText: string) => {
    await supabase
      .from("survey_options")
      .update({ option_text: newText })
      .eq("id", optionId);
  };

  // ── add option to existing question ───────────────────────────────────────
  const handleAddOption = async (questionId: string, surveyId: string) => {
    const q = questions.find((q) => q.id === questionId);
    const nextOrder = q ? q.options.length : 0;
    await supabase.from("survey_options").insert({
      question_id: questionId,
      option_text: `Option ${nextOrder + 1}`,
      display_order: nextOrder,
    });
    await loadQuestions(surveyId);
  };

  // ── delete option ─────────────────────────────────────────────────────────
  const handleDeleteOption = async (
    optionId: string,
    surveyId: string
  ) => {
    await supabase.from("survey_options").delete().eq("id", optionId);
    await loadQuestions(surveyId);
  };

  // ── open responses view ───────────────────────────────────────────────────
  const openResponses = async (survey: Survey) => {
    const qs = await loadQuestions(survey.id);
    setViewingQuestions(qs);
    setViewingResponses(survey);
  };

  // ── render ────────────────────────────────────────────────────────────────

  // If viewing responses for a survey, show that sub-view
  if (viewingResponses) {
    return (
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-6 w-6" />
            Réponses – {viewingResponses.title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsesView
            survey={viewingResponses}
            questions={viewingQuestions}
            onBack={() => setViewingResponses(null)}
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-6 w-6" />
          Gestion des Sondages
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* ── Create button / form toggle ── */}
        {!showCreateForm ? (
          <Button
            variant="outline"
            onClick={() => setShowCreateForm(true)}
            className="w-full border-dashed"
          >
            <Plus className="h-4 w-4 mr-2" />
            Créer un nouveau sondage
          </Button>
        ) : (
          <div className="border rounded-lg p-5 space-y-4 bg-muted/30">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold flex items-center gap-2">
                <Plus className="h-4 w-4" /> Nouveau sondage
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowCreateForm(false)}
              >
                Annuler
              </Button>
            </div>

            <div className="space-y-2">
              <Label>Titre *</Label>
              <Input
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                placeholder="Titre du sondage"
              />
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                rows={2}
                placeholder="Description optionnelle..."
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Date de début</Label>
                <Input
                  type="datetime-local"
                  value={formData.start_date}
                  onChange={(e) =>
                    setFormData({ ...formData, start_date: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Date de fin</Label>
                <Input
                  type="datetime-local"
                  value={formData.end_date}
                  onChange={(e) =>
                    setFormData({ ...formData, end_date: e.target.value })
                  }
                />
              </div>
            </div>

            {/* Toggles row */}
            <div className="flex flex-wrap gap-6 pt-2">
              <div className="flex items-center gap-3">
                <Switch
                  checked={formData.allow_anonymous}
                  onCheckedChange={(v) =>
                    setFormData({ ...formData, allow_anonymous: v })
                  }
                />
                <Label className="cursor-pointer select-none">
                  Permettre les réponses anonymes
                </Label>
              </div>
              <div className="flex items-center gap-3">
                <Switch
                  checked={formData.is_form}
                  onCheckedChange={(v) =>
                    setFormData({ ...formData, is_form: v })
                  }
                />
                <Label className="cursor-pointer select-none">
                  Mode formulaire (résultats non publics)
                </Label>
              </div>
            </div>

            <Button onClick={handleCreateSurvey} disabled={loading}>
              <Plus className="h-4 w-4 mr-2" />
              Créer le sondage
            </Button>
          </div>
        )}

        {/* ── Survey list ── */}
        <div className="space-y-4">
          {surveys.length === 0 && (
            <p className="text-center text-muted-foreground py-8">
              Aucun sondage pour le moment
            </p>
          )}

          {surveys.map((survey) => {
            const isEditing = editingSurveyId === survey.id;

            return (
              <Card key={survey.id} className="bg-muted/20 overflow-hidden">
                {/* ── Survey header ── */}
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-bold text-lg truncate">
                          {survey.title}
                        </h4>
                        <StatusBadge status={survey.status} />
                        {survey.is_form && (
                          <Badge
                            variant="outline"
                            className="border-blue-500 text-blue-600 text-xs"
                          >
                            Formulaire
                          </Badge>
                        )}
                        {survey.allow_anonymous && (
                          <Badge
                            variant="outline"
                            className="border-gray-500 text-gray-500 text-xs"
                          >
                            Anonyme OK
                          </Badge>
                        )}
                      </div>
                      {survey.description && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {survey.description}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        Créé le{" "}
                        {new Date(survey.created_at).toLocaleDateString("fr-FR")}
                      </p>
                    </div>

                    {/* Action buttons */}
                    <div className="flex gap-1 flex-shrink-0">
                      {/* Open / Close */}
                      {survey.status === "draft" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => patchSurvey(survey.id, { status: "open" })}
                          title="Ouvrir le sondage"
                        >
                          <Unlock className="h-4 w-4 mr-1" /> Ouvrir
                        </Button>
                      )}
                      {survey.status === "open" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => patchSurvey(survey.id, { status: "closed" })}
                          title="Clôturer le sondage"
                        >
                          <Lock className="h-4 w-4 mr-1" /> Fermer
                        </Button>
                      )}

                      {/* View responses */}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openResponses(survey)}
                        title="Voir les réponses"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>

                      {/* Edit toggle */}
                      <Button
                        size="sm"
                        variant={isEditing ? "default" : "outline"}
                        onClick={() => {
                          if (isEditing) {
                            setEditingSurveyId(null);
                          } else {
                            setEditingSurveyId(survey.id);
                            loadQuestions(survey.id);
                          }
                        }}
                        title="Éditer"
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>

                      {/* Delete */}
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="destructive" title="Supprimer">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Supprimer « {survey.title} » ?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Cette action est irréversible. Le sondage, ses questions et toutes les réponses seront définitivement supprimés.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Annuler</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeleteSurvey(survey.id)}
                            >
                              Supprimer
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>

                  {/* ── Editing panel ── */}
                  {isEditing && (
                    <div className="mt-5 border-t pt-5 space-y-5">
                      {/* Inline toggles for allow_anonymous & is_form */}
                      <div className="flex flex-wrap gap-6">
                        <div className="flex items-center gap-3">
                          <Switch
                            checked={survey.allow_anonymous}
                            onCheckedChange={(v) =>
                              patchSurvey(survey.id, { allow_anonymous: v })
                            }
                          />
                          <Label className="select-none">
                            Réponses anonymes autorisées
                          </Label>
                        </div>
                        <div className="flex items-center gap-3">
                          <Switch
                            checked={survey.is_form}
                            onCheckedChange={(v) =>
                              patchSurvey(survey.id, { is_form: v })
                            }
                          />
                          <Label className="select-none">
                            Mode formulaire
                          </Label>
                        </div>
                      </div>

                      {/* Existing questions */}
                      <div className="space-y-3">
                        <h5 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
                          Questions
                        </h5>
                        {questions.length === 0 && (
                          <p className="text-sm text-muted-foreground italic">
                            Aucune question pour le moment.
                          </p>
                        )}
                        {questions.map((q, idx) => (
                          <div
                            key={q.id}
                            className="border rounded-lg p-4 bg-background space-y-3"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-xs font-bold text-muted-foreground">
                                    {idx + 1}.
                                  </span>
                                  <p className="font-medium text-sm">
                                    {q.question_text}
                                  </p>
                                  <Badge variant="outline" className="text-xs">
                                    {q.question_type === "qcm"
                                      ? "QCM"
                                      : "Texte libre"}
                                  </Badge>
                                  {q.is_required && (
                                    <Badge className="text-xs bg-orange-100 text-orange-700 border-orange-300">
                                      Obligatoire
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() =>
                                  handleDeleteQuestion(q.id, survey.id)
                                }
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>

                            {/* Options for QCM */}
                            {q.question_type === "qcm" && (
                              <div className="space-y-2 pl-4">
                                {q.options.map((opt) => (
                                  <div
                                    key={opt.id}
                                    className="flex items-center gap-2"
                                  >
                                    <span className="text-muted-foreground text-xs">•</span>
                                    <Input
                                      className="h-7 text-sm flex-1"
                                      value={opt.option_text}
                                      onChange={(e) =>
                                        handleUpdateOption(opt.id, e.target.value)
                                      }
                                      onBlur={() =>
                                        handleUpdateOption(opt.id, opt.option_text)
                                      }
                                    />
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() =>
                                        handleDeleteOption(opt.id, survey.id)
                                      }
                                      className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                  </div>
                                ))}
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() =>
                                    handleAddOption(q.id, survey.id)
                                  }
                                  className="h-7 text-xs text-muted-foreground hover:text-accent"
                                >
                                  <Plus className="h-3 w-3 mr-1" /> Ajouter une option
                                </Button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* ── Add question form ── */}
                      <div className="border rounded-lg p-4 bg-muted/20 space-y-3">
                        <h5 className="font-semibold text-sm">Ajouter une question</h5>

                        <div className="space-y-2">
                          <Input
                            value={newQuestionText}
                            onChange={(e) => setNewQuestionText(e.target.value)}
                            placeholder="Texte de la question..."
                          />
                        </div>

                        {/* Type selector */}
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant={
                              newQuestionType === "qcm" ? "default" : "outline"
                            }
                            onClick={() => setNewQuestionType("qcm")}
                          >
                            <PieChartIcon className="h-4 w-4 mr-1" /> QCM
                          </Button>
                          <Button
                            size="sm"
                            variant={
                              newQuestionType === "text" ? "default" : "outline"
                            }
                            onClick={() => setNewQuestionType("text")}
                          >
                            <FileText className="h-4 w-4 mr-1" /> Texte libre
                          </Button>
                        </div>

                        {/* Options input for QCM */}
                        {newQuestionType === "qcm" && (
                          <div className="space-y-2 pl-3 border-l-2 border-muted ml-1">
                            <Label className="text-xs text-muted-foreground">
                              Options de réponse
                            </Label>
                            {newOptions.map((opt, i) => (
                              <div key={i} className="flex items-center gap-2">
                                <span className="text-muted-foreground text-xs w-4">
                                  {i + 1}.
                                </span>
                                <Input
                                  className="h-8 text-sm flex-1"
                                  value={opt}
                                  onChange={(e) => {
                                    const updated = [...newOptions];
                                    updated[i] = e.target.value;
                                    setNewOptions(updated);
                                  }}
                                  placeholder={`Option ${i + 1}`}
                                />
                                {newOptions.length > 2 && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() =>
                                      setNewOptions(
                                        newOptions.filter((_, idx) => idx !== i)
                                      )
                                    }
                                    className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                )}
                              </div>
                            ))}
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() =>
                                setNewOptions([
                                  ...newOptions,
                                  `Option ${newOptions.length + 1}`,
                                ])
                              }
                              className="h-7 text-xs text-muted-foreground hover:text-accent"
                            >
                              <Plus className="h-3 w-3 mr-1" /> Ajouter une option
                            </Button>
                          </div>
                        )}

                        {/* Required toggle */}
                        <div className="flex items-center gap-3 pt-1">
                          <Switch
                            checked={newQuestionRequired}
                            onCheckedChange={setNewQuestionRequired}
                          />
                          <Label className="select-none text-sm">
                            Question obligatoire
                          </Label>
                        </div>

                        <Button
                          size="sm"
                          onClick={() => handleAddQuestion(survey.id)}
                          disabled={loading}
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Ajouter la question
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};
