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

export interface Role {
  id: string;
  title: string;
  candidatesList?: Candidate[];
}

export interface AllCandidatesData {
  roles: Role[];
}

export const generateAllCandidatesPDF = (data: AllCandidatesData) => {
  const doc = new jsPDF();
  const { roles } = data;

  // Flatten all candidates from all roles
  const allCandidates: (Candidate & { roleTitle: string })[] = [];
  roles.forEach(role => {
    if (role.candidatesList && role.candidatesList.length > 0) {
      role.candidatesList.forEach(candidate => {
        allCandidates.push({
          ...candidate,
          roleTitle: role.title
        });
      });
    }
  });

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

  // Header
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('Complete Candidate Overview', margin, yPosition);
  yPosition += 10;

  doc.setFontSize(14);
  doc.setFont('helvetica', 'normal');
  doc.text('All Roles & Candidates', margin, yPosition);
  yPosition += 8;

  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(`Generated: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`, margin, yPosition);
  doc.text(`Total Roles: ${roles.length}`, pageWidth - margin - 40, yPosition);
  yPosition += 5;
  doc.text(`Total Candidates: ${allCandidates.length}`, pageWidth - margin - 40, yPosition);
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

  const avgScore = allCandidates.length > 0
    ? Math.round(allCandidates.reduce((sum, c) => sum + (c.score || 0), 0) / allCandidates.length)
    : 0;
  const topCandidates = allCandidates.filter(c => c.score && c.score >= 85);
  const excellentFit = allCandidates.filter(c => c.fit === 'excellent');
  const activeRoles = roles.filter(r => (r as any).status === 'active').length;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Total Roles: ${roles.length} (${activeRoles} active)`, margin, yPosition);
  yPosition += 6;
  doc.text(`Average Match Score Across All Candidates: ${avgScore}%`, margin, yPosition);
  yPosition += 6;
  doc.text(`Top Candidates (>=85%): ${topCandidates.length}`, margin, yPosition);
  yPosition += 6;
  doc.text(`Excellent Fit Candidates: ${excellentFit.length}`, margin, yPosition);
  yPosition += 12;

  // Overall Skill Distribution
  checkPageBreak(50);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Organization-Wide Top Skills', margin, yPosition);
  yPosition += 8;

  const skillCounts: Record<string, number> = {};
  allCandidates.forEach(c => c.skills.forEach(skill => {
    skillCounts[skill] = (skillCounts[skill] || 0) + 1;
  }));

  const topSkills = Object.entries(skillCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  topSkills.forEach(([skill, count]) => {
    checkPageBreak(6);
    doc.text(`• ${skill}`, margin + 5, yPosition);
    doc.text(`${count} candidate${count > 1 ? 's' : ''}`, pageWidth - margin - 30, yPosition);
    yPosition += 6;
  });
  yPosition += 8;

  // Top Candidates Across All Roles
  if (topCandidates.length > 0) {
    checkPageBreak(40);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Top Candidates Across All Roles', margin, yPosition);
    yPosition += 8;

    const sortedTopCandidates = topCandidates.sort((a, b) => (b.score || 0) - (a.score || 0));

    sortedTopCandidates.slice(0, 10).forEach((candidate, index) => {
      checkPageBreak(32);

      // Candidate header with score
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(`${index + 1}. ${candidate.name}`, margin, yPosition);

      // Score badge
      doc.setFillColor(59, 130, 246);
      doc.roundedRect(pageWidth - margin - 25, yPosition - 4, 25, 8, 2, 2, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(10);
      doc.text(`${candidate.score}%`, pageWidth - margin - 17, yPosition + 1);
      doc.setTextColor(0, 0, 0);
      yPosition += 8;

      // Role applied for
      doc.setFontSize(9);
      doc.setFont('helvetica', 'italic');
      doc.text(`Applied for: ${candidate.roleTitle}`, margin + 5, yPosition);
      yPosition += 5;

      // Candidate details
      doc.setFont('helvetica', 'normal');
      doc.text(`Email: ${candidate.email}`, margin + 5, yPosition);
      yPosition += 5;
      doc.text(`Phone: ${candidate.phone}`, margin + 5, yPosition);
      yPosition += 5;
      doc.text(`Experience: ${candidate.experience_years} years`, margin + 5, yPosition);
      doc.text(`Fit: ${candidate.fit || 'N/A'}`, pageWidth - margin - 60, yPosition);
      yPosition += 5;
      if (candidate.status) {
        doc.text(`Status: ${candidate.status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}`, margin + 5, yPosition);
        yPosition += 5;
      }

      // Skills
      const skillsText = `Skills: ${candidate.skills.slice(0, 8).join(', ')}${candidate.skills.length > 8 ? '...' : ''}`;
      const skillLines = doc.splitTextToSize(skillsText, contentWidth - 10);
      skillLines.forEach((line: string) => {
        checkPageBreak(5);
        doc.text(line, margin + 5, yPosition);
        yPosition += 5;
      });

      yPosition += 6;
    });

    if (topCandidates.length > 10) {
      doc.setFontSize(9);
      doc.setFont('helvetica', 'italic');
      doc.text(`... and ${topCandidates.length - 10} more top candidates`, margin + 5, yPosition);
      yPosition += 10;
    }
  }

  // Breakdown by Role
  checkPageBreak(40);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Breakdown by Role', margin, yPosition);
  yPosition += 8;

  roles.forEach((role) => {
    const roleCandidates = role.candidatesList || [];
    if (roleCandidates.length === 0) return;

    checkPageBreak(50);

    // Role header
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setFillColor(240, 240, 250);
    doc.roundedRect(margin, yPosition - 5, contentWidth, 10, 2, 2, 'F');
    doc.text(role.title, margin + 5, yPosition + 1);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`${roleCandidates.length} candidate${roleCandidates.length !== 1 ? 's' : ''}`, pageWidth - margin - 35, yPosition + 1);
    yPosition += 12;

    // Role statistics
    const roleAvgScore = roleCandidates.length > 0
      ? Math.round(roleCandidates.reduce((sum, c) => sum + (c.score || 0), 0) / roleCandidates.length)
      : 0;
    const roleTopCandidates = roleCandidates.filter(c => c.score && c.score >= 85).length;

    doc.setFontSize(9);
    doc.text(`Avg Score: ${roleAvgScore}%`, margin + 5, yPosition);
    doc.text(`Top Candidates: ${roleTopCandidates}`, margin + 60, yPosition);
    yPosition += 8;

    // Top 5 candidates for this role
    const sortedRoleCandidates = [...roleCandidates].sort((a, b) => (b.score || 0) - (a.score || 0));
    sortedRoleCandidates.slice(0, 5).forEach((candidate, idx) => {
      checkPageBreak(15);

      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text(`${idx + 1}. ${candidate.name}`, margin + 10, yPosition);
      if (candidate.score) {
        doc.setFont('helvetica', 'normal');
        doc.text(`${candidate.score}%`, pageWidth - margin - 25, yPosition);
      }
      yPosition += 5;

      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      const statusText = candidate.status ? ` | Status: ${candidate.status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}` : '';
      doc.text(`${candidate.email} | ${candidate.experience_years} yrs exp | ${candidate.fit || 'N/A'}${statusText}`, margin + 15, yPosition);
      yPosition += 5;

      // Limited skills
      const limitedSkills = candidate.skills.slice(0, 4).join(', ');
      doc.text(`Skills: ${limitedSkills}${candidate.skills.length > 4 ? '...' : ''}`, margin + 15, yPosition);
      yPosition += 6;
    });

    if (roleCandidates.length > 5) {
      doc.setFontSize(8);
      doc.setFont('helvetica', 'italic');
      doc.text(`+ ${roleCandidates.length - 5} more candidate${roleCandidates.length - 5 !== 1 ? 's' : ''}`, margin + 10, yPosition);
      yPosition += 8;
    } else {
      yPosition += 3;
    }
  });

  // Organization-wide Recommendations
  checkPageBreak(60);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Organization-Wide Hiring Recommendations', margin, yPosition);
  yPosition += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');

  const recommendations: string[] = [];

  if (topCandidates.length > 0) {
    recommendations.push(
      `IMMEDIATE PRIORITY: You have ${topCandidates.length} exceptional candidates scoring 85% or above across all roles. These represent your strongest talent pool and should be engaged immediately to prevent loss to competitors.`
    );
  }

  if (excellentFit.length > 0) {
    recommendations.push(
      `CULTURAL ALIGNMENT: ${excellentFit.length} candidates show excellent cultural fit. Prioritize these in hiring decisions as cultural fit strongly correlates with long-term retention and performance.`
    );
  }

  recommendations.push(
    `TALENT PIPELINE: With ${allCandidates.length} total candidates across ${roles.length} roles, maintain regular communication with top performers even if positions aren't immediately available. Build a talent reserve for future needs.`
  );

  const rolesWithCandidates = roles.filter(r => r.candidatesList && r.candidatesList.length > 0);
  if (rolesWithCandidates.length > 0) {
    recommendations.push(
      `HIRING FOCUS: ${rolesWithCandidates.length} of your ${roles.length} roles have active candidates. Consider allocating additional recruiting resources to roles without candidates or closing unfilled positions.`
    );
  }

  recommendations.push(
    `SKILL DEVELOPMENT: Top organizational skills include ${topSkills.slice(0, 5).map(([s]) => s).join(', ')}. Consider upskilling programs in complementary areas to build well-rounded teams.`
  );

  recommendations.push(
    `DATA-DRIVEN DECISIONS: Continue leveraging AI-powered scoring to reduce bias and improve hiring quality. Track hire success rates against scores to refine your evaluation criteria over time.`
  );

  recommendations.push(
    `ACTION PLAN: (1) Contact all 85+ scored candidates within 48 hours, (2) Create fast-track interview processes for excellent fit candidates, (3) Schedule hiring manager reviews for top 3 candidates per role, (4) Build talent pools for future hiring needs.`
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
    yPosition += 3;
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
  const filename = `all-candidates-overview-${Date.now()}.pdf`;

  // Download the PDF
  doc.save(filename);
};
