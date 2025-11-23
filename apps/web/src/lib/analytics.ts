import { supabase } from './supabase';

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
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      console.warn('Cannot track event: No authenticated user');
      return;
    }

    const { error } = await supabase.rpc('log_analytics_event', {
      p_user_id: user.id,
      p_event_type: eventType,
      p_metadata: metadata || {}
    });

    if (error) {
      console.error('Error tracking analytics event:', error);
    }
  } catch (error) {
    console.error('Failed to track analytics event:', error);
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
