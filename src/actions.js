module.exports = {
	initActions: function () {
		let self = this
		let actions = {}

		actions['fader_increase_once'] = {
			name: 'Increase Fader Level 1 Point and Stop',
			options: [],
			callback: async function () {
				self.Fader_Change('increase')
			},
		}

		actions['fader_increase_timer'] = {
			name: 'Increase Fader Level 1 Point Continuously',
			options: [
				{
					type: 'number',
					label: 'Rate',
					id: 'rate',
					default: '500',
					tooltip: 'Time in milliseconds between increases',
				},
			],
			callback: async function (action) {
				self.Fader_Timer('increase', 'start', action.options.rate)
			},
		}

		actions['fader_increase_stop'] = {
			name: 'Stop Increasing Fader Level',
			options: [],
			callback: async function () {
				self.Fader_Timer('increase', 'stop', null)
			},
		}

		actions['fader_decrease_once'] = {
			name: 'Decrease Fader Level 1 Point and Stop',
			options: [],
			callback: async function () {
				self.Fader_Change('decrease')
			},
		}

		actions['fader_decrease_timer'] = {
			name: 'Decrease Fader Level 1 Point Continuously',
			options: [
				{
					type: 'number',
					label: 'Rate',
					id: 'rate',
					default: '500',
					tooltip: 'Time in milliseconds between decreases',
				},
			],
			callback: async function (action) {
				self.Fader_Timer('decrease', 'start', action.options.rate)
			},
		}

		actions['fader_decrease_stop'] = {
			name: 'Stop Decreasing Fader Level',
			options: [],
			callback: async function () {
				self.Fader_Timer('decrease', 'stop', null)
			},
		}

		actions['fader_setlevel'] = {
			name: 'Set Fader to Level',
			options: [
				{
					type: 'textinput',
					label: 'Level',
					id: 'level',
					tooltip: 'Sets the level to a specific value (0.0-10.0)',
					default: '8.5',
					required: true,
					useVariables: true,
				},
			],
			callback: async function (action) {
				let level = parseFloat(await self.parseVariablesInString(action.options.level)) * 10 //the protocol requires it in 10 but the display uses decimals. i.e. 1.8 = 18

				let cmd

				if (self.config.model === 'cp650') {
					cmd = 'fader_level=' + level
				} else {
					let prefix = ''
					if (self.config.model === 'cp750') {
						prefix = 'cp750.'
					}
					cmd = prefix + 'sys.fader ' + level
				}

				self.sendCommand(cmd)
			},
		}

		if (self.config.model === 'cp650') {
			actions['set_format_button'] = {
				name: 'Set Format Button',
				options: [
					{
						type: 'dropdown',
						label: 'Format',
						id: 'format',
						default: '0',
						choices: self.CHOICES_FORMATS,
					},
				],
				callback: async function (action) {
					let cmd = 'format_button=' + action.options.format
					self.sendCommand(cmd)
				},
			}
		} else {
			actions['set_macro_preset'] = {
				name: 'Set Macro by Preset Number',
				options: [
					{
						type: 'number',
						label: 'Macro Preset Number',
						id: 'macro',
						min: 1,
						max: 8,
						default: 1,
						step: 1,
						required: true,
						range: true,
						tooltip: '(1-8)',
					},
				],
				callback: async function (action) {
					let prefix = ''
					if (self.config.model === 'cp750') {
						prefix = 'cp750.'
					}
					let cmd = prefix + 'sys.macro_preset ' + action.options.macro
					self.sendCommand(cmd)
				},
			}

			actions['set_macro_name'] = {
				name: 'Set Macro by Name',
				options: [
					{
						type: 'textinput',
						label: 'Macro Name',
						id: 'macro',
						default: '<macro name>',
						required: true,
						useVariables: true,
					},
				],
				callback: async function (action) {
					let prefix = ''
					if (self.config.model === 'cp750') {
						prefix = 'cp750.'
					}
					let cmd = prefix + 'sys.macro_name ' + (await self.parseVariablesInString(action.options.macro))
					self.sendCommand(cmd)
				},
			}
		}

		actions['mute_on'] = {
			name: 'Mute On',
			options: [],
			callback: async function () {
				let cmd

				if (self.config.model === 'cp650') {
					cmd = 'mute=1'
				} else {
					let prefix = ''
					if (self.config.model === 'cp750') {
						prefix = 'cp750.'
					}
					cmd = prefix + 'sys.mute 1'
				}

				self.sendCommand(cmd)
			},
		}

		actions['mute_off'] = {
			name: 'Mute Off',
			options: [],
			callback: async function () {
				let cmd

				if (self.config.model === 'cp650') {
					cmd = 'mute=0'
				} else {
					let prefix = ''
					if (self.config.model === 'cp750') {
						prefix = 'cp750.'
					}
					cmd = prefix + 'sys.mute 0'
				}

				self.sendCommand(cmd)
			},
		}

		actions['mute_toggle'] = {
			name: 'Toggle Mute',
			options: [],
			callback: async function () {
				let cmd

				if (self.config.model === 'cp650') {
					cmd = 'mute=2'
				} else {
					//determine current mute state and send opposite
					if (self.MUTE_STATUS === true) {
						let prefix = ''
						if (self.config.model === 'cp750') {
							prefix = 'cp750.'
						}
						cmd = prefix + 'sys.mute 0'
					} else {
						let prefix = ''
						if (self.config.model === 'cp750') {
							prefix = 'cp750.'
						}
						cmd = prefix + 'sys.mute 1'
					}
				}

				self.sendCommand(cmd)
			},
		}

		self.setActionDefinitions(actions)
	},
}
