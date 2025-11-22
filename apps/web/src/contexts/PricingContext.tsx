import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';

export interface PricingPlan {
  id: string;
  name: string;
  slug: string;
  price_monthly: number;
  price_currency: string;
  description: string;
  features: string[];
  candidate_limit: number | null;
  api_requests_limit: number | null;
  is_active: boolean;
  is_popular: boolean;
  sort_order: number;
}

interface PricingContextType {
  plans: PricingPlan[];
  isLoading: boolean;
  error: string | null;
  refreshPlans: () => Promise<void>;
}

const PricingContext = createContext<PricingContextType | undefined>(undefined);

export const PricingProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [plans, setPlans] = useState<PricingPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshPlans = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('pricing_plans')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (fetchError) throw fetchError;

      setPlans(data || []);
    } catch (err: any) {
      setError(err.message);
      // TODO: Replace with proper error logging service (e.g., Sentry)
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshPlans();
  }, []);

  return (
    <PricingContext.Provider value={{ plans, isLoading, error, refreshPlans }}>
      {children}
    </PricingContext.Provider>
  );
};

export const usePricing = () => {
  const context = useContext(PricingContext);
  if (context === undefined) {
    throw new Error('usePricing must be used within a PricingProvider');
  }
  return context;
};
