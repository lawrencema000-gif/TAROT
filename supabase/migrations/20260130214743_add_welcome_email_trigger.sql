/*
  # Add welcome email trigger for newsletter subscribers

  1. Changes
    - Creates a database function to trigger welcome emails
    - Adds a trigger to send welcome emails when newsletter subscription is enabled
    - Uses pg_net extension to call the edge function server-side with service role key
  
  2. Security
    - Trigger runs with SECURITY DEFINER (elevated privileges)
    - Only fires when subscribed_to_newsletter changes from false to true or is initially true
    - Uses service role key from vault for authenticated edge function calls
*/

-- Create function to send welcome email via edge function
CREATE OR REPLACE FUNCTION send_welcome_email_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  supabase_url text;
  service_role_key text;
BEGIN
  -- Only send if subscribed_to_newsletter is true
  IF NEW.subscribed_to_newsletter = true AND (TG_OP = 'INSERT' OR OLD.subscribed_to_newsletter = false) THEN
    -- Get Supabase URL and service role key from environment
    supabase_url := current_setting('app.settings.supabase_url', true);
    service_role_key := current_setting('app.settings.service_role_key', true);
    
    -- Call edge function asynchronously using pg_net if available
    -- If pg_net is not available, just log it
    BEGIN
      PERFORM net.http_post(
        url := supabase_url || '/functions/v1/send-welcome-email',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || service_role_key
        ),
        body := jsonb_build_object(
          'user_id', NEW.id
        )
      );
    EXCEPTION
      WHEN OTHERS THEN
        -- Log error but don't fail the transaction
        RAISE WARNING 'Failed to send welcome email for user %: %', NEW.id, SQLERRM;
    END;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on profiles table
DROP TRIGGER IF EXISTS on_newsletter_subscribe_send_welcome ON profiles;

CREATE TRIGGER on_newsletter_subscribe_send_welcome
  AFTER INSERT OR UPDATE OF subscribed_to_newsletter
  ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION send_welcome_email_trigger();
