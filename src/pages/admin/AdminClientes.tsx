import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Search } from 'lucide-react';
import { format } from 'date-fns';

interface Profile {
  id: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  company: string | null;
  created_at: string;
}

export default function AdminClientes() {
  const navigate = useNavigate();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [filteredProfiles, setFilteredProfiles] = useState<Profile[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProfiles();
  }, []);

  useEffect(() => {
    if (search) {
      const filtered = profiles.filter(
        (p) =>
          p.first_name.toLowerCase().includes(search.toLowerCase()) ||
          p.last_name.toLowerCase().includes(search.toLowerCase()) ||
          (p.company && p.company.toLowerCase().includes(search.toLowerCase()))
      );
      setFilteredProfiles(filtered);
    } else {
      setFilteredProfiles(profiles);
    }
  }, [search, profiles]);

  const fetchProfiles = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProfiles(data || []);
      setFilteredProfiles(data || []);
    } catch (error) {
      console.error('Error fetching profiles:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[hsl(210_20%_98%)]">
      <header className="bg-background border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <Button variant="ghost" onClick={() => navigate('/admin')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar ao Dashboard
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground">Gerenciar Clientes</h1>
            <p className="text-muted-foreground mt-2">
              Visualize todos os clientes cadastrados no sistema
            </p>
          </div>

          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou empresa..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          ) : filteredProfiles.length === 0 ? (
            <Card className="p-12 text-center">
              <p className="text-muted-foreground">
                {search ? 'Nenhum cliente encontrado com esse critério.' : 'Nenhum cliente cadastrado ainda.'}
              </p>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredProfiles.map((profile) => (
                <Card key={profile.id} className="p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-foreground">
                        {profile.first_name} {profile.last_name}
                      </h3>
                      {profile.company && (
                        <p className="text-sm text-muted-foreground">{profile.company}</p>
                      )}
                      {profile.phone && (
                        <p className="text-sm text-muted-foreground">{profile.phone}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-2">
                        Cadastrado em {format(new Date(profile.created_at), 'dd/MM/yyyy')}
                      </p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
