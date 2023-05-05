import { PrismaClient } from "@prisma/client";
import Discordjs, { ActionRowBuilder, ButtonBuilder, ButtonInteraction, CommandInteraction, EmbedBuilder, Message, SlashCommandBuilder, StringSelectMenuBuilder, StringSelectMenuInteraction, StringSelectMenuOptionBuilder, VoiceChannel } from "discord.js";
import { GoogleSpreadsheetCell } from "google-spreadsheet";
// import { getSpreadsheetData } from "../index";
// import { updateGooglesheets } from "../index";

const prisma = new PrismaClient()

export default {
  data: new SlashCommandBuilder()
    .setName('raid')
    .setDescription('Comando utilizado para gerenciar a fila de uma raid.')
    .addSubcommand(subcommand =>
      subcommand
        .setName("create")
        .setDescription("Cria uma nova fila para raid.")
    )
  ,
  async execute(interaction: CommandInteraction) {
    await interaction.deferReply({ ephemeral: true });
    const { data } = interaction.options

    if (data[0]) {
      if (interaction.options.data[0].name === "create") {
        await createRaid(interaction)
        // await updateEmbed(interaction, "ed2906fd-25ab-414a-ba10-30511a40fd43")
      }
    }
    // await createRaid(interaction);
    // await updateEmbed(interaction);
    // await interaction.editReply('\u200B');
  },
};


async function createRaid(interaction: CommandInteraction) {
  const memberRoles = interaction.member?.roles as Discordjs.GuildMemberRoleManager
  const hasLeaderRole = memberRoles.cache.find(role => role.name === "Arche Raid Leader") ? true : false

  if (!hasLeaderRole) {
    return await interaction.editReply({
      content: "Você não tem permissão para executar essa função."
    });
  }

  const user = await prisma.user.findUnique({
    where: {
      discordId: interaction.user.id
    }
  })

  if (!user) {
    return await interaction.reply({ content: "O id do seu discord não foi encontrado. Atualize o formulário.", ephemeral: true })
  }

  const message = await interaction.channel?.send("Aguarde, sua raid está sendo criada...")
  if (!message) return;

  const queue = await prisma.queue.create({
    data: {
      channelId: interaction.channelId,
      messageId: message.id,
      userId: user.id
    }
  })

  try {
    await interaction.deleteReply();
  } catch (error) {

  }
  await updateEmbed(interaction, queue.id)
}

