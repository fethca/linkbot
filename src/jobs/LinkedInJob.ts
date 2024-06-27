import { ILogger, Logger } from '@fethcat/logger'
import { Page } from 'puppeteer'
import { extractId, getAnswer, getPrompt } from '../helpers/utils.js'
import { PuppeteerManager } from '../modules/puppeteer.js'
import { openai } from '../services/services.js'
import { Message, settings } from '../settings.js'
import { IGPT, gptSchemas } from '../types.js'

const { instanceId, logs, metadata } = settings

type IMessage = { message: string; id: string }

export class LinkedInJob {
  protected logger: ILogger<Message> = Logger.create<Message>(instanceId, logs, metadata)
  private puppeteer = new PuppeteerManager()
  private page: Page | undefined

  async run() {
    const { success, failure } = this.logger.action('linkedin_job')
    try {
      // await wait(2000)
      await this.puppeteer.init()
      await this.login()

      const messages = await this.extract()

      for (const message of messages) await this.processMessage(message)

      await this.puppeteer.destroy()
      success()
    } catch (error) {
      if (this.page) await this.page.screenshot({ path: settings.linkedin.errorPath })
      await this.puppeteer.destroy()
      throw failure(error)
    }
  }

  async login() {
    const { success, failure } = this.logger.action('linkedin_login')
    try {
      const link = 'https://www.linkedin.com/login/fr?fromSignIn=true&trk=guest_homepage-basic_nav-header-signin'
      this.page = await this.puppeteer.createPage(link)
      await this.page.type('#username', settings.linkedin.username)
      await this.page.type('#password', settings.linkedin.password)
      await this.page.click('button[data-litms-control-urn="login-submit"]')
      await this.page.waitForNavigation()
      success()
    } catch (error) {
      throw failure(error)
    }
  }

  async extract(): Promise<IMessage[]> {
    const { success, failure, skip } = this.logger.action('linkedin_extract')
    try {
      if (!this.page) throw "Something went wrong, page doesn't exist"

      await this.page.goto('https://www.linkedin.com/messaging/?filter=unread')

      await Promise.race([
        this.page.waitForSelector('.msg-conversations-container__convo-item-link'),
        this.page.waitForSelector('text="Aucun message"'),
      ])

      if (await this.page.$('text="Aucun message"')) {
        skip('no_messages')
        return []
      }

      await this.page.waitForSelector('.msg-conversations-container__convo-item-link')

      const links = await this.page.$$eval('.msg-conversations-container__convo-item-link', (conversations) =>
        conversations.map((conversation) => {
          if (conversation instanceof HTMLAnchorElement) return conversation.href
        }),
      )

      const threadIds = links.map((link) => extractId(link)).filter(Boolean)

      const messages: IMessage[] = []
      for (const id of threadIds) {
        await this.page.goto(`https://www.linkedin.com/messaging/thread/${id}/?filter=unread`)
        await this.page.waitForSelector('.msg-s-event-listitem__body')
        const message = await this.page.$eval('.msg-s-event-listitem__body', (el) => el.textContent)
        if (message && id) messages.push({ message, id })
      }

      success()
      return messages
    } catch (error) {
      throw failure(error)
    }
  }

  async processMessage(message: IMessage) {
    const { success, failure } = this.logger.action('process_message')
    try {
      const { isRecruitment, firstName, isFirstContact } = await this.interpret(message.message)
      if (isRecruitment && isFirstContact) await this.answer(message, firstName)

      success()
    } catch (error) {
      throw failure(error)
    }
  }

  async interpret(message: string): Promise<IGPT> {
    const { success, failure } = this.logger.action('open_ai_interpret')
    try {
      const prompt = getPrompt(message)

      const gpt = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
      })

      const result = gpt.choices[0].message.content || ''
      const { isRecruitment, firstName, isFirstContact } = gptSchemas.parse(JSON.parse(result))

      success({ isRecruitment, firstName, isFirstContact })
      return { isRecruitment, firstName, isFirstContact }
    } catch (error) {
      throw failure(error)
    }
  }

  async answer(message: IMessage, firstName: string) {
    const { success, failure } = this.logger.action('linkedin_answer')
    try {
      if (!this.page) throw "Something went wrong, page doesn't exist"
      await this.page.goto(`https://www.linkedin.com/messaging/thread/${message.id}`)
      await this.page.waitForSelector('.msg-form__contenteditable')
      await this.page.type('.msg-form__contenteditable', getAnswer(firstName))
      await this.page.click('.msg-form__send-button')
      success()
    } catch (error) {
      throw failure(error)
    }
  }
}
