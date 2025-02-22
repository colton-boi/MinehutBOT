import { MinehutCommand } from '../../structure/command/minehutCommand';
import { Message } from 'discord.js';
import { MessageEmbed } from 'discord.js';
import { prettyDate } from '../../util/functions';
import { startCase, truncate } from 'lodash';

const COLOUR_CODE_EXPR = /&[0-9A-FK-OR]/gim;

export default class ServerInfoCommand extends MinehutCommand {
	constructor() {
		super('serverInfo', {
			aliases: ['server'],
			description: {
				content: 'Look up a Minehut server',
				usage: '<server>',
				examples: ['Warzone'],
			},
			category: 'info',
			args: [
				{
					id: 'serverName',
					type: 'string',
					prompt: {
						start: (msg: Message) =>
							`${msg.author}, what server would you like to look up?`,
						retry: (msg: Message) =>
							`${msg.author}, please provide a server name.`,
					},
				},
			],
		});
	}

	async exec(msg: Message, { serverName }: { serverName: string }) {
		const m = await msg.channel.send(
			`${process.env.EMOJI_LOADING} fetching server **${serverName}**`
		);
		try {
			const server = await this.client.minehutApi.servers.get(serverName);
			const embed = new MessageEmbed();
			embed.setTitle(
				`${server.name} (${server.visibility ? 'visible' : 'unlisted'})`
			);
			embed.setColor(server.online ? 'GREEN' : 'RED');
			embed.setDescription(`\`\`\`${server.motd.replace(COLOUR_CODE_EXPR, '')}\`\`\``);
			embed.addField('Last Started', prettyDate(server.lastOnline), true);
			embed.addField('Created At', prettyDate(server.createdAt), true);
			if (server.playerCount > 0)
				embed.addField('Player Count', `${server.playerCount.toString()} / ${server.maxPlayers.toString()}`, true);
			embed.addField('Suspended?', server.suspended ? 'Yes' : 'No', true);
			embed.addField(
				'Credits/day',
				Math.round(server.creditsPerDay).toString(),
				true
			);
			const icon = await server.getActiveIcon();
			if (icon) embed.addField('Icon', icon.displayName, true);
			if(server.categories.length > 0) embed.addField(
				'Categories',
				server.categories.map(c => `• ${c}`.trim()).join('\n')
			);
			const addons = await server.getInstalledContent();
			if (addons.length > 0)
				embed.addField(
					'Installed Content',
					addons
						.map(p =>
							`• ${p.title} ${
								p.category == 'Plugin' ? '' : `(${p.category})`
							}`.trim()
						)
						.join('\n')
				);
			embed.addField(
				'Server Properties',
				Object.keys(server.serverProperties)
					.map(
						key =>
							`⋆ **${startCase(key)}**: ${
								typeof server.serverProperties[key] === 'boolean'
									? server.serverProperties[key]
										? 'Yes'
										: 'No'
									: server.serverProperties[key].toString().length > 0
									? `\`${truncate(server.serverProperties[key] + '', {
											length: 50,
									  })}\``
									: truncate(server.serverProperties[key] + '', { length: 50 })
							}`
					)
					.join('\n'),
				true
			);
			embed.setFooter(
				`Requested by ${msg.author.tag}`,
				msg.author.displayAvatarURL()
			);
			return m.edit({ content: null, embeds: [embed] });
		} catch (e) {
			if (process.env.NODE_ENV === 'development') console.log(e);
			return m.edit(`${process.env.EMOJI_CROSS} could not fetch server`);
		}
	}
}
