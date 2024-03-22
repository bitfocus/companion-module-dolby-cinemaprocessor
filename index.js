const { InstanceBase, InstanceStatus, runEntrypoint } = require('@companion-module/base')
const UpgradeScripts = require('./src/upgrades')

const config = require('./src/config')
const actions = require('./src/actions')
const feedbacks = require('./src/feedbacks')
const variables = require('./src/variables')
const presets = require('./src/presets')

const constants = require('./src/constants')
const utils = require('./src/utils')

class dolbyInstance extends InstanceBase {
	constructor(internal) {
		super(internal)

		// Assign the methods from the listed files to this class
		Object.assign(this, {
			...config,
			...actions,
			...feedbacks,
			...variables,
			...presets,
			...constants,
			...utils,
		})

		this.FADER_LEVEL = 85

		this.MUTE_STATUS = null

		this.TIMER_FADER = null
	}

	async destroy() {
		if (this.socket !== undefined) {
			this.socket.destroy()
		}

		//destroy timers
		if (this.TIMER_FADER !== null) {
			clearInterval(this.TIMER_FADER)
			this.TIMER_FADER = null
		}
	}

	async init(config) {
		this.configUpdated(config)
	}

	async configUpdated(config) {
		this.config = config

		this.initActions()
		this.initFeedbacks()
		this.initVariables()
		this.initPresets()

		this.updateStatus(InstanceStatus.Connecting)

		this.initConnection()
	}
}

runEntrypoint(dolbyInstance, UpgradeScripts)
