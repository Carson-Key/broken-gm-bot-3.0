import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';

export const pages = async (interaction, pagesArray, defaultPageGenerator) => {
    const nextButton = new ButtonBuilder()
        .setCustomId('next')
        .setLabel('Next')
        .setStyle(ButtonStyle.Secondary)
    const prevButton = new ButtonBuilder()
        .setCustomId('previous')
        .setLabel('Previous')
        .setStyle(ButtonStyle.Secondary)
    const buttonRow = new ActionRowBuilder()
        .addComponents(
            nextButton
        );

    let currentPage = 0
    const messageObject = await interaction.reply({
        embeds: pagesArray[currentPage].generatePage ? [await pagesArray[currentPage].generatePage(pagesArray[currentPage])] : [await defaultPageGenerator(pagesArray[currentPage])],
        components: pagesArray.length > 1 ? [buttonRow] : [],
        ephemeral: true
    });

    const collector = messageObject.createMessageComponentCollector({
        filter: ({user}) => user.id === interaction.user.id
    })

    collector.on('collect', async (interaction) => {
        interaction.customId === "previous" ? (currentPage -= 1) : (currentPage += 1)

        const buttonRow = new ActionRowBuilder()

        if (currentPage) {
            buttonRow.addComponents(
                prevButton
            );
        }
        if (currentPage + 1 < pagesArray.length) {
            buttonRow.addComponents(
                nextButton
            );
        }

        if (pagesArray[currentPage].generatePage) {
            await interaction.update({
                embeds: [await pagesArray[currentPage].generatePage(pagesArray[currentPage])],
                components: [buttonRow],
                ephemeral: true
            })
        } else {
            await interaction.update({
                embeds: [await defaultPageGenerator(pagesArray[currentPage])],
                components: [buttonRow],
                ephemeral: true
            })
        }
    })
}