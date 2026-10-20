# Compass Forge Finance

ATLAS.SAD: diagnóstico financeiro, benchmarking por clusters e simulação exploratória no navegador. O benchmark padrão usa dados CVM de 2026 em uma janela móvel de 12 meses (TTM), carregados automaticamente na abertura do app.

## Navegação e fluxo de análise

| Página            | Caminho              | Conteúdo                                                                                          |
| ----------------- | -------------------- | ------------------------------------------------------------------------------------------------- |
| Diagnóstico       | `/`                  | Patrimônio e gap estrutural no topo, perfil, tabela financeira, base/filtro setorial, três gráficos de mercado e recomendações. |
| Simulador         | `/simulador`         | Controles de cenário com atualização dos indicadores em tempo real.                               |
| Patrimônio futuro | `/patrimonio-futuro` | Histórico próprio, hipóteses e previsão; controles opcionais em **Ajustar cenário nesta página**. |
| Relatórios        | `/relatorios`        | Prévia do dossiê e exportação PDF com três ou quatro gráficos.                                    |

Informe os dados no modal, revise a referência padrão ou escolha outra em **Diagnóstico**, ajuste o cenário em **Simulador**, preencha o histórico em **Patrimônio futuro** e revise/exporte em **Relatórios**. O endereço antigo `/benchmarking` redireciona para `/#mercado`, a seção de mercado do diagnóstico. Atalhos no início do diagnóstico levam ao resumo, patrimônio e mercado. O menu destaca a página ativa; **Editar dados** permanece disponível em todas as páginas.

A navegação pelo menu mantém os dados inicialmente informados, o cenário, a base de mercado completa e seu filtro selecionado, além de nome, histórico, janela e hipóteses e horizonte da empresa. O `FinanceProvider` da raiz compartilha esse estado por `finance-state`; a previsão é derivada centralmente. Assim, alterações em **Simulador** chegam ao relatório mesmo sem voltar a **Patrimônio futuro**, e histórico inválido remove a previsão anterior. No modo visitante, recarregar a página reinicia os dados da empresa e restaura o benchmark padrão de 2026. Contas autenticadas recuperam os dados salvos no servidor; não há persistência em `localStorage` ou `sessionStorage`.

## Benchmark padrão CVM 2026 (TTM)

O app inicia com [public/base-cvm-2026.json](public/base-cvm-2026.json): **29 das 35 empresas** da amostra, com seis exclusões documentadas. Receita, custos e investimento cobrem **01/07/2025 a 30/06/2026**; o patrimônio é a posição de **30/06/2026**. A coleta anual DFP 2026 não retornou empresas completas para o encerramento de dezembro; o benchmark usa dados efetivamente publicados no ITR, sem apresentar um exercício anual de 2026 já fechado.

```text
Fluxo em 12 meses = DFP anual 2025 + ITR acumulado 01/01–30/06/2026
                                  − ITR acumulado 01/01–30/06/2025
Patrimônio = posição do ITR em 30/06/2026
```

Não há multiplicação do semestre por dois. O script escolhe o trimestre calendário mais recente com dados completos para pelo menos metade da amostra e no mínimo três empresas. As três parcelas usam o mesmo CNPJ e escopo (consolidado ou individual), última versão de cada documento e acumulados desde janeiro. Não mistura trimestre isolado com semestre acumulado nem preenche ausências com zero. Cada empresa traz a conciliação das parcelas; a origem registra os três arquivos públicos, SHA-256, data da coleta, cobertura e períodos avaliados.

```sh
python3 scripts/coletar-base-cvm.py --ano 2026 --ttm --cache-dir /tmp/cvm-zips --saida public/base-cvm-2026.json
# Corte explícito, opcional:
python3 scripts/coletar-base-cvm.py --ano 2026 --ttm --data-referencia 2026-06-30 --cache-dir /tmp/cvm-zips --saida /tmp/base-cvm-2026.json
```

