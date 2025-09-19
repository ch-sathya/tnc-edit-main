-- Create user connections/friends system
CREATE TABLE public.user_connections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  requester_id UUID NOT NULL,
  addressee_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'blocked')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Ensure no duplicate connections between same users
  UNIQUE(requester_id, addressee_id)
);

-- Enable Row Level Security
ALTER TABLE public.user_connections ENABLE ROW LEVEL SECURITY;

-- Create policies for user connections
CREATE POLICY "Users can view their own connection requests and accepted connections" 
ON public.user_connections 
FOR SELECT 
USING (
  requester_id = (SELECT user_id FROM profiles WHERE user_id = auth.uid()) OR 
  addressee_id = (SELECT user_id FROM profiles WHERE user_id = auth.uid()) OR
  status = 'accepted'
);

CREATE POLICY "Users can create connection requests" 
ON public.user_connections 
FOR INSERT 
WITH CHECK (requester_id = (SELECT user_id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can update their received connection requests" 
ON public.user_connections 
FOR UPDATE 
USING (addressee_id = (SELECT user_id FROM profiles WHERE user_id = auth.uid()));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_user_connections_updated_at
BEFORE UPDATE ON public.user_connections
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();