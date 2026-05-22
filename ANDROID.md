# Hibrid Club Android

Este projeto usa Capacitor para transformar o app React/Vite em um aplicativo Android.

## Primeira vez

No PowerShell, dentro da pasta do projeto:

```powershell
npm run android:init
```

Esse comando baixa o Capacitor e cria a pasta `android`.

## Abrir no Android Studio

Depois da primeira configuracao:

```powershell
npm run android:open
```

O comando gera a versao web em `dist`, sincroniza com o Android e abre o projeto no Android Studio.

## Gerar APK de teste

Com o Android ja criado:

```powershell
npm run android:debug
```

O APK de teste fica em:

```text
android/app/build/outputs/apk/debug/app-debug.apk
```

## Gerar APK pelo GitHub

O workflow `Build Android APK` roda automaticamente a cada push na branch `main`.

Para baixar o APK gerado:

1. Abra o repositorio no GitHub.
2. Entre em `Actions`.
3. Abra a execucao `Build Android APK`.
4. Baixe o artefato `hibrid-club-debug-apk`.

## Depois de mudar o app

Sempre que alterar telas, estilos ou logica do webapp, rode:

```powershell
npm run android:sync
```

Isso atualiza o projeto Android com a ultima versao do webapp.
