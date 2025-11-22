import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useUser } from '@/contexts/UserContext';

interface UsageData {
  parses_used: number;
  scores_used: number;
  api_calls_made: number;
  period_start: string;
  period_end: string;
}

interface UsageLimits {
  max_parses: number;
  max_scores: number;
}

export function useUsage() {
  const { supabaseUser } = useUser();
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [limits, setLimits] = useState<UsageLimits | null>(null);
  const [loading, setLoading] = useState(false);

  /**
   * Get current month's usage statistics for the user
   */
  const getCurrentUsage = useCallback(async (): Promise<UsageData | null> => {
    if (!supabaseUser?.id) {
      return null;
    }

    try {
      const { data, error } = await supabase.rpc('get_current_usage', {
        p_user_id: supabaseUser.id
      });

      if (error) {
        console.error('Error fetching usage:', error);
        return null;
      }

      // Data comes back as an array, take first element
      const usageData = data?.[0] || {
        parses_used: 0,
        scores_used: 0,
        api_calls_made: 0,
        period_start: new Date().toISOString().split('T')[0],
        period_end: new Date().toISOString().split('T')[0]
      };

      setUsage(usageData);
      return usageData;
    } catch (error) {
      console.error('Error in getCurrentUsage:', error);
      return null;
    }
  }, [supabaseUser?.id]);

  /**
   * Get user's plan limits from subscription
   */
  const getPlanLimits = useCallback(async (): Promise<UsageLimits | null> => {
    if (!supabaseUser?.id) {
      return null;
    }

    try {
      // Get user's subscription and plan limits
      const { data, error } = await supabase
        .from('subscriptions')
        .select(`
          *,
          pricing_plans!inner (
            max_parses_per_month,
            max_scores_per_month
          )
        `)
        .eq('user_id', supabaseUser.id)
        .eq('status', 'active')
        .single();

      if (error || !data) {
        // User doesn't have an active subscription, use free tier limits
        const limitsData: UsageLimits = {
          max_parses: 10,
          max_scores: 10
        };
        setLimits(limitsData);
        return limitsData;
      }

      const limitsData: UsageLimits = {
        max_parses: data.pricing_plans.max_parses_per_month || 10,
        max_scores: data.pricing_plans.max_scores_per_month || 10
      };

      setLimits(limitsData);
      return limitsData;
    } catch (error) {
      console.error('Error in getPlanLimits:', error);
      // Return free tier defaults on error
      const defaultLimits: UsageLimits = {
        max_parses: 10,
        max_scores: 10
      };
      setLimits(defaultLimits);
      return defaultLimits;
    }
  }, [supabaseUser?.id]);

  /**
   * Load both usage and limits
   */
  const loadUsageData = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.all([
        getCurrentUsage(),
        getPlanLimits()
      ]);
    } finally {
      setLoading(false);
    }
  }, [getCurrentUsage, getPlanLimits]);

  /**
   * Increment parse usage counter
   */
  const incrementParseUsage = useCallback(async (count: number = 1): Promise<void> => {
    if (!supabaseUser?.id) {
      return;
    }

    try {
      const { error } = await supabase.rpc('increment_parse_usage', {
        p_user_id: supabaseUser.id,
        p_count: count
      });

      if (error) {
        console.error('Error incrementing parse usage:', error);
        return;
      }

      // Refresh usage data
      await getCurrentUsage();
    } catch (error) {
      console.error('Error in incrementParseUsage:', error);
    }
  }, [supabaseUser?.id, getCurrentUsage]);

  /**
   * Increment score usage counter
   */
  const incrementScoreUsage = useCallback(async (count: number = 1): Promise<void> => {
    if (!supabaseUser?.id) {
      return;
    }

    try {
      const { error } = await supabase.rpc('increment_score_usage', {
        p_user_id: supabaseUser.id,
        p_count: count
      });

      if (error) {
        console.error('Error incrementing score usage:', error);
        return;
      }

      // Refresh usage data
      await getCurrentUsage();
    } catch (error) {
      console.error('Error in incrementScoreUsage:', error);
    }
  }, [supabaseUser?.id, getCurrentUsage]);

  /**
   * Check if user can perform a parse operation (has quota remaining)
   */
  const canParse = useCallback((count: number = 1): boolean => {
    if (!usage || !limits) {
      return false;
    }
    return (usage.parses_used + count) <= limits.max_parses;
  }, [usage, limits]);

  /**
   * Check if user can perform a score operation (has quota remaining)
   */
  const canScore = useCallback((count: number = 1): boolean => {
    if (!usage || !limits) {
      return false;
    }
    return (usage.scores_used + count) <= limits.max_scores;
  }, [usage, limits]);

  /**
   * Get remaining quota for parses
   */
  const remainingParses = useCallback((): number => {
    if (!usage || !limits) {
      return 0;
    }
    return Math.max(0, limits.max_parses - usage.parses_used);
  }, [usage, limits]);

  /**
   * Get remaining quota for scores
   */
  const remainingScores = useCallback((): number => {
    if (!usage || !limits) {
      return 0;
    }
    return Math.max(0, limits.max_scores - usage.scores_used);
  }, [usage, limits]);

  return {
    usage,
    limits,
    loading,
    loadUsageData,
    getCurrentUsage,
    getPlanLimits,
    incrementParseUsage,
    incrementScoreUsage,
    canParse,
    canScore,
    remainingParses,
    remainingScores
  };
}
