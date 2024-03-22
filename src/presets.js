const { combineRgb } = require('@companion-module/base')

module.exports = {
	initPresets: function () {
		let self = this
		let presets = []

		const foregroundColor = combineRgb(255, 255, 255) // White
		const foregroundColorBlack = combineRgb(0, 0, 0) // Black
		const backgroundColorRed = combineRgb(255, 0, 0) // Red
		const backgroundColorGreen = combineRgb(0, 255, 0) // Green
		const backgroundColorOrange = combineRgb(255, 102, 0) // Orange

		presets.push({
			type: 'button',
			category: 'Fader Level',
			name: 'Fader +',
			style: {
				text: 'Fader +',
				size: '14',
				color: '16777215',
				bgcolor: combineRgb(0, 0, 0),
			},
			steps: [
				{
					down: [
						{
							actionId: 'fader_increase_timer',
							options: {
								rate: '500',
							},
						},
					],
					up: [
						{
							actionId: 'fader_increase_stop',
						},
					],
				},
			],
			feedbacks: [],
		})

		presets.push({
			type: 'button',
			category: 'Fader Level',
			name: 'Fader -',
			style: {
				text: 'Fader -',
				size: '14',
				color: '16777215',
				bgcolor: combineRgb(0, 0, 0),
			},
			steps: [
				{
					down: [
						{
							actionId: 'fader_decrease_timer',
							options: {
								rate: '500',
							},
						},
					],
					up: [
						{
							actionId: 'fader_decrease_stop',
						},
					],
				},
			],
			feedbacks: [],
		})

		self.setPresetDefinitions(presets)
	},
}
