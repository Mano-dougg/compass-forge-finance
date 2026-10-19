# Compass Forge Finance

quero construir um app com base num documento de requisitos, de inicio quero apenas  a página principal, com um modal pra botar os dados da empresa e depois exibir a classificação e ter linhas com um botao pra rolar esses dados pra direita pra aumentar e rolar pra esquerda pra diminuir um dos dados da empresa, e gerar a previsão dos outros com base numa formula mockada.
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

RN03 - Termo de Confiança: O dashboard e o PDF devem exibir um aviso claro informando que a projeção preditiva possui uma margem de variância não explicada de 48,7% (100% - R² de 51,3%).

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
