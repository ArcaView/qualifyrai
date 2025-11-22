import jsPDF from 'jspdf';

export interface Candidate {
  id: string;
  name: string;
  email: string;
  phone: string;
  score?: number;
  fit?: string;
  status?: string;
  experience_years: number;
  skills: string[];
  appliedDate: string;
  fileName: string;
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
  const addWrappedText = (text: string, x: number, fontSize: number, maxWidth: number, fontStyle: 'normal' | 'bold' = 'normal') => {
    doc.setFont('helvetica', fontStyle);
    doc.setFontSize(fontSize);
    const lines = doc.splitTextToSize(text, maxWidth);
    lines.forEach((line: string) => {
      checkPageBreak(7);
      doc.text(line, x, yPosition);
      yPosition += fontSize * 0.5;
    });
  };

  // Header
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('Candidate Summary Report', margin, yPosition);
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

  const avgScore = candidates.length > 0
    ? Math.round(candidates.reduce((sum, c) => sum + (c.score || 0), 0) / candidates.length)
    : 0;
  const topCandidates = candidates.filter(c => c.score && c.score >= 85);
  const excellentFit = candidates.filter(c => c.fit === 'excellent');

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Average Match Score: ${avgScore}%`, margin, yPosition);
  yPosition += 6;
  doc.text(`Top Candidates (>=85%): ${topCandidates.length}`, margin, yPosition);
  yPosition += 6;
  doc.text(`Excellent Fit: ${excellentFit.length}`, margin, yPosition);
  yPosition += 12;

  // Skill Distribution Section
  checkPageBreak(40);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Top Skills', margin, yPosition);
  yPosition += 8;

  const skillCounts: Record<string, number> = {};
  candidates.forEach(c => c.skills.forEach(skill => {
    skillCounts[skill] = (skillCounts[skill] || 0) + 1;
  }));

  const topSkills = Object.entries(skillCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  topSkills.forEach(([skill, count]) => {
    checkPageBreak(6);
    doc.text(`• ${skill}`, margin + 5, yPosition);
    doc.text(`${count} candidate${count > 1 ? 's' : ''}`, pageWidth - margin - 30, yPosition);
    yPosition += 6;
  });
  yPosition += 8;

  // Top Candidates Section
  if (topCandidates.length > 0) {
    checkPageBreak(40);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Top Candidates', margin, yPosition);
    yPosition += 8;

    topCandidates.forEach((candidate, index) => {
      checkPageBreak(30);

      // Candidate header with score
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(`${index + 1}. ${candidate.name}`, margin, yPosition);

      // Score badge
      doc.setFillColor(59, 130, 246); // Blue color
      doc.roundedRect(pageWidth - margin - 25, yPosition - 4, 25, 8, 2, 2, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(10);
      doc.text(`${candidate.score}%`, pageWidth - margin - 17, yPosition + 1);
      doc.setTextColor(0, 0, 0);
      yPosition += 8;

      // Candidate details
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(`Email: ${candidate.email}`, margin + 5, yPosition);
      yPosition += 5;
      doc.text(`Phone: ${candidate.phone}`, margin + 5, yPosition);
      yPosition += 5;
      doc.text(`Experience: ${candidate.experience_years} years`, margin + 5, yPosition);
      yPosition += 5;
      doc.text(`Fit: ${candidate.fit || 'N/A'}`, margin + 5, yPosition);
      if (candidate.status) {
        doc.text(`Status: ${candidate.status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}`, pageWidth - margin - 60, yPosition);
      }
      yPosition += 5;

      // Skills (wrapped)
      const skillsText = `Skills: ${candidate.skills.slice(0, 8).join(', ')}${candidate.skills.length > 8 ? '...' : ''}`;
      const skillLines = doc.splitTextToSize(skillsText, contentWidth - 10);
      skillLines.forEach((line: string) => {
        checkPageBreak(5);
        doc.text(line, margin + 5, yPosition);
        yPosition += 5;
      });

      yPosition += 6;
    });
  }

  // All Candidates Section
  checkPageBreak(40);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('All Candidates', margin, yPosition);
  yPosition += 8;

  // Sort candidates by score
  const sortedCandidates = [...candidates].sort((a, b) => (b.score || 0) - (a.score || 0));

  sortedCandidates.forEach((candidate, index) => {
    checkPageBreak(25);

    // Candidate name and rank
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(`${index + 1}. ${candidate.name}`, margin, yPosition);

    // Score
    if (candidate.score) {
      doc.setFont('helvetica', 'normal');
      doc.text(`${candidate.score}%`, pageWidth - margin - 20, yPosition);
    }
    yPosition += 6;

    // Details in two columns
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`${candidate.email}`, margin + 5, yPosition);
    doc.text(`${candidate.experience_years} years exp`, pageWidth - margin - 45, yPosition);
    yPosition += 5;
    doc.text(`${candidate.phone}`, margin + 5, yPosition);
    if (candidate.fit) {
      doc.text(`Fit: ${candidate.fit}`, pageWidth - margin - 45, yPosition);
    }
    yPosition += 5;
    if (candidate.status) {
      doc.text(`Status: ${candidate.status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}`, margin + 5, yPosition);
      yPosition += 5;
    }

    // Skills (limited to fit on one or two lines)
    const limitedSkills = candidate.skills.slice(0, 6).join(', ');
    const skillText = `Skills: ${limitedSkills}${candidate.skills.length > 6 ? `, +${candidate.skills.length - 6} more` : ''}`;
    const lines = doc.splitTextToSize(skillText, contentWidth - 10);
    lines.forEach((line: string, i: number) => {
      if (i < 2) { // Limit to 2 lines
        checkPageBreak(5);
        doc.text(line, margin + 5, yPosition);
        yPosition += 5;
      }
    });

    yPosition += 6;
  });

  // Recommendations Section
  checkPageBreak(60);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Hiring Recommendations', margin, yPosition);
  yPosition += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');

  // Build comprehensive recommendations
  const recommendations: string[] = [];

  // Top candidates recommendation
  if (topCandidates.length > 0) {
    recommendations.push(
      `IMMEDIATE ACTION: Schedule interviews with the top ${Math.min(3, topCandidates.length)} candidates scoring above 85%. These candidates (${topCandidates.slice(0, 3).map(c => c.name).join(', ')}) demonstrate exceptional qualifications and should be contacted within 24-48 hours.`
    );
  }

  // Excellent fit recommendation
  if (excellentFit.length > 0) {
    recommendations.push(
      `PRIORITY CANDIDATES: ${excellentFit.length} candidate${excellentFit.length !== 1 ? 's' : ''} show excellent cultural and skill fit (${excellentFit.slice(0, 3).map(c => c.name).join(', ')}${excellentFit.length > 3 ? ', and others' : ''}). These should be fast-tracked through your hiring pipeline.`
    );
  }

  // Skill alignment
  if (topSkills.length >= 3) {
    recommendations.push(
      `SKILL FOCUS: Prioritize candidates with proven expertise in ${topSkills.slice(0, 3).map(([s]) => s).join(', ')}. These skills are most common among your top-performing candidates and align well with role requirements.`
    );
  }

  // Experience-based recommendation
  const avgExperience = Math.round(
    sortedCandidates.reduce((sum, c) => sum + c.experience_years, 0) / sortedCandidates.length
  );
  const experiencedCandidates = sortedCandidates.filter(c => c.experience_years >= avgExperience + 2);
  if (experiencedCandidates.length > 0) {
    recommendations.push(
      `EXPERIENCE DEPTH: ${experiencedCandidates.length} candidate${experiencedCandidates.length !== 1 ? 's have' : ' has'} significantly more experience than average (${avgExperience} years). Consider ${experiencedCandidates.slice(0, 2).map(c => c.name).join(' and ')} for senior or leadership positions.`
    );
  }

  // Diversity of skills
  const totalUniqueSkills = Object.keys(skillCounts).length;
  if (totalUniqueSkills > 15) {
    recommendations.push(
      `SKILL DIVERSITY: Candidates present ${totalUniqueSkills} unique skills across the pool. This diversity enables team composition flexibility - consider pairing complementary skill sets during team building.`
    );
  }

  // Score distribution insights
  const midRangeCandidates = sortedCandidates.filter(c => c.score && c.score >= 70 && c.score < 85);
  if (midRangeCandidates.length > 0) {
    recommendations.push(
      `SECONDARY POOL: ${midRangeCandidates.length} candidate${midRangeCandidates.length !== 1 ? 's score' : ' scores'} between 70-84%. While not top-tier, these candidates may excel in roles with adjusted requirements or through targeted training programs.`
    );
  }

  // Timeline recommendation
  if (topCandidates.length >= 2) {
    recommendations.push(
      `HIRING VELOCITY: With ${topCandidates.length} strong candidates available, aim to complete initial interviews within the next 5-7 business days to maintain candidate engagement and prevent talent loss to competitors.`
    );
  }

  // General best practice
  recommendations.push(
    `NEXT STEPS: (1) Send personalized outreach emails to top candidates within 24 hours, (2) Schedule phone screens for candidates scoring 85+, (3) Prepare role-specific technical assessments, (4) Establish a feedback loop with hiring managers to refine scoring criteria.`
  );

  recommendations.forEach((rec, idx) => {
    checkPageBreak(15);
    const lines = doc.splitTextToSize(`${idx + 1}. ${rec}`, contentWidth - 10);
    lines.forEach((line: string, lineIdx: number) => {
      if (lineIdx === 0) {
        doc.setFont('helvetica', 'bold');
      } else {
        doc.setFont('helvetica', 'normal');
      }
      doc.text(line, margin + 5, yPosition);
      yPosition += 5;
    });
    yPosition += 3; // Extra spacing between recommendations
  });

  // Footer on last page
  yPosition = pageHeight - margin;
  doc.setFontSize(9);
  doc.setTextColor(128, 128, 128);
  doc.text('Qualifyr.AI - Automated CV Parsing & Scoring', margin, yPosition);
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
  const filename = `${roleTitle.replace(/\s+/g, '-').toLowerCase()}-summary-${Date.now()}.pdf`;

  // Download the PDF
  doc.save(filename);
};
