import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const Terms = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-4xl font-bold mb-8">Terms of Service</h1>

            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Acceptance of Terms</CardTitle>
              </CardHeader>
              <CardContent className="prose prose-slate dark:prose-invert max-w-none">
                <p className="text-muted-foreground">
                  By accessing and using Qualifyr.AI, you accept and agree to be bound by the terms and provision of this agreement.
                </p>
              </CardContent>
            </Card>

            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Use of Service</CardTitle>
              </CardHeader>
              <CardContent className="prose prose-slate dark:prose-invert max-w-none">
                <p className="text-muted-foreground">
                  Details about acceptable use of our service will be outlined here.
                </p>
              </CardContent>
            </Card>

            <Card className="mb-6">
              <CardHeader>
                <CardTitle>User Accounts</CardTitle>
              </CardHeader>
              <CardContent className="prose prose-slate dark:prose-invert max-w-none">
                <p className="text-muted-foreground">
                  Information about user account responsibilities and requirements will be included here.
                </p>
              </CardContent>
            </Card>

            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Payment Terms</CardTitle>
              </CardHeader>
              <CardContent className="prose prose-slate dark:prose-invert max-w-none">
                <p className="text-muted-foreground">
                  Subscription and payment terms will be detailed here.
                </p>
              </CardContent>
            </Card>

            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Limitation of Liability</CardTitle>
              </CardHeader>
              <CardContent className="prose prose-slate dark:prose-invert max-w-none">
                <p className="text-muted-foreground">
                  Our liability limitations will be outlined here.
                </p>
              </CardContent>
            </Card>

            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Contact Information</CardTitle>
              </CardHeader>
              <CardContent className="prose prose-slate dark:prose-invert max-w-none">
                <p className="text-muted-foreground">
                  For questions about these Terms of Service, please contact us at{" "}
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

export default Terms;
