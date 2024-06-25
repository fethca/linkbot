import { ILogger, Logger } from '@fethcat/logger'
import { Message, settings } from '../settings.js'
import { LinkedInJob } from './LinkedInJob.js'

const { instanceId, logs, metadata } = settings

export class MainJob {
  protected logger: ILogger<Message> = Logger.create<Message>(instanceId, logs, metadata)

  async run(): Promise<void> {
    const { success, failure } = this.logger.action('main_job')
    try {
      await new LinkedInJob().run()
      setTimeout(this.run.bind(this), 1000 * 60 * 60 * 12) //12h
      success()
    } catch (error) {
      throw failure(error)
    }
  }
}
