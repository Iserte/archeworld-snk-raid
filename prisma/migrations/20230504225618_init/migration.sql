-- CreateEnum
CREATE TYPE "Priority" AS ENUM ('PLAYER', 'STREAMER', 'STAFF');

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('Mage', 'Archer', 'Tank', 'Melee');

-- CreateEnum
CREATE TYPE "GameClass" AS ENUM ('Hexblade', 'Hex_Warden', 'Hordebreaker', 'Dreadhunter', 'Harbinger', 'Shadowblade', 'Dirgeweaver', 'Shaman', 'Abolisher', 'Doomlord', 'Liberator', 'Crusader', 'Blighter', 'Dawncaller', 'Paladin', 'Bloodreaver', 'Bonestalker', 'Enforcer', 'Darkrunner', 'Herald', 'Argent', 'Dreadbow', 'Ravager', 'Executioner', 'Lorebreaker', 'Blackguard', 'Destroyer', 'Outrider', 'Bloodskald', 'Warpriest', 'Hellweaver', 'Spellword', 'Fleshshaper', 'Blade_Dancer', 'Inquisitor', 'Bloodthrall', 'Dreambreaker', 'Defiler', 'Archon', 'Cabalist', 'Shadowknight', 'Poxbane', 'Shadowbane', 'Nightcloak', 'Arcane_Hunter', 'Arcanist', 'Eidolon', 'Enchantrix', 'Hierophant', 'Shadestriker', 'Demonologist', 'Shroudmaster', 'Tombcaller', 'Necromancer', 'Stormcaster', 'Trickster', 'Songcraft', 'Hex_Ranger', 'Soulbow', 'Daggerspell', 'Lamentor', 'Skullknight', 'Bastion', 'Thaumaturge', 'Nightblade', 'Tomb_Warden', 'Templar', 'Dreadstone', 'Battlemage', 'Dreadnaught', 'Dark_Aegis', 'Justicar', 'Farslayer', 'Stone_Arrow', 'Honorguard', 'Druid', 'Swiftstone', 'Earthsinger', 'Scion', 'Nightbearer', 'Death_Warden', 'Caretaker', 'Astral_Ranger', 'Revenant', 'Planeshifter', 'Phantasm', 'Edgewalker', 'Stormchaser', 'Primeval', 'Howler', 'Oracle', 'Enigmatist', 'Spellsong', 'Boneweaver', 'Exorcist', 'Soothsayer', 'Cleric', 'Spellbow', 'Assassin', 'Gravesinger', 'Blood_Arrow', 'Reaper', 'Requiem', 'Cultist', 'Nocturne', 'Doombringer', 'Sorrowsong', 'Infiltrator', 'Evoker', 'Naturalist', 'Ebonsong', 'Ranger', 'Soulsong', 'Spellsinger', 'Animist', 'Gypsy', 'Confessor');

-- CreateEnum
CREATE TYPE "Clan" AS ENUM ('look_a_snack', 'defn_a_snack', 'snake_snack', 'who_said_snack', 'tempest_snack', 'we_are_snack', 'another_snack', 'need_a_snack', 'just_a_snack', 'save_your_snack', 'not_a_snack', 'gimme_a_snack');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "discordId" TEXT NOT NULL,
    "discordUser" TEXT,
    "nickname" TEXT NOT NULL,
    "gameClass" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "clan" TEXT NOT NULL,
    "priority" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Queue" (
    "id" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT,

    CONSTRAINT "Queue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_RaidMembers" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "_QueueMembers" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "User_discordId_key" ON "User"("discordId");

-- CreateIndex
CREATE UNIQUE INDEX "_RaidMembers_AB_unique" ON "_RaidMembers"("A", "B");

-- CreateIndex
CREATE INDEX "_RaidMembers_B_index" ON "_RaidMembers"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_QueueMembers_AB_unique" ON "_QueueMembers"("A", "B");

-- CreateIndex
CREATE INDEX "_QueueMembers_B_index" ON "_QueueMembers"("B");

-- AddForeignKey
ALTER TABLE "Queue" ADD CONSTRAINT "Queue_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_RaidMembers" ADD CONSTRAINT "_RaidMembers_A_fkey" FOREIGN KEY ("A") REFERENCES "Queue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_RaidMembers" ADD CONSTRAINT "_RaidMembers_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_QueueMembers" ADD CONSTRAINT "_QueueMembers_A_fkey" FOREIGN KEY ("A") REFERENCES "Queue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_QueueMembers" ADD CONSTRAINT "_QueueMembers_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
