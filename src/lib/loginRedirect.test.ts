import { describe, it, expect } from 'vitest';
import {
  resolveLoginPath,
  TEAM_LOGIN_PATH,
  CLIENT_LOGIN_PATH,
} from './loginRedirect';

describe('resolveLoginPath', () => {
  it('envia rotas da equipe para o login da equipe', () => {
    expect(resolveLoginPath('/equipe/digital')).toBe(TEAM_LOGIN_PATH);
    expect(resolveLoginPath('/equipe/digital/mapa/mt')).toBe(TEAM_LOGIN_PATH);
    expect(resolveLoginPath('/equipe/osg')).toBe(TEAM_LOGIN_PATH);
    expect(resolveLoginPath('/equipe/osg/work/documentos')).toBe(TEAM_LOGIN_PATH);
    expect(resolveLoginPath('/equipe/acessos')).toBe(TEAM_LOGIN_PATH);
  });

  it('trata a raiz /equipe como rota da equipe', () => {
    expect(resolveLoginPath('/equipe')).toBe(TEAM_LOGIN_PATH);
  });

  it('envia rotas do cliente para o login do cliente', () => {
    expect(resolveLoginPath('/cliente')).toBe(CLIENT_LOGIN_PATH);
    expect(resolveLoginPath('/cliente/chamados/123')).toBe(CLIENT_LOGIN_PATH);
  });

  it('usa o login do cliente como padrão para rotas fora da equipe', () => {
    expect(resolveLoginPath('/')).toBe(CLIENT_LOGIN_PATH);
    expect(resolveLoginPath('/novidades')).toBe(CLIENT_LOGIN_PATH);
  });

  it('não confunde prefixos parecidos com a área da equipe', () => {
    expect(resolveLoginPath('/equipeteste')).toBe(CLIENT_LOGIN_PATH);
  });
});
