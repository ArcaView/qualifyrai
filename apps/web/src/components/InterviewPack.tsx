import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Copy, RefreshCw, Check, Loader2 } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import type { InterviewPack, InterviewQuestion } from "@/types/interview-pack";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface InterviewPackProps {
  pack: InterviewPack | null;
  onRegenerate: () => void;
  isGenerating?: boolean;
  compact?: boolean; // For inline display within interview cards
  onQuestionUpdate?: (questionId: string, updates: { notes?: string; score?: number }) => void; // Callback when question notes/score change
}

export function InterviewPackComponent({ pack, onRegenerate, isGenerating = false, compact = false, onQuestionUpdate }: InterviewPackProps) {
  const { toast } = useToast();
  const [copiedQuestionId, setCopiedQuestionId] = useState<string | null>(null);
  const [showRegenerateDialog, setShowRegenerateDialog] = useState(false);
  const debounceTimers = useRef<Map<string, NodeJS.Timeout>>(new Map());
  // Local state for question notes to allow immediate typing while debouncing saves
  const [localNotes, setLocalNotes] = useState<Map<string, string>>(new Map());
  
  // Initialize local notes from pack questions when pack changes
  useEffect(() => {
    if (pack) {
      setLocalNotes(prev => {
        const next = new Map(prev);
        pack.questions.forEach(q => {
          // Initialize from prop if not already in local state (preserve user's typing)
          if (!next.has(q.id)) {
            next.set(q.id, q.notes || '');
          }
        });
        return next;
      });
    }
  }, [pack?.id]); // Re-init when pack ID changes (new pack loaded)
  
  // Sync local notes when question.notes prop updates (after save), but only if user isn't actively typing
  useEffect(() => {
    if (pack) {
      pack.questions.forEach(q => {
        // Only sync if there's no active debounce timer (user isn't typing)
        const hasActiveTimer = debounceTimers.current.has(q.id);
        if (!hasActiveTimer) {
          setLocalNotes(prev => {
            // Only update if the prop value differs from local state
            const currentLocal = prev.get(q.id);
            const propValue = q.notes || '';
            if (currentLocal !== propValue) {
              const next = new Map(prev);
              next.set(q.id, propValue);
              return next;
            }
            return prev;
          });
        }
      });
    }
  }, [pack?.questions.map(q => `${q.id}:${q.notes || ''}`).join(',')]); // Update when question notes change

  const handleCopyQuestion = async (question: InterviewQuestion) => {
    const text = formatQuestionForCopy(question);
    await navigator.clipboard.writeText(text);
    setCopiedQuestionId(question.id);
    toast({
      title: 'Copied!',
      description: 'Question copied to clipboard',
    });
    setTimeout(() => setCopiedQuestionId(null), 2000);
  };

  const handleCopyAll = async () => {
    if (!pack) return;
    
    const text = formatFullPackForCopy(pack);
    await navigator.clipboard.writeText(text);
    toast({
      title: 'Copied!',
      description: 'Full interview pack copied to clipboard',
    });
  };

  const handleRegenerate = () => {
    setShowRegenerateDialog(false);
    onRegenerate();
  };

  // Cleanup debounce timers on unmount
  useEffect(() => {
    return () => {
      debounceTimers.current.forEach((timer) => clearTimeout(timer));
      debounceTimers.current.clear();
    };
  }, []);

  if (!pack) {
    return null;
  }

  const packContent = (
    <div className="space-y-6">
      {/* Pack Header */}
      <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
        <div>
          <h3 className="font-semibold text-sm mb-2">Focus Areas</h3>
          <div className="flex flex-wrap gap-2">
            {pack.focusAreas.map((area, idx) => (
              <Badge key={idx} variant="secondary">
                {area}
              </Badge>
            ))}
          </div>
        </div>
        
        <div>
          <h3 className="font-semibold text-sm mb-2">Risks & Concerns</h3>
          <div className="flex flex-wrap gap-2">
            {pack.risks.map((risk, idx) => (
              <Badge key={idx} variant="destructive" className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
                {risk}
              </Badge>
            ))}
          </div>
        </div>
        
        <div>
          <h3 className="font-semibold text-sm mb-2">Suggested Timeline</h3>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{pack.timeline}</p>
        </div>
      </div>

      {/* Questions */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-lg">Interview Questions</h3>
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyAll}
            disabled={isGenerating}
          >
            <Copy className="w-4 h-4 mr-2" />
            Copy All Questions
          </Button>
        </div>
        <Accordion type="single" collapsible className="w-full">
          {pack.questions.map((question, idx) => (
            <AccordionItem key={question.id} value={question.id}>
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-start gap-3 flex-1 text-left pr-4">
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="min-w-[3rem]">Q{idx + 1}</Badge>
                    <Badge variant="secondary">{question.timebox} min</Badge>
                  </div>
                  <span className="font-medium flex-1">{question.mainQuestion}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCopyQuestion(question);
                    }}
                    disabled={isGenerating}
                    className="shrink-0"
                  >
                    {copiedQuestionId === question.id ? (
                      <Check className="w-4 h-4 text-green-600" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4 pt-2 pl-12">
                  {/* JD Requirement */}
                  <div>
                    <h4 className="text-xs font-semibold text-muted-foreground mb-1">JD Requirement</h4>
                    <p className="text-sm">{question.jdRequirement}</p>
                  </div>

                  {/* Candidate Evidence */}
                  <div>
                    <h4 className="text-xs font-semibold text-muted-foreground mb-1">Candidate Evidence</h4>
                    {question.candidateEvidence ? (
                      <p className="text-sm bg-blue-50 dark:bg-blue-900/20 p-2 rounded border-l-2 border-blue-500">
                        {question.candidateEvidence}
                      </p>
                    ) : (
                      <p className="text-sm text-amber-600 dark:text-amber-400 italic">
                        Missing - no relevant evidence found in CV
                      </p>
                    )}
                  </div>

                  {/* Follow-up Questions */}
                  {question.followUpQuestions.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold text-muted-foreground mb-1">Follow-up Questions</h4>
                      <ul className="list-disc list-inside space-y-1 text-sm">
                        {question.followUpQuestions.map((followUp, idx) => (
                          <li key={idx}>{followUp}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* What Good Looks Like */}
                  <div>
                    <h4 className="text-xs font-semibold text-muted-foreground mb-1">What Good Looks Like</h4>
                    <p className="text-sm bg-green-50 dark:bg-green-900/20 p-2 rounded border-l-2 border-green-500">
                      {question.goodLooksLike}
                    </p>
                  </div>

                  {/* Red Flags */}
                  {question.redFlags.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold text-muted-foreground mb-1">Red Flags</h4>
                      <ul className="list-disc list-inside space-y-1 text-sm">
                        {question.redFlags.map((flag, idx) => (
                          <li key={idx} className="text-red-700 dark:text-red-400">{flag}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Rubric - Clickable */}
                  <div>
                    <h4 className="text-xs font-semibold text-muted-foreground mb-2">Scoring Rubric (1-5) - Click to select</h4>
                    <div className="space-y-1 text-sm">
                      {Object.entries(question.rubric).map(([score, description]) => {
                        const isSelected = question.score === parseInt(score);
                        return (
                          <div
                            key={score}
                            onClick={() => {
                              if (onQuestionUpdate && !isGenerating) {
                                onQuestionUpdate(question.id, { score: parseInt(score) });
                              }
                            }}
                            className={`flex gap-2 p-2 rounded cursor-pointer transition-colors ${
                              isSelected
                                ? 'bg-primary/10 border-l-2 border-primary'
                                : 'hover:bg-muted/50'
                            }`}
                          >
                            <Badge 
                              variant={isSelected ? "default" : "outline"} 
                              className={`w-8 justify-center ${isSelected ? '' : ''}`}
                            >
                              {score}
                            </Badge>
                            <span className={`flex-1 ${isSelected ? 'font-medium' : 'text-muted-foreground'}`}>
                              {description}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Interview Notes */}
                  <div className="pt-4 border-t">
                    <div className="flex items-center justify-between mb-2">
                      <Label htmlFor={`notes-${question.id}`} className="text-xs font-semibold">
                        Interview Notes
                      </Label>
                      {question.score && (
                        <Badge variant="secondary" className="text-xs">
                          Score: {question.score}/5
                        </Badge>
                      )}
                    </div>
                    <Textarea
                      id={`notes-${question.id}`}
                      placeholder="Add your notes about the candidate's answer..."
                      value={localNotes.get(question.id) ?? question.notes ?? ''}
                      onChange={(e) => {
                        const value = e.target.value;
                        // Update local state immediately for responsive typing
                        setLocalNotes(prev => {
                          const next = new Map(prev);
                          next.set(question.id, value);
                          return next;
                        });
                        
                        if (onQuestionUpdate) {
                          // Clear existing timer for this question
                          const existingTimer = debounceTimers.current.get(question.id);
                          if (existingTimer) {
                            clearTimeout(existingTimer);
                          }
                          
                          // Set new debounced timer (1 second delay)
                          const timer = setTimeout(() => {
                            onQuestionUpdate(question.id, { notes: value });
                            debounceTimers.current.delete(question.id);
                          }, 1000);
                          
                          debounceTimers.current.set(question.id, timer);
                        }
                      }}
                      className="min-h-[100px] text-sm"
                      disabled={isGenerating}
                    />
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </div>
  );

  return (
    <>
      {compact ? (
        // Compact mode - just show summary
        packContent
      ) : (
        // Full mode - wrap in Card
        <Card className="mt-4">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle>Interview Pack</CardTitle>
                <CardDescription>
                  {pack.duration}-minute tailored interview questions
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyAll}
                  disabled={isGenerating}
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Copy All
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowRegenerateDialog(true)}
                  disabled={isGenerating}
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Regenerate
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {packContent}
          </CardContent>
        </Card>
      )}

      {/* Regenerate Dialog */}
      <AlertDialog open={showRegenerateDialog} onOpenChange={setShowRegenerateDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Regenerate Interview Pack?</AlertDialogTitle>
            <AlertDialogDescription>
              This will replace the current interview pack with a newly generated one. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRegenerate}>Regenerate</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function formatQuestionForCopy(question: InterviewQuestion): string {
  let text = `Q: ${question.mainQuestion}\n\n`;
  text += `JD Requirement: ${question.jdRequirement}\n`;
  text += `Candidate Evidence: ${question.candidateEvidence || 'Missing'}\n`;
  text += `Timebox: ${question.timebox} minutes\n\n`;
  
  if (question.followUpQuestions.length > 0) {
    text += `Follow-up Questions:\n`;
    question.followUpQuestions.forEach((q, idx) => {
      text += `${idx + 1}. ${q}\n`;
    });
    text += '\n';
  }
  
  text += `What Good Looks Like:\n${question.goodLooksLike}\n\n`;
  
  if (question.redFlags.length > 0) {
    text += `Red Flags:\n`;
    question.redFlags.forEach((flag, idx) => {
      text += `• ${flag}\n`;
    });
    text += '\n';
  }
  
  text += `Rubric:\n`;
  Object.entries(question.rubric).forEach(([score, desc]) => {
    text += `${score}: ${desc}\n`;
  });
  
  return text;
}

function formatFullPackForCopy(pack: InterviewPack): string {
  let text = `INTERVIEW PACK - ${pack.duration} MINUTES\n`;
  text += `Generated: ${new Date(pack.createdAt).toLocaleString()}\n`;
  text += '='.repeat(50) + '\n\n';
  
  text += `FOCUS AREAS:\n`;
  pack.focusAreas.forEach((area, idx) => {
    text += `${idx + 1}. ${area}\n`;
  });
  text += '\n';
  
  text += `RISKS & CONCERNS:\n`;
  pack.risks.forEach((risk, idx) => {
    text += `${idx + 1}. ${risk}\n`;
  });
  text += '\n';
  
  text += `TIMELINE:\n${pack.timeline}\n\n`;
  text += '='.repeat(50) + '\n\n';
  
  pack.questions.forEach((question, idx) => {
    text += `QUESTION ${idx + 1} (${question.timebox} min)\n`;
    text += formatQuestionForCopy(question);
    text += '\n' + '-'.repeat(50) + '\n\n';
  });
  
  return text;
}
