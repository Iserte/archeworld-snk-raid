import fs from 'fs';
import path from 'path';
import { Client, Collection, Events, GatewayIntentBits } from 'discord.js';
import { PrismaClient } from '@prisma/client'

import { token, devToken, arquivo } from './config.json';

import { GoogleSpreadsheet } from 'google-spreadsheet';
import credentials from './credentials.json';
import raid, { enterQueue, leaveQueue, removeQueue, selectRoleMenu } from './commands/raid';


const isDevelopmentMode = process.env.TS_NODE_DEV === "development" ? true : false

interface Data {
  limit: number;
  nextKey: null;
  items: [
    {
      Ranking: number;
      RankingChange: number;
      WorldUID: number;
      WorldName: string;
      GuildName: string;
      Class: number;
      CharacterName: string;
      RankingValue: number;
      ProfesionLevel: string;
    }
  ];
  totalCount: number;
  additional: {
    baseDt: Date;
  }
}

export class ClientPlusCommands extends Client {
  commands!: Collection<unknown, unknown>;
}

const prisma = new PrismaClient()

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers] }) as ClientPlusCommands;

client.commands = new Collection();

const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js') || file.endsWith('.ts'));

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const command = require(filePath).default;
  // Set a new item in the Collection with the key as the command name and the value as the exported module
  if ('data' in command && 'execute' in command) {
    client.commands.set(command.data.name, command);
  } else {
    console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
  }
}

client.once(Events.ClientReady, async (c) => {
  console.log(`Ready! Logged in as ${c.user.tag}`);
  const interval = 1000 * 60 * 5;

  await updateDiscordMember();
  // setInterval(async () => {
  //   await updateDiscordMember();
  // }, interval)
});

client.on("interactionCreate", (interaction) => {
  if (interaction.isCommand()) {
    if (interaction.commandName === "raid") {
      raid.execute(interaction)
    }
  } else if (interaction.isButton()) {
    if (interaction.customId.includes("enterQueue")) {
      enterQueue(interaction)
    }
    if (interaction.customId.includes("leaveQueue")) {
      leaveQueue(interaction)
    }
    if (interaction.customId.includes("selectRoleMenu")) {
      selectRoleMenu(interaction)
    }
  } else if (interaction.isStringSelectMenu()) {
    if (interaction.customId.includes("removeQueue")) {
      removeQueue(interaction)
    }
  }
})

client.login(isDevelopmentMode ? devToken : token);

export async function updateDiscordMember() {
  // const _guild = (await client.guilds.fetch()).map(g => g.name === "Iserte" && g)[0]
  // if (!_guild) return;

  const guilds = await client.guilds.fetch()

  for (const [guildId, _guild] of guilds) {
    const guild = await _guild.fetch()

    const sheet = await getSpreadsheetData()
    await sheet.loadHeaderRow(3)
    await sheet.loadCells()

    const nicknameColIndex = sheet.headerValues.indexOf("Personagem")

    const rows = await sheet.getRows()

    const users = []

    for (const row of rows) {
      const discordId = row["Discord Id"] as string;
      const discordUser = row["Discord User"] as string;
      const nickname = row["Personagem"] as string;
      const gameClass = row["Class"] as string;
      const role = row["Role"] as string;
      const rating = row["Rating"] as string;
      const clan = row["Clã"] as string;


      const priority =
        sheet.getCell(row.rowIndex - 1, nicknameColIndex).effectiveFormat.backgroundColor.red !== 1 ||
        sheet.getCell(row.rowIndex - 1, nicknameColIndex).effectiveFormat.backgroundColor.green !== 1 ||
        sheet.getCell(row.rowIndex - 1, nicknameColIndex).effectiveFormat.backgroundColor.blue !== 1;

      if (
        !discordId ||
        !nickname ||
        !gameClass ||
        !role ||
        !rating ||
        !clan
      ) continue;
      console.log(`Atualizando o membro: ${nickname}`)

      users.push({
        discordId,
        discordUser,
        nickname,
        gameClass,
        role,
        rating: Number(rating),
        clan,
        priority
      })
    }

    try {
      const dbUsers = await prisma.user.findMany()

      for (const user of users) {
        let dbUser = dbUsers.find(u => u.discordId === user.discordId)

        if (!dbUser) {
          dbUser = dbUsers.find(u => u.nickname === user.nickname)
          if (!dbUser) {
            await prisma.user.create({
              data: user
            })
          }
          else {
            if (
              user.clan === dbUser.clan &&
              user.discordId === dbUser.discordId &&
              user.discordUser === dbUser.discordUser &&
              user.gameClass === dbUser.gameClass &&
              user.nickname === dbUser.nickname &&
              user.priority === dbUser.priority &&
              user.rating === dbUser.rating &&
              user.role === dbUser.role
            ) {
              continue;
            } else {
              await prisma.user.update({
                data: user,
                where: {
                  discordId: dbUser.discordId
                }
              })
            }
          }
        }
        else {
          if (
            user.clan === dbUser.clan &&
            user.discordId === dbUser.discordId &&
            user.discordUser === dbUser.discordUser &&
            user.gameClass === dbUser.gameClass &&
            user.nickname === dbUser.nickname &&
            user.priority === dbUser.priority &&
            user.rating === dbUser.rating &&
            user.role === dbUser.role
          ) {
            continue;
          } else {
            await prisma.user.update({
              data: user,
              where: {
                discordId: dbUser.discordId
              }
            })
          }
        }
      }

      console.log("Sucesso");
    } catch (error) {
      console.log(error)
      console.log(`Falhou`);
      continue;
    }
  }
}




export async function getSpreadsheetData() {
  const doc = new GoogleSpreadsheet(arquivo.id);

  await doc.useServiceAccountAuth({
    client_email: credentials.client_email,
    private_key: credentials.private_key.replace(/\\n/g, '\n')
  })
  await doc.loadInfo();

  return doc.sheetsByTitle["RankPanel"]
}