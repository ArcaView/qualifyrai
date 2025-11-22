import { Navbar } from "@/components/Navbar";
import { Hero } from "@/components/Hero";
import { Features } from "@/components/Features";
import { HowItWorks } from "@/components/HowItWorks";
import { Footer } from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Quote } from "lucide-react";

const testimonials = [
  {
    quote: "Qualifyr.AI transformed our hiring process. We're now screening candidates 10x faster and finding better matches than ever before.",
    author: "Sarah Chen",
    role: "Head of Talent, TechFlow Inc.",
  },
  {
    quote: "The AI scoring is incredibly accurate and saves our team hours every week. We've cut our time-to-hire in half since implementing Qualifyr.AI.",
    author: "Michael Rodriguez",
    role: "VP of HR, GrowthCorp",
  },
  {
    quote: "As a recruiter, Qualifyr.AI gives me superpowers. I can handle 3x more roles while actually improving the quality of candidates I present.",
    author: "Emily Watson",
    role: "Senior Recruiter, HireScale",
  },
];

const HomePage = () => {
  return (
    <div className="min-h-screen">
      <Navbar />
      <Hero />
      <HowItWorks />
      <Features />

      <Footer />
    </div>
  );
};

export default HomePage;
