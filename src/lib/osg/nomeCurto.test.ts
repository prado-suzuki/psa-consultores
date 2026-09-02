import { describe, expect, it } from 'vitest';
import { nomesCurtos, primeiroNome } from '@/lib/osg/nomeCurto';

describe('nome curto para os quadros', () => {
  it('primeiro nome, em caixa de texto', () => {
    expect(primeiroNome('AVELINO NERI BOCOLLI')).toBe('Avelino');
    expect(primeiroNome('CRISTINA KIELBA BOCOLLI BORDIGNON')).toBe('Cristina');
    expect(primeiroNome('LUIS HENRIQUE DE OLIVEIRA FONSECA VILA')).toBe('Luis');
    // Já em caixa de texto continua igual, e espaço sobrando não vira parte.
    expect(primeiroNome('  Regina  Kielba ')).toBe('Regina');
  });

  it('acento e nome de uma palavra', () => {
    expect(primeiroNome('VITÉLIO COSTA BEBER')).toBe('Vitélio');
    expect(primeiroNome('MARIA')).toBe('Maria');
  });

  it('cresce SÓ quem colide, e pelo sobrenome — não pela partícula', () => {
    const curto = nomesCurtos([
      { id: 'a', nome: 'AVELINO NERI BOCOLLI' },
      { id: 'b', nome: 'AVELINO DE SOUZA COSTA' },
      { id: 'c', nome: 'CRISTINA KIELBA BOCOLLI' },
    ]);
    // Os dois Avelinos crescem: um pelo "Neri", o outro pelo "Souza" — o "de" não
    // conta, porque "Avelino de" não distinguiria nada.
    expect(curto.get('a')).toBe('Avelino Neri');
    expect(curto.get('b')).toBe('Avelino Souza');
    // Quem não colide fica com o primeiro nome.
    expect(curto.get('c')).toBe('Cristina');
  });

  it('cresce mais de uma vez quando o segundo nome também empata', () => {
    const curto = nomesCurtos([
      { id: 'a', nome: 'JOAO SILVA ALVES' },
      { id: 'b', nome: 'JOAO SILVA COSTA' },
      { id: 'c', nome: 'JOAO PEREIRA' },
    ]);
    expect(curto.get('a')).toBe('Joao Silva Alves');
    expect(curto.get('b')).toBe('Joao Silva Costa');
    expect(curto.get('c')).toBe('Joao Pereira');
  });

  it('homônimo verdadeiro chega ao nome completo e para', () => {
    // Duas PESSOAS diferentes com o mesmo nome inteiro é dado do cadastro. A chave é
    // o id, então as duas entradas existem; inventar "Maria (2)" esconderia que o
    // cadastro tem duas, e quem resolve isso é o cadastro.
    const curto = nomesCurtos([
      { id: 'p1', nome: 'MARIA SILVA' },
      { id: 'p2', nome: 'MARIA SILVA' },
    ]);
    expect(curto.size).toBe(2);
    expect(curto.get('p1')).toBe('Maria Silva');
    expect(curto.get('p2')).toBe('Maria Silva');
  });

  it('lista vazia e nome vazio não explodem', () => {
    expect(nomesCurtos([]).size).toBe(0);
    expect(primeiroNome('')).toBe('');
    expect(nomesCurtos([{ id: 'x', nome: '' }]).get('x')).toBe('');
  });
});
