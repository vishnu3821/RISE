-- Enable the pg_net extension to make HTTP requests from the database
CREATE EXTENSION IF NOT EXISTS "pg_net";

-- Create a secure function that the frontend can call to send emails
CREATE OR REPLACE FUNCTION public.send_email(
  target_email text,
  email_subject text,
  email_html text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with elevated privileges
AS $$
DECLARE
  resend_api_key text := 're_4r7NGSb1_BzHAtj8mW6L4DaB5TcJGQxjo';
  resend_from_email text := 'onboarding@resend.dev';
  request_body jsonb;
BEGIN
  -- Construct the JSON payload for Resend API
  -- Note: Since you are using the testing domain (onboarding@resend.dev), 
  -- Resend will ONLY allow you to send emails to the exact email address you verified on their dashboard!
  request_body := jsonb_build_object(
    'from', resend_from_email,
    'to', jsonb_build_array(target_email),
    'subject', email_subject,
    'html', email_html
  );

  -- Send the HTTP POST request asynchronously via pg_net
  PERFORM net.http_post(
    url := 'https://api.resend.com/emails',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || resend_api_key,
      'Content-Type', 'application/json'
    ),
    body := request_body
  );
END;
$$;

-- Grant execute permission to authenticated users so they can trigger emails
GRANT EXECUTE ON FUNCTION public.send_email(text, text, text) TO authenticated;
