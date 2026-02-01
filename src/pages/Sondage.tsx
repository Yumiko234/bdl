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
import {
  BarChart3,
  CheckCircle2,
  ArrowLeft,
  Lock,
  Eye,
  EyeOff,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from "recharts";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Survey {
  id: string;
  title: string;
  description: string;
  status: "open" | "closed";
  start_date: string | null;
  end_date: string | null;
  allow_anonymous: boolean;
  is_form: boolean;
}

interface Question {
  id: string;
  question_text: string;
  question_type: "qcm" | "text";
  display_order: number;
  is_required: boolean;
  options: Option[];
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

interface QcmResult {
  name: string;
  value: number;
  [key: string]: any;
}

interface ResultsData {
  [questionId: string]:
    | { type: "qcm"; options: QcmResult[] }
    | { type: "text"; answers: string[] };
}

// ─── constants ────────────────────────────────────────────────────────────────

const COLORS = [
  "#3B82F6", // blue-500
  "#10B981", // emerald-500
  "#F59E0B", // amber-500
  "#EF4444", // red-500
  "#8B5CF6", // violet-500
  "#EC4899", // pink-500
  "#14B8A6", // teal-500
  "#F97316", // orange-500
];

// ─── Custom pie label ─────────────────────────────────────────────────────────

const renderCustomLabel = (props: any) => {
  const { cx, cy, midAngle, innerRadius, outerRadius, percent } = props;
  if (percent < 0.06) return null; // skip tiny slices

  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  return (
    <text
      x={x}
      y={y}
      fill="white"
      textAnchor="middle"
      dominantBaseline="central"
      fontSize={12}
      fontWeight={600}
    >
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

// ─── Component ────────────────────────────────────────────────────────────────

const Sondage = () => {
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [selectedSurvey, setSelectedSurvey] = useState<Survey | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [respondentName, setRespondentName] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [results, setResults] = useState<ResultsData | null>(null);

  useEffect(() => {
    loadSurveys();
  }, []);

  // ── load surveys (open + closed only) ────────────────────────────────────
  const loadSurveys = async () => {
    const { data, error } = await supabase
      .from("surveys")
      .select("*")
      .in("status", ["open", "closed"])
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Erreur lors du chargement");
    } else {
      setSurveys(data || []);
    }
  };

  // ── load questions + options for a survey ────────────────────────────────
  const loadQuestions = async (surveyId: string): Promise<Question[]> => {
    const { data: qData } = await supabase
      .from("survey_questions")
      .select("*")
      .eq("survey_id", surveyId)
      .order("display_order");

    const result: Question[] = await Promise.all(
      (qData || []).map(async (q: any) => {
        if (q.question_type === "qcm") {
          const { data: opts } = await supabase
            .from("survey_options")
            .select("*")
            .eq("question_id", q.id)
            .order("display_order");
          return { ...q, options: opts || [] };
        }
        return { ...q, options: [] };
      })
    );

    setQuestions(result);
    return result;
  };

  // ── load aggregated results for closed non-form surveys ──────────────────
  const loadResults = async (surveyId: string, qs: Question[]) => {
    const resultsData: ResultsData = {};

    for (const question of qs) {
      if (question.question_type === "qcm") {
        const { data: qcmAnswers } = await supabase
          .from("survey_answers")
          .select("option_id")
          .eq("question_id", question.id)
          .not("option_id", "is", null);

        const optionCounts: Record<string, number> = {};
        (qcmAnswers || []).forEach((ans: any) => {
          if (ans.option_id) {
            optionCounts[ans.option_id] =
              (optionCounts[ans.option_id] || 0) + 1;
          }
        });

        resultsData[question.id] = {
          type: "qcm",
          options: question.options.map((opt) => ({
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
          answers: (textAnswers || []).map((a: any) => a.text_answer),
        };
      }
    }

    setResults(resultsData);
  };

  // ── select a survey ──────────────────────────────────────────────────────
  const handleSelectSurvey = async (survey: Survey) => {
    setSelectedSurvey(survey);
    setHasSubmitted(false);
    setAnswers([]);
    setResults(null);
    setIsAnonymous(false);
    setRespondentName("");

    const qs = await loadQuestions(survey.id);

    // For closed surveys that are NOT forms, show results
    if (survey.status === "closed" && !survey.is_form) {
      await loadResults(survey.id, qs);
    }
  };

  // ── answer change ─────────────────────────────────────────────────────────
  const handleAnswerChange = (
    questionId: string,
    optionId?: string,
    textAnswer?: string
  ) => {
    setAnswers((prev) => {
      const filtered = prev.filter((a) => a.questionId !== questionId);
      return [
        ...filtered,
        { questionId, optionId, textAnswer },
      ];
    });
  };

  // ── validation ────────────────────────────────────────────────────────────
  const validate = (): string | null => {
    if (!isAnonymous && !respondentName.trim()) {
      return "Veuillez entrer votre nom ou cocher la case « Répondre anonymement ».";
    }

    for (const q of questions) {
      if (!q.is_required) continue;
      const ans = answers.find((a) => a.questionId === q.id);
      if (!ans) return `La question « ${q.question_text} » est obligatoire.`;
      if (q.question_type === "qcm" && !ans.optionId)
        return `La question « ${q.question_text} » est obligatoire.`;
      if (q.question_type === "text" && !ans.textAnswer?.trim())
        return `La question « ${q.question_text} » est obligatoire.`;
    }

    return null;
  };

  // ── submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!selectedSurvey || selectedSurvey.status !== "open") return;

    const error = validate();
    if (error) {
      toast.error(error);
      return;
    }

    setLoading(true);

    // 1. create response row
    const { data: response, error: respErr } = await supabase
      .from("survey_responses")
      .insert({
        survey_id: selectedSurvey.id,
        respondent_name: isAnonymous ? null : respondentName,
        is_anonymous: isAnonymous,
      })
      .select()
      .single();

    if (respErr) {
      toast.error("Erreur lors de l'envoi");
      setLoading(false);
      return;
    }

    // 2. insert answers
    const answerRows = answers.map((ans) => ({
      response_id: response.id,
      question_id: ans.questionId,
      option_id: ans.optionId || null,
      text_answer: ans.textAnswer || null,
    }));

    // also insert rows for non-required unanswered questions (null answer)
    questions.forEach((q) => {
      if (!answers.find((a) => a.questionId === q.id)) {
        answerRows.push({
          response_id: response.id,
          question_id: q.id,
          option_id: null,
          text_answer: null,
        });
      }
    });

    const { error: ansErr } = await supabase
      .from("survey_answers")
      .insert(answerRows);

    if (ansErr) {
      toast.error("Erreur lors de l'enregistrement des réponses");
    } else {
      toast.success("Réponses enregistrées avec succès !");
      setHasSubmitted(true);
      setAnswers([]);
      setRespondentName("");
      setIsAnonymous(false);
    }

    setLoading(false);
  };

  // ── render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />

      <main className="flex-1">
        {/* Hero */}
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
              {/* ── Survey listing ── */}
              {!selectedSurvey && (
                <>
                  <h2 className="text-3xl font-bold">Sondages disponibles</h2>

                  {surveys.length === 0 && (
                    <Card className="shadow-card">
                      <CardContent className="p-8 text-center text-muted-foreground">
                        Aucun sondage disponible pour le moment
                      </CardContent>
                    </Card>
                  )}

                  {surveys.map((survey) => (
                    <Card
                      key={survey.id}
                      className={`shadow-card cursor-pointer hover:shadow-elegant transition-all ${
                        survey.status === "open"
                          ? "border-2 border-accent"
                          : ""
                      }`}
                      onClick={() => handleSelectSurvey(survey)}
                    >
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 flex-wrap mb-2">
                              <h3 className="text-2xl font-bold">
                                {survey.title}
                              </h3>
                              <Badge
                                variant={
                                  survey.status === "open"
                                    ? "default"
                                    : "secondary"
                                }
                              >
                                {survey.status === "open" ? "Ouvert" : "Fermé"}
                              </Badge>
                              {survey.is_form && (
                                <Badge
                                  variant="outline"
                                  className="border-blue-500 text-blue-600"
                                >
                                  Formulaire
                                </Badge>
                              )}
                            </div>
                            {survey.description && (
                              <p className="text-muted-foreground">
                                {survey.description}
                              </p>
                            )}
                            {survey.end_date && (
                              <p className="text-xs text-muted-foreground mt-2">
                                {survey.status === "open"
                                  ? "Ouvert jusqu'au "
                                  : "Fermé le "}
                                {new Date(survey.end_date).toLocaleString(
                                  "fr-FR"
                                )}
                              </p>
                            )}
                          </div>
                          {/* Right-hand icon hint */}
                          <div className="ml-4 text-muted-foreground">
                            {survey.status === "open" ? (
                              <span className="text-sm underline">Répondre →</span>
                            ) : survey.is_form ? (
                              <Lock className="h-5 w-5" />
                            ) : (
                              <Eye className="h-5 w-5" />
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </>
              )}

              {/* ── Selected survey ── */}
              {selectedSurvey && (
                <>
                  <Button
                    variant="outline"
                    onClick={() => setSelectedSurvey(null)}
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" /> Retour aux sondages
                  </Button>

                  <Card className="shadow-card">
                    <CardHeader>
                      <div className="flex items-center gap-2 flex-wrap">
                        <CardTitle className="text-3xl">
                          {selectedSurvey.title}
                        </CardTitle>
                        <Badge
                          variant={
                            selectedSurvey.status === "open"
                              ? "default"
                              : "secondary"
                          }
                        >
                          {selectedSurvey.status === "open"
                            ? "Ouvert"
                            : "Fermé"}
                        </Badge>
                        {selectedSurvey.is_form && (
                          <Badge
                            variant="outline"
                            className="border-blue-500 text-blue-600"
                          >
                            Formulaire
                          </Badge>
                        )}
                      </div>
                      {selectedSurvey.description && (
                        <p className="text-muted-foreground mt-1">
                          {selectedSurvey.description}
                        </p>
                      )}
                    </CardHeader>

                    <CardContent className="space-y-6">
                      {/* ═══ OPEN + not yet submitted → answer form ═══ */}
                      {selectedSurvey.status === "open" && !hasSubmitted && (
                        <>
                          {/* Identification block */}
                          <div className="border rounded-lg p-4 bg-muted/30 space-y-4">
                            <h3 className="font-semibold">Identification</h3>

                            {/* Name field – hidden when anonymous */}
                            {!isAnonymous && (
                              <div className="space-y-2">
                                <Label>Nom et Prénom</Label>
                                <Input
                                  value={respondentName}
                                  onChange={(e) =>
                                    setRespondentName(e.target.value)
                                  }
                                  placeholder="Votre nom complet"
                                />
                              </div>
                            )}

                            {/* Anonymous checkbox – only when survey allows it */}
                            {selectedSurvey.allow_anonymous && (
                              <div className="flex items-center space-x-2">
                                <Checkbox
                                  id="anonymous"
                                  checked={isAnonymous}
                                  onCheckedChange={(checked) =>
                                    setIsAnonymous(checked as boolean)
                                  }
                                />
                                <Label
                                  htmlFor="anonymous"
                                  className="cursor-pointer flex items-center gap-1.5"
                                >
                                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                                  Répondre anonymement
                                </Label>
                              </div>
                            )}
                          </div>

                          {/* Questions */}
                          {questions.map((question, idx) => {
                            const currentAnswer = answers.find(
                              (a) => a.questionId === question.id
                            );
                            return (
                              <div
                                key={question.id}
                                className="border rounded-lg p-4 space-y-3"
                              >
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h4 className="font-semibold">
                                    {idx + 1}. {question.question_text}
                                  </h4>
                                  {question.is_required && (
                                    <span className="text-red-500 text-sm font-bold">
                                      *
                                    </span>
                                  )}
                                </div>

                                {question.question_type === "qcm" &&
                                question.options.length > 0 ? (
                                  <RadioGroup
                                    value={currentAnswer?.optionId || ""}
                                    onValueChange={(value) =>
                                      handleAnswerChange(question.id, value)
                                    }
                                  >
                                    {question.options.map((option) => (
                                      <div
                                        key={option.id}
                                        className="flex items-center space-x-2"
                                      >
                                        <RadioGroupItem
                                          value={option.id}
                                          id={option.id}
                                        />
                                        <Label
                                          htmlFor={option.id}
                                          className="cursor-pointer"
                                        >
                                          {option.option_text}
                                        </Label>
                                      </div>
                                    ))}
                                  </RadioGroup>
                                ) : (
                                  <Textarea
                                    rows={3}
                                    placeholder="Votre réponse..."
                                    value={
                                      currentAnswer?.textAnswer || ""
                                    }
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
                            );
                          })}

                          <Button
                            onClick={handleSubmit}
                            disabled={loading}
                            size="lg"
                            className="w-full"
                          >
                            {loading
                              ? "Envoi en cours..."
                              : "Soumettre mes réponses"}
                          </Button>
                        </>
                      )}

                      {/* ═══ Submitted confirmation ═══ */}
                      {hasSubmitted && (
                        <div className="text-center py-12 space-y-4">
                          <CheckCircle2 className="h-16 w-16 text-green-600 mx-auto" />
                          <h3 className="text-2xl font-bold">
                            Merci pour votre participation !
                          </h3>
                          <p className="text-muted-foreground">
                            Vos réponses ont été enregistrées avec succès.
                          </p>
                        </div>
                      )}

                      {/* ═══ CLOSED + is_form → no results ═══ */}
                      {selectedSurvey.status === "closed" &&
                        selectedSurvey.is_form && (
                          <div className="text-center py-12 space-y-3">
                            <Lock className="h-12 w-12 text-muted-foreground mx-auto" />
                            <h3 className="text-xl font-semibold">
                              Ce formulaire est fermé
                            </h3>
                            <p className="text-muted-foreground">
                              Les résultats ne sont pas publiés pour ce type de
                              formulaire.
                            </p>
                          </div>
                        )}

                      {/* ═══ CLOSED + not a form → show results ═══ */}
                      {selectedSurvey.status === "closed" &&
                        !selectedSurvey.is_form &&
                        results && (
                          <>
                            <h3 className="text-2xl font-bold border-b pb-2">
                              Résultats
                            </h3>

                            {questions.map((question, idx) => {
                              const qResult = results[question.id];
                              return (
                                <div
                                  key={question.id}
                                  className="border rounded-lg p-4 space-y-4"
                                >
                                  <h4 className="font-semibold text-lg">
                                    {idx + 1}. {question.question_text}
                                  </h4>

                                  {qResult?.type === "qcm" ? (
                                    <>
                                      {/* Pie chart */}
                                      <div className="h-72">
                                        <ResponsiveContainer
                                          width="100%"
                                          height="100%"
                                        >
                                          <PieChart>
                                            <Pie
                                              data={qResult.options}
                                              cx="50%"
                                              cy="50%"
                                              labelLine={false}
                                              label={renderCustomLabel}
                                              outerRadius={90}
                                              dataKey="value"
                                              stroke="none"
                                            >
                                              {qResult.options.map(
                                                (_, index) => (
                                                  <Cell
                                                    key={`cell-${index}`}
                                                    fill={
                                                      COLORS[
                                                        index % COLORS.length
                                                      ]
                                                    }
                                                  />
                                                )
                                              )}
                                            </Pie>
                                            <Tooltip
                                              formatter={(value: number) => [
                                                `${value} réponse${value !== 1 ? "s" : ""}`,
                                                "Total",
                                              ]}
                                            />
                                            <Legend />
                                          </PieChart>
                                        </ResponsiveContainer>
                                      </div>

                                      {/* Summary table below chart */}
                                      <div className="space-y-2 mt-2">
                                        {(() => {
                                          const total = qResult.options.reduce(
                                            (sum, o) => sum + o.value,
                                            0
                                          );
                                          return qResult.options.map(
                                            (opt, i) => {
                                              const pct =
                                                total > 0
                                                  ? (opt.value / total) * 100
                                                  : 0;
                                              return (
                                                <div
                                                  key={i}
                                                  className="flex items-center gap-3"
                                                >
                                                  <div
                                                    className="w-3 h-3 rounded-full flex-shrink-0"
                                                    style={{
                                                      backgroundColor:
                                                        COLORS[
                                                          i % COLORS.length
                                                        ],
                                                    }}
                                                  />
                                                  <span className="text-sm flex-1 truncate">
                                                    {opt.name}
                                                  </span>
                                                  <span className="text-sm text-muted-foreground w-16 text-right">
                                                    {opt.value}
                                                  </span>
                                                  <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                                                    <div
                                                      className="h-full rounded-full"
                                                      style={{
                                                        width: `${pct}%`,
                                                        backgroundColor:
                                                          COLORS[
                                                            i % COLORS.length
                                                          ],
                                                      }}
                                                    />
                                                  </div>
                                                  <span className="text-xs text-muted-foreground w-12 text-right">
                                                    {pct.toFixed(0)}%
                                                  </span>
                                                </div>
                                              );
                                            }
                                          );
                                        })()}
                                      </div>
                                    </>
                                  ) : qResult?.type === "text" ? (
                                    <div className="space-y-2">
                                      {qResult.answers.length === 0 ? (
                                        <p className="text-sm text-muted-foreground italic">
                                          Aucune réponse.
                                        </p>
                                      ) : (
                                        qResult.answers.map((ans, i) => (
                                          <div
                                            key={i}
                                            className="p-3 bg-muted/50 rounded text-sm border-l-2 border-accent"
                                          >
                                            "{ans}"
                                          </div>
                                        ))
                                      )}
                                    </div>
                                  ) : null}
                                </div>
                              );
                            })}
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
