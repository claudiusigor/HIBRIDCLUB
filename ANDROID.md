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

## Gerar APK de teste local

Com o Android ja criado:

```powershell
npm run android:debug
```

O APK de teste fica em:

```text
android/app/build/outputs/apk/debug/app-debug.apk
```

Esse APK de debug serve para teste rapido. Para atualizar no celular sem
desinstalar, use o APK release assinado do GitHub Actions.

## Atualizar no celular sem desinstalar

O Android so aceita atualizar um app instalado quando:

- o `applicationId` continua igual: `com.hibridclub.app`;
- o APK novo foi assinado com a mesma chave do APK instalado;
- o `versionCode` do APK novo e maior que o anterior.

O projeto ja esta preparado para isso. O GitHub Actions usa:

- `ANDROID_VERSION_CODE=${{ github.run_number }}`;
- `ANDROID_VERSION_NAME=1.0.${{ github.run_number }}`;
- APK release assinado com uma chave guardada em GitHub Secrets.

## Configurar a chave oficial uma vez

No seu computador, gere uma chave release uma unica vez:

```powershell
keytool -genkeypair -v `
  -keystore hibridclub-release.jks `
  -alias hibridclub `
  -keyalg RSA `
  -keysize 2048 `
  -validity 10000
```

Depois converta a chave para Base64:

```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("hibridclub-release.jks")) | Set-Clipboard
```

No GitHub, abra o repositorio e va em:

```text
Settings > Secrets and variables > Actions > New repository secret
```

Crie estes secrets:

```text
ANDROID_KEYSTORE_BASE64   conteudo Base64 copiado
ANDROID_KEYSTORE_PASSWORD senha do keystore
ANDROID_KEY_ALIAS         hibridclub
ANDROID_KEY_PASSWORD      senha da chave
```

Guarde o arquivo `hibridclub-release.jks` e as senhas em local seguro. Se essa
chave for perdida, o Android nao deixa atualizar o app ja instalado com uma nova
chave.

## Gerar APK pelo GitHub

O workflow `Build Android APK` roda automaticamente a cada push na branch `main`.

Para baixar o APK gerado:

1. Abra o repositorio no GitHub.
2. Entre em `Actions`.
3. Abra a execucao `Build Android APK`.
4. Baixe o artefato `hibrid-club-release-apk`.

Se voce rodar o workflow manualmente por `Run workflow`, ele tambem cria uma
entrada em `Releases` com o APK anexado. Esse e o caminho mais simples para
baixar pelo celular.

## Depois de mudar o app

Sempre que alterar telas, estilos ou logica do webapp, rode:

```powershell
npm run android:sync
```

Isso atualiza o projeto Android com a ultima versao do webapp.
