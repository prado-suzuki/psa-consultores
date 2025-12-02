import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, ArrowLeft, Mail, Lock, Building2, ChevronRight } from 'lucide-react';
import logo from '@/assets/logo-psa.png';

const areas = [
  { id: 'digital', label: 'Digital' },
  { id: 'financeiro', label: 'Financeiro' },
  { id: 'operacional', label: 'Operacional' },
  { id: 'comercial', label: 'Comercial' },
];

const EquipeAuth = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedArea, setSelectedArea] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const { signIn, user, isTeamMember, isAdmin, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user && (isTeamMember || isAdmin)) {
      navigate('/equipe/dashboard');
    }
  }, [user, isTeamMember, isAdmin, loading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    const { error } = await signIn(email, password);
    
    if (!error) {
      // Navigation will happen automatically via useEffect
    }
    
    setIsLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <img src={logo} alt="PSA Consultores" className="h-16 mx-auto mb-4" />
          <div className="flex items-center justify-center gap-2 mb-2">
            <Users className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold text-white">Área da Equipe</h1>
          </div>
          <p className="text-gray-400">Sistema de Gestão de Demandas</p>
        </div>

        {!selectedArea ? (
          <Card className="bg-gray-900/50 border-gray-800 backdrop-blur-lg">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Building2 className="h-5 w-5 text-gray-400" />
                Selecione sua área
              </CardTitle>
              <CardDescription className="text-gray-400">
                Escolha a área de atuação antes de continuar
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Select value={selectedArea} onValueChange={setSelectedArea}>
                <SelectTrigger className="bg-gray-800/50 border-gray-700 text-white">
                  <SelectValue placeholder="Escolha sua área" />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  {areas.map((area) => (
                    <SelectItem 
                      key={area.id} 
                      value={area.id}
                      className="text-white hover:bg-gray-700 focus:bg-gray-700"
                    >
                      {area.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="pt-4 border-t border-gray-800">
                <Button 
                  variant="ghost" 
                  className="w-full text-gray-400 hover:text-white"
                  onClick={() => navigate('/')}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Voltar ao site
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-gray-900/50 border-gray-800 backdrop-blur-lg">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-white">Acesso Restrito</CardTitle>
                  <CardDescription className="text-gray-400">
                    Entre com suas credenciais de membro da equipe
                  </CardDescription>
                </div>
                <Badge area={selectedArea} />
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-gray-300">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="seu@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10 bg-gray-800/50 border-gray-700 text-white placeholder:text-gray-500"
                      required
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-gray-300">Senha</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                    <Input
                      id="password"
                      type="password"
                      placeholder="********"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10 bg-gray-800/50 border-gray-700 text-white placeholder:text-gray-500"
                      required
                    />
                  </div>
                </div>

                <Button 
                  type="submit" 
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                  disabled={isLoading}
                >
                  {isLoading ? 'Entrando...' : 'Entrar'}
                  {!isLoading && <ChevronRight className="h-4 w-4 ml-2" />}
                </Button>
              </form>

              <div className="mt-6 pt-4 border-t border-gray-800 space-y-2">
                <Button 
                  variant="ghost" 
                  className="w-full text-gray-400 hover:text-white"
                  onClick={() => setSelectedArea('')}
                >
                  <Building2 className="h-4 w-4 mr-2" />
                  Trocar área
                </Button>
                <Button 
                  variant="ghost" 
                  className="w-full text-gray-400 hover:text-white"
                  onClick={() => navigate('/')}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Voltar ao site
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

const Badge = ({ area }: { area: string }) => {
  const areaLabel = areas.find(a => a.id === area)?.label || area;
  return (
    <span className="px-3 py-1 bg-primary/20 text-primary text-sm rounded-full">
      {areaLabel}
    </span>
  );
};

export default EquipeAuth;