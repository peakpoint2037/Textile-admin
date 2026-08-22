import { PageHeader } from '@/components/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { isSupabaseConfigured } from '@/lib/supabase';

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b py-3 text-sm last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

export function SettingsPage() {
  const { user } = useAuth();

  return (
    <div className="mx-auto max-w-xl">
      <PageHeader title="Settings" />

      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
        </CardHeader>
        <CardContent>
          <Row label="Name" value={user?.name} />
          <Row label="Email" value={user?.email} />
          <Row label="Role" value={<Badge variant="secondary">{user?.role}</Badge>} />
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Environment</CardTitle>
        </CardHeader>
        <CardContent>
          <Row label="API URL" value={import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api'} />
          <Row
            label="Authentication"
            value={
              isSupabaseConfigured ? (
                <Badge variant="success">Supabase</Badge>
              ) : (
                <Badge variant="outline">Developer token (local)</Badge>
              )
            }
          />
        </CardContent>
      </Card>
    </div>
  );
}
