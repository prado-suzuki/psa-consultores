import { concordar, generoDeConcordancia } from '@/lib/templates/concordancia';
import type { AdministradorParaMapear, SocioParaMapear } from '@/lib/templates/mapeadores';

const normal = (t: string) =>
  t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLocaleLowerCase('pt-BR');

/**
 * Rótulo do administrador no painel, pelo quadro que a folha descreve. O cargo do
 * cadastro diz "Sócio-Administrador" mesmo depois de uma cessão total; fora do
 * quadro, a pessoa é administradora não sócia, como a folha a qualifica.
 */
export function rotuloDoAdministrador(admin: AdministradorParaMapear, socios: readonly SocioParaMapear[]): string {
  const cargo = admin.cargo?.trim() ?? '';
  const ehSocio = socios.some((s) => s.pessoa.id === admin.pessoa.id);
  if (ehSocio || (cargo && !/\bsoci[oa]\b/.test(normal(cargo)))) return cargo;
  const genero = generoDeConcordancia(admin.pessoa.genero === 'F' ? 'F' : null, admin.pessoa.tipo_pessoa);
  return concordar(genero, 'Administrador não sócio', 'Administradora não sócia');
}
