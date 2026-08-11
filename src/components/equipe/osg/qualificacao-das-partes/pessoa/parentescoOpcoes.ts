/**
 * Vocabulário do vínculo de parentesco, num arquivo só porque duas telas o usam:
 * o campo único do cadastro novo (PessoaDadosTab) e a lista de vínculos da
 * pessoa já gravada (ParentescoPanel).
 *
 * `Pai` e `Mãe` entraram no lugar do antigo `Pai/Mãe` porque a filiação de
 * `pessoa` é projetada destes vínculos (migration 20260813120200) e um tipo
 * único não diz qual dos dois slots preencher. Vínculo legado gravado como
 * `Pai/Mãe` continua sendo lido (resolvido pelo gênero do parente), mas não é
 * mais oferecido para cadastro novo.
 */
export const TIPOS_PARENTESCO = [
  'Pai', 'Mãe', 'Filho(a)', 'Irmão(ã)', 'Avô(ó)', 'Neto(a)', 'Tio(a)', 'Sobrinho(a)',
  'Primo(a)', 'Sogro(a)', 'Genro/Nora', 'Cunhado(a)', 'Padrasto/Madrasta',
  'Enteado(a)', 'Outro',
];

export const NATUREZAS_PARENTESCO = ['Consanguíneo', 'Afim', 'Adotivo', 'Civil'];
