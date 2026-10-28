export type Language = 'typescript' | 'javascript';

const projectTemplates = {
  typescript: `import { Client, GatewayIntentBits } from 'discord.js';
import { ClientHandler } from 'xtoncore';

async function main(): Promise<void> {
  const token = process.env.DISCORD_TOKEN;
  if (!token) throw new Error('DISCORD_TOKEN is required');
  const client = new Client({ intents: [GatewayIntentBits.Guilds] });
  const handler = await ClientHandler.create({
    client,
    commandsPath: './src/commands',
    eventsPath: './src/events',
    validationsPath: './src/validations',
    componentsPath: './src/components',
    jobsPath: './src/jobs',
    localesPath: './src/locales',
    defaultLocale: 'en-US'
  });
  await client.login(token);
  process.once('SIGINT', () => void handler.destroy());
}

void main();
`,
  javascript: `const { Client, GatewayIntentBits } = require('discord.js');
const { ClientHandler } = require('xtoncore');

async function main() {
  const token = process.env.DISCORD_TOKEN;
  if (!token) throw new Error('DISCORD_TOKEN is required');
  const client = new Client({ intents: [GatewayIntentBits.Guilds] });
  const handler = await ClientHandler.create({
    client,
    commandsPath: './src/commands',
    eventsPath: './src/events',
    validationsPath: './src/validations',
    componentsPath: './src/components',
    jobsPath: './src/jobs',
    localesPath: './src/locales',
    defaultLocale: 'en-US'
  });
  await client.login(token);
  process.once('SIGINT', () => void handler.destroy());
}

void main();
`
} as const;

export function projectEntry(language: Language): string {
  return projectTemplates[language];
}

export function commandTemplate(language: Language, name: string): string {
  return language === 'typescript'
    ? `import { SlashCommandBuilder } from 'discord.js';\nimport type { CommandRunOptions } from 'xtoncore';\n\nexport const data = new SlashCommandBuilder().setName('${name}').setDescription('Describe ${name}');\n\nexport async function run({ interaction }: CommandRunOptions) {\n  await interaction.reply('Hello from ${name}!');\n}\n`
    : `const { SlashCommandBuilder } = require('discord.js');\n\nmodule.exports = { data: new SlashCommandBuilder().setName('${name}').setDescription('Describe ${name}'), async run({ interaction }) { await interaction.reply('Hello from ${name}!'); } };\n`;
}

export function moduleTemplate(language: Language, kind: string, name: string): string {
  if (kind === 'event') return language === 'typescript'
    ? `export default async function ${name}(client: unknown) { console.log('Event ${name} fired'); }\n`
    : `module.exports = async function ${name}(client) { console.log('Event ${name} fired'); };\n`;
  if (kind === 'validation') return language === 'typescript'
    ? `export default async function ${name}() { return true; }\n`
    : `module.exports = async function ${name}() { return true; };\n`;
  if (kind === 'job') return language === 'typescript'
    ? `export default { name: '${name}', cron: '0 * * * *', async run(client: unknown, handler: unknown) { console.log('Job ${name} executed'); } };\n`
    : `module.exports = { name: '${name}', cron: '0 * * * *', async run(client, handler) { console.log('Job ${name} executed'); } };\n`;
  if (kind === 'locale') return JSON.stringify({ hello: 'Hello', goodbye: 'Goodbye' }, null, 2) + '\n';
  const type = kind === 'selectmenu' ? 'StringSelectMenuInteraction' : kind === 'modal' ? 'ModalSubmitInteraction' : 'ButtonInteraction';
  const componentType = kind === 'selectmenu' ? 'selectMenu' : kind;
  return language === 'typescript'
    ? `import type { ${type} } from 'discord.js';\nexport const customId = '${name}';\nexport const type = '${componentType}' as const;\nexport async function run(interaction: ${type}, client: unknown) { await interaction.reply({ content: 'Handled ${name}', ephemeral: true }); }\n`
    : `module.exports = { customId: '${name}', type: '${componentType}', async run(interaction, client) { await interaction.reply({ content: 'Handled ${name}', ephemeral: true }); } };\n`;
}
