import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const DocsPage = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <main className="flex-1">
        {/* Hero Section */}
        <section className="py-20 bg-gradient-to-b from-primary/5 to-background">
          <div className="container mx-auto px-4 text-center">
            <Badge className="mb-4 bg-primary/10 text-primary border-primary/20">Documentation</Badge>
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              Get Started in Minutes
            </h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Comprehensive guides and API reference to help you integrate Qualifyr.AI into your application.
            </p>
          </div>
        </section>

        {/* Quick Start */}
        <section className="py-20">
          <div className="container mx-auto px-4 max-w-5xl">
            <h2 className="text-3xl font-bold mb-8">Quick Start</h2>
            
            <div className="space-y-8">
              <div>
                <h3 className="text-xl font-semibold mb-4">1. Get Your API Key</h3>
                <p className="text-muted-foreground mb-4">
                  Sign up for a free account and generate your API key from the dashboard. Store it securely - you'll need it for all API requests.
                </p>
                <Card className="bg-code">
                  <CardContent className="p-4">
                    <pre className="text-sm font-mono text-code-foreground">
{`export QUALIFYR_API_KEY="qai_live_your_api_key_here"`}
                    </pre>
                  </CardContent>
                </Card>
              </div>

              <div>
                <h3 className="text-xl font-semibold mb-4">2. Parse a CV</h3>
                <p className="text-muted-foreground mb-4">
                  Upload a resume file to extract structured data. Supported formats: PDF, DOCX, DOC, TXT.
                </p>
                
                <Tabs defaultValue="curl" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="curl">cURL</TabsTrigger>
                    <TabsTrigger value="python">Python</TabsTrigger>
                    <TabsTrigger value="typescript">TypeScript</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="curl">
                    <Card className="bg-code">
                      <CardContent className="p-4">
                        <pre className="text-sm font-mono text-code-foreground overflow-x-auto">
{`curl -X POST https://api.qualifyr.ai/v1/parse \\
  -H "Authorization: Bearer $QUALIFYR_API_KEY" \\
  -H "Content-Type: multipart/form-data" \\
  -F "file=@resume.pdf"

# Response
{
  "id": "parse_abc123",
  "candidate": {
    "name": "Jane Doe",
    "email": "jane@example.com",
    "phone": "+1-555-0100",
    "location": { "city": "San Francisco", "country": "USA" },
    "skills": ["Python", "FastAPI", "PostgreSQL"],
    "experience": [
      {
        "title": "Senior Engineer",
        "company": "TechCorp",
        "start_date": "2021-01-01",
        "end_date": "2024-12-31",
        "duration_months": 48
      }
    ],
    "education": [
      {
        "institution": "MIT",
        "degree": "BS Computer Science",
        "field": "Computer Science",
        "graduation_date": "2020-06-01"
      }
    ]
  },
  "confidence": {
    "overall": 0.95,
    "contact": 0.98,
    "experience": 0.92,
    "education": 0.94
  }
}`}
                        </pre>
                      </CardContent>
                    </Card>
                  </TabsContent>
                  
                  <TabsContent value="python">
                    <Card className="bg-code">
                      <CardContent className="p-4">
                        <pre className="text-sm font-mono text-code-foreground overflow-x-auto">
{`import requests

api_key = "ps_live_your_api_key_here"
url = "https://api.qualifyr.ai/v1/parse"

headers = {
    "Authorization": f"Bearer {api_key}"
}

with open("resume.pdf", "rb") as f:
    files = {"file": f}
    response = requests.post(url, headers=headers, files=files)

data = response.json()
print(f"Parsed: {data['candidate']['name']}")
print(f"Skills: {', '.join(data['candidate']['skills'])}")`}
                        </pre>
                      </CardContent>
                    </Card>
                  </TabsContent>
                  
                  <TabsContent value="typescript">
                    <Card className="bg-code">
                      <CardContent className="p-4">
                        <pre className="text-sm font-mono text-code-foreground overflow-x-auto">
{`const API_KEY = "ps_live_your_api_key_here";
const url = "https://api.qualifyr.ai/v1/parse";

const formData = new FormData();
formData.append("file", fileInput.files[0]);

const response = await fetch(url, {
  method: "POST",
  headers: {
    "Authorization": \`Bearer \${API_KEY}\`
  },
  body: formData
});

const data = await response.json();
console.log("Parsed:", data.candidate.name);
console.log("Skills:", data.candidate.skills.join(", "));`}
                        </pre>
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              </div>

              <div>
                <h3 className="text-xl font-semibold mb-4">3. Score a Candidate</h3>
                <p className="text-muted-foreground mb-4">
                  Compare a candidate against a job profile to get a fit score with detailed breakdown.
                </p>
                
                <Tabs defaultValue="curl" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="curl">cURL</TabsTrigger>
                    <TabsTrigger value="python">Python</TabsTrigger>
                    <TabsTrigger value="typescript">TypeScript</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="curl">
                    <Card className="bg-code">
                      <CardContent className="p-4">
                        <pre className="text-sm font-mono text-code-foreground overflow-x-auto">
{`curl -X POST https://api.qualifyr.ai/v1/score \\
  -H "Authorization: Bearer $QUALIFYR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "candidate_id": "parse_abc123",
    "job": {
      "title": "Senior Backend Engineer",
      "required_skills": ["Python", "PostgreSQL"],
      "preferred_skills": ["FastAPI", "Docker"],
      "min_years_experience": 3
    },
    "llm": false
  }'

# Response
{
  "overall_score": 87,
  "fit": "excellent",
  "breakdown": {
    "skills": 92,
    "experience": 85,
    "education": 78,
    "certifications": 0,
    "stability": 88
  },
  "risk_flags": [],
  "rationale": "Strong match with 4 years experience..."
}`}
                        </pre>
                      </CardContent>
                    </Card>
                  </TabsContent>
                  
                  <TabsContent value="python">
                    <Card className="bg-code">
                      <CardContent className="p-4">
                        <pre className="text-sm font-mono text-code-foreground overflow-x-auto">
{`payload = {
    "candidate_id": "parse_abc123",
    "job": {
        "title": "Senior Backend Engineer",
        "required_skills": ["Python", "PostgreSQL"],
        "preferred_skills": ["FastAPI", "Docker"],
        "min_years_experience": 3
    },
    "llm": False
}

response = requests.post(
    "https://api.qualifyr.ai/v1/score",
    headers=headers,
    json=payload
)

score_data = response.json()
print(f"Score: {score_data['overall_score']}/100")
print(f"Fit: {score_data['fit']}")`}
                        </pre>
                      </CardContent>
                    </Card>
                  </TabsContent>
                  
                  <TabsContent value="typescript">
                    <Card className="bg-code">
                      <CardContent className="p-4">
                        <pre className="text-sm font-mono text-code-foreground overflow-x-auto">
{`const scorePayload = {
  candidate_id: "parse_abc123",
  job: {
    title: "Senior Backend Engineer",
    required_skills: ["Python", "PostgreSQL"],
    preferred_skills: ["FastAPI", "Docker"],
    min_years_experience: 3
  },
  llm: false
};

const response = await fetch(
  "https://api.qualifyr.ai/v1/score",
  {
    method: "POST",
    headers: {
      "Authorization": \`Bearer \${API_KEY}\`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(scorePayload)
  }
);

const scoreData = await response.json();
console.log(\`Score: \${scoreData.overall_score}/100\`);
console.log(\`Fit: \${scoreData.fit}\`);`}
                        </pre>
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              </div>
            </div>
          </div>
        </section>

        {/* Error Codes */}
        <section className="py-20 bg-muted/30">
          <div className="container mx-auto px-4 max-w-5xl">
            <h2 className="text-3xl font-bold mb-8">Error Codes</h2>
            
            <div className="space-y-4">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <Badge variant="destructive" className="text-base">400</Badge>
                    <div>
                      <h3 className="font-semibold mb-2">Bad Request</h3>
                      <p className="text-muted-foreground text-sm">
                        Invalid request format or missing required parameters. Check your request body and headers.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <Badge variant="destructive" className="text-base">401</Badge>
                    <div>
                      <h3 className="font-semibold mb-2">Unauthorized</h3>
                      <p className="text-muted-foreground text-sm">
                        Invalid or missing API key. Ensure your Authorization header is correct.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <Badge variant="destructive" className="text-base">413</Badge>
                    <div>
                      <h3 className="font-semibold mb-2">Payload Too Large</h3>
                      <p className="text-muted-foreground text-sm">
                        File size exceeds maximum allowed (10MB). Try compressing or splitting the file.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <Badge variant="destructive" className="text-base">422</Badge>
                    <div>
                      <h3 className="font-semibold mb-2">Unprocessable Entity</h3>
                      <p className="text-muted-foreground text-sm">
                        File format not supported or corrupted. Ensure the file is a valid PDF, DOCX, DOC, or TXT.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <Badge variant="destructive" className="text-base">429</Badge>
                    <div>
                      <h3 className="font-semibold mb-2">Too Many Requests</h3>
                      <p className="text-muted-foreground text-sm">
                        Rate limit exceeded. Check the Retry-After header and consider upgrading your plan.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <Badge variant="destructive" className="text-base">500</Badge>
                    <div>
                      <h3 className="font-semibold mb-2">Internal Server Error</h3>
                      <p className="text-muted-foreground text-sm">
                        Something went wrong on our end. Our team has been notified. Please try again or contact support.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Next Steps */}
        <section className="py-20">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Ready to Build?
            </h2>
            <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
              Check out our full API reference or explore more advanced use cases.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button variant="hero" size="lg">
                View Full API Reference
              </Button>
              <Button variant="outline" size="lg">
                Explore Examples
              </Button>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default DocsPage;
