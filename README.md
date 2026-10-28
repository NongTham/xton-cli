# Xton CLI

Standalone CLI for scaffolding Discord.js projects with [XtonCore](https://www.npmjs.com/package/xtoncore).

## Install

```bash
npm install -g xton-cli
xton --help
```

## Commands

```bash
xton init my-bot
xton init my-bot --javascript --yes
xton generate command ping --category utility
xton gen button confirm
xton generate job hourly-report
xton generate locale th-TH
```

Generated projects use `xtoncore@^3.0.2`. The CLI does not make performance claims; measure your own application.

## Development

```bash
npm install
npm test
npm run build
npm pack --dry-run
```

## License

ISC
