<div align="center">

# Hibrid Club

App mobile para atletas hibridos acompanharem treino, cardio, consistencia, hidratacao, perfil e ranking mensal.

[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=111)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-5-646CFF?logo=vite&logoColor=fff)](https://vitejs.dev/)
[![Supabase](https://img.shields.io/badge/Supabase-Backend-3FCF8E?logo=supabase&logoColor=111)](https://supabase.com/)
[![Android](https://img.shields.io/badge/Android-APK-3DDC84?logo=android&logoColor=111)](https://github.com/claudiusigor/HIBRIDCLUB/releases/latest)

<br />

<a href="https://github.com/claudiusigor/HIBRIDCLUB/releases/latest/download/hibrid-club-latest.apk">
  <strong>Baixar APK mais recente</strong>
</a>

<br />
<br />

![Hibrid Club](public/HYBRIDCLUBBANNER.png)

</div>

## Sobre o projeto

O app nasceu para transformar um plano de treino hibrido em uma rotina diaria clara. A ideia e simples: abrir o celular, ver o treino do dia, registrar a execucao e acompanhar a evolucao sem friccao.

Ele combina uma interface web moderna com empacotamento Android via Capacitor, permitindo uso como PWA no navegador e como APK instalado no celular.

## Principais recursos

- Plano diario de treino com foco em execucao rapida.
- Registro de treinos, cardio, historico e hidratacao.
- Perfil do atleta com foto, sequencia, dias no mes e pontos mensais.
- Ranking mensal com pontuacao, podium e fotos de perfil sincronizadas.
- Tema claro/escuro com visual premium e responsivo.
- Backend Supabase para autenticacao, perfis, storage e dados do app.
- APK Android gerado por GitHub Actions com versionamento automatico.

## Download do APK

O APK oficial fica nas releases do repositorio:

[Download direto do APK](https://github.com/claudiusigor/HIBRIDCLUB/releases/latest/download/hibrid-club-latest.apk)

Pagina de releases:

[github.com/claudiusigor/HIBRIDCLUB/releases/latest](https://github.com/claudiusigor/HIBRIDCLUB/releases/latest)

Para atualizar no celular sem desinstalar, instale sempre o APK release assinado gerado pelo GitHub. O Android aceita a atualizacao quando o app mantem o mesmo `applicationId`, a mesma assinatura e um `versionCode` maior.

## Stack

- React 18
- Vite
- Tailwind CSS
- Supabase
- Capacitor Android
- GitHub Actions

## Como rodar localmente

```powershell
npm install
npm run dev
```

O app abre por padrao em:

```text
http://127.0.0.1:5173/
```

## Build web

```powershell
npm run build
```

## Build Android

Sincronizar o projeto Android com a ultima versao web:

```powershell
npm run android:sync
```

Gerar APK debug local:

```powershell
npm run android:debug
```

O fluxo oficial de APK release esta documentado em [ANDROID.md](ANDROID.md).

## Variaveis de ambiente

Crie um arquivo `.env.local` com as chaves do Supabase:

```text
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_OWNER_EMAIL=
```

## Supabase

O projeto usa Supabase para:

- autenticacao de usuarios;
- tabela de perfis;
- storage de fotos de perfil;
- logs diarios de treino;
- ranking mensal calculado por funcao SQL.

As migrations ficam em:

```text
supabase/migrations
```

## Automacao do APK

O workflow `Build Android APK` roda na branch `main` e tambem pode ser executado manualmente em `Actions`.

Quando executado manualmente, ele cria uma release com:

- APK versionado, por exemplo `hibrid-club-1.0.25-25.apk`;
- APK com nome fixo `hibrid-club-latest.apk`, usado pelo link direto do README.

## Status

Projeto em evolucao continua, com foco em experiencia mobile, consistencia de treino e ranking social entre atletas.
