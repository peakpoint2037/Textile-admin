import * as React from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Shirt } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { isSupabaseConfigured } from '@/lib/supabase';

const passwordSchema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});
type PasswordForm = z.infer<typeof passwordSchema>;

function PasswordLoginForm() {
  const { loginWithPassword } = useAuth();
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<PasswordForm>({ resolver: zodResolver(passwordSchema) });

  async function onSubmit(values: PasswordForm) {
    try {
      await loginWithPassword(values.email, values.password);
      navigate('/dashboard');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Login failed');
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" autoComplete="email" {...register('email')} />
        {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="password">Password</Label>
        <Input id="password" type="password" autoComplete="current-password" {...register('password')} />
        {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
      </div>
      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? 'Signing in…' : 'Sign in'}
      </Button>
    </form>
  );
}

function DevTokenLoginForm() {
  const { loginWithToken } = useAuth();
  const navigate = useNavigate();
  const [token, setTokenValue] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token.trim()) return;
    setIsSubmitting(true);
    try {
      await loginWithToken(token.trim());
      navigate('/dashboard');
    } catch {
      toast.error('Could not sign in with that token');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="token">Developer token</Label>
        <Input
          id="token"
          placeholder="Paste the token from `npm run dev-token`"
          value={token}
          onChange={(e) => setTokenValue(e.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          No Supabase project is configured yet, so sign in with a token minted by running{' '}
          <code className="rounded bg-muted px-1 py-0.5">npm run dev-token</code> in the repo root.
        </p>
      </div>
      <Button type="submit" className="w-full" disabled={isSubmitting || !token.trim()}>
        {isSubmitting ? 'Signing in…' : 'Sign in'}
      </Button>
    </form>
  );
}

export function LoginPage() {
  const { status } = useAuth();

  if (status === 'authenticated') return <Navigate to="/dashboard" replace />;

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center text-center">
          <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Shirt className="h-5 w-5" />
          </div>
          <CardTitle className="text-base text-foreground">Textile Admin</CardTitle>
          <CardDescription>Sign in to manage products, orders and inventory.</CardDescription>
        </CardHeader>
        <CardContent>{isSupabaseConfigured ? <PasswordLoginForm /> : <DevTokenLoginForm />}</CardContent>
      </Card>
    </div>
  );
}
