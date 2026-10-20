import { z } from "zod";
const dinheiro = z.number().finite().min(-1e16).max(1e16);
const dados = z
  .object({
    receita: dinheiro.nonnegative(),
    custos: dinheiro.nonnegative(),
    patrimonio: dinheiro,
    investimento: dinheiro.nonnegative(),
  })
  .strict();
export const companyDocumentSchema = z
  .object({
    version: z.literal(1),
    base: dados.nullable(),
    dados,
    nome: z.string().max(160),
    janela: z.number().int().min(2).max(4),
    horizonte: z.number().int().min(1).max(5).optional(),
    linhas: z
      .array(z.object({ ano: z.string().max(8), patrimonio: z.string().max(40) }).strict())
      .max(100),
    hipoteses: z
      .object({
        impostoPct: z.string().max(40),
        retencaoPct: z.string().max(40),
        retornoInvestimentoPct: z.string().max(40),
      })
      .strict(),
    // The market importer validates and recomputes clusters when restoring custom data.
    mercadoCompleto: z.string().max(5_000_000).nullable(),
    setor: z.string().max(500),
    demonstracao: z.boolean(),
  })
  .strict();
export type CompanyDocument = z.infer<typeof companyDocumentSchema>;
export type Account = { id: string; cnpj: string; nome: string };
export type SessionData = { account: Account; document: CompanyDocument | null; revision: number };
