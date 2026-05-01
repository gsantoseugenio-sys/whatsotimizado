import { Router } from "express";

const router = Router();

const styles = `
  :root { color-scheme: light; --green: #078866; --ink: #17211d; --muted: #5e6f68; --line: #dbe7e2; --soft: #f4faf7; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: Arial, Helvetica, sans-serif; color: var(--ink); background: #ffffff; line-height: 1.6; }
  header { border-bottom: 1px solid var(--line); background: #ffffff; position: sticky; top: 0; }
  nav { width: min(100%, 1040px); margin: 0 auto; padding: 14px 20px; display: flex; align-items: center; justify-content: space-between; gap: 16px; }
  nav a { color: var(--ink); text-decoration: none; font-size: 14px; }
  .brand { display: flex; align-items: center; gap: 10px; font-weight: 700; }
  .mark { width: 32px; height: 32px; border-radius: 9px; display: grid; place-items: center; background: var(--green); color: #fff; font-weight: 700; }
  main { width: min(100%, 1040px); margin: 0 auto; padding: 44px 20px 64px; }
  .hero { display: grid; gap: 18px; padding: 32px 0 36px; }
  h1 { font-size: clamp(32px, 6vw, 58px); line-height: 1.02; margin: 0; letter-spacing: 0; font-weight: 700; max-width: 760px; }
  h2 { font-size: 24px; margin: 34px 0 10px; }
  h3 { font-size: 18px; margin: 24px 0 8px; }
  p { margin: 0 0 12px; max-width: 820px; }
  ul { padding-left: 20px; margin: 0 0 16px; }
  li { margin: 6px 0; }
  .lead { color: var(--muted); font-size: 18px; max-width: 760px; }
  .actions { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 8px; }
  .button { border: 1px solid var(--green); background: var(--green); color: white; padding: 11px 16px; border-radius: 10px; text-decoration: none; font-weight: 700; }
  .button.secondary { background: white; color: var(--green); }
  .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 14px; margin-top: 22px; }
  .card { border: 1px solid var(--line); border-radius: 12px; padding: 18px; background: var(--soft); }
  .card strong { display: block; margin-bottom: 6px; }
  .doc { max-width: 860px; }
  .muted { color: var(--muted); }
  footer { border-top: 1px solid var(--line); color: var(--muted); padding: 24px 20px; text-align: center; font-size: 13px; }
`;

function page({ title, description, body }) {
  return `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title}</title>
    <meta name="description" content="${description}" />
    <style>${styles}</style>
  </head>
  <body>
    <header>
      <nav>
        <a class="brand" href="/">
          <span class="mark">AI</span>
          <span>Whats Otimizado</span>
        </a>
        <div>
          <a href="/privacy">Privacidade</a>
          &nbsp;&nbsp;
          <a href="/terms">Termos</a>
        </div>
      </nav>
    </header>
    <main>${body}</main>
    <footer>Whats Otimizado - Ferramenta de escrita com IA para mensagens.</footer>
  </body>
</html>`;
}

router.get("/", (_req, res) => {
  res.type("html").send(
    page({
      title: "Whats Otimizado",
      description: "Extensao Chrome para aperfeicoar mensagens com IA.",
      body: `
        <section class="hero">
          <h1>Aperfeicoe suas mensagens com IA, direto no navegador.</h1>
          <p class="lead">O Whats Otimizado ajuda a reescrever textos para conversas, vendas, atendimento, e-mails e redes sociais, com controle de uso e foco em privacidade.</p>
          <div class="actions">
            <a class="button" href="/privacy">Ver politica de privacidade</a>
            <a class="button secondary" href="/terms">Ver termos de uso</a>
          </div>
        </section>
        <section class="grid" aria-label="Recursos">
          <div class="card"><strong>Uso Empresarial</strong><span>Reescritas para vendas, atendimento, linguagem formal, copywriting e termos tecnicos.</span></div>
          <div class="card"><strong>Uso Pessoal</strong><span>Adapte mensagens para tons emocionais, naturais e contextuais.</span></div>
          <div class="card"><strong>Uso Recreativo</strong><span>Transforme textos em estilos criativos, narrativos e expressivos.</span></div>
          <div class="card"><strong>Privacidade</strong><span>O texto so e enviado quando o usuario aciona voluntariamente uma funcao de IA.</span></div>
        </section>
      `
    })
  );
});

