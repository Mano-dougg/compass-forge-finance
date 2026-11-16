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
// Read-only compatibility for company documents saved before group ranking was removed.
const legacySawSchema = z
  .object({
    pesos: z
      .object({
        margem: z.number().finite().min(0).max(100),
        giro: z.number().finite().min(0).max(100),
        investimento: z.number().finite().min(0).max(100),
      })
      .strict(),
    metaInvestimentoPct: z.number().finite().min(0).max(1000),
    justificativa: z.string().max(2000),
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
    saw: legacySawSchema.optional(),
    // Read-only compatibility: validated legacy settings are discarded before use or saving.
    hipotesesAquisicao: z
      .object({
        multiploCompra: z.string().max(40),
        multiploRevenda: z.string().max(40),
        custoEntrada: z.string().max(40),
        custoSaida: z.string().max(40),
        taxaDescontoPct: z.string().max(40),
      })
      .strict()
      .optional(),
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
    planejamento: z
      .object({
        objetivo: z
          .object({
            patrimonioAlvo: dinheiro,
            anos: z.number().int().min(1).max(50),
            distribuicaoPct: z.number().finite().min(0).max(100),
            anoBase: z.number().int().min(1900).max(2200),
          })
          .strict(),
        manual: z
          .object({ receita: dinheiro.nonnegative(), custos: dinheiro.nonnegative() })
          .strict(),
        escolha: z.string().max(20).nullable(),
        assinatura: z.string().max(1_000_000),
        justificativa: z.string().max(2000),
      })
      .strict()
      .optional(),
  })
  .strict()
  .transform(({ hipotesesAquisicao: _legacy, ...document }) => document);
export type CompanyDocument = z.infer<typeof companyDocumentSchema>;
export type Account = { id: string; cnpj: string; nome: string };
export type SessionData = { account: Account; document: CompanyDocument | null; revision: number };
