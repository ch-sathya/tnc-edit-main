import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.56.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });
    
    // Use service role for credit operations to bypass RLS
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { messages, sessionId, model = "google/gemini-2.0-flash" } = await req.json();

    // Check user credits - auto-provision if not exists
    let { data: credits } = await adminClient
      .from("user_credits")
      .select("credits_remaining, credits_used")
      .eq("user_id", user.id)
      .single();

    if (!credits) {
      // Auto-provision credits for existing users
      const { data: newCredits, error: insertError } = await adminClient
        .from("user_credits")
        .insert({
          user_id: user.id,
          credits_remaining: 10,
          credits_used: 0,
        })
        .select("credits_remaining, credits_used")
        .single();

      if (insertError) {
        console.error("Failed to provision credits:", insertError);
        return new Response(JSON.stringify({ error: "Failed to initialize credits" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      credits = newCredits;
    }

    // Also auto-provision subscription if not exists
    const { data: existingSub } = await adminClient
      .from("user_subscriptions")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (!existingSub) {
      const { data: freePlan } = await adminClient
        .from("plan_tiers")
        .select("id")
        .eq("name", "free")
        .single();

      if (freePlan) {
        await adminClient.from("user_subscriptions").insert({
          user_id: user.id,
          plan_id: freePlan.id,
          status: "active",
        });
      }
    }

    if (credits.credits_remaining <= 0) {
      return new Response(JSON.stringify({ error: "No credits remaining. Please upgrade your plan." }), {
        status: 402,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      console.error("LOVABLE_API_KEY not found");
      return new Response(JSON.stringify({ error: "AI service not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const systemPrompt = `You are a helpful AI coding assistant for the Vibe Coding platform. You help developers write, debug, and understand code. You provide clear, concise, and accurate code suggestions. When writing code, always use best practices and modern patterns. Format code blocks with the appropriate language identifier.`;

    const aiMessages = [
      { role: "system", content: systemPrompt },
      ...messages.map((m: { role: string; content: string }) => ({
        role: m.role,
        content: m.content,
      })),
    ];

    console.log("Calling AI Gateway with model:", model);
    
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: aiMessages,
        max_tokens: 4096,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);
      return new Response(JSON.stringify({ error: "AI service error. Please try again." }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const assistantMessage = data.choices?.[0]?.message?.content || "No response generated.";
    const tokensUsed = data.usage?.total_tokens || 0;

    // Deduct credit and save chat history using admin client
    await Promise.all([
      adminClient
        .from("user_credits")
        .update({
          credits_remaining: credits.credits_remaining - 1,
          credits_used: credits.credits_used + 1,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id),
      adminClient.from("ai_chat_history").insert([
        {
          user_id: user.id,
          session_id: sessionId || crypto.randomUUID(),
          role: "user",
          content: messages[messages.length - 1].content,
          model,
          tokens_used: 0,
        },
        {
          user_id: user.id,
          session_id: sessionId || crypto.randomUUID(),
          role: "assistant",
          content: assistantMessage,
          model,
          tokens_used: tokensUsed,
        },
      ]),
    ]);

    return new Response(
      JSON.stringify({
        message: assistantMessage,
        credits_remaining: credits.credits_remaining - 1,
        tokens_used: tokensUsed,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
