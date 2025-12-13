import { supabase } from './supabase';

// Cache to track if analytics function exists (to avoid repeated 404s)
// Use localStorage to persist across page refreshes
const ANALYTICS_FUNCTION_EXISTS_KEY = 'analytics_function_exists';

function getAnalyticsFunctionExists(): boolean | null {
  const stored = localStorage.getItem(ANALYTICS_FUNCTION_EXISTS_KEY);
  if (stored === null) {
    // Default to false (assume function doesn't exist) to prevent 404 errors
    // Only make the call if we've explicitly verified it exists
    return false;
  }
  return stored === 'true';
}

function setAnalyticsFunctionExists(exists: boolean) {
  localStorage.setItem(ANALYTICS_FUNCTION_EXISTS_KEY, exists.toString());
}

/**
 * Analytics event types
 */
export type AnalyticsEventType =
  | 'cv_parsed'
  | 'candidate_scored'
  | 'role_created'
  | 'role_updated'
  | 'role_deleted'
  | 'candidate_added'
  | 'candidate_status_changed'
  | 'interview_scheduled'
  | 'bulk_parse_started'
  | 'bulk_parse_completed'
  | 'api_key_generated'
  | 'subscription_created'
  | 'subscription_updated';

/**
 * Track an analytics event
 * @param eventType The type of event to track
 * @param metadata Optional metadata to store with the event
 */
export async function trackEvent(
  eventType: AnalyticsEventType,
  metadata?: Record<string, any>
): Promise<void> {
  // Skip if we know the function doesn't exist (prevents 404 errors in console)
  // Default behavior: assume function doesn't exist until proven otherwise
  const functionExists = getAnalyticsFunctionExists();
  if (functionExists === false) {
    return;
  }

  // If functionExists is true, we've verified it exists, so make the call
  // If functionExists is null (shouldn't happen with our default), also skip to be safe
  if (functionExists !== true) {
    return;
  }

  try {
    // Use getSession() for better performance (cached, faster)
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.user) {
      // Silently fail if no user - analytics is optional
      return;
    }

    const { error } = await supabase.rpc('log_analytics_event', {
      p_user_id: session.user.id,
      p_event_type: eventType,
      p_metadata: metadata || {}
    });

    if (error) {
      // Handle missing RPC function gracefully (404/PGRST202 errors)
      // This is expected if the analytics function hasn't been set up in the database
      if (error.code === 'PGRST202' || error.code === '42883' || error.message?.includes('Could not find the function')) {
        // Mark that the function doesn't exist to prevent future calls (persist in localStorage)
        setAnalyticsFunctionExists(false);
        return;
      }
      
      // Only log unexpected errors
      console.warn('Analytics tracking error (non-critical):', error.message || error.code);
    } else {
      // Function exists and call succeeded - ensure it's marked as existing
      setAnalyticsFunctionExists(true);
    }
  } catch (error: any) {
    // Handle missing RPC function in catch block too
    if (error?.code === 'PGRST202' || error?.code === '42883' || error?.message?.includes('Could not find the function')) {
      setAnalyticsFunctionExists(false);
      return;
    }
    
    // Silently fail - analytics is optional and shouldn't break the app
    // Only log if it's an unexpected error type
    if (error?.code !== 'PGRST202' && error?.code !== '42883') {
      console.warn('Analytics tracking failed (non-critical):', error?.message || error);
    }
  }
}

/**
 * Get event counts for a user within a date range
 * @param startDate Start of date range
 * @param endDate End of date range
 * @returns Event counts grouped by event type
 */
export async function getEventCounts(
  startDate: Date,
  endDate: Date
): Promise<Array<{ event_type: string; count: number }>> {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return [];
    }

    const { data, error } = await supabase.rpc('get_user_event_counts', {
      p_user_id: user.id,
      p_start_date: startDate.toISOString(),
      p_end_date: endDate.toISOString()
    });

    if (error) {
      console.error('Error getting event counts:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Failed to get event counts:', error);
    return [];
  }
}

/**
 * Get events over time for a specific event type
 * @param eventType The type of event to query
 * @param interval Time interval ('hour', 'day', 'week', 'month')
 * @returns Time series data for the event
 */
export async function getEventsOverTime(
  eventType: AnalyticsEventType,
  interval: 'hour' | 'day' | 'week' | 'month' = 'day'
): Promise<Array<{ time_bucket: string; count: number }>> {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return [];
    }

    const { data, error } = await supabase.rpc('get_events_over_time', {
      p_user_id: user.id,
      p_event_type: eventType,
      p_interval: interval
    });

    if (error) {
      console.error('Error getting events over time:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Failed to get events over time:', error);
    return [];
  }
}

/**
 * Get monthly API call count for the current user
 * @returns Monthly API call count
 */
export async function getMonthlyApiCalls(): Promise<number> {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return 0;
    }

    const { data, error } = await supabase.rpc('get_monthly_api_calls', {
      p_user_id: user.id
    });

    if (error) {
      console.error('Error getting monthly API calls:', error);
      return 0;
    }

    return data?.[0]?.api_calls_made || 0;
  } catch (error) {
    console.error('Failed to get monthly API calls:', error);
    return 0;
  }
}