router.get(["/privacy", "/privacy-policy", "/politica-de-privacidade"], (_req, res) => {
  res.type("html").send(
    page({
      title: "Politica de Privacidade - Whats Otimizado",
      description: "Politica de privacidade da extensao Whats Otimizado.",
      body: `
        <article class="doc">
          <h1>Politica de Privacidade</h1>
          <p class="muted">Ultima atualizacao: 1 de maio de 2026.</p>
          <p>Esta politica explica como o Whats Otimizado trata dados na extensao Chrome e nos servicos de backend usados para melhorar textos com IA.</p>

          <h2>Dados que podemos coletar</h2>
          <ul>
            <li>Texto enviado voluntariamente pelo usuario para reescrita, traducao, variacoes ou outras acoes de IA.</li>
            <li>Metadados tecnicos, como plataforma, dominio do site, tipo de acao solicitada, plano, contagem de uso e horario da requisicao.</li>
            <li>Dados de conta quando o usuario faz login, como e-mail, identificador de usuario e plano contratado.</li>
            <li>Eventos de feedback, como sugestao aceita, rejeitada, tentativa novamente e avaliacao positiva ou negativa.</li>
          </ul>

          <h2>Como usamos os dados</h2>
          <ul>
            <li>Gerar respostas, melhorias, variacoes e traducoes solicitadas pelo usuario.</li>
            <li>Controlar limites de uso por plano e liberar recursos pagos.</li>
            <li>Melhorar a qualidade das sugestoes com base em feedback e metricas agregadas.</li>
            <li>Manter seguranca, prevenir abuso e corrigir falhas tecnicas.</li>
          </ul>

          <h2>Controle do usuario</h2>
          <p>A extensao nao envia texto automaticamente. O envio ocorre apenas quando o usuario clica em uma acao de IA. O usuario pode desativar aprendizado, evitar armazenamento de texto e limpar historico local nas configuracoes da extensao, quando essas opcoes estiverem disponiveis.</p>

          <h2>Dados sensiveis</h2>
          <p>O usuario nao deve enviar senhas, documentos, informacoes financeiras, dados medicos ou outros dados altamente sensiveis para reescrita. A extensao busca evitar campos sensiveis, mas o usuario tambem deve revisar o conteudo antes de acionar a IA.</p>

          <h2>Compartilhamento</h2>
          <p>Os textos enviados podem ser processados por provedores de infraestrutura e IA estritamente para executar a funcao solicitada. Nao vendemos dados pessoais.</p>

          <h2>Retencao</h2>
          <p>Dados de uso podem ser mantidos pelo tempo necessario para funcionamento, seguranca, suporte, cobranca e melhoria do produto. Historico local fica no navegador do usuario e pode ser apagado pelo proprio usuario.</p>

          <h2>Contato</h2>
          <p>Para solicitacoes sobre privacidade, remocao de dados ou suporte, entre em contato pelo e-mail: suporte@whatsotimizado.com.br.</p>
        </article>
      `
    })
  );
});

router.get(["/terms", "/termos"], (_req, res) => {
  res.type("html").send(
    page({
      title: "Termos de Uso - Whats Otimizado",
      description: "Termos de uso da extensao Whats Otimizado.",
      body: `
        <article class="doc">
          <h1>Termos de Uso</h1>
          <p class="muted">Ultima atualizacao: 1 de maio de 2026.</p>
          <p>Ao usar o Whats Otimizado, o usuario concorda com estes termos.</p>

          <h2>Uso do produto</h2>
          <p>O Whats Otimizado e uma ferramenta de apoio para melhorar, adaptar, traduzir e criar variacoes de textos. O usuario e responsavel por revisar o conteudo antes de enviar mensagens a terceiros.</p>

          <h2>Planos e limites</h2>
          <p>Recursos e limites podem variar conforme o plano. O plano gratuito pode ter limite diario. Planos pagos liberam limites maiores ou recursos adicionais conforme indicado no produto.</p>

          <h2>Condutas proibidas</h2>
          <ul>
            <li>Usar o produto para fraude, spam, abuso, assedio, violacao de direitos ou atividades ilegais.</li>
            <li>Tentar extrair chaves, contornar limites, automatizar abuso ou comprometer a seguranca do sistema.</li>
            <li>Enviar dados sensiveis sem necessidade ou sem autorizacao.</li>
          </ul>

          <h2>Disponibilidade</h2>
          <p>Podemos atualizar, pausar ou alterar funcionalidades para manutencao, seguranca, melhorias ou exigencias legais.</p>

          <h2>Contato</h2>
          <p>Para suporte, entre em contato pelo e-mail: suporte@whatsotimizado.com.br.</p>
        </article>
      `
    })
  );
});

export default router;
