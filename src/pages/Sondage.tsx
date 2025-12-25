import { useState, useEffect } from "react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { BarChart3, PieChart as PieChartIcon, CheckCircle2 } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";

interface Survey {
  id: string;
  title: string;
  description: string;
  status: string;
  start_date: string | null;
  end_date: string | null;
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

interface Answer {
  questionId: string;
  optionId?: string;
  textAnswer?: string;
}

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8", "#82CA9D"];

const Sondage = () => {
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [selectedSurvey, setSelectedSurvey] = useState<Survey | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [respondentName, setRespondentName] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [results, setResults] = useState<any>(null);

  useEffect(() => {
    loadSurveys();
  }, []);

  const loadSurveys = async () => {
    const { data, error } = await supabase
      .from("surveys")
      .select("*")
      .in("status", ["open", "closed"])
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Erreur lors du chargement");
      console.error(error);
    } else {
      setSurveys(data || []);
    }
  };

  const loadQuestions = async (surveyId: string) => {
    const { data: questionsData, error } = await supabase
      .from("survey_questions")
      .select("*")
      .eq("survey_id", surveyId)
      .order("display_order");

    if (error) {
      console.error(error);
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

  const loadResults = async (surveyId: string) => {
    const { data: responses } = await supabase
      .from("survey_responses")
      .select("id")
      .eq("survey_id", surveyId);

    if (!responses) return;

    const resultsData: any = {};

    for (const question of questions) {
      if (question.question_type === "qcm") {
        const { data: qcmAnswers } = await supabase
          .from("survey_answers")
          .select("option_id")
          .eq("question_id", question.id)
          .not("option_id", "is", null);

        const optionCounts: Record<string, number> = {};
        qcmAnswers?.forEach((ans) => {
          if (ans.option_id) {
            optionCounts[ans.option_id] = (optionCounts[ans.option_id] || 0) + 1;
          }
        });

        resultsData[question.id] = {
          type: "qcm",
          options: question.options?.map((opt) => ({
            name: opt.option_text,
            value: optionCounts[opt.id] || 0,
          })),
        };
      } else {
        const { data: textAnswers } = await supabase
          .from("survey_answers")
          .select("text_answer")
          .eq("question_id", question.id)
          .not("text_answer", "is", null);

        resultsData[question.id] = {
          type: "text",
          answers: textAnswers?.map((a) => a.text_answer) || [],
        };
      }
    }

    setResults(resultsData);
  };

  const handleSelectSurvey = async (survey: Survey) => {
    setSelectedSurvey(survey);
    setHasSubmitted(false);
    setAnswers([]);
    await loadQuestions(survey.id);
    if (survey.status === "closed") {
      await loadResults(survey.id);
    }
  };

  const handleAnswerChange = (questionId: string, optionId?: string, textAnswer?: string) => {
    setAnswers((prev) => {
      const existing = prev.filter((a) => a.questionId !== questionId);
      return [...existing, { questionId, optionId, textAnswer }];
    });
  };

  const handleSubmit = async () => {
    if (!selectedSurvey || selectedSurvey.status !== "open") return;

    if (!isAnonymous && !respondentName.trim()) {
      toast.error("Veuillez entrer votre nom ou cocher la case anonyme");
      return;
    }

    if (answers.length !== questions.length) {
      toast.error("Veuillez répondre à toutes les questions");
      return;
    }

    setLoading(true);

    const { data: response, error: responseError } = await supabase
      .from("survey_responses")
      .insert({
        survey_id: selectedSurvey.id,
        respondent_name: isAnonymous ? null : respondentName,
        is_anonymous: isAnonymous,
      })
      .select()
      .single();

    if (responseError) {
      toast.error("Erreur lors de l'envoi");
      console.error(responseError);
      setLoading(false);
      return;
    }

    const answerInserts = answers.map((ans) => ({
      response_id: response.id,
      question_id: ans.questionId,
      option_id: ans.optionId || null,
      text_answer: ans.textAnswer || null,
    }));

    const { error: answersError } = await supabase
      .from("survey_answers")
      .insert(answerInserts);

    if (answersError) {
      toast.error("Erreur lors de l'envoi des réponses");
      console.error(answersError);
    } else {
      toast.success("Réponses enregistrées avec succès !");
      setHasSubmitted(true);
      setAnswers([]);
      setRespondentName("");
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />

      <main className="flex-1">
        <section className="py-16 gradient-institutional text-white">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center space-y-4">
              <BarChart3 className="h-20 w-20 mx-auto" />
              <h1 className="text-5xl font-bold">Sondages BDL</h1>
              <p className="text-xl">
                Participez aux sondages du Bureau des Lycéens
              </p>
            </div>
          </div>
        </section>

        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto space-y-6">
              {!selectedSurvey ? (
                <>
                  <h2 className="text-3xl font-bold">Sondages disponibles</h2>
                  {surveys.length === 0 ? (
                    <Card className="shadow-card">
                      <CardContent className="p-8 text-center text-muted-foreground">
                        Aucun sondage disponible pour le moment
                      </CardContent>
                    </Card>
                  ) : (
                    surveys.map((survey) => (
                      <Card
                        key={survey.id}
                        className={`shadow-card cursor-pointer hover:shadow-elegant transition-all ${
                          survey.status === "open" ? "border-2 border-accent" : ""
                        }`}
                        onClick={() => handleSelectSurvey(survey)}
                      >
                        <CardContent className="p-6">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h3 className="text-2xl font-bold">{survey.title}</h3>
                                <Badge
                                  variant={survey.status === "open" ? "default" : "secondary"}
                                >
                                  {survey.status === "open" ? "Ouvert" : "Fermé"}
                                </Badge>
                              </div>
                              {survey.description && (
                                <p className="text-muted-foreground">{survey.description}</p>
                              )}
                              {survey.end_date && (
                                <p className="text-xs text-muted-foreground mt-2">
                                  {survey.status === "open" && "Ouvert jusqu'au "}
                                  {new Date(survey.end_date).toLocaleString("fr-FR")}
                                </p>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </>
              ) : (
                <>
                  <Button variant="outline" onClick={() => setSelectedSurvey(null)}>
                    ← Retour aux sondages
                  </Button>

                  <Card className="shadow-card">
                    <CardHeader>
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-3xl">{selectedSurvey.title}</CardTitle>
                        <Badge
                          variant={
                            selectedSurvey.status === "open" ? "default" : "secondary"
                          }
                        >
                          {selectedSurvey.status === "open" ? "Ouvert" : "Fermé"}
                        </Badge>
                      </div>
                      {selectedSurvey.description && (
                        <p className="text-muted-foreground">
                          {selectedSurvey.description}
                        </p>
                      )}
                    </CardHeader>

                    <CardContent className="space-y-6">
                      {selectedSurvey.status === "open" && !hasSubmitted ? (
                        <>
                          {/* Identification */}
                          <div className="border rounded-lg p-4 bg-muted/30 space-y-4">
                            <h3 className="font-semibold">Identification</h3>
                            {!isAnonymous && (
                              <div className="space-y-2">
                                <Label>Nom et Prénom</Label>
                                <Input
                                  value={respondentName}
                                  onChange={(e) => setRespondentName(e.target.value)}
                                  placeholder="Votre nom complet"
                                />
                              </div>
                            )}
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                id="anonymous"
                                checked={isAnonymous}
                                onCheckedChange={(checked) =>
                                  setIsAnonymous(checked as boolean)
                                }
                              />
                              <Label htmlFor="anonymous" className="cursor-pointer">
                                Répondre anonymement
                              </Label>
                            </div>
                          </div>

                          {/* Questions */}
                          {questions.map((question, idx) => (
                            <div
                              key={question.id}
                              className="border rounded-lg p-4 space-y-4"
                            >
                              <h4 className="font-semibold">
                                {idx + 1}. {question.question_text}
                              </h4>

                              {question.question_type === "qcm" && question.options ? (
                                <RadioGroup
                                  onValueChange={(value) =>
                                    handleAnswerChange(question.id, value)
                                  }
                                >
                                  {question.options.map((option) => (
                                    <div
                                      key={option.id}
                                      className="flex items-center space-x-2"
                                    >
                                      <RadioGroupItem value={option.id} id={option.id} />
                                      <Label htmlFor={option.id} className="cursor-pointer">
                                        {option.option_text}
                                      </Label>
                                    </div>
                                  ))}
                                </RadioGroup>
                              ) : (
                                <Textarea
                                  rows={4}
                                  placeholder="Votre réponse..."
                                  onChange={(e) =>
                                    handleAnswerChange(
                                      question.id,
                                      undefined,
                                      e.target.value
                                    )
                                  }
                                />
                              )}
                            </div>
                          ))}

                          <Button
                            onClick={handleSubmit}
                            disabled={loading}
                            size="lg"
                            className="w-full"
                          >
                            {loading ? "Envoi en cours..." : "Soumettre mes réponses"}
                          </Button>
                        </>
                      ) : hasSubmitted ? (
                        <div className="text-center py-12 space-y-4">
                          <CheckCircle2 className="h-16 w-16 text-green-600 mx-auto" />
                          <h3 className="text-2xl font-bold">Merci pour votre participation !</h3>
                          <p className="text-muted-foreground">
                            Vos réponses ont été enregistrées avec succès.
                          </p>
                        </div>
                      ) : (
                        <>
                          {/* Results for closed surveys */}
                          <h3 className="text-2xl font-bold">Résultats</h3>
                          {questions.map((question, idx) => (
                            <div key={question.id} className="space-y-4">
                              <h4 className="font-semibold text-lg">
                                {idx + 1}. {question.question_text}
                              </h4>

                              {results?.[question.id]?.type === "qcm" ? (
                                <div className="h-64">
                                  <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                      <Pie
                                        data={results[question.id].options}
                                        cx="50%"
                                        cy="50%"
                                        labelLine={false}
                                        label={(props: any) => 
  props.value > 0 ? `${props.name}: ${props.value}` : ""
}
                                        outerRadius={80}
                                        fill="#8884d8"
                                        dataKey="value"
                                      >
                                        {results[question.id].options.map(
                                          (_: any, index: number) => (
                                            <Cell
                                              key={`cell-${index}`}
                                              fill={COLORS[index % COLORS.length]}
                                            />
                                          )
                                        )}
                                      </Pie>
                                      <Tooltip />
                                      <Legend />
                                    </PieChart>
                                  </ResponsiveContainer>
                                </div>
                              ) : (
                                <div className="space-y-2">
                                  {results?.[question.id]?.answers?.map(
                                    (ans: string, i: number) => (
                                      <div
                                        key={i}
                                        className="p-3 bg-muted/50 rounded text-sm"
                                      >
                                        "{ans}"
                                      </div>
                                    )
                                  )}
                                </div>
                              )}
                            </div>
                          ))}
                        </>
                      )}
                    </CardContent>
                  </Card>
                </>
              )}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Sondage;