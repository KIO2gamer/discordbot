const {
    SlashCommandBuilder,
    EmbedBuilder,
    PermissionFlagsBits
} = require('discord.js')
const { handleError } = require('../../bot_utils/errorHandler')

module.exports = {
    data: new SlashCommandBuilder()
        .setName('embed')
        .setDescription('Posts a pre-formatted embed message.')
        .addStringOption((option) =>
            option
                .setName('type')
                .setDescription('Select the type of embed to post')
                .setRequired(true)
                .addChoices(
                    { name: 'Welcome', value: 'welcome' },
                    { name: 'Level Roles', value: 'level_roles' },
                    { name: 'Server Booster Perks', value: 'booster_perks' },
                    { name: 'Other Roles', value: 'other_roles' },
                    { name: 'All Role Information', value: 'all_roles_info' },
                    { name: 'Forms', value: 'forms' },
                    { name: 'Server Rules', value: 'rules' },
                    { name: 'Self-Assignable Roles', value: 'self_roles' },
                    { name: 'All Embeds', value: 'all' }
                )
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true })

        const embedType = interaction.options.getString('type')

        //const roles = this.getRoles(interaction)
        const embeds = this.getEmbeds(interaction)

        try {
            if (embeds[embedType]) {
                const embed = embeds[embedType]

                if (Array.isArray(embed)) {
                    await interaction.channel.send({ embeds: embed })

                    await interaction.editReply({
                        content: 'Embed sent successfully!',
                        ephemeral: true
                    })
                } else {
                    await interaction.channel.send({ embeds: [embed] })

                    await interaction.editReply({
                        content: 'Embed sent successfully!',
                        ephemeral: true
                    })
                }
            } else if (embedType === 'all_roles_info') {
                await interaction.channel.send({
                    embeds: [
                        //embeds.level_roles,
                        embeds.booster_perks,
                        embeds.other_roles
                    ]
                })

                await interaction.editReply({
                    content: 'Embed sent successfully!',
                    ephemeral: true
                })
            } else if (embedType === 'all') {
                await interaction.channel.send({
                    embeds: [
                        embeds.welcome,
                        //embeds.level_roles,
                        embeds.booster_perks,
                        embeds.other_roles,
                        embeds.forms,
                        embeds.self_roles
                    ]
                })

                await interaction.editReply({
                    content: 'Embed sent successfully!',
                    ephemeral: true
                })
            } else {
                return interaction.editReply({
                    content: 'Invalid embed type chosen!',
                    ephemeral: true
                })
            }
        } catch (error) {
            handleError(
                interaction,
                error,

                await interaction.editReply({
                    content:
                        'There was an error trying to execute that command.',
                    ephemeral: true
                })
            )
        }
    },

    getEmbeds(interaction) {
        const { guild } = interaction
        return {
            welcome: new EmbedBuilder()
                .setTitle(`Welcome to ${interaction.member.guild.name}! 👋`)
                .setDescription(
                    `Welcome to our community! We're glad you're here.\n**Here are some key things to check out:**\n\n> - **<#938309117771149342>:** Read our server rules to ensure a positive experience for everyone.\n> - **<#950302591504498718>:** Get support or ask any questions you have.\n> - **[Server Invite Link](https://discord.gg/y3GvzeZVJ3)**: Share the server with your friends!`
                )
                .setColor('#7289DA')
                .setThumbnail(guild.iconURL({ dynamic: true, size: 512 })),

            // level_roles: new EmbedBuilder()
            //     .setTitle('🔰 Level Roles 🔰')
            //     .setDescription(
            //         `
            //         Talking in the server will allow you to gain xp. The more you earn xp, the higher level you unlock and the better perks you will get. Every minute, you earn **35-70 XP** by chatting in the server.\n\n## **Level Perks: **
                    
            //         **Level 5** - <@&1179261239042515014>
            //         - Access to \n- y\n
            //         **Level 10** - <@&944618683693686864>
            //         - y\n
            //         **Level 15** - <@&944618768074686545>
            //         - y\n
            //         **Level 20** - <@&944870028371697726>
            //         - y\n
            //         **Level 25** - <@&944870267874865152>
            //         - y\n
            //         **Level 30** - <@&944870323218710548>
            //         - y\n
            //         **Level 35** - <@&944870387987132437>
            //         - y\n
            //         **Level 40** - <@&1179121387793809519>
            //         - y\n
            //         **Level 45** - <@&1178939286486261800>
            //         - y\n
            //         **Level 50** - <@&944870441275756565>
            //         - y\n
            //         **Level 55** - <@&1178939982988201994>
            //         - y\n
            //         **Level 60** - <@&1178940249695584256>
            //         - y\n
            //         **Level 65** - <@&1178940469292576798>
            //         - y\n
            //         **Level 70** - <@&954309817990791238>
            //         - y\n
            //         **Level 75** - <@&1291352414896525323>
            //         - y\n
            //         **Level 80** - <@&1291356950373597256>
            //         - y\n
            //         **Level 85** - <@&1291356990865539082>
            //         - y\n
            //         **Level 90** - <@&1291357011090604103>
            //         - y\n
            //         **Level 95** - <@&1291357051624230993>
            //         - y\n
            //         **Level 100** - <@&1291357071140323448>
            //         - y\n
            //         `
            //     )
            //     .setThumbnail('https://i.imgur.com/v7QMeOL.png')
            //     .setColor('Purple'),

            booster_perks: new EmbedBuilder()
                .setTitle('Thank You, Server Boosters! ❤️')
                .setDescription(
                    `Boosting our server helps us grow and provides you with amazing perks!\n## **Perks:**\n - Special ${'Booster'} role\n- Access to exclusive channels: <#950318340889518150>, <#950318103739400202>\n- Ability to change your nickname\n- Use external emojis in the server`
                )
                .setColor('#F47FFF')
                .setThumbnail('https://i.imgur.com/Y0l9Muu.png'),

            other_roles: new EmbedBuilder()
                .setTitle('Other Server Roles')
                .setDescription(
                    'These roles are assigned based on specific criteria or by staff.'
                )
                .addFields(
                    {
                        name: 'Staff Roles',
                        value: `
                            **${'Admin'}** - Manages server settings and enforces rules.
                            **${'Moderator'}** - Assists with moderation and community management.
                            **${'Trainee Moderator'}** -  New moderators learning the ropes. 
                        `,
                        inline: true
                    },
                    {
                        name: 'Special Roles',
                        value: `
                            **${'OG Members'}** -  Early supporters of the server.
                            **${'Subscriber'}** - Subscribers of our [YouTube Channel](https://www.youtube.com/@kio2gamer).
                        `,
                        inline: true
                    }
                )
                .setColor('#0099ff')
                .setThumbnail('https://i.imgur.com/mVq1EEw.png'),

            forms: new EmbedBuilder()
                .setTitle('📋 Important Forms 📋')
                .setDescription(
                    'Access important forms for applications and appeals.'
                )
                .addFields(
                    {
                        name: 'Moderator Application',
                        value: '> Apply to join our moderation team! [Link to Application](https://forms.gle/SRTkYJqYM3xCjoLF7)'
                    },
                    {
                        name: 'Ban/Mute Appeal',
                        value: '> Appeal a ban or mute if you believe it was unjust. [Link to Appeal Form](https://forms.gle/9xtrkcTzEeTu6pmeA)'
                    }
                )
                .setColor('#00FFFF')
                .setThumbnail(
                    'https://upload.wikimedia.org/wikipedia/commons/1/1f/Writing_icon.png'
                ),

            rules: [
                new EmbedBuilder()
                    .setTitle('Rule 1: Keep It Clean and Respectful')
                    .setDescription(
                        "This server is a place for everyone to enjoy. Let's keep it friendly and respectful."
                    )
                    .addFields(
                        {
                            name: '> 1.1 No Spamming',
                            value: "Avoid sending a bunch of messages in a row.  Let's give everyone a chance to chat!"
                        },
                        {
                            name: '> 1.2 Be Original',
                            value: "No need to repeat the same message over and over.  Let's keep things fresh."
                        },
                        {
                            name: '> 1.3 Stay On Topic',
                            value: "Keep your messages relevant to the current conversation.  Let's avoid getting sidetracked."
                        },
                        {
                            name: '> 1.4 Mentioning Others',
                            value: "Only mention people when you need their attention. Let's avoid unnecessary tagging."
                        },
                        {
                            name: '> 1.5 Voice Chat Etiquette',
                            value: 'Be mindful of others in voice channels.  No loud noises or interruptions, please.'
                        },
                        {
                            name: '> 1.6 No Ghost Pinging',
                            value: "Don't mention someone then delete your message. It's just rude!  Try to avoid this behavior."
                        }
                    )
                    .setColor('#FF0000'),

                new EmbedBuilder()
                    .setTitle('Rule 2: Be Kind and Inclusive')
                    .setDescription(
                        "Everyone deserves to feel safe and welcome here.  Let's treat each other with respect."
                    )
                    .addFields(
                        {
                            name: '> 2.1 No Bullying or Harassment',
                            value: 'Treat everyone with respect.  Bullying, harassment, and personal attacks are not allowed.'
                        },
                        {
                            name: '> 2.2 Embrace Diversity',
                            value: 'Discrimination based on race, religion, gender, sexual orientation, or anything else is strictly prohibited.'
                        },
                        {
                            name: '> 2.3 Use Appropriate Language',
                            value: "Avoid using slurs, hate speech, or anything that could be offensive. Let's keep it clean."
                        },
                        {
                            name: '> 2.4 Privacy Matters',
                            value: "Don't share personal information about others without their permission.  Respect everyone's privacy."
                        },
                        {
                            name: '> 2.5 Keep It Safe',
                            value: 'Threats of violence or harm are absolutely not allowed.  We want to keep everyone safe.'
                        }
                    )
                    .setColor('#FF0000'),

                new EmbedBuilder()
                    .setTitle('Rule 3: No NSFW Content')
                    .setDescription(
                        "This server is meant for everyone.  Let's keep things appropriate for all ages."
                    )
                    .addFields(
                        {
                            name: '> 3.1 Keep It Clean',
                            value: "Don't post NSFW (Not Safe for Work) content, including sexually suggestive material, gore, or violence."
                        },
                        {
                            name: '> 3.2 Mind Your Language',
                            value: "Use language that's appropriate for everyone.  Avoid using explicit or suggestive words."
                        }
                    )
                    .setColor('#FF0000'),

                new EmbedBuilder()
                    .setTitle('Rule 4: Speak English')
                    .setDescription(
                        "English is the official language of this server.  Let's make sure everyone can understand each other."
                    )
                    .addFields({
                        name: '> 4.1  Communication is Key',
                        value: "English helps us all understand each other clearly.  Let's keep things simple and straightforward."
                    })
                    .setColor('#FF0000'),

                new EmbedBuilder()
                    .setTitle('Rule 5:  Keep It Friendly')
                    .setDescription(
                        "Let's avoid sensitive topics that might cause disagreements.  We want to keep things harmonious."
                    )
                    .addFields(
                        {
                            name: '> 5.1  Avoid Sensitive Subjects',
                            value: "Discussions about politics and religion can be divisive. Let's focus on common ground."
                        },
                        {
                            name: '> 5.2  Be Respectful of Differences',
                            value: "If these topics come up, let's be respectful of everyone's opinions and avoid arguments."
                        }
                    )
                    .setColor('#FF0000'),

                new EmbedBuilder()
                    .setTitle('Rule 6:  Watch Your Language')
                    .setDescription(
                        "Be mindful of what you say. Let's keep the conversation positive and respectful."
                    )
                    .addFields(
                        {
                            name: '> 6.1  No Excessive Swearing',
                            value: "While a little bit of swearing is okay, let's avoid excessive profanity."
                        },
                        {
                            name: '> 6.2  No Hate Speech',
                            value: 'Hate speech, derogatory terms, and slurs are never acceptable.  Be kind to everyone.'
                        },
                        {
                            name: '> 6.3  Respect the Rules',
                            value: "Don't try to get around the rules by using creative spellings or tricks.  Let's play fair."
                        }
                    )
                    .setColor('#FF0000'),

                new EmbedBuilder()
                    .setTitle('Rule 7: Choose a Mentionable Username')
                    .setDescription(
                        "Pick a username that's easy for others to mention.  Let's make it simple to chat with each other."
                    )
                    .addFields(
                        {
                            name: '> 7.1  Easy to Mention',
                            value: 'Choose a username that other members can easily ping (@mention) without any confusion.'
                        },
                        {
                            name: '> 7.2  Avoid Difficult Characters',
                            value: "Don't use special characters, symbols, or excessive capitalization that make it hard to mention you."
                        }
                    )
                    .setColor('#FF0000'),

                new EmbedBuilder()
                    .setTitle('Rule 8:  Stay Organized')
                    .setDescription(
                        "Each channel has a purpose. Let's keep things tidy and easy to find."
                    )
                    .addFields(
                        {
                            name: '> 8.1  Use Channels Correctly',
                            value: 'Post content in the right channel so we can easily find what we need.'
                        },
                        {
                            name: '> 8.2  Find Your Place',
                            value: "For general chat, use the designated channel.  Let's keep conversations in the right place."
                        },
                        {
                            name: '> 8.3  Be Mindful of Conversations',
                            value: "Don't interrupt ongoing conversations with unrelated topics. Let's stay focused."
                        }
                    )
                    .setColor('#FF0000'),

                new EmbedBuilder()
                    .setTitle('Rule 9:  No Advertising')
                    .setDescription(
                        "This server is for hanging out and having fun. Let's keep it focused on our community."
                    )
                    .addFields(
                        {
                            name: '> 9.1  No Unauthorized Ads',
                            value: 'Advertising other servers, websites, social media, or projects without permission is not allowed.'
                        },
                        {
                            name: '> 9.2  Respect Other Members',
                            value: "Don't send unsolicited advertisements or promotional messages to other members.  Let's be respectful."
                        }
                    )
                    .setColor('#FF0000'),

                new EmbedBuilder()
                    .setTitle("Rule 10:  Follow Discord's Rules")
                    .setDescription(
                        "Let's make sure everyone has a positive and safe experience.  Let's all follow Discord's guidelines."
                    )
                    .addFields(
                        {
                            name: "> 10.1  Discord's Community Guidelines",
                            value: "In addition to our server rules, please read and follow [Discord's Community Guidelines](https://discord.com/guidelines)."
                        },
                        {
                            name: '> 10.2  Understand the Consequences',
                            value: "Violating Discord's guidelines might result in actions taken against your account by Discord."
                        }
                    )
                    .setColor('#FF0000')
            ],

            self_roles: new EmbedBuilder()
                .setTitle('Customize Your Experience! 🎨')
                .setDescription(
                    `Assign yourself roles to personalize your experience and connect with others who share your interests!\n **How to get roles:**\n\n - Go to the <#channel-id-for-self-roles> channel.\n- React to the messages corresponding to the roles you want.`
                )
                .setColor('#800080')
                .setThumbnail('https://i.imgur.com/nl9JNfj.png')
        }
    }
}
