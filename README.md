<div align="center">

# Hibrid Club

App mobile para atletas hibridos organizarem treino, corrida, hidratacao, historico e evolucao em uma Arena mensal.

[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=111)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-5-646CFF?logo=vite&logoColor=fff)](https://vitejs.dev/)
[![Supabase](https://img.shields.io/badge/Supabase-Backend-3FCF8E?logo=supabase&logoColor=111)](https://supabase.com/)
[![Android](https://img.shields.io/badge/Android-APK-3DDC84?logo=android&logoColor=111)](https://github.com/claudiusigor/HIBRIDCLUB/releases/latest)

[Abrir aplicacao](https://claudiusigor.github.io/HIBRIDCLUB/) | [Baixar APK](https://github.com/claudiusigor/HIBRIDCLUB/releases/latest/download/hibrid-club-latest.apk) | [Ver releases](https://github.com/claudiusigor/HIBRIDCLUB/releases/latest)

![Hibrid Club](public/HYBRIDCLUBBANNER.png)

</div>

## Visao geral

O Hibrid Club transforma um plano de treino hibrido em uma rotina diaria clara. O atleta abre o app, identifica a ficha do dia, registra a execucao e acompanha consistencia, cardio, hidratacao e progresso sem interromper o treino.

O mesmo projeto funciona como PWA e como aplicativo Android empacotado com Capacitor. Autenticacao, perfis, planos, registros diarios, fotos e Ranking sao integrados ao Supabase.

## Experiencia atual

- **Inicio:** semana de treino, ficha do dia, progresso dos exercicios e modo de execucao.
- **Cardio:** indicadores de corrida e acesso direto aos treinos relacionados.
- **Agua:** controle diario de hidratacao e nutricao.
- **Historico:** calendario mensal, sequencia, variedade de fichas, pontos e impacto no Ranking.
- **Plano:** visualizacao e edicao do plano pessoal.
- **Ranking:** temporada mensal, divisao, proximo adversario, podio 3D e conquistas.
- **Perfil:** nome, bio, foco, objetivo principal, foto e moldura personalizada.

### Perfil e avatar

- Upload de JPG, PNG ou WEBP de ate 5 MB.
- Editor de recorte com arraste, zoom, rotacao e previa.
- Exportacao quadrada otimizada antes do upload.
- Bio e objetivo visiveis no perfil publico da Arena.
- Molduras Minimal, Azul e Glass disponiveis para todos.
- Molduras especiais desbloqueadas por conquistas do Ranking.

### Arena e recompensas

A pontuacao mensal segue o mesmo contrato no cliente e no Supabase:

| Acao | Pontos |
| --- | ---: |
| Dia com treino registrado | +100 |
| Dia de sequencia ativa | +25 |
| Variedade de ficha no mes | +10 |

Conquistas de consistencia, variedade, sequencia e colocacao liberam molduras exclusivas. Premios de Top 10, podio e campeao so sao consolidados quando a temporada e finalizada.

## Stack

- React 18 e Vite 5
- Tailwind CSS e Plus Jakarta Sans
- Supabase Auth, Database e Storage
- Three.js e OGL para experiencias visuais 3D
- React Easy Crop para edicao de avatar
- Capacitor 8 para Android
- Node Test Runner
- GitHub Actions e GitHub Pages

## Requisitos

- Node.js 22
- npm
- Java 21 para builds Android locais
- Android SDK 36 e Build Tools 36.0.0
- Android Studio para executar ou depurar o projeto nativo
- Projeto Supabase configurado

## Configuracao local

```powershell
git clone https://github.com/claudiusigor/HIBRIDCLUB.git
cd HIBRIDCLUB
npm install
```

Crie `.env.local`:

```text
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_OWNER_EMAIL=
```

Inicie o servidor:

```powershell
npm run dev
```

O Vite informa no terminal a porta disponivel, normalmente `http://127.0.0.1:5173/`.

## Supabase

As migrations versionadas ficam em `supabase/migrations` e devem ser aplicadas em ordem cronologica. Elas cobrem:

- autenticacao, perfis e planos;
- logs diarios de treino e nutricao;
- storage de avatares;
- pontuacao e temporadas do Ranking;
- conquistas publicas e trofeus sazonais;
- personalizacao do perfil e molduras;
- vitrine publica da Arena e reconciliacao de premios.

Os arquivos `supabase/setup_*.sql` agrupam configuracoes para instalacao ou manutencao manual. Revise o SQL antes de executar em um projeto com dados de producao.

## Scripts

| Comando | Funcao |
| --- | --- |
| `npm run dev` | Inicia o ambiente local com Vite |
| `npm test` | Executa todos os testes |
| `npm run test:ranking` | Valida pontuacao, conquistas e contrato SQL |
| `npm run test:profile` | Valida perfil, avatar e personalizacoes |
| `npm run build` | Gera o bundle web de producao |
| `npm run build:android` | Gera assets web com caminhos relativos |
| `npm run android:sync` | Compila e sincroniza os assets com o Android |
| `npm run android:debug` | Gera o APK debug local |
| `npm run android:open` | Sincroniza e abre o Android Studio |

## Android

Para gerar um APK debug local:

```powershell
npm run android:debug
```

Saida:

```text
android/app/build/outputs/apk/debug/app-debug.apk
```

O build local requer Java 21. O APK oficial deve ser o release assinado pelo GitHub Actions, pois ele preserva a assinatura e permite atualizar o app instalado sem desinstalacao.

O identificador Android permanece:

```text
com.hibridclub.app
```

Veja os detalhes de assinatura e configuracao em [ANDROID.md](ANDROID.md).

## CI/CD

### GitHub Pages

Todo push em `main` executa `.github/workflows/deploy-pages.yml`, roda a validacao do Ranking, gera o bundle e publica:

[https://claudiusigor.github.io/HIBRIDCLUB/](https://claudiusigor.github.io/HIBRIDCLUB/)

### APK Android

Todo push em `main` executa `.github/workflows/build-android-apk.yml` e armazena o APK release assinado como artefato. Uma execucao manual por `workflow_dispatch` tambem cria uma GitHub Release contendo:

- `hibrid-club-<versao>-<codigo>.apk`;
- `hibrid-club-latest.apk` para o link permanente de download.

[Baixar APK mais recente](https://github.com/claudiusigor/HIBRIDCLUB/releases/latest/download/hibrid-club-latest.apk)

## Estrutura principal

```text
src/components/          shell, autenticacao, paginas e componentes visuais
src/components/profile/  avatar, molduras e editor de foto
src/components/ranking/  podio, medalhas e trofeus 3D
src/domain/              regras de perfil e Ranking
src/services/            Supabase, storage, planos e integracoes nativas
src/utils/               processamento de imagem e utilitarios
supabase/migrations/     evolucao versionada do banco
tests/                   testes de Dashboard, Perfil e Ranking
android/                 projeto nativo Capacitor
```

## Status

Projeto em evolucao continua, com prioridade para experiencia mobile, execucao rapida do treino, consistencia de dados e recompensas sociais sem perder a identidade clean e premium.
