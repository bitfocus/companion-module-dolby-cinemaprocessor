const { combineRgb } = require('@companion-module/base')

module.exports = {
	initFeedbacks: function () {
		let self = this
		let feedbacks = {}

		const foregroundColor = combineRgb(255, 255, 255) // White
		const backgroundColorRed = combineRgb(255, 0, 0) // Red

		feedbacks['mute_status'] = {
			type: 'boolean',
			name: 'Change Button Color If Muted',
			description: 'If muted, set the button to this color.',
			defaultStyle: {
				color: foregroundColor,
				bgcolor: backgroundColorRed,
			},
			callback: function () {
				if (self.MUTE_STATUS === true) {
					return true
				}

				return false
			},
		}

		self.setFeedbackDefinitions(feedbacks)
	},
}