async function updateEmbed(interaction: CommandInteraction | ButtonInteraction | StringSelectMenuInteraction, queueId: string) {
  const queue = await prisma.queue.findUnique({
    where: {
      id: queueId
    },
    include: {
      RaidLeader: true,
      QueueMembers: true,
      RaidMembers: true
    }
  })
  if (!queue) return;

  const riftChannel = await interaction.guild?.channels.fetch(queue?.channelId!) as VoiceChannel
  if (!riftChannel) return;

  const embedMessage = await riftChannel.messages.fetch(queue?.messageId!) as Message
  if (!embedMessage) return;

  const dbMembers = await prisma.user.findMany()

  const totalDpsMembers = dbMembers
    .filter(member => member.role === "Mage" || member.role === "Archer" || member.role === "Melee")

  const totalHealerMembers = dbMembers
    .filter(member => member.role === "Healer")

  const totalTankMembers = dbMembers
    .filter(member => member.role === "Tank")

  const queueMembers = queue.QueueMembers
    .sort((a, b) => Number(a.rating) > Number(b.rating) ? 1 : -2)
    .sort((a, b) => a.priority < b.priority ? 2 : -1)

  const dpsMembers = queueMembers
    .filter(member => member.role === "Mage" || member.role === "Archer" || member.role === "Melee")
    .map((member, index) => `\`${String(index + 1).padStart(2, "0")}\`\t${member.nickname} ${member.priority ? "✔" : ""}`)

  const healerMembers = queueMembers
    .filter(member => member.role === "Healer")
    .map((member, index) => `\`${String(index + 1).padStart(2, "0")}\`\t${member.nickname} ${member.priority ? "✔" : ""}`)

  const tankMembers = queueMembers
    .filter(member => member.role === "Tank")
    .map((member, index) => `\`${String(index + 1).padStart(2, "0")}\`\t${member.nickname} ${member.priority ? "✔" : ""}`)

  const queueSize = 24

  const embed = new EmbedBuilder()
    .setColor(0x0099FF)
    .setTitle('Fila da Raid - SNACK')
    .setDescription(':flag_br: Selecione abaixo para entrar na fila da raid.\n:flag_us: Select below to enter the raid queue.')
    .addFields(
      { name: '\u200B', value: '\u200B' },
      { name: '👑 Líder da Raid', value: `\`Líder\` ${queue?.RaidLeader?.nickname} ${queue?.RaidLeader?.priority ? "✔" : ""}\n`, inline: true },
      { name: ':busts_in_silhouette: Fila de Espera', value: `\`${queueMembers.length}/${dbMembers.length} Jogadores\``, inline: true },
      { name: '\u200B', value: '\u200B' },
      {
        name: `⚔ DPS \`${dpsMembers.length}/${totalDpsMembers.length}\``,
        value: `${dpsMembers.length > queueSize ? `${dpsMembers.slice(0, queueSize).join("\n").substring(0, 1018)}\n\`... +Outros\`` : dpsMembers.join("\n").substring(0, 1018)}\u200B`,
        inline: true
      },
      {
        name: `:herb: HEALER \`${healerMembers.length}/${totalHealerMembers.length}\``,
        value: `${healerMembers.length > queueSize ? `${healerMembers.slice(0, queueSize).join("\n").substring(0, 1018)}\n\`... +Outros\`` : healerMembers.join("\n").substring(0, 1018)}\u200B`,
        inline: true
      },
      {
        name: `:shield: TANK \`${tankMembers.length}/${totalTankMembers.length}\``,
        value: `${tankMembers.length > queueSize ? `${tankMembers.slice(0, queueSize).join("\n").substring(0, 1018)}\n\`... +Outros\`` : tankMembers.join("\n").substring(0, 1018)}\u200B`,
        inline: true
      },
      { name: '\u200B', value: '\u200B' },
    )
    .setFooter({
      text: `Raid Id: ${queue?.id}`
    })

  const enterButton = new ButtonBuilder()
    .setLabel('Entrar na fila')
    .setStyle(Discordjs.ButtonStyle.Success)
    .setCustomId(`enterQueue:${queueId}`)
    .setEmoji("✅")
  // .setDisabled()

  const leaveButton = new ButtonBuilder()
    .setLabel('Sair da fila')
    .setStyle(Discordjs.ButtonStyle.Danger)
    .setCustomId(`leaveQueue:${queueId}`)
    .setEmoji("✖")

  const removeButton = new ButtonBuilder()
    .setLabel('Remover da fila')
    .setStyle(Discordjs.ButtonStyle.Secondary)
    .setCustomId(`selectRoleMenu:${queueId}`)
    .setEmoji("🚫")

  const row = new ActionRowBuilder()
    .addComponents([enterButton, leaveButton, removeButton]) as any

  await embedMessage.edit({ embeds: [embed], components: [row], content: "" })
}

export async function enterQueue(interaction: ButtonInteraction) {
  const [_, queueId] = interaction.customId.split(":");
  console.log(queueId)

  const user = await prisma.user.findUnique({
    where: {
      discordId: interaction.user.id
    }
  })

  if (!user) {
    return await interaction.reply({ content: "O id do seu discord não foi encontrado. Atualize o formulário.", ephemeral: true })
  }

  const queueUser = await prisma.queue.findUnique({
    where: {
      id: queueId,
    },
    include: {
      QueueMembers: true
    }
  })

  if (queueUser?.QueueMembers.find(u => u.discordId === user.discordId)) {
    await interaction.reply({ content: "Você já está na fila.", ephemeral: true })
  } else {
    await prisma.queue.update({
      where: {
        id: queueId
      },
      data: {
        QueueMembers: {
          connect: { id: user.id }
        }
      },
      include: {
        QueueMembers: true
      }
    })
    await interaction.reply({ content: "Você entrou na fila.", ephemeral: true })
  }

  await updateEmbed(interaction, queueId)
}

export async function leaveQueue(interaction: ButtonInteraction) {
  const [_, queueId] = interaction.customId.split(":");
  console.log(queueId)

  const user = await prisma.user.findUnique({
    where: {
      discordId: interaction.user.id
    }
  })

  if (!user) {
    return await interaction.reply({ content: "O id do seu discord não foi encontrado. Atualize o formulário.", ephemeral: true })
  }

  const queueUser = await prisma.queue.findUnique({
    where: {
      id: queueId,
    },
    include: {
      QueueMembers: true
    }
  })

  if (queueUser?.QueueMembers.find(u => u.discordId === user.discordId)) {
    await prisma.queue.update({
      where: {
        id: queueId
      },
      data: {
        QueueMembers: {
          disconnect: { id: user.id }
        }
      },
      include: {
        QueueMembers: true
      }
    })

    await interaction.reply({ content: "Você saiu da fila.", ephemeral: true })
  } else {
    await interaction.reply({ content: "Você não está na fila.", ephemeral: true })
  }

  await updateEmbed(interaction, queueId)
}

export async function selectRoleMenu(interaction: ButtonInteraction) {
  const memberRoles = interaction.member?.roles as Discordjs.GuildMemberRoleManager
  const hasLeaderRole = memberRoles.cache.find(role => role.name === "Arche Raid Leader") ? true : false

  if (!hasLeaderRole) {
    return await interaction.reply({
      content: "Você não tem permissão para executar essa função.",
      ephemeral: true
    });
  }

  const [_, queueId] = interaction.customId.split(":");
  console.log(queueId)

  const queue = await prisma.queue.findUnique({
    where: {
      id: queueId
    },
    include: {
      RaidLeader: true
    }
  })

  if (!queue) return;

  const select = new StringSelectMenuBuilder()
    .setCustomId(`removeQueue:${queueId}`)
    .setPlaceholder('Escolha uma opção')
    .addOptions(
      new StringSelectMenuOptionBuilder()
        .setLabel('DPS')
        .setValue('dps'),
      new StringSelectMenuOptionBuilder()
        .setLabel('Healer')
        .setValue('healer'),
      new StringSelectMenuOptionBuilder()
        .setLabel('Tank')
        .setValue('tank'),
    );

  const row = new ActionRowBuilder<StringSelectMenuBuilder>()
    .addComponents(select)

  await interaction.reply({
    content: 'Selecione a fila',
    components: [row],
    ephemeral: true
  });
}

export async function removeQueue(interaction: StringSelectMenuInteraction) {
  const [_, queueId] = interaction.customId.split(":");
  const role = interaction.values[0]

  const queue = await prisma.queue.findUnique({
    where: {
      id: queueId
    },
    include: {
      QueueMembers: true
    }
  })
  if (!queue) return;

  let members = queue.QueueMembers
    .sort((a, b) => Number(a.rating) > Number(b.rating) ? 1 : -2)
    .sort((a, b) => a.priority < b.priority ? 2 : -1)

  if (role === "dps") {
    members = members.filter(member => member.role === "Melee" || member.role === "Archer" || member.role === "Mage")
  } else if (role === "healer") {
    members = members.filter(member => member.role === "Healer")
  } else if (role === "tank") {
    members = members.filter(member => member.role === "Tank")
  }

  const chosenUser = members.shift()

  if (chosenUser) {
    await prisma.queue.update({
      where: {
        id: queue.id
      },
      data: {
        QueueMembers: {
          disconnect: {
            discordId: chosenUser?.discordId
          }
        }
      }
    })
    await interaction.update({ content: `${chosenUser?.nickname} foi removido da fila.`, components: [] })
  } else {
    await interaction.update({ content: `Não há nenhum jogador na fila de ${role}.`, components: [] })
  }


  await updateEmbed(interaction, queueId)
}