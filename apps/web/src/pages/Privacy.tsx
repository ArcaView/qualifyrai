import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const Privacy = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-4xl font-bold mb-8">Privacy Policy</h1>

            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Introduction</CardTitle>
              </CardHeader>
              <CardContent className="prose prose-slate dark:prose-invert max-w-none">
                <p className="text-muted-foreground">
                  This Privacy Policy will be updated to describe how Qualifyr.AI collects, uses, and protects your personal information.
                </p>
              </CardContent>
            </Card>

            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Information We Collect</CardTitle>
              </CardHeader>
              <CardContent className="prose prose-slate dark:prose-invert max-w-none">
                <p className="text-muted-foreground">
                  Details about the types of information we collect will be added here.
                </p>
              </CardContent>
            </Card>

            <Card className="mb-6">
              <CardHeader>
                <CardTitle>How We Use Your Information</CardTitle>
              </CardHeader>
              <CardContent className="prose prose-slate dark:prose-invert max-w-none">
                <p className="text-muted-foreground">
                  Information about how we use your data will be included here.
                </p>
              </CardContent>
            </Card>

            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Data Security</CardTitle>
              </CardHeader>
              <CardContent className="prose prose-slate dark:prose-invert max-w-none">
                <p className="text-muted-foreground">
                  Details about our security measures will be outlined here.
                </p>
              </CardContent>
            </Card>

            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Contact Us</CardTitle>
              </CardHeader>
              <CardContent className="prose prose-slate dark:prose-invert max-w-none">
                <p className="text-muted-foreground">
                  If you have any questions about this Privacy Policy, please contact us at{" "}
                  <a href="mailto:info@qualifyr.ai" className="text-primary hover:underline">
                    info@qualifyr.ai
                  </a>
                </p>
              </CardContent>
            </Card>

            <p className="text-sm text-muted-foreground text-center mt-8">
              Last updated: {new Date().toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Privacy;
