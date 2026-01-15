/*
  # Fix Function Search Path for calculate_user_level Overload

  ## Summary
  Fix the "Function Search Path Mutable" security warning for the
  calculate_user_level(integer, integer, integer) function overload.

  ## Changes
  - Add secure search_path to the three-parameter version of calculate_user_level
  - Set search_path to pg_catalog, public to prevent search path injection attacks
  - Keep function logic unchanged
*/

-- Recreate the function with secure search_path
CREATE OR REPLACE FUNCTION public.calculate_user_level(
  p_streak integer, 
  p_total_readings integer, 
  p_total_entries integer
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_points integer;
BEGIN
  v_points := (p_streak * 10) + (p_total_readings * 5) + (p_total_entries * 5);

  IF v_points >= 1000 THEN RETURN 10;
  ELSIF v_points >= 750 THEN RETURN 9;
  ELSIF v_points >= 500 THEN RETURN 8;
  ELSIF v_points >= 350 THEN RETURN 7;
  ELSIF v_points >= 250 THEN RETURN 6;
  ELSIF v_points >= 150 THEN RETURN 5;
  ELSIF v_points >= 100 THEN RETURN 4;
  ELSIF v_points >= 50 THEN RETURN 3;
  ELSIF v_points >= 20 THEN RETURN 2;
  ELSE RETURN 1;
  END IF;
END;
$$;
