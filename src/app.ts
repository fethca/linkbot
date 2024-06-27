import { Logger } from '@fethcat/logger'
import { MainJob } from './jobs/MainJob.js'
import { puppeteer } from './services/services.js'
import { Message, settings } from './settings.js'

const { instanceId, logs, metadata } = settings

export class App {
  logger = Logger.create<Message>(instanceId, logs, metadata)

  run() {
    const { success, failure } = this.logger.action('app_start')
    try {
      void new MainJob().run()
      process.on('SIGTERM', this.exit.bind(this))
      success()
    } catch (error) {
      failure(error)
      process.exit(1)
    }
  }

  private async exit() {
    this.logger.info('app_stop')
    await puppeteer.destroy()
  }
}
