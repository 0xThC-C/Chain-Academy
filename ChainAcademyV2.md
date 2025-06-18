Este projeto visa criar a "Chain Academy", uma plataforma de mentoria sobre criptomoedas e blockchain. O foco é ser 100% descentralizada, priorizando a privacidade do usuário (sem KYC) e a liberdade dos mentores. A identidade e a reputação são construídas on-chain. A plataforma terá um design profissional e moderno, com funcionalidades de comunicação avançadas.

Design e Interface (UI/UX):

Paleta de Cores: Utilize estritamente as seguintes cores:
Preto (#000000) para fundos principais (no modo escuro) e textos (no modo claro).
Branco (#FFFFFF) para fundos principais (no modo claro) e textos (no modo escuro).
Vermelho (#FF0000 ou um tom vibrante similar) para botões de ação (CTAs), links, ícones e destaques importantes.
Modo Escuro/Claro:
Implemente um botão de alternância (ícone de sol/lua) no cabeçalho para ligar e desligar o modo escuro.
Modo Claro (Padrão): Fundo branco, texto preto.
Modo Escuro: Fundo preto, texto branco.
O estado (claro/escuro) deve ser salvo nas preferências do usuário no navegador.
Ícones Profissionais:
Utilize uma biblioteca de ícones moderna como a Font Awesome ou Heroicons para garantir um visual limpo e profissional em toda a plataforma.
É fundamental que o design utilize exclusivamente esta biblioteca de ícones, não utilizando emojis em nenhuma parte da interface para manter a estética profissional.
Cabeçalho (Header):
No lado esquerdo do cabeçalho, exiba o nome da plataforma: "Chain Academy".
Ao lado do nome, inclua um ícone de chapéu de formatura (graduation cap).
Página Inicial (Home Page):

Apresente de forma destacada a seguinte mensagem:
"Bem-vindo à Chain Academy: a sua plataforma de conhecimento 100% descentralizada. Aqui, qualquer pessoa com conhecimento pode ensinar e cobrar o que achar justo pelo seu trabalho. E qualquer pessoa com curiosidade pode aprender diretamente com especialistas do mercado. Conecte-se, aprenda e cresça no universo cripto."

Funcionalidades Essenciais:

1. Contratos Inteligentes e Pagamentos:

Taxa da Plataforma: A taxa de retenção sobre todas as transações de mentoria deve ser de 10%.
Moedas de Pagamento: Todos os valores dentro da plataforma devem ser definidos e pagos em USDT ou USDC. O usuário (aprendiz) deve poder escolher qual das duas stablecoins usar no momento do pagamento.
Compatibilidade de Rede: Integre a plataforma com a rede Ethereum e suas principais segundas camadas (L2s), como Polygon, Arbitrum, Optimism e Base. O usuário deve poder escolher em qual rede deseja transacionar.
Smart Contract de Escrow: O contrato inteligente deve:
Receber e bloquear o pagamento (USDT/USDC) em escrow quando uma mentoria é agendada.
Após a conclusão confirmada pelo aprendiz, liberar 90% do valor para a carteira do mentor e 10% para a carteira da plataforma.
Lidar com disputas de forma transparente.
2. Estrutura de Menus do Usuário:

Após conectar a carteira, o usuário deve ter acesso a um painel de controle com os seguintes menus claros:

<ícone-de-perfil> Perfil:
Configurar Perfil: Permitir que o usuário (mentor ou aprendiz) adicione um nome de usuário, uma imagem de perfil (pode ser um NFT), e uma biografia.
<ícone-de-criação> Criar Mentoria:
Um formulário detalhado onde o mentor pode configurar a mentoria que deseja oferecer.
Campos: Título da mentoria, descrição completa (o que será ensinado), categorias/tags (ex: DeFi, NFT, Trading), valor em USDT/USDC, e duração da sessão (em minutos/horas).
<ícone-de-calendário> Minhas Mentorias:
Visualizar um histórico de mentorias recebidas (como aprendiz) e ministradas (como mentor).
Verificar status: agendada, concluída, cancelada.
<ícone-de-carteira> Financeiro:
Vincular Carteira: Exibir o endereço da carteira já conectada. O usuário deve ser capaz de definir um endereço de carteira diferente exclusivamente para receber os pagamentos das mentorias, se desejar.
Extrato de Ganhos: Mostrar um histórico de todos os valores recebidos pelas mentorias.
Função de Saque: Embora os fundos sejam enviados diretamente para a carteira do mentor pelo smart contract, esta seção pode consolidar a visualização dos ganhos e fornecer links diretos para exploradores de blocos para rastrear as transações.
3. Funcionalidades de Comunicação (Estilo Discord):

Para cada sessão de mentoria agendada, crie uma "sala" privada para o mentor e o aprendiz.
Dentro desta sala, implemente as seguintes funcionalidades usando WebRTC:
Chamada de Vídeo (Call de Vídeo): Vídeo de alta qualidade entre os dois participantes.
Chamada de Áudio (Call de Áudio): Opção de desligar o vídeo e continuar apenas com áudio.
Chat de Texto: Um chat persistente para a sessão, onde podem trocar mensagens e links.
Compartilhamento de Tela: Permitir que tanto o mentor quanto o aprendiz possam compartilhar sua tela.
Prompt Final para o Claude Code:

XML

<prompt>
  <system>
    Você é um desenvolvedor full-stack especialista em Web3. Sua tarefa é gerar o código para uma plataforma de mentoria descentralizada chamada "Chain Academy".
  </system>

  <user_request>
    Por favor, desenvolva o código para a plataforma "Chain Academy" com as seguintes especificações detalhadas.

    <design_specs>
      <color_palette>
        - Fundo principal (Modo Escuro): Preto (#000000)
        - Fundo principal (Modo Claro): Branco (#FFFFFF)
        - Texto (Modo Escuro): Branco (#FFFFFF)
        - Texto (Modo Claro): Preto (#000000)
        - Cor de Destaque (CTAs, links, ícones): Vermelho (#FF0000)
      </color_palette>
      <dark_mode>
        - Implemente um botão de alternância (ícone sol/lua) no cabeçalho para o modo escuro/claro.
        - O estado deve ser persistente.
      </dark_mode>
      <icons>
        - Utilize a biblioteca Heroicons ou Font Awesome para todos os ícones da UI.
        - No cabeçalho, ao lado do nome "Chain Academy", adicione um ícone de chapéu de formatura (graduation cap).
        - É proibido o uso de emojis na interface; toda a representação gráfica visual deve ser feita através da biblioteca de ícones especificada para manter uma estética profissional.
      </icons>
      <homepage>
        - Exiba o texto: "Bem-vindo à Chain Academy: a sua plataforma de conhecimento 100% descentralizada. Aqui, qualquer pessoa com conhecimento pode ensinar e cobrar o que achar justo pelo seu trabalho. E qualquer pessoa com curiosidade pode aprender diretamente com especialistas do mercado. Conecte-se, aprenda e cresça no universo cripto."
      </homepage>
    </design_specs>

    <tech_stack>
      - Frontend: React com Tailwind CSS (para facilitar o design e o modo escuro).
      - Backend: Node.js com Express.js.
      - Blockchain: Contratos inteligentes em Solidity.
      - Comunicação Real-time: WebRTC.
    </tech_stack>

    <smart_contract_details name="Mentorship.sol">
      - **Taxa:** A taxa da plataforma é de 10%.
      - **Moedas:** O contrato deve aceitar pagamentos em USDT e USDC.
      - **Redes:** Deve ser implantável no Ethereum, Polygon, Arbitrum, Optimism e Base.
      - **Lógica de Escrow:**
        1. `createMentorshipSession`: Função chamada pelo aprendiz para pagar e bloquear os fundos em stablecoins.
        2. `confirmCompletion`: Função chamada pelo aprendiz para liberar os fundos (90% para o mentor, 10% para a plataforma).
        3. Inclua mecanismos de segurança para disputas ou não comparecimento.
    </smart_contract_details>

    <backend_api_specs>
      - **Autenticação:** Autenticação sem senha, baseada na assinatura de mensagem da carteira do usuário (ex: SIWE - Sign-In with Ethereum).
      - **Endpoints para Menus:**
        - `/profile`: GET, PUT para configurar nome de usuário, bio, imagem.
        - `/mentorships`: POST para criar, GET para listar e buscar.
        - `/my-mentorships`: GET para visualizar o histórico de sessões do usuário.
        - `/financials`: GET para extrato, PUT para definir/atualizar a carteira de recebimento.
      - **Interação com Contrato:** A API deve fornecer os dados necessários para o frontend interagir com os smart contracts.
    </backend_api_specs>

    <frontend_react_specs>
      - **Conexão de Carteira:** Use a biblioteca `wagmi` ou `web3-react` para uma conexão multi-chain e multi-wallet robusta, garantindo suporte a todas as redes especificadas.
      - **Componentes de Menu:** Crie componentes React para cada menu especificado (Perfil, Criar Mentoria, Minhas Mentorias, Financeiro).
      - **Fluxo de Mentoria:**
        1. Componente para mentores criarem suas ofertas (formulário "Criar Mentoria").
        2. Galeria de mentores com filtros por categoria e reputação.
        3. Página de agendamento que interage com o smart contract para pagamento.
      - **Sala de Mentoria:**
        - Crie uma interface que utilize WebRTC para as funcionalidades de vídeo, áudio, chat e compartilhamento de tela, inspirada no Discord.
    </frontend_react_specs>

    Por favor, comece pelo desenvolvimento do contrato inteligente `Mentorship.sol`, detalhando suas funções e eventos. Em seguida, estruture a API do backend em Node.js e, por fim, os principais componentes do frontend em React com Tailwind CSS.
  </user_request>
</prompt>