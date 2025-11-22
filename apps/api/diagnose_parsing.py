"""Diagnostic script to see what's being extracted from CV."""
import sys
from app.parser.core import CVParser

# Read the test file
with open('fixtures/sample_cv_senior_dev.txt', 'rb') as f:
    file_bytes = f.read()

parser = CVParser()

# Extract raw text
text = parser._extract_text(file_bytes, 'sample.txt')

print("=" * 70)
print("RAW EXTRACTED TEXT")
print("=" * 70)
print(text)
print("\n" + "=" * 70)
print(f"Text length: {len(text)} characters")
print("=" * 70)

# Test section detection
print("\n" + "=" * 70)
print("SECTION DETECTION RESULTS")
print("=" * 70)

for section_name, pattern in parser.section_patterns.items():
    match = pattern.search(text)
    if match:
        print(f"✅ Found {section_name.upper()} at position {match.start()}-{match.end()}")
        print(f"   Matched text: '{text[match.start():match.end()]}'")
    else:
        print(f"❌ Did not find {section_name.upper()}")

# Try to parse the full CV
print("\n" + "=" * 70)
print("FULL PARSE ATTEMPT")
print("=" * 70)

try:
    candidate = parser.parse_file(file_bytes, 'sample.txt')
    
    print(f"\n📧 Contact Info:")
    print(f"   Name: {candidate.contact.full_name}")
    print(f"   Emails: {candidate.contact.emails}")
    print(f"   Phones: {candidate.contact.phones}")
    
    print(f"\n💼 Work Experience: {len(candidate.work_experience)} entries")
    for i, work in enumerate(candidate.work_experience, 1):
        print(f"   {i}. {work.title} at {work.employer}")
        print(f"      {work.start_date} to {work.end_date or 'Present'}")
        print(f"      Duration: {work.duration_months} months")
        print(f"      Bullets: {len(work.bullets)}")
    
    print(f"\n🎓 Education: {len(candidate.education)} entries")
    for edu in candidate.education:
        print(f"   • {edu.institution}")
        print(f"     Degree: {edu.degree}")
    
    print(f"\n🛠️ Skills: {len(candidate.skills)} found")
    for skill in candidate.skills[:10]:
        print(f"   • {skill.name}")
    
    print(f"\n📜 Certifications: {len(candidate.certifications)}")
    for cert in candidate.certifications:
        print(f"   • {cert.name}")
    
except Exception as e:
    print(f"❌ Parse failed: {e}")
    import traceback
    traceback.print_exc()