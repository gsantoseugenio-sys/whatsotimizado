# Checklist para publicar na Chrome Web Store

## Status tecnico atual

- Manifest V3: OK.
- Icones PNG 16, 32, 48 e 128: OK.
- Permissoes reduzidas para `storage`: OK.
- Nome sem uso de marca de terceiro: OK.
- Descricao curta e objetiva: OK.
- Politica de privacidade criada: OK.
- Link interno de privacidade nas configuracoes e no painel: OK.

## Pendencias antes do ZIP final

1. Conferir se `https://api.whatsotimizado.com.br` esta configurado como dominio HTTPS real do backend em:
   - `extension/config.js`
   - `extension/options.js`
   - `extension/content-script.js`
   - `extension/manifest.json`

2. Publicar `PRIVACY_POLICY.md` ou o conteudo de `extension/privacy-policy.html` em uma URL publica.

3. Cadastrar essa URL no campo "Privacy policy" do Chrome Developer Dashboard.

4. Substituir o trecho de contato da politica pelo email oficial de suporte.

5. Garantir que o backend em producao use HTTPS e aceite chamadas da extensao publicada.

6. Usar `backend/.env.production.example` como base para configurar as variaveis de producao no provedor de hospedagem.

## Declaracao de coleta de dados para a Chrome Web Store

Marcar que a extensao coleta/processa dados do usuario.

Categorias recomendadas para declarar:

- Personally identifiable information: email e identificador de usuario quando houver login.
- Authentication information: token de sessao armazenado localmente para autenticar chamadas.
- Website content: texto que o usuario decide enviar para reescrita ou mensagens recebidas quando a traducao automatica estiver ativada.
- User activity: eventos de uso, como sugestao aceita/rejeitada, feedback, plano e contadores.
- Website or app activity: dominio do site onde a extensao foi usada.

Finalidades:

- Funcionalidade principal da extensao.
- Gerenciamento de conta e plano.
- Analise de produto limitada e aprendizado quando permitido pelo usuario.
- Seguranca, prevencao de abuso e suporte.

Declaracoes importantes:

- Nao vender dados.
- Nao usar dados para publicidade comportamental.
- Nao usar dados para avaliacao de credito.
- Nao enviar texto para reescrita automaticamente; traducao de recebidas somente com opcao explicitamente ativada pelo usuario.
- Usar criptografia em transito via HTTPS.
- Permitir desativar aprendizado personalizado e armazenamento de texto.

## Texto sugerido para a loja

Nome:

`Aperfeicoar Mensagens IA`

Resumo curto:

`Aperfeicoe mensagens em conversas, e-mails e redes sociais com IA, estilos e controle de uso.`

Descricao:

`Aperfeicoar Mensagens IA ajuda a melhorar textos escritos em campos de mensagem, mantendo o sentido original e adaptando o tom conforme o perfil escolhido. A extensao funciona em sites compativeis como WhatsApp Web, Gmail e Instagram Web, sem ser afiliada ou endossada por essas marcas.`

`O usuario decide quando enviar o texto para melhoria. A extensao nao envia mensagens automaticamente e nao substitui texto sem acao do usuario. O painel permite escolher modos de uso, idioma, gerar variacoes, acompanhar limite de uso e controlar preferencias de aprendizado.`

## Justificativa de permissao

`storage`: usada para salvar preferencias, sessao, historico local recente, feedback e configuracoes de aprendizado.

## Riscos que foram reduzidos

- Uso de nome e iconografia parecidos com WhatsApp removidos.
- Permissoes de clipboard removidas.
- Politica de privacidade criada.
- Produto deixa claro que atua apenas quando o usuario solicita.
- Manifest mantido em MV3 com iconografia completa.

## Riscos restantes

- A URL `https://api.whatsotimizado.com.br` precisa estar ativa em producao. Publicar sem o backend responder pode quebrar login, checkout e IA.
- A politica precisa estar em uma URL publica, nao apenas dentro do projeto.
- Screenshots da loja tambem devem evitar parecer produto oficial do WhatsApp, Gmail, Instagram, Google ou Meta.
