# Compass Forge Finance

ATLAS.SAD: protótipo educacional de apoio à definição de metas anuais de receita e custos para buscar um patrimônio desejado. O gestor compara alternativas e escolhe o orçamento; o sistema não ordena opções por qualidade. O benchmark CVM 2026 é carregado automaticamente como contexto de comparação.

## Navegação e fluxo de planejamento

| Página                 | Caminho              | Conteúdo                                                                                                                              |
| ---------------------- | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Visão geral            | `/`                  | Patrimônio atual e objetivo, orçamento anual, síntese da trajetória, eficiência por R$ 100 de receita, investimento e gap estrutural. |
| Planejar metas         | `/simulador`         | Objetivo, prazo e distribuição; alternativas A/B/C; simulação manual e escolha justificada do gestor.                                 |
| Trajetória patrimonial | `/patrimonio-futuro` | Gráfico e tabela anual da referência sem mudanças e do orçamento escolhido.                                                           |
| Análise detalhada      | `/analise-detalhada` | Base recolhível, filtro setorial, mediana e quartis dos pares, gráficos por grupo e diagnóstico MQO.                                  |
| Relatórios             | `/relatorios`        | Revisão e PDF do objetivo, alternativas, escolha, premissas e trajetória em imagem.                                                   |

Comece com a empresa fictícia identificada ou use **Informar dados**. Informe patrimônio na data-base, receita e custos/despesas anuais e investimento para o benchmark. Em **Planejar metas**, confirme patrimônio desejado, ano-base, prazo e distribuição. Compare A (mantém custos), B (mantém receita) e C (mediana das proporções dos pares selecionados). Você pode manter o orçamento atual ou simular e escolher um orçamento próprio, mesmo que não atinja o alvo.

O plano usa orçamento anual constante. Com `S = R − C`, a distribuição é `D = max(S, 0) × d`, truncada para centavos; a retenção é `G = S − D`, e `P(t) = P0 + t × G`. O resultado simplificado não é lucro líquido completo. Distribuição padrão: 0%. Prejuízos reduzem integralmente o patrimônio. Investimento não participa dessas equações, nem há aportes ou crescimento composto. O limite operacional deste protótipo é de 1 a 50 anos, não uma garantia de precisão nesse horizonte.

A referência sem mudanças fica disponível; opções inviáveis matematicamente ou fora da precisão monetária recebem explicação. Metas já atingidas na data-base e distribuição de 100% são tratadas explicitamente. Alternativas coincidentes são reunidas. Se dados, objetivo, orçamento manual ou recorte mudarem, uma escolha anterior deixa de ser considerada confirmada até revisão. Um erro no orçamento manual não remove as alternativas válidas.

O estado compartilhado calcula as alternativas uma vez por mudança de entradas. A interface foi organizada por composição de componentes (resumo, editor, alternativas e elementos comuns), com inputs controlados, validação e feedback de rascunhos não aplicados. Os cálculos puros são compartilhados pelas telas e pelo relatório. A navegação da raiz mantém `codeSplitGroupings` de loader e componente. Os endereços antigos `/benchmarking`, `/#mercado` e `/#ordenacao-grupos` continuam levando à análise detalhada.

Login é opcional. Visitantes mantêm dados durante a navegação; recarregar reinicia a sessão. Contas autenticadas salvam os dados, objetivo, orçamento manual, escolha e justificativa no servidor. Documentos antigos continuam legíveis e seus campos históricos são preservados. Os antigos cenários temporais não definem as metas do novo fluxo. Não há persistência em `localStorage` ou `sessionStorage`.

## Benchmark padrão CVM 2026 (TTM)

O app inicia com [public/base-cvm-2026-b3.json](public/base-cvm-2026-b3.json), usando o **catálogo integral de 491 emissores** do repositório da pesquisa, em vez do recorte de 35 índices. A coleta incluiu **374 empresas**, distribuídas por **72 setores**, e documentou **117 exclusões** por ausência/incompatibilidade de demonstrações, receita ou PL não positivos ou custos incompatíveis. Cada CNPJ é contado uma vez; classes/tickers não duplicam uma companhia.

