import React, { useEffect, useState } from 'react';
import Navigation from '@/components/Navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, ArrowLeft, Sparkles, Crown, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';

interface PlanTier {
  id: string;
  name: string;
  display_name: string;
  price_cents: number;
  billing_period: string;
  credits_per_month: number;
  max_private_repos: number;
  max_projects: number;
  max_collab_rooms: number;
  features: string[];
}

const Pricing = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [plans, setPlans] = useState<PlanTier[]>([]);
  const [currentPlan, setCurrentPlan] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPlans();
  }, [user]);

  const fetchPlans = async () => {
    try {
      const { data: tiers } = await supabase
        .from('plan_tiers')
        .select('*')
        .eq('is_active', true)
        .order('price_cents', { ascending: true });

      if (tiers) setPlans(tiers as PlanTier[]);

      if (user) {
        const { data: sub } = await supabase
          .from('user_subscriptions')
          .select('plan_id, plan_tiers(name)')
          .eq('user_id', user.id)
          .single();
        if (sub) setCurrentPlan((sub as any).plan_tiers?.name || null);
      }
    } catch (error) {
      console.error('Error fetching plans:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPlan = async (plan: PlanTier) => {
    if (!user) {
      navigate('/auth');
      return;
    }

    if (plan.name === 'free') {
      toast({ title: "You're on the Free plan", description: 'This is your current plan.' });
      return;
    }

    // For paid plans, show coming soon until Stripe is set up
    toast({
      title: 'Stripe Payment Coming Soon',
      description: `${plan.display_name} plan at $${(plan.price_cents / 100).toFixed(0)}/mo will be available once payment is configured.`,
    });
  };

  const getPlanIcon = (name: string) => {
    switch (name) {
      case 'pro': return <Crown className="h-6 w-6 text-primary" />;
      case 'team': return <Sparkles className="h-6 w-6 text-primary" />;
      default: return <Zap className="h-6 w-6 text-muted-foreground" />;
    }
  };

  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center mb-12">
            <Button variant="ghost" onClick={() => navigate('/')} className="mb-6">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Button>
            <h1 className="text-4xl font-bold text-foreground mb-4">Choose Your Plan</h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Unlock AI coding credits, private repos, and more
            </p>
          </div>

          {loading ? (
            <div className="grid md:grid-cols-3 gap-8 mb-12">
              {[1, 2, 3].map((i) => (
                <Card key={i}><CardContent className="p-6"><Skeleton className="h-64 w-full" /></CardContent></Card>
              ))}
            </div>
          ) : (
            <div className="grid md:grid-cols-3 gap-8 mb-12">
              {plans.map((plan) => {
                const isCurrent = currentPlan === plan.name;
                const isPopular = plan.name === 'pro';
                return (
                  <Card
                    key={plan.id}
                    className={`relative ${isPopular ? 'border-primary shadow-lg scale-105' : 'border-border'}`}
                  >
                    {isPopular && (
                      <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                        <Badge className="bg-primary text-primary-foreground">Most Popular</Badge>
                      </div>
                    )}
                    <CardHeader>
                      <div className="flex items-center gap-3 mb-2">
                        {getPlanIcon(plan.name)}
                        <CardTitle className="text-2xl">{plan.display_name}</CardTitle>
                      </div>
                      <div className="mt-2">
                        <span className="text-4xl font-bold text-foreground">
                          ${(plan.price_cents / 100).toFixed(0)}
                        </span>
                        <span className="text-muted-foreground">/{plan.billing_period === 'monthly' ? 'mo' : plan.billing_period}</span>
                      </div>
                      <CardDescription className="mt-2">
                        {plan.credits_per_month} AI credits/month · {plan.max_projects === -1 ? 'Unlimited' : plan.max_projects} projects
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-3">
                        {(plan.features as string[]).map((feature, index) => (
                          <li key={index} className="flex items-center gap-2">
                            <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                            <span className="text-sm text-foreground">{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                    <CardFooter>
                      <Button
                        className="w-full"
                        variant={isPopular ? 'default' : 'outline'}
                        size="lg"
                        disabled={isCurrent}
                        onClick={() => handleSelectPlan(plan)}
                      >
                        {isCurrent ? 'Current Plan' : plan.price_cents === 0 ? 'Get Started' : 'Upgrade'}
                      </Button>
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          )}

          {/* FAQ */}
          <div className="max-w-3xl mx-auto mt-16">
            <h2 className="text-3xl font-bold text-center mb-8">Frequently Asked Questions</h2>
            <div className="space-y-6">
              {[
                { q: 'What are AI credits?', a: 'Each AI credit allows you to send one message to the Vibe Code AI assistant. Credits reset monthly based on your plan.' },
                { q: 'Can I switch plans later?', a: 'Yes! You can upgrade or downgrade your plan at any time. Changes will be reflected in your next billing cycle.' },
                { q: 'What about private repositories?', a: 'Free plans have public repositories only. Pro gets 10 private repos, and Team gets unlimited.' },
              ].map((faq, i) => (
                <div key={i} className="p-6 border border-border rounded-lg">
                  <h3 className="text-lg font-semibold mb-2">{faq.q}</h3>
                  <p className="text-muted-foreground">{faq.a}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Pricing;
