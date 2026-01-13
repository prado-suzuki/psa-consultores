import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get the password from request body
    const { password } = await req.json();

    if (!password) {
      return new Response(
        JSON.stringify({ valid: false, error: "Password is required" }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // Get the stored password hash
    const { data: passwordData, error: dbError } = await supabase
      .from("gestao_area_password")
      .select("password_hash")
      .limit(1)
      .single();

    if (dbError || !passwordData) {
      // If no password is set, use a default password for initial setup
      // In production, this should be properly configured
      const defaultPassword = "gestao2024";
      
      if (password === defaultPassword) {
        return new Response(
          JSON.stringify({ valid: true }),
          { 
            status: 200, 
            headers: { ...corsHeaders, "Content-Type": "application/json" } 
          }
        );
      }
      
      return new Response(
        JSON.stringify({ valid: false }),
        { 
          status: 200, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // For now, we're doing a simple comparison
    // In production, you should use bcrypt or similar for password hashing
    // The stored hash should be created using the same method
    
    // Simple comparison for demo (replace with proper hash comparison in production)
    const storedHash = passwordData.password_hash;
    
    // Check if it's the placeholder hash (initial setup)
    if (storedHash === "$2a$10$defaulthashplaceholder") {
      // Allow default password during initial setup
      const defaultPassword = "gestao2024";
      const isValid = password === defaultPassword;
      
      return new Response(
        JSON.stringify({ valid: isValid }),
        { 
          status: 200, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // For proper implementation, use bcrypt comparison here
    // For now, simple string comparison (NOT RECOMMENDED FOR PRODUCTION)
    const isValid = password === storedHash;

    return new Response(
      JSON.stringify({ valid: isValid }),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ valid: false, error: "Internal server error" }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