O snapshot é importado por `src/lib/default-benchmark.ts` e treinado com os mesmos cálculos puros no navegador e no SSR. O período e a metodologia aparecem na interface e no PDF. Em **Diagnóstico**, o filtro setorial recalcula os clusters; **Restaurar CVM 2026** retorna à amostra completa. A opção de demonstração foi retirada da interface; contas antigas que a tinham selecionado passam a abrir a base CVM 2026, preservando os dados da empresa. Bases importadas explicitamente e filtros salvos continuam disponíveis nas contas autenticadas. Sem conta, recarregar restabelece o padrão de 2026. Não há atualização remota automática da CVM.

O coletor recusa gravar benchmarks com menos de três empresas e escreve o JSON de forma atômica para preservar uma base existente caso a coleta falhe. Use valores anuais ou de 12 meses da empresa para comparar com esta referência; os perfis permanecem exploratórios, e importar uma base nova não calibra a regressão de patrimônio.

### Base anual CVM 2024 (histórica)

A base anterior permanece disponível para importação manual como referência histórica, sem ser o padrão inicial.

O arquivo [public/base-cvm-2024.json](public/base-cvm-2024.json) inclui **28 das 35 empresas** selecionadas na [pesquisa de origem](https://github.com/Mano-dougg/metodos-estatisticos-scripts). As sete exclusões e os motivos estão em `excluidas`; dados ausentes não são imputados como zero. A coleta usa DFP anual de janeiro a dezembro, exercício atual (`ÚLTIMO`), prioriza consolidado e aceita individual quando necessário, mantendo o mesmo escopo entre as contas de cada empresa.

As contas são convertidas para reais (`MIL × 1.000`; `UNIDADE × 1`): patrimônio em BPP `2.03` com fallback `2.04`, receita em DRE `3.01`, custos como `−(3.02 + 3.04)` e investimento como `max(0, −DFC 6.02)`, usando DFC indireta com fallback direta. Investimento significa **saída líquida de caixa de investimento**, não CAPEX bruto; o fluxo original fica no JSON. Esse zero para fluxo líquido positivo é uma transformação de sinal, não preenchimento de ausência.

Para reproduzir a coleta, use Python 3 com biblioteca padrão. O script apenas lê fontes públicas e grava o JSON local; **não envia dados ao Google Forms ou a outros formulários**. A origem registra URL, SHA-256 do ZIP e data da coleta. Atualizações da CVM podem alterar os resultados; forneça o mesmo ZIP para reproduzir o conteúdo financeiro.

```sh
python3 scripts/coletar-base-cvm.py --ano 2024 --saida public/base-cvm-2024.json
# Alternativa com o ZIP da CVM já baixado:
python3 scripts/coletar-base-cvm.py --ano 2024 --zip /caminho/dfp_cia_aberta_2024.zip --saida /tmp/base-cvm-2024.json
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

## Patrimônio futuro da sua empresa

O primeiro ano da previsão está definido como **2027**, com **2026 como ano-base** e horizonte selecionável de **1 a 5 anos** (padrão: 2027–2031). O formulário novo começa em 2022–2026. Rascunhos vazios antigos são atualizados; históricos preenchidos preservam anos e valores e recebem um campo 2026 vazio quando faltar. A previsão aguarda esse preenchimento em vez de renomear dados de 2025 como 2026. O PL de 2026 pode ser atual ou estimado para o fechamento e deve coincidir com o PL originalmente informado; receita, custos e investimento de base devem corresponder ao período de 2026. O benchmark CVM permanece identificado como 2026 TTM. Gráficos, compra/revenda e PDF usam o mesmo alvo 2027.

Na página **Patrimônio futuro** (`/patrimonio-futuro`), informe de 3 a 5 patrimônios anuais próprios, em reais e com anos consecutivos na janela usada. A janela contém **2 a 4 variações anuais**, exigindo um PL a mais: o padrão de três variações precisa de quatro patrimônios. O último PL histórico deve coincidir com o PL originalmente informado no modal; **Usar PL informado em 2026** facilita esse preenchimento. Receita, custos e investimento iniciais devem corresponder ao mesmo exercício. Histórico aceita zero e negativos, e campos vazios representam ausência, sem imputação de zero.

O cenário reage às alterações feitas no simulador e às hipóteses de imposto, retenção e retorno do investimento. Para `h` anos à frente (de 1 a 5), a referência sem mudanças é `PL inicial + h × média das variações anuais de PL`; a projeção completa é:

```text
PL futuro(h) = PL inicial + h × média das variações anuais + ajuste único de capital
             + h × [(Δreceita − Δcustos) + Δinvestimento × retorno] × (1 − imposto) × retenção
```

Os deltas comparam cenário e valores originalmente informados, e o ajuste de capital é a mudança do campo Patrimônio. Na fórmula, as taxas são frações; a interface recebe percentuais entre 0 e 100. Os padrões explícitos são **imposto 0%, retenção 100% e retorno do investimento 0%**. Investimento não é descontado diretamente do PL: apenas seu retorno adicional assumido entra no cálculo. Os incrementos evitam somar novamente os resultados e distribuições habituais já contidos na trajetória histórica. Imposto e retenção são hipóteses marginais simplificadas, também aplicadas a efeitos adicionais negativos.

Os cenários são extrapolações condicionais para **1 a 5 anos**, em reais nominais e sem intervalo de confiança calibrado. A variação média e os efeitos operacionais adicionais são mantidos anualmente em reais, sem juros compostos. Aportes e retiradas entram uma única vez; projeções não são inseridas no histórico nem usadas no teste retrospectivo. O gráfico compara histórico próprio, referência sem mudanças e cenário com mudanças. O teste retrospectivo informa o erro absoluto médio (MAE) da referência contra repetir o último PL, sempre usando apenas anos anteriores ao ano avaliado; pode ficar indisponível com poucos anos. Ele avalia apenas um ano à frente, sem validar os efeitos das mudanças simuladas nem a precisão dos anos mais distantes.

Nome, histórico, hipóteses e horizonte permanecem nesta sessão para visitantes e são salvos na conta para usuários autenticados. O PDF inclui hipóteses, resultados e quatro imagens quando há previsão válida; sem ela, mantém os três gráficos do diagnóstico financeiro.

### Coleta histórica CVM opcional

O script também pode obter séries anuais de PL das empresas da amostra para pesquisa, mantendo consolidado e individual separados, valores com sinal (inclusive zero e negativos), posição de 31/12 e última versão disponível por ano. Usa BPP `2.03` com fallback `2.04`, converte para reais e não preenche ausências. Essas revisões são as disponíveis na coleta, sem garantir o que era conhecido em cada data passada. A leitura é pública e não envia formulários; o cache guarda os ZIPs localmente.

```sh
python3 scripts/coletar-base-cvm.py --historico --inicio 2021 --fim 2025 --cache-dir /tmp/cvm-zips --saida /tmp/historico-cvm.json
```

Esse arquivo é um artefato opcional de pesquisa, separado do JSON de benchmarking; não é carregado como histórico próprio pela interface. A coleta verificada foi exportada apenas em `/tmp`, sem distribuir dados CVM como se fossem da empresa do usuário.

## Método e limites

- K-Means determinístico com três grupos, ordenação por empresa, sementes mais distantes e até 200 iterações. Treino e classificação usam margem `(receita − custos)/receita`, investimento/receita, giro do patrimônio `(receita/patrimonio)/3` e escala `min(1, receita/tetoReceita)`. A empresa diagnosticada não participa do treino.
- Os nomes Conservador, Estruturado e Expansivo ordenam os grupos por intensidade média de investimento; são rótulos operacionais locais. Os centroides treinados e rótulos originais da pesquisa não foram fornecidos, portanto esta implementação não reproduz aquela classificação.
- Benchmarks financeiros são médias exatas dos membros; dispersão usa desvio padrão populacional. Desvio padronizado com dispersão zero fica indisponível. Líderes são os 25% de maior receita do grupo, arredondados para cima; sua intensidade de investimento é `soma(investimento)/soma(receita)`. Metas de custos e investimento são proporcionais à receita da empresa.
- Os tetos por variável são `max(teto demonstrativo, máximo observado na base selecionada)`; não equivalem aos limites de Box Plot da pesquisa. A correlação de referência (−0,9629) e a regressão demonstrativa permanecem fixas: importar dados não reajusta o modelo. Não há R² ou precisão estatística calibrados para o diagnóstico atual; os percentuais legados de 51,3%/48,7% foram removidos da interface e do PDF.
- Amostras setoriais pequenas e clusters com apenas um membro são exploratórios: dispersão zero não prova estabilidade. Perfis e posição estrutural não constituem avaliação validada de risco de crédito nem previsão temporal validada.

Dashboard e dossiê compartilham os módulos puros `sad-model`, `market-clusters`, `benchmarking` e `patrimonio-historico`. A exportação fica na página **Relatórios** (`/relatorios`), que reúne todos os gráficos para captura. Aguarde **Gráficos prontos para exportação**, use **Exportar Relatório (PDF)** e escolha **Salvar como PDF** na impressão. A janela abre durante o clique para preservar a ativação do navegador; os gráficos são capturados como imagens e a impressão espera seu carregamento.

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

A validação inclui 32 testes TypeScript e seis testes Python, além de TypeScript, lint e build aprovados. Os testes cobrem benchmarking, regras de simulação, importação, previsão própria, hipóteses e coleta histórica. No navegador foram conferidos os cinco acessos diretos (HTTP 200), menu ativo, retenção de estado e opções de filtro entre páginas, recálculo temporal com a página de previsão desmontada, erros de histórico e restauração. O PDF apresentou quatro PNGs decodificados com previsão válida; as cinco páginas não apresentaram erros de execução nem overflow no mobile.

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

RN01 - Trava de Multicolinearidade: Se o usuário aumentar a simulação de Receita Líquida, o sistema deve obrigar um reajuste nos Custos e Despesas (proporção baseada no índice de Pearson de -0,9629), impossibilitando projeções irreais.

RN02 - Teto de Escala: O sistema não pode aceitar simulações que ultrapassem os limites máximos encontrados no cálculo do Box Plot da pesquisa, emitindo um alerta de "Cenário fora da escala de mercado".

RN03 - Termo de Confiança (atualizado): Informar que a regressão estrutural é demonstrativa e não foi calibrada para a base atual, sem atribuir R² ou precisão estatística não medidos.

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

As quatro páginas financeiras são públicas: visitantes podem informar os dados, comparar, simular e exportar relatórios sem conta. No modo visitante, os dados ficam somente em memória durante a sessão e não são enviados à API de salvamento. Entrar/cadastrar é opcional e habilita a recuperação e persistência no servidor. Navegar até o login/cadastro e voltar preserva o rascunho visitante. Uma conta sem documento salvo aproveita esse rascunho; uma conta com dados salvos carrega os dados da própria empresa. Sair limpa os dados da conta da tela e retorna ao modo visitante. Falha na infraestrutura de contas não bloqueia as ferramentas públicas. O servidor identifica a empresa pela sessão, nunca por um identificador enviado no documento financeiro. Os dados atuais, cenário, histórico, hipóteses, janela da média móvel e base/setor de benchmarking são salvos automaticamente após 700 ms sem alterações. O cabeçalho mostra o estado do salvamento; falhas mantêm o conteúdo em memória e permitem nova tentativa. O botão Sair aguarda o salvamento. Fechar/recarregar com alterações pendentes aciona o aviso nativo do navegador. Uma troca de conta em outra aba também bloqueia a gravação com a identidade anterior. Ao detectar alteração em outra aba, o servidor devolve conflito e exige recarregar em vez de sobrescrever silenciosamente.

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

## Leitura guiada dos resultados

O diagnóstico, a comparação de mercado, o simulador e a revisão do relatório apresentam perguntas e respostas em linguagem simples antes dos detalhes estatísticos. As comparações de custos e investimentos usam valores por R$ 100 de receita e os mesmos gaps proporcionais do módulo `benchmarking.ts`. A apresentação compartilhada fica em `src/lib/leitura-financeira.ts`, também usada no dossiê impresso; receita zero produz instruções de preenchimento, sem percentuais inventados.

O gráfico de barras compara somente percentuais da receita. O giro do patrimônio continua disponível na dispersão e nos dados do relatório, com sua unidade própria. Os gráficos explicam como ler proporções, a estrela da empresa e a referência de 100% do radar. Os detalhes do agrupamento, das metas e do modelo experimental ficam em seções expansíveis. A comparação experimental de patrimônio não é apresentada como comprovação de falta de capital, e o histórico de patrimônio distingue valores informados de cenários condicionais.

Os gráficos e suas interpretações ficam no mesmo bloco: `ComparacaoReceita.tsx` reúne barras e leitura simplificada no diagnóstico, simulador, mercado e revisão do relatório. Na comparação de mercado, a dispersão identifica o grupo ao lado do gráfico e o radar apresenta os quatro valores da empresa e da referência junto do desenho. Em telas menores, cada gráfico vem seguido da sua própria explicação.

### Amostra selecionada e grupo de referência

“Amostra completa” inclui todas as empresas disponíveis na base carregada (29 no snapshot CVM 2026). Ela define os dados usados para treinar e classificar os perfis; as médias e metas continuam sendo as do grupo de referência da empresa. No snapshot padrão, os grupos têm 26, 2 e 1 empresas — os 26 do grupo Conservador não representam perda de registros da amostra.

A dispersão agora desenha um ponto por empresa da amostra selecionada, usando `pontosAmostra` em `market-clusters.ts`, em vez de mostrar somente os três centroides. O tooltip identifica a empresa e seu perfil. Aplicar um setor altera os pontos; voltar à amostra completa recupera todos os registros. O radar informa a contagem da amostra, a contagem do grupo e os percentuais relativos à média; valores empresariais muito menores que a referência aparecem próximos do centro, sem alteração artificial da escala ou dos dados. O dossiê usa os mesmos pontos e explicita as duas contagens.

As recomendações estratégicas interpretam os resultados de `analisarGaps`, em `benchmarking.ts`, tanto na interface como no PDF. A seção “O que priorizar agora” distingue revisão de custos, avaliação de investimentos e acompanhamento de resultados, com orientação prática sem repetir os textos das metas em reais. Custos e investimentos usam razões entre médias financeiras do grupo, com metas em reais proporcionais à receita; líderes usam o quartil superior por receita. Não são feitas inferências de caixa ou capacidade de dívida a partir da margem ou do giro do PL. Receita zero pede preenchimento de uma receita positiva em vez de emitir recomendações de alinhamento.

### Compra, recuperação e revenda pela hipótese patrimonial

A página **Patrimônio futuro** também mostra **Comprar, recuperar e revender**, sem exigir novos campos. A hipótese explícita é comprar 100% da empresa pelo PL originalmente informado e revender pelo PL futuro com mudanças no último ano selecionado da projeção. São dados do histórico e cenário da própria empresa, não uma avaliação de preço de mercado nem o patrimônio teórico demonstrativo do diagnóstico.

O módulo puro `compra-revenda.ts` é compartilhado pela página e pelo PDF. `aporte = max(ajustePL, 0)`, `retirada = max(-ajustePL, 0)`, `aplicado = PL original + aporte`, `recebido = PL futuro + retirada`, `resultado = recebido − aplicado` e `retorno = resultado/aplicado`. Aportes não viram lucro; retiradas são tratadas como devoluções ao comprador. O percentual é acumulado no horizonte selecionado (não anualizado), com aporte no início e recebimento no encerramento, sem modelar fluxos intermediários ou calcular TIR. Ganho, perda e empate recebem explicações distintas. Um resultado positivo representa espaço para absorver custos ainda não informados, não recomendação de aquisição.

Sem previsão válida, a seção orienta a completar o histórico. PL inicial zero/negativo ou PL futuro negativo torna a hipótese de preço patrimonial insuficiente, sem inventar preço ou retorno; nesse caso é necessário conhecer os valores negociados. O resultado não modela custos de transação/recuperação não informados, passivos ocultos nem financiamento da recuperação. Mudanças continuam salvas pelos campos existentes para contas autenticadas; visitantes mantêm o funcionamento durante a sessão.

O seletor **Projetar por** controla os anos exibidos no gráfico e na tabela anual. O PDF inclui a mesma série e o mesmo horizonte, e compra/revenda usa o seu último ano. O campo opcional `horizonte` do documento aceita inteiros entre 1 e 5; documentos antigos sem ele continuam válidos e abrem com 5 anos. A limitação de incerteza crescente com o horizonte segue a discussão em [Forecasting: Principles and Practice, §1.7](https://otexts.com/fpp3/intro.html#the-statistical-forecasting-perspective); esta implementação não oferece intervalos de previsão calibrados nem trata a extrapolação como resultado garantido.
