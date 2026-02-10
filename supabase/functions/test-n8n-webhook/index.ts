import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { webhook_url } = await req.json();

    const payload = {
      event_type: "ticket_created",
      ticket_id: "test-123",
      ticket_title: "Teste de Notificação - PSA Consultores",
      ticket_department: "ICMS/IPI",
      recipient_email: "alexandre.silva@psaconsultores.com.br",
      recipient_name: "Alexandre Silva",
      actor_name: "Cliente Teste",
      message_preview: "",
      ticket_url: "https://psa-consultores.lovable.app/gestao/chamados/test-123"
    };

    console.log("Sending POST to n8n webhook:", webhook_url);
    console.log("Payload:", JSON.stringify(payload));

    const response = await fetch(webhook_url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const responseText = await response.text();
    console.log("n8n response status:", response.status);
    console.log("n8n response body:", responseText);

    return new Response(JSON.stringify({
      success: response.ok,
      status: response.status,
      response: responseText,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
