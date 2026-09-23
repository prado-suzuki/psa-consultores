import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { PessoaRow } from '@/hooks/useQualificacaoDasPartes';
import type { AdministradorParaMapear, SocioParaMapear } from '@/lib/templates/mapeadores';
import { rotuloDoAdministrador } from '@/lib/osg/rotuloDoAdministrador';
import { ListaAdministradores } from './ListaAdministradores';

const pessoa = (id: string, denominacao: string, genero: string | null = 'M', tipo_pessoa = 'PF') =>
  ({ id, denominacao, genero, tipo_pessoa }) as unknown as PessoaRow;
const socio = (p: PessoaRow) => ({ pessoa: p, quotas: 10, vlr_total: 10, representante: null }) as SocioParaMapear;
const admin = (p: PessoaRow, cargo: string | null): AdministradorParaMapear => ({ pessoa: p, cargo });

const lucas = pessoa('lucas', 'Lucas Nogueira');
const marina = pessoa('marina', 'Marina Salgado', 'F');
const jatoba = pessoa('jatoba', 'Jatobá Sementes S.A.', null, 'PJ');

describe('rotuloDoAdministrador', () => {
  it('cargo de sócio de quem saiu do quadro vira administrador não sócio, concordado', () => {
    expect(rotuloDoAdministrador(admin(lucas, 'Sócio-Administrador'), [socio(jatoba)])).toBe('Administrador não sócio');
    expect(rotuloDoAdministrador(admin(marina, 'Sócio-Administrador'), [socio(jatoba)])).toBe('Administradora não sócia');
  });

  it('sócio no quadro e cargo que não fala de sócio ficam como no cadastro', () => {
    expect(rotuloDoAdministrador(admin(lucas, 'Sócio-Administrador'), [socio(lucas)])).toBe('Sócio-Administrador');
    expect(rotuloDoAdministrador(admin(lucas, 'Diretor'), [socio(jatoba)])).toBe('Diretor');
    expect(rotuloDoAdministrador(admin(lucas, null), [socio(lucas)])).toBe('');
  });
});

describe('ListaAdministradores', () => {
  it('após cessão total, os ex-sócios aparecem como administradores não sócios', () => {
    render(
      <ListaAdministradores
        administradores={[admin(lucas, 'Sócio-Administrador'), admin(marina, 'Sócio-Administrador')]}
        socios={[socio(jatoba)]}
      />,
    );
    expect(screen.queryByText('Sócio-Administrador')).not.toBeInTheDocument();
    expect(screen.getByText('Administrador não sócio')).toBeInTheDocument();
    expect(screen.getByText('Administradora não sócia')).toBeInTheDocument();
  });
});
