import jsPDF from 'jspdf';

export interface InterviewSummary {
  summary: string;
  overall_score?: number;
  strengths?: string[];
  concerns?: string[];
}

export interface Interview {
  id: string;
  date: string;
  interviewer: string;
  notes: string;
  type: 'phone_screen' | 'technical' | 'behavioral' | 'final' | 'other';
  summary?: InterviewSummary;
}

export interface StatusHistoryEntry {
  status: string;
  changedAt: string;
  note?: string;
}

export interface ScoreBreakdown {
  skills?: number;
  experience?: number;
  prestige?: number;
  education?: number;
  stability?: number;
}

export interface Candidate {
  id: string;
  name: string;
  email: string;
  phone: string;
  score?: number;
  score_breakdown?: ScoreBreakdown;
  fit?: string;
  status?: string;
  experience_years: number;
  skills: string[];
  appliedDate: string;
  fileName: string;
  interviews?: Interview[];
  statusHistory?: StatusHistoryEntry[];
  summary?: string;
}

export interface RoleSummaryData {
  roleTitle: string;
  candidates: Candidate[];
}

export const generateCandidateSummaryPDF = (data: RoleSummaryData) => {
  const doc = new jsPDF();
  const { roleTitle, candidates } = data;

  let yPosition = 20;
  const pageWidth = 210; // A4 width in mm
  const pageHeight = 297; // A4 height in mm
  const margin = 20;
  const contentWidth = pageWidth - (2 * margin);

  // Helper function to check if we need a new page
  const checkPageBreak = (requiredSpace: number) => {
    if (yPosition + requiredSpace > pageHeight - margin) {
      doc.addPage();
      yPosition = margin;
      return true;
    }
    return false;
  };

  // Helper function to add wrapped text
  const addWrappedText = (text: string, x: number, fontSize: number, maxWidth: number, fontStyle: 'normal' | 'bold' = 'normal', lineHeight: number = 5) => {
    doc.setFont('helvetica', fontStyle);
    doc.setFontSize(fontSize);
    const lines = doc.splitTextToSize(text, maxWidth);
    lines.forEach((line: string) => {
      checkPageBreak(lineHeight);
      doc.text(line, x, yPosition);
      yPosition += lineHeight;
    });
  };

  // Helper to calculate combined score
  const getCombinedScore = (candidate: Candidate): number => {
    const cvScore = candidate.score || 0;
    const interviewScores = (candidate.interviews || [])
      .filter(i => i.summary?.overall_score)
      .map(i => (i.summary!.overall_score! / 5) * 100);
    
    if (interviewScores.length === 0) return cvScore;
    const avgInterviewScore = interviewScores.reduce((sum, score) => sum + score, 0) / interviewScores.length;
    return (cvScore * 0.6) + (avgInterviewScore * 0.4);
  };

  // Helper to get interview type label
  const getInterviewTypeLabel = (type: Interview['type']): string => {
    switch (type) {
      case 'phone_screen': return 'Phone Screen';
      case 'technical': return 'Technical';
      case 'behavioral': return 'Behavioral';
      case 'final': return 'Final';
      default: return 'Interview';
    }
  };

  // Header
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('Hiring Decision Report', margin, yPosition);
  yPosition += 10;

  doc.setFontSize(16);
  doc.setFont('helvetica', 'normal');
  doc.text(roleTitle, margin, yPosition);
  yPosition += 8;

  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(`Generated: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`, margin, yPosition);
  doc.text(`Total Candidates: ${candidates.length}`, pageWidth - margin - 40, yPosition);
  yPosition += 10;

  // Divider Line
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.5);
  doc.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += 10;

  // Executive Summary Section
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('Executive Summary', margin, yPosition);
  yPosition += 8;

  const avgCvScore = candidates.length > 0
    ? Math.round(candidates.reduce((sum, c) => sum + (c.score || 0), 0) / candidates.length)
    : 0;
  
  const candidatesWithInterviews = candidates.filter(c => c.interviews && c.interviews.length > 0);
  const candidatesWithScores = candidates.filter(c => c.interviews?.some(i => i.summary?.overall_score));
  const avgInterviewScore = candidatesWithScores.length > 0
    ? candidatesWithScores.reduce((sum, c) => {
        const scores = c.interviews!.filter(i => i.summary?.overall_score).map(i => i.summary!.overall_score!);
        return sum + (scores.reduce((a, b) => a + b, 0) / scores.length);
      }, 0) / candidatesWithScores.length
    : 0;

  const topCandidates = [...candidates]
    .map(c => ({ ...c, combinedScore: getCombinedScore(c) }))
    .sort((a, b) => b.combinedScore - a.combinedScore)
    .slice(0, 3);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Average CV Match Score: ${avgCvScore}%`, margin, yPosition);
  yPosition += 6;
  
  if (candidatesWithScores.length > 0) {
    doc.text(`Candidates Interviewed: ${candidatesWithInterviews.length} / ${candidates.length}`, margin, yPosition);
    yPosition += 6;
    doc.text(`Average Interview Score: ${avgInterviewScore.toFixed(1)}/5.0`, margin, yPosition);
    yPosition += 6;
  }

  doc.setFont('helvetica', 'bold');
  doc.text(`Top 3 Candidates: ${topCandidates.map((c, i) => `${i + 1}. ${c.name} (${c.combinedScore.toFixed(0)}%)`).join(', ')}`, margin, yPosition);
  yPosition += 8;

  // Interview Performance Overview
  if (candidatesWithScores.length > 0) {
    checkPageBreak(40);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Interview Performance Overview', margin, yPosition);
    yPosition += 8;

    const interviewStats = {
      excellent: candidatesWithScores.filter(c => 
        c.interviews!.some(i => (i.summary?.overall_score || 0) >= 4.5)
      ).length,
      good: candidatesWithScores.filter(c => 
        c.interviews!.some(i => {
          const score = i.summary?.overall_score || 0;
          return score >= 3.5 && score < 4.5;
        })
      ).length,
      needsReview: candidatesWithScores.filter(c => 
        c.interviews!.some(i => (i.summary?.overall_score || 0) < 3.5)
      ).length,
    };

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Excellent Interviews (>=4.5/5): ${interviewStats.excellent} candidates`, margin, yPosition);
    yPosition += 6;
    doc.text(`Good Interviews (3.5-4.4/5): ${interviewStats.good} candidates`, margin, yPosition);
    yPosition += 6;
    doc.text(`Needs Review (<3.5/5): ${interviewStats.needsReview} candidates`, margin, yPosition);
    yPosition += 10;
  }

  // Detailed Candidate Profiles
  checkPageBreak(50);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Candidate Profiles', margin, yPosition);
  yPosition += 8;

  // Sort candidates by combined score
  const sortedCandidates = [...candidates]
    .map(c => ({ ...c, combinedScore: getCombinedScore(c) }))
    .sort((a, b) => b.combinedScore - a.combinedScore);

  sortedCandidates.forEach((candidate, index) => {
    checkPageBreak(60);
    
    // Candidate header with ranking
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(`${index + 1}. ${candidate.name}`, margin, yPosition);
    
    // Scores
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const scoreX = pageWidth - margin - 80;
    doc.text('Combined:', scoreX, yPosition);
    doc.setFont('helvetica', 'bold');
    doc.text(`${candidate.combinedScore.toFixed(0)}%`, scoreX + 25, yPosition);
    
    if (candidate.score) {
      doc.setFont('helvetica', 'normal');
      doc.text(`CV: ${candidate.score}%`, scoreX + 45, yPosition);
    }
    yPosition += 8;

    // Contact info and basic details
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Email: ${candidate.email}`, margin + 5, yPosition);
    doc.text(`Phone: ${candidate.phone}`, margin + 90, yPosition);
    yPosition += 5;
    
    doc.text(`Experience: ${candidate.experience_years} years`, margin + 5, yPosition);
    if (candidate.fit) {
      doc.text(`Fit: ${candidate.fit}`, margin + 90, yPosition);
    }
    if (candidate.status) {
      const statusText = candidate.status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      doc.text(`Status: ${statusText}`, pageWidth - margin - 50, yPosition);
    }
    yPosition += 5;

    // Score breakdown if available
    if (candidate.score_breakdown) {
      const breakdown = candidate.score_breakdown;
      const breakdownText = [
        breakdown.skills && `Skills: ${breakdown.skills}`,
        breakdown.experience && `Exp: ${breakdown.experience}`,
        breakdown.education && `Edu: ${breakdown.education}`,
      ].filter(Boolean).join(' • ');
      if (breakdownText) {
        doc.text(breakdownText, margin + 5, yPosition);
        yPosition += 5;
      }
    }

    // Top skills
    const topSkills = candidate.skills.slice(0, 8).join(', ');
    const skillsText = candidate.skills.length > 8 
      ? `Skills: ${topSkills}... (+${candidate.skills.length - 8} more)`
      : `Skills: ${topSkills}`;
    const skillLines = doc.splitTextToSize(skillsText, contentWidth - 10);
    skillLines.forEach((line: string) => {
      doc.text(line, margin + 5, yPosition);
      yPosition += 4.5;
    });
    yPosition += 3;

    // Interview Results
    if (candidate.interviews && candidate.interviews.length > 0) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text('Interview Results:', margin + 5, yPosition);
      yPosition += 6;

      candidate.interviews.forEach((interview) => {
        checkPageBreak(30);
        const interviewDate = new Date(interview.date).toLocaleDateString();
        const interviewType = getInterviewTypeLabel(interview.type);
        
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.text(`• ${interviewType} (${interviewDate}) - ${interview.interviewer}`, margin + 10, yPosition);
        
        if (interview.summary?.overall_score) {
          doc.setFont('helvetica', 'normal');
          doc.text(`Score: ${interview.summary.overall_score.toFixed(1)}/5.0`, pageWidth - margin - 30, yPosition);
        }
        yPosition += 5;

        // Interview summary
        if (interview.summary?.summary) {
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(7.5);
          const summaryLines = doc.splitTextToSize(interview.summary.summary, contentWidth - 15);
          summaryLines.slice(0, 2).forEach((line: string) => {
            doc.text(line, margin + 15, yPosition);
            yPosition += 4;
          });
          if (summaryLines.length > 2) {
            doc.text('...', margin + 15, yPosition);
            yPosition += 4;
          }
        }

        // Strengths and concerns
        if (interview.summary?.strengths && interview.summary.strengths.length > 0) {
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(7.5);
          doc.text('Strengths:', margin + 15, yPosition);
          yPosition += 4;
          doc.setFont('helvetica', 'normal');
          interview.summary.strengths.slice(0, 2).forEach((strength) => {
            const strengthLines = doc.splitTextToSize(`  • ${strength}`, contentWidth - 20);
            strengthLines.forEach((line: string) => {
              doc.text(line, margin + 15, yPosition);
              yPosition += 3.5;
            });
          });
        }

        if (interview.summary?.concerns && interview.summary.concerns.length > 0) {
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(7.5);
          doc.text('Concerns:', margin + 15, yPosition);
          yPosition += 4;
          doc.setFont('helvetica', 'normal');
          interview.summary.concerns.slice(0, 2).forEach((concern) => {
            const concernLines = doc.splitTextToSize(`  • ${concern}`, contentWidth - 20);
            concernLines.forEach((line: string) => {
              doc.text(line, margin + 15, yPosition);
              yPosition += 3.5;
            });
          });
        }
        yPosition += 3;
      });
    } else {
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text('No interviews conducted yet', margin + 5, yPosition);
      doc.setTextColor(0, 0, 0);
      yPosition += 5;
    }

    // Status History (recent entries)
    if (candidate.statusHistory && candidate.statusHistory.length > 0) {
      const recentHistory = [...candidate.statusHistory].reverse().slice(0, 3);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(0, 0, 0);
      doc.text('Recent Status:', margin + 5, yPosition);
      yPosition += 4.5;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      recentHistory.forEach((entry) => {
        const date = new Date(entry.changedAt).toLocaleDateString();
        const statusText = entry.status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        const historyText = entry.note 
          ? `${date}: ${statusText} - ${entry.note}`
          : `${date}: ${statusText}`;
        const historyLines = doc.splitTextToSize(`  • ${historyText}`, contentWidth - 15);
        historyLines.forEach((line: string) => {
          doc.text(line, margin + 15, yPosition);
          yPosition += 3.5;
        });
      });
    }

    yPosition += 5;
    
    // Divider line
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.3);
    doc.line(margin, yPosition, pageWidth - margin, yPosition);
    yPosition += 8;
  });

  // Hiring Recommendations
  checkPageBreak(80);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('Hiring Recommendations', margin, yPosition);
  yPosition += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const recommendations: string[] = [];

  // Top candidates recommendation
  if (topCandidates.length > 0) {
    const topCandidate = topCandidates[0];
    const hasInterviews = topCandidate.interviews && topCandidate.interviews.length > 0;
    const hasScores = topCandidate.interviews?.some(i => i.summary?.overall_score);
    
    if (hasScores) {
      const avgScore = topCandidate.interviews!
        .filter(i => i.summary?.overall_score)
        .reduce((sum, i) => sum + (i.summary!.overall_score!), 0) / 
        topCandidate.interviews!.filter(i => i.summary?.overall_score).length;
      recommendations.push(
        `PRIORITY HIRE: ${topCandidate.name} ranks #1 with a combined score of ${topCandidate.combinedScore.toFixed(0)}% (CV: ${topCandidate.score}%, Interview avg: ${avgScore.toFixed(1)}/5.0). Strong recommendation to extend offer.`
      );
    } else if (hasInterviews) {
      recommendations.push(
        `PRIORITY INTERVIEW: ${topCandidate.name} ranks #1 with ${topCandidate.combinedScore.toFixed(0)}% combined score. Schedule final interview to complete assessment.`
      );
    } else {
      recommendations.push(
        `PRIORITY INTERVIEW: ${topCandidate.name} has the highest CV match score (${topCandidate.score}%). Schedule interview immediately.`
      );
    }
  }

  // Interview-based recommendations
  const excellentInterviews = candidates.filter(c => 
    c.interviews?.some(i => (i.summary?.overall_score || 0) >= 4.5)
  );
  if (excellentInterviews.length > 0) {
    recommendations.push(
      `STRONG CANDIDATES: ${excellentInterviews.length} candidate${excellentInterviews.length !== 1 ? 's' : ''} (${excellentInterviews.map(c => c.name).join(', ')}) scored ≥4.5/5.0 in interviews. Consider for final round or offer.`
    );
  }

  // Interview gaps
  const noInterviews = candidates.filter(c => !c.interviews || c.interviews.length === 0);
  if (noInterviews.length > 0 && topCandidates.some(c => !c.interviews || c.interviews.length === 0)) {
    const topNoInterview = topCandidates.find(c => !c.interviews || c.interviews.length === 0);
    if (topNoInterview) {
      recommendations.push(
        `URGENT ACTION: ${topNoInterview.name} ranks ${sortedCandidates.indexOf(topNoInterview) + 1} but hasn't been interviewed. Schedule interview within 48 hours to prevent losing this candidate.`
      );
    }
  }

  // Concerns-based recommendations
  const candidatesWithConcerns = candidates.filter(c => 
    c.interviews?.some(i => i.summary?.concerns && i.summary.concerns.length > 0)
  );
  if (candidatesWithConcerns.length > 0) {
    recommendations.push(
      `REVIEW REQUIRED: ${candidatesWithConcerns.length} candidate${candidatesWithConcerns.length !== 1 ? 's have' : ' has'} flagged concerns in interview summaries. Review detailed feedback before proceeding.`
    );
  }

  // Status-based recommendations
  const interviewing = candidates.filter(c => c.status === 'interviewing');
  const shortlisted = candidates.filter(c => c.status === 'shortlisted');
  if (interviewing.length > 0) {
    recommendations.push(
      `IN PROGRESS: ${interviewing.length} candidate${interviewing.length !== 1 ? 's are' : ' is'} currently in interview process. Ensure timely feedback and next steps.`
    );
  }
  if (shortlisted.length > 0) {
    recommendations.push(
      `SHORTLIST: ${shortlisted.length} candidate${shortlisted.length !== 1 ? 's have' : ' has'} been shortlisted. Prepare offer packages for top candidates.`
    );
  }

  // General best practices
  if (candidatesWithScores.length > 0) {
    recommendations.push(
      `DECISION SUPPORT: Use interview scores and summaries to make data-driven hiring decisions. Prioritize candidates with both strong CV match and interview performance.`
    );
  }

  recommendations.forEach((rec, idx) => {
    checkPageBreak(15);
    const lines = doc.splitTextToSize(`${idx + 1}. ${rec}`, contentWidth - 10);
    lines.forEach((line: string, lineIdx: number) => {
      doc.setFont(lineIdx === 0 ? 'helvetica' : 'helvetica', lineIdx === 0 ? 'bold' : 'normal');
      doc.text(line, margin + 5, yPosition);
      yPosition += 5;
    });
    yPosition += 3;
  });

  // Footer on last page
  yPosition = pageHeight - margin;
  doc.setFontSize(9);
  doc.setTextColor(128, 128, 128);
  doc.text('Qualifyr.AI - Hiring Decision Support Report', margin, yPosition);
  doc.text(`Page ${doc.getNumberOfPages()}`, pageWidth - margin - 20, yPosition);

  // Add page numbers to all pages
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(9);
    doc.setTextColor(128, 128, 128);
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - margin - 25, pageHeight - margin + 5);
  }

  // Generate filename
  const filename = `${roleTitle.replace(/\s+/g, '-').toLowerCase()}-hiring-report-${Date.now()}.pdf`;

  // Download the PDF
  doc.save(filename);
};
