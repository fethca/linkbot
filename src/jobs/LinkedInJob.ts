import { ILogger, Logger } from '@fethcat/logger'
import { extractId, getAnswer, getPrompt } from '../helpers/utils.js'
import { openai, puppeteer } from '../services/services.js'
import { Message, settings } from '../settings.js'
import { IGPT, gptSchemas } from '../types.js'

const { instanceId, logs, metadata } = settings

type IMessage = { message: string; id: string }

export class LinkedInJob {
  protected logger: ILogger<Message> = Logger.create<Message>(instanceId, logs, metadata)

  async run() {
    const { success, failure } = this.logger.action('linkedin_job')
    try {
      // await wait(2000)
      await puppeteer.init()
      await this.login()

      const messages = await this.extract()

      for (const message of messages) await this.processMessage(message)

      await puppeteer.destroy()
      success()
    } catch (error) {
      if (puppeteer.currentPage) await puppeteer.currentPage.screenshot({ path: settings.linkedin.errorPath })
      await puppeteer.destroy()
      throw failure(error)
    }
  }

  async login() {
    const { success, failure } = this.logger.action('linkedin_login')
    try {
      const link = 'https://www.linkedin.com/login/fr?fromSignIn=true&trk=guest_homepage-basic_nav-header-signin'
      await puppeteer.createPage(link)

      if (!puppeteer.currentPage) throw "Something went wrong, page doesn't exist"

      await puppeteer.currentPage.type('#username', settings.linkedin.username)
      await puppeteer.currentPage.type('#password', settings.linkedin.password)
      await puppeteer.currentPage.click('button[data-litms-control-urn="login-submit"]')
      await puppeteer.currentPage.waitForNavigation()
      success()
    } catch (error) {
      throw failure(error)
    }
  }

  async extract(): Promise<IMessage[]> {
    const { success, failure, skip } = this.logger.action('linkedin_extract')
    try {
      if (!puppeteer.currentPage) throw "Something went wrong, page doesn't exist"

      await puppeteer.currentPage.goto('https://www.linkedin.com/messaging/?filter=unread')

      await Promise.race([
        puppeteer.currentPage.waitForSelector('.msg-conversations-container__convo-item-link'),
        puppeteer.currentPage.waitForSelector('text="Aucun message"'),
      ])

      if (await puppeteer.currentPage.$('text="Aucun message"')) {
        skip('no_messages')
        return []
      }

      await puppeteer.currentPage.waitForSelector('.msg-conversations-container__convo-item-link')

      const links = await puppeteer.currentPage.$$eval(
        '.msg-conversations-container__convo-item-link',
        (conversations) =>
          conversations.map((conversation) => {
            if (conversation instanceof HTMLAnchorElement) return conversation.href
          }),
      )

      const threadIds = links.map((link) => extractId(link)).filter(Boolean)

      const messages: IMessage[] = []
      for (const id of threadIds) {
        await puppeteer.currentPage.goto(`https://www.linkedin.com/messaging/thread/${id}/?filter=unread`)
        await puppeteer.currentPage.waitForSelector('.msg-s-event-listitem__body')
        const message = await puppeteer.currentPage.$eval('.msg-s-event-listitem__body', (el) => el.textContent)
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
      if (!puppeteer.currentPage) throw "Something went wrong, page doesn't exist"
      await puppeteer.currentPage.goto(`https://www.linkedin.com/messaging/thread/${message.id}`)
      await puppeteer.currentPage.waitForSelector('.msg-form__contenteditable')
      await puppeteer.currentPage.type('.msg-form__contenteditable', getAnswer(firstName))
      await puppeteer.currentPage.click('.msg-form__send-button')
      success()
    } catch (error) {
      throw failure(error)
    }
  }
}