O catálogo local é idêntico ao [CSV upstream no commit de 19/06/2026](<https://github.com/Mano-dougg/metodos-estatisticos-scripts/blob/6b9d085d1e250a44b9c217264a523d92e4f04be6/empresas_br_acoes_b3(2).csv>). A base é o universo integral **desse catálogo**, com os emissores elegíveis; não é uma consulta atual à B3 nem todas as companhias abertas da CVM. Admissões, cancelamentos e revisões posteriores do catálogo não são verificados automaticamente. Origem, hash do catálogo, fontes CVM, contas e conciliação de cada parcela ficam registrados no snapshot.

Receita, custos e investimento cobrem **01/07/2025 a 30/06/2026**; o patrimônio é a posição de **30/06/2026**. O corte de setembro disponível na coleta tinha 103 empresas completas; junho tinha 374. A regra operacional escolhe o trimestre mais recente que cobre ao menos metade dos 491 emissores e pelo menos três empresas (mínimo 246 neste catálogo). Essa regra não comprova representatividade estatística e não apresenta dezembro de 2026 como exercício encerrado.

```text
Fluxo em 12 meses = DFP anual 2025 + ITR acumulado 01/01–30/06/2026
                                  − ITR acumulado 01/01–30/06/2025
Patrimônio = posição do ITR em 30/06/2026
```

Não há multiplicação do semestre por dois. As três parcelas usam o mesmo CNPJ e escopo (consolidado ou individual), última versão de cada documento e acumulados desde janeiro. A coleta incluiu 286 registros consolidados e 88 individuais. Não mistura trimestre isolado com semestre acumulado nem preenche ausências com zero. O catálogo completo ainda limita comparações por diferenças de setor e porte: os grupos gerais ficaram com 371, 1 e 2 empresas; use o recorte setorial e interprete os grupos pequenos com cautela. Não são rankings de qualidade.

```sh
# Universo padrão: catálogo integral (sem envio de dados a formulários):
python3 scripts/coletar-base-cvm.py --ano 2026 --ttm --universo b3 --cache-dir /tmp/cvm-zips --saida public/base-cvm-2026-b3.json
# Corte explícito, opcional:
python3 scripts/coletar-base-cvm.py --ano 2026 --ttm --universo b3 --data-referencia 2026-06-30 --cache-dir /tmp/cvm-zips --saida /tmp/base-cvm-2026-b3.json
# Amostra original para pesquisa, preservada como opção separada:
python3 scripts/coletar-base-cvm.py --ano 2026 --ttm --universo pesquisa --cache-dir /tmp/cvm-zips --saida /tmp/base-cvm-2026-pesquisa.json
```

O coletor usa apenas Python padrão e leitura de fontes públicas; não executa o envio a Google Forms existente no script de origem. `--universo b3` é o padrão do CLI; `--universo pesquisa` mantém o recorte original. O parser conserva as contas relevantes da versão mais recente sem armazenar todas as linhas dos demonstrativos em memória. O benchmark é escrito atomicamente apenas com cobertura suficiente, preservando um arquivo existente se a coleta falhar.

A [amostra anterior de 29 empresas entre 35](public/base-cvm-2026.json) permanece intacta e auditável. O novo snapshot bruto tem aproximadamente 1,2 MB; a base compacta persistida pelo app fica abaixo de 100 KB, dentro do limite de 5 MB. Telas e PDF usam as mesmas funções puras para treinar os grupos, calcular estatísticas e ajustar MQO.

Novas sessões usam a base ampla. Contas que preservavam exatamente o antigo padrão de 29 empresas são reconhecidas e migradas, mantendo os dados próprios e o setor; qualquer base customizada diferente é preservada. **Restaurar catálogo B3 2026** permite voltar explicitamente ao novo padrão. Sem conta, recarregar restaura a base padrão. O filtro setorial recalcula apenas as análises disponíveis: setores pequenos mantêm estatísticas e explicam agrupamento ou regressão indisponíveis. Não há atualização remota automática da CVM ou da listagem B3.

### Base anual CVM 2024 (histórica)

A base anterior permanece disponível para importação manual como referência histórica, sem ser o padrão inicial.

O arquivo [public/base-cvm-2024.json](public/base-cvm-2024.json) inclui **28 das 35 empresas** selecionadas na [pesquisa de origem](https://github.com/Mano-dougg/metodos-estatisticos-scripts). As sete exclusões e os motivos estão em `excluidas`; dados ausentes não são imputados como zero. A coleta usa DFP anual de janeiro a dezembro, exercício atual (`ÚLTIMO`), prioriza consolidado e aceita individual quando necessário, mantendo o mesmo escopo entre as contas de cada empresa.

As contas são convertidas para reais (`MIL × 1.000`; `UNIDADE × 1`): patrimônio em BPP `2.03` com fallback `2.04`, receita em DRE `3.01`, custos como `−(3.02 + 3.04)` e investimento como `max(0, −DFC 6.02)`, usando DFC indireta com fallback direta. Investimento significa **saída líquida de caixa de investimento**, não CAPEX bruto; o fluxo original fica no JSON. Esse zero para fluxo líquido positivo é uma transformação de sinal, não preenchimento de ausência.

Para reproduzir a coleta, use Python 3 com biblioteca padrão. O script apenas lê fontes públicas e grava o JSON local; **não envia dados ao Google Forms ou a outros formulários**. A origem registra URL, SHA-256 do ZIP e data da coleta. Atualizações da CVM podem alterar os resultados; forneça o mesmo ZIP para reproduzir o conteúdo financeiro.

```sh
python3 scripts/coletar-base-cvm.py --ano 2024 --universo pesquisa --saida public/base-cvm-2024.json
# Alternativa com o ZIP da CVM já baixado:
python3 scripts/coletar-base-cvm.py --ano 2024 --universo pesquisa --zip /caminho/dfp_cia_aberta_2024.zip --saida /tmp/base-cvm-2024.json
```

## Importar JSON próprio

Use o seletor de arquivo ou baixe o **exemplo fictício** disponível na interface ([public/base-mercado-exemplo.json](public/base-mercado-exemplo.json)); ele não representa empresas reais da B3. O formato mínimo é:

```json
{
  "fonte": "Exemplo fictício, sem vínculo com a B3",
  "setor": "Setor ilustrativo",
  "periodo": "2024 anual",
  "empresas": [
    {
      "empresa": "Fictícia A",
      "receita": 100000000,
      "custos": 82000000,
      "patrimonio": 150000000,
      "investimento": 4000000
    },
    {
      "empresa": "Fictícia B",
      "receita": 400000000,
      "custos": 300000000,
      "patrimonio": 210000000,
      "investimento": 48000000
    },
    {
      "empresa": "Fictícia C",
      "receita": 650000000,
      "custos": 455000000,
      "patrimonio": 590000000,
      "investimento": 130000000
    }
  ]
}
```

Informe entre 3 e 5.000 empresas e até 5 MB, identificadores únicos e ao menos três perfis financeiros distintos. Os valores devem ser números finitos em reais; receita e patrimônio positivos, custos e investimento não negativos. `setor` por empresa é opcional e habilita os filtros. Mantenha período e critérios contábeis comparáveis; a validação de formato não comprova a origem declarada. Uma importação ou filtro inválido mantém a referência anterior.

## Trajetória patrimonial do orçamento escolhido

O ano-base padrão é 2026 e o primeiro ano simulado é 2027. O usuário pode ajustar a data-base e o prazo. O gráfico compara o orçamento atual e o escolhido com o patrimônio desejado; a tabela expõe os valores anuais completos, incluindo perdas e eventual excedente monetário. Trata-se de um cenário condicional nominal, sem estimativa de demanda, intervalo de confiança ou promessa de realização.

O modelo atual não soma uma tendência histórica aos resultados anuais. Os módulos de média móvel/histórico da versão anterior permanecem no repositório para compatibilidade e pesquisa, mas não participam do fluxo de metas nem do novo PDF.

### Coleta histórica CVM opcional

O script também pode obter séries anuais de PL das empresas da amostra para pesquisa, mantendo consolidado e individual separados, valores com sinal (inclusive zero e negativos), posição de 31/12 e última versão disponível por ano. Usa BPP `2.03` com fallback `2.04`, converte para reais e não preenche ausências. Essas revisões são as disponíveis na coleta, sem garantir o que era conhecido em cada data passada. A leitura é pública e não envia formulários; o cache guarda os ZIPs localmente.

```sh
python3 scripts/coletar-base-cvm.py --historico --universo pesquisa --inicio 2021 --fim 2025 --cache-dir /tmp/cvm-zips --saida /tmp/historico-cvm.json
```

Esse arquivo é um artefato opcional de pesquisa, separado do JSON de benchmarking; não é carregado como histórico próprio pela interface. A coleta verificada foi exportada apenas em `/tmp`, sem distribuir dados CVM como se fossem da empresa do usuário.

## Método e limites

- K-Means determinístico com três grupos, ordenação por empresa, sementes mais distantes e até 200 iterações. Treino e classificação usam patrimônio, receita, custos assinados e fluxo líquido de investimento, padronizados por Z-score. Médias e desvios da amostra de treino são reutilizados na classificação; variável constante produz coordenada zero. O custo entra negativo; investimento usa `fluxoInvestimentoOriginal` quando disponível, ou `−investimento` quando só há a magnitude de saída. A empresa diagnosticada não participa do treino.
- Conservador, Expansionista e Gigante setorial são nomes descritivos atribuídos por porte médio de receita, seguindo a terminologia do trabalho. Não representam ranking de qualidade ou risco. Os centroides são reestimados para a amostra selecionada; não há reprodução dos membros, médias ou resultados publicados para as 28 empresas originais.
- Benchmarks financeiros são médias exatas dos membros; dispersão usa desvio padrão populacional. Desvio padronizado com dispersão zero fica indisponível. P25 e mediana usam as proporções individuais de custos/receita do grupo, com quantil por interpolação linear na posição `(n−1)p`. A antiga meta de investimento baseada nas empresas de maior receita foi removida. As proporções por grupo são comparações descritivas; a opção C do plano usa a mediana de toda a seleção, não apenas do cluster. Não são geradas metas de investimento.
- Os tetos do simulador legado não limitam as novas alternativas de planejamento. Receita e custos são decisões distintas: Pearson não é uma inclinação causal. A antiga equação fictícia de patrimônio foi removida. A regressão MQO `PL = b0 + b1 receita + b2 custos assinados + b3 fluxo líquido de investimento` é reestimada ao mudar a amostra, usando QR com preditores centrados/padronizados. Requer pelo menos cinco empresas e posto completo. Base insuficiente, variável constante ou dependência linear deixam o gap indisponível, sem coeficientes artificiais. R², R² ajustado e erro residual são estimados na amostra atual; R² não é precisão fora da amostra ou garantia futura. Os parâmetros do PDF não são copiados.
- Amostras setoriais pequenas e clusters com apenas um membro são exploratórios: dispersão zero não prova estabilidade. Perfis e posição estrutural não constituem avaliação validada de risco de crédito nem previsão temporal validada.

Telas e PDF de planejamento compartilham `planejamento-metas`; os diagnósticos usam os módulos puros de padronização, clusters e regressão. Na página **Relatórios**, use **Exportar plano em PDF** e escolha **Salvar como PDF**. A janela abre durante o clique; o gráfico é capturado em PNG e a impressão espera sua decodificação. Se a captura falhar, a janela explica como tentar novamente e mantém a tabela anual.

Esta extensão preserva o sistema visual existente: IBM Plex Sans/Mono, superfícies `surface`/`surface-2`, bordas e cores dos tokens de [src/styles.css](src/styles.css). Os controles de base e a previsão própria reutilizam esses tokens e o componente Button; não há mudança de identidade visual. A rota de diagnóstico mantém o agrupamento de loader e componente para evitar regressão no carregamento do chunk. O shell e os componentes foram extraídos sem mudar o sistema visual; `src/routeTree.gen.ts` é gerado automaticamente pelo roteador.

## Validação local

Use Node.js **22.18+ ou 24** para `npm test` (remoção nativa de tipos TypeScript). Com as dependências instaladas:

```sh
npm test
python3 -m unittest discover -s scripts -p 'test_*.py'
npx tsc --noEmit
npm run lint
npm run build
```

Os testes TypeScript incluem os 16 casos documentais de metas, tratamento de perdas/distribuição, centavos e opções coincidentes, independência do investimento, assinatura das premissas, falhas isoladas de precisão, HTML seguro do relatório, setores pequenos e persistência retrocompatível. Os testes históricos continuam executando para detectar regressões nos módulos preservados. As verificações de navegador desta implementação estão registradas separadamente; esses testes não validam a realização econômica das metas.

## Requisitos iniciais (histórico)

quero construir um app com base num documento de requisitos, de inicio quero apenas a página principal, com um modal pra botar os dados da empresa e depois exibir a classificação e ter linhas com um botao pra rolar esses dados pra direita pra aumentar e rolar pra esquerda pra diminuir um dos dados da empresa, e gerar a previsão dos outros com base numa formula mockada.
Documento de Requisitos: Sistema de Apoio à Decisão Financeira (SAD)

1. Visão Geral do Produto

Plataforma web analítica focada em inteligência de negócios e planejamento financeiro. O sistema utiliza modelagem estatística (Regressão Múltipla e Clusters) baseada em dados reais da B3 para diagnosticar o perfil operacional de uma empresa e simular cenários de crescimento seguro.

2. Perfis de Usuário

Gestor Financeiro / CFO: Utiliza o sistema para validar o planejamento orçamentário anual.

Consultor Empresarial: Utiliza o sistema para rodar diagnósticos em clientes e exportar relatórios de auditoria/planejamento (caso de uso ideal para a sua empresa júnior).

3. Requisitos Funcionais (RF)

O que o sistema faz.

RF01 - Entrada de Dados: O sistema deve fornecer um formulário para o usuário inserir os valores de Receita Líquida, Custos e Despesas, Patrimônio Líquido atual e Fluxo de Investimento.

RF02 - Motor de Diagnóstico: O sistema deve calcular a distância dos dados inseridos em relação aos centroides da B3 e classificar a empresa em um dos perfis de operação (ex: Conservador, Expansionista, etc.).

RF03 - Dashboard Interativo: O sistema deve renderizar gráficos em tempo real (barras e dispersão) comparando os dados do usuário com as médias do seu grupo (cluster).

RF04 - Simulador de Cenários: O painel deve possuir controles deslizantes (sliders) ou campos numéricos para o usuário alterar projeções de Receita e Investimentos para o próximo ano.

RF05 - Cálculo Preditivo: O sistema deve rodar a equação de regressão linear em tempo real e atualizar a projeção do Patrimônio Líquido no painel sempre que um cenário for alterado.

RF06 - Exportação: O sistema deve ter um botão "Exportar Relatório", gerando um arquivo PDF formatado contendo o diagnóstico atual, os cenários simulados e as recomendações estratégicas.

4. Requisitos Não Funcionais (RNF)

Como o sistema será construído e seu desempenho.

RNF01 - Stack Tecnológico: Recomenda-se a construção do front-end em um ecossistema TypeScript/JavaScript, utilizando um framework moderno como Next.js. Isso garante rotas rápidas, boa componentização para os gráficos e facilidade para gerar o PDF no lado do servidor ou cliente.

RNF02 - Responsividade: A interface deve adaptar a visualização dos gráficos para monitores desktop e tablets, já que são os dispositivos mais usados em mesas de reunião financeira.

RNF03 - Tratamento de Erros: O sistema deve possuir tratamento robusto de exceções (evitando telas em branco ou quebras repentinas por falhas de conexão de rede ou erros internos de servidor) caso consuma alguma API externa.

5. Regras de Negócio (RN)

As leis do sistema baseadas na sua pesquisa.

RN01 (revisada após leitura do trabalho) - Ajustes independentes: alterar receita não modifica custos automaticamente. A correlação de Pearson não estima a variação causal de custos nem sustenta uma trava de multicolinearidade.

RN02 (revisada) - Limite numérico: a simulação utiliza o maior valor entre os limites demonstrativos e máximos observados da base. Não corresponde às cercas de Box Plot do estudo.

RN03 - Termo de Confiança: apresentar o ajuste MQO na amostra atual sem tratá-lo como previsão temporal ou precisão validada fora da amostra. O gap não demonstra suficiência de capital; metas não garantem competitividade.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/5fe30607-efd1-4ec6-a17e-9565c5bcf0c2).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

## Contas por CNPJ e persistência

As páginas `/login` e `/cadastro` usam CNPJ e senha (10–128 caracteres). O cadastro inclui razão social. A validação aceita CNPJ numérico e alfanumérico, com verificação dos dois dígitos conforme o [manual da Receita Federal](https://www.gov.br/receitafederal/pt-br/centrais-de-conteudo/publicacoes/documentos-tecnicos/cnpj/manual-dv-cnpj.pdf). Validar os dígitos não consulta a situação cadastral nem verifica a titularidade da empresa.

As páginas financeiras são públicas: visitantes podem informar os dados, comparar, simular e exportar relatórios sem conta. No modo visitante, os dados ficam somente em memória durante a sessão e não são enviados à API de salvamento. Entrar/cadastrar é opcional e habilita a recuperação e persistência no servidor. Navegar até o login/cadastro e voltar preserva o rascunho visitante. Uma conta sem documento salvo aproveita esse rascunho; uma conta com dados salvos carrega os dados da própria empresa. Sair limpa os dados da conta da tela e retorna ao modo visitante. Falha na infraestrutura de contas não bloqueia as ferramentas públicas. O servidor identifica a empresa pela sessão, nunca por um identificador enviado no documento financeiro. Os dados atuais, cenário, histórico, hipóteses, janela da média móvel e base/setor de benchmarking são salvos automaticamente após 700 ms sem alterações. O cabeçalho mostra o estado do salvamento; falhas mantêm o conteúdo em memória e permitem nova tentativa. O botão Sair aguarda o salvamento. Fechar/recarregar com alterações pendentes aciona o aviso nativo do navegador. Uma troca de conta em outra aba também bloqueia a gravação com a identidade anterior. Ao detectar alteração em outra aba, o servidor devolve conflito e exige recarregar em vez de sobrescrever silenciosamente.

### Desenvolvimento

`npm run dev` usa SQLite em `.data/atlas.sqlite`, criado automaticamente pela migração `migrations/0001_accounts.sql`. É armazenamento real no servidor e sobrevive a reiniciar o Vite. `.data/` é ignorado pelo Git. Use Node 24 ou versão com `node:sqlite`. O banco local é separado do banco publicado; contas de desenvolvimento não são copiadas automaticamente.

### Produção no Cloudflare

O build atual usa um Worker Cloudflare. Configure um banco [D1](https://developers.cloudflare.com/d1/get-started/) com binding **ATLAS_DB** e aplique as migrações. Sem esse binding, a API devolve 503 explicando que falta o banco, sem simular autenticação ou salvar dados no navegador.

Para publicação própria, com acesso à conta Cloudflare:

```sh
npx wrangler login
npx wrangler d1 create atlas-finance
npm run build
npm run db:configure -- <database_id_retornado_pelo_comando_create>
npm run db:migrate:remote
npx wrangler deploy --config .output/server/wrangler.json
```

Execute `db:configure` a cada novo build, pois Nitro regenera o arquivo de publicação. Os comandos de migração e publicação remotas só devem ser executados na conta/banco do ambiente correto. No Lovable, a integração de infraestrutura precisa disponibilizar o mesmo binding `ATLAS_DB` ao Worker e executar a migração; a interface do aplicativo, sozinha, não provisiona um banco na conta de hospedagem.

Para testar o Worker e o D1 **locais**, após o build (o estado fica em `.wrangler/atlas`, separado de `.output`):

```sh
npm run db:configure -- --local
npm run db:migrate:local
npm run preview:accounts -- --port 4175
```

### Segurança e limites

Senhas são derivadas com PBKDF2-SHA256, sal aleatório de 256 bits e 100.000 iterações ([limite atual da implementação Web Crypto do Cloudflare](https://github.com/cloudflare/workerd/issues/1346)). Sessões de sete dias usam token aleatório de 256 bits, cujo hash é guardado no banco, e cookie `HttpOnly`, `SameSite=Lax`, `Secure` em HTTPS. Sair revoga a sessão. A API limita tentativas por CNPJ e IP, verifica a origem das operações de escrita, valida os documentos e limita o tamanho da requisição. Em produção, use HTTPS e mantenha o banco com acesso restrito ao Worker. Recuperação de senha e comprovação de titularidade do CNPJ ainda não fazem parte deste fluxo.

`npm test` inclui casos de cadastro, autenticação, CNPJ alfanumérico, isolamento entre empresas, conflitos de versão, sessão expirada/revogada e limite de tentativas.

## Organização do protótipo e especificação

A síntese fica na principal; as análises detalhadas ficam separadas. Os gráficos mantêm as cores, fontes e superfícies das telas anteriores. O menu em telas pequenas rola horizontalmente para preservar espaço de leitura. Login e cadastro usam os formulários existentes; a conta é necessária somente para salvar e recuperar dados automaticamente.

A especificação está nos documentos locais [Word](docs/planejamento/especificacao-modelo-metas.docx) e [PDF](docs/planejamento/especificacao-modelo-metas.pdf), produzidos antes da implementação. Inclui fontes, funções analíticas, equações, alternativas, critérios, casos especiais e validações propostas. O [design do protótipo](docs/planejamento/design-prototipo-metas.md) registra a adaptação das telas. Esses documentos de planejamento não substituem a demonstração ou o trabalho acadêmico final, que será produzido separadamente.

Uma cópia versionada dos 16 casos fictícios está em [src/lib/fixtures/metas-referencia.json](src/lib/fixtures/metas-referencia.json), executada contra o motor em `npm test`. Sumarização alimenta C; K-Means e regressão oferecem contexto no benchmark. A interface distingue a proporção da seleção inteira das médias por grupo. Não há score de qualidade, ordenação de grupos ou recomendação de compra/revenda.

Para regenerar o Word: `uv run --with python-docx python docs/planejamento/gerar_especificacao.py`. Para PDF: `libreoffice --headless --convert-to pdf --outdir docs/planejamento docs/planejamento/especificacao-modelo-metas.docx`. A pasta `docs` mantém a exclusão de Git existente; os documentos acadêmicos são locais.

## Documento para justificar o sistema no trabalho

A justificativa acadêmica foi organizada separadamente em [Word editável](docs/fundamentacao/fundamentacao-teorica-sad.docx) e [PDF](docs/fundamentacao/fundamentacao-teorica-sad.pdf). O documento reúne definições das quatro variáveis, K-Means/Z-score, regressão e gap, indicadores e quartis, projeção temporal, fontes e limites de validação. Não integra as telas ou o relatório executivo do aplicativo. O Word e o PDF foram regenerados para registrar o escopo educacional e a proposta de geração de metas anuais constantes. As demais seções registram a versão anterior e devem ser conciliadas com o protótipo de metas antes de compor o trabalho final; a presença desses documentos não comprova validação preditiva.

A versão pode ser regenerada com `uv run --with python-docx python docs/fundamentacao/gerar_documento.py`. A pasta `docs` segue a exclusão do Git já existente no projeto; os arquivos são documentos locais. Para PDF, use `libreoffice --headless --convert-to pdf --outdir docs/fundamentacao docs/fundamentacao/fundamentacao-teorica-sad.docx`.

## Trabalho acadêmico de origem: variáveis e resultados

O documento fornecido pelo autor, [Trabalho metodos.pdf](<Trabalho metodos.pdf>), é a referência local para o estudo original. A numeração abaixo corresponde às páginas físicas do PDF (51 páginas). O trabalho serve como fonte das definições e dos resultados reportados; suas citações bibliográficas não foram verificadas nas edições originais dos livros e seus resultados não foram reestimados a partir do PDF.

| Elemento                                     | Localização no trabalho                                            | Relação com o sistema                                                                                                                                                                                                                                                                                         |
| -------------------------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Patrimônio líquido                           | §2.1 e Quadro 1, pp. 3–4; Assaf Neto citado no trabalho            | Estoque contábil na data de referência; não somar patrimônios dos últimos 12 meses nem tratá-lo automaticamente como preço de mercado.                                                                                                                                                                        |
| Receita líquida                              | §2.1 e Quadro 1, pp. 3–4; Iudícibus citado no trabalho             | Fluxo de receita no período, depois das deduções pertinentes.                                                                                                                                                                                                                                                 |
| Custos e despesas                            | §2.1 e Quadro 1, pp. 3–4; Assaf Neto citado no trabalho            | O estudo conserva sinais contábeis negativos. A interface e a base atual usam magnitudes positivas de custos e despesas; a mudança de sinal deve ser considerada na interpretação das associações.                                                                                                            |
| Caixa líquido das atividades de investimento | §2.1 e Quadro 1, pp. 3–4; Gitman citado no trabalho                | A base mantém a magnitude `max(0, -fluxo líquido)` para comparações de saída de caixa e preserva o campo assinado original para K-Means e MQO. Entradas manuais sem campo assinado usam a saída com sinal negativo. Nenhum desses campos equivale automaticamente a CAPEX bruto.                              |
| K-Means e distância euclidiana               | §3.3.2, pp. 19–20; §4.2, pp. 26–30; Hair et al. citado no trabalho | O estudo relata K=3, quatro variáveis contábeis e padronização Z-score. O algoritmo foi alinhado às quatro variáveis e ao Z-score, com distância euclidiana e centróides como médias aritméticas. Os grupos são reestimados na base atual; não reproduzem necessariamente os membros e centroides publicados. |
| Pearson `r = −0,9629`                        | Tabela 5, p. 31; interpretação na p. 32                            | Resultado reportado para receita e custos com sinal negativo na amostra saneada de 28 empresas. Não é coeficiente de reajuste de custos nem resultado recalculado para a base CVM 2026 do app.                                                                                                                |
| Regressão múltipla e `R² = 0,5130`           | Tabelas 6–7, pp. 35–37; Gujarati e Porter citado no trabalho       | Resultados reportados para a amostra original. O app usa o mesmo tipo de MQO, com coeficientes e R² reestimados na amostra selecionada. Não copia os coeficientes publicados nem utiliza 0,5130 como precisão das projeções temporais.                                                                        |

### Limites de transferência dos resultados

- O trabalho parte de 35 observações e descreve saneamento para 28 empresas. Seus grupos multidimensionais têm 18 Conservadores, 8 Expansionistas e 2 Gigantes Setoriais. A base padrão do aplicativo tem outro período/recorte, 29 empresas e grupos recalculados. Não copiar médias, centroides, correlações, R² ou coeficientes como se tivessem sido estimados para a base atual.
- O estudo inclui patrimônios negativos nos agrupamentos unidimensionais. O importador atual exige patrimônio e receita positivos. Essa diferença de elegibilidade afeta o suporte a empresas em dificuldade e deve ser resolvida explicitamente antes de alegar reprodução do estudo.
- A Tabela 7 informa intercepto 209,71; coeficiente de receita 0,3216; custos −0,0000 (arredondado); investimento −0,1338. Antes de qualquer uso operacional, conferir a unidade do intercepto, as saídas originais da regressão e a precisão não arredondada dos parâmetros. O documento também reporta multicolinearidade e valores-p individuais elevados; esses coeficientes não demonstram efeitos causais isolados.
- A relação negativa receita/custos do estudo reflete a convenção de custos negativos. Se `C_magnitude = −C_contábil`, então `corr(R, C_magnitude) = −corr(R, C_contábil)`, para a mesma amostra. Isso não sustenta interpretar aumento da receita como redução da magnitude de custos, nem usar `|r|` como uma inclinação estimada.
- A antiga fórmula fictícia de patrimônio foi removida e substituída pelo ajuste MQO descrito acima. O PL informado do cenário não é variável explicativa: alterar somente esse PL muda o gap, sem realimentar o modelo. Esse ajuste é uma associação transversal, não uma previsão futura nem uma regra de capital mínimo.
- O estudo é transversal, de um exercício. As projeções temporais de 2027–2031 são extensões do aplicativo; exigem fundamentação e hipóteses próprias e não herdam a validação da regressão transversal.
- Há conferências editoriais pendentes: Iudícibus (2017) é citado no Quadro 1 mas não aparece na lista final de referências; Gitman (2010) e Assaf Neto (2021) do quadro divergem das entradas/anos da bibliografia. Na definição do K-Means, o centróide é a média aritmética dos vetores, apesar da expressão “média geométrica” na p. 20. A definição de fluxo líquido de investimento não implica que um saldo positivo seja necessariamente irregular; a exclusão desse saldo é um recorte do estudo, não uma obrigação contábil geral.

Essa rastreabilidade vincula as variáveis e resultados ao material fornecido sem atribuir às hipóteses do aplicativo uma validação teórica, normativa ou empírica que ainda não foi demonstrada.

### Fórmulas derivadas e hipóteses que continuam próprias do aplicativo

| Cálculo                            | Definição e status                                                                                                                                                                                                |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Margem após custos informados      | `(receita − custos)/receita`; identidade operacional, não margem líquida contábil completa nem caixa disponível.                                                                                                  |
| Cobertura de custos                | `receita/custos`; razão descritiva, renomeada para evitar confusão com ROI/ROIC.                                                                                                                                  |
| Eficiência relativa                | `100 × (receita/custos)/(receita média/custos médios)`; 100 representa o grupo, sem limiar normativo de aprovação.                                                                                                |
| Metas proporcionais                | `receita da empresa × (custo ou investimento médio/receita média)`; regra de comparação com pares, sem garantia de ganho ou recomendação automática de desembolso.                                                |
| Radar e desvio                     | `100 × valor/média` e `(valor − média)/desvio populacional`; descrições de tamanho e afastamento, sem probabilidade de insolvência. Denominador zero deixa comparação indisponível conforme a regra do indicador. |
| Referência de menor custo relativo | P25 de custos/receita e mediana dos pares. A antiga seleção por maior receita foi removida; não há ranking de eficiência global.                                                                                  |
| Gap estrutural                     | `PL informado − PL ajustado pelo MQO`; residual comparativo. Não é necessidade comprovada de aporte ou preço justo.                                                                                               |
| Cenários de patrimônio             | Extensões condicionais documentadas na seção temporal; o estudo transversal não lhes fornece validação.                                                                                                           |

A fundamentação do trabalho ampara as variáveis, K-Means/Z-score e a família de regressão utilizada. As referências complementares abaixo fundamentam comparação proporcional, quartis e deriva. Os valores de parâmetros e a eficácia econômica das ações ainda dependem de julgamento e validação próprios.

## Fundamentação complementar e correções (09/11/2026)

As fontes consultadas são primárias: autores do livro, entidade de benchmarking, professor/autor e órgãos emissores. As fontes estão em `docs/fundamentacao/fontes.json`, separadas do código exibido pela aplicação. As telas e o dossiê executivo mantêm os resultados e suas condições de interpretação, sem bibliografia acadêmica. Nenhuma referência valida automaticamente os resultados da empresa.

| Fonte                                                                                                                                                                                                 | Aplicação e limite                                                                                                                                                                                                                                                                                                                                                                            |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Hyndman, R. J.; Athanasopoulos, G. _Forecasting: Principles and Practice_, 3ª ed., [cap. 5](https://otexts.com/fpp3/toolbox.html)                                                                     | `PL_T + h × (PL_T − PL_(T−janela))/janela` é a deriva aplicada à janela móvel. Equivale à média de suas variações consecutivas. A janela curta é adaptação do app; não é um modelo ótimo publicado para PL. Testes de origem móvel são exibidos para cada horizonte, com MAE e referência ingênua nos mesmos alvos. Sem histórico suficiente, não há métrica. Não há uso do futuro no treino. |
| CPC 26 (R1), [itens 106–110](https://conteudo.cvm.gov.br/export/sites/cvm/menu/regulados/normascontabeis/cpc/CPC_26_R1_rev_14.pdf)                                                                    | Sustenta distinguir resultados e transações com proprietários na base 2026. A projeção incremental não substitui uma DMPL. A [Resolução CVM 237](https://conteudo.cvm.gov.br/legislacao/resolucoes/resol237.html) aprova o CPC 51; este projeto não certifica conformidade de demonstrações futuras com esse novo pronunciamento.                                                             |
| CPC 32, [item 34](https://conteudo.cvm.gov.br/export/sites/cvm/menu/regulados/normascontabeis/cpc/CPC_32_rev_13.pdf)                                                                                  | Benefício fiscal relacionado a prejuízo não é automático. O cenário usa imposto positivo e perdas integrais, sem ativo fiscal diferido ou apuração fiscal completa. Alíquota e retenção continuam hipóteses do usuário.                                                                                                                                                                       |
| APQC, [comparação com pares](https://www.apqc.org/What-Benchmark-Values-Best-Support-Comparison-With-Peers) e [quartis](https://www.apqc.org/What-Does-Top-Quartile-Performance-Mean-in-Benchmarking) | Fundamenta normalização por receita e comparação de distribuições. A referência favorável depende da direção do indicador: aqui P25 indica menor custo relativo. Nem média nem quartil são orçamento obrigatório ou prova de melhor operação. Recomendações passam a alternativas sem prioridade automática.                                                                                  |

Correções de nomenclatura: `receita/custos` é cobertura de custos; o índice relativo é 100 vezes essa razão dividida pela razão do grupo. São construções descritivas transparentes, não indicadores normativos de rentabilidade. Foram removidos os limiares visuais arbitrários de 90%/120% e as afirmações de liderança por maior receita. Os limites de simulação e de horizonte são escolhas de interface, sem significado econômico inferido.
