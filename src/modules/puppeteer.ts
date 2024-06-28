import { ILogger, Logger } from '@fethcat/logger'
import axios from 'axios'
import { findOne, textContent } from 'domutils'
import { parseDocument } from 'htmlparser2'
import locateChrome from 'locate-chrome'
import { Browser, DEFAULT_INTERCEPT_RESOLUTION_PRIORITY, Page } from 'puppeteer'
import puppeteer from 'puppeteer-extra'
import blockResourcesPlugin from 'puppeteer-extra-plugin-block-resources'
import StealthPlugin from 'puppeteer-extra-plugin-stealth'
import { z } from 'zod'
import { unwantedUA } from '../helpers/utils.js'
import { Message, settings } from '../settings.js'
import { IPuppeteerManager } from '../types.js'

const { instanceId, logs, metadata } = settings

const defaultUA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/73.0.3683.75 Safari/537.36'

puppeteer.default
  .use(
    blockResourcesPlugin({
      blockedTypes: new Set([
        // 'stylesheet',
        // 'image',
        // 'media',
        // 'font',
        // 'texttrack',
        // 'fetch',
        // 'eventsource',
        // 'websocket',
        // 'manifest',
      ]),
      interceptResolutionPriority: DEFAULT_INTERCEPT_RESOLUTION_PRIORITY,
    }),
  )
  .use(StealthPlugin())

export class PuppeteerManager implements IPuppeteerManager {
  logger: ILogger<Message> = Logger.create<Message>(instanceId, logs, metadata)
  isReleased = false
  userAgents: string[] = []
  browser?: Browser
  chromePath: string = ''
  currentPage: Page | undefined

  async init() {
    const { success, failure } = this.logger.action('puppeteer_init')
    try {
      await this.resetBrowser()
      if (!this.browser) throw new Error("couldn't run browser")

      let retry = 0
      this.browser.on('disconnected', async () => {
        if (this.isReleased) return
        this.logger.error('puppeteer_browser_disconnected')
        if (retry <= 3) {
          retry++
          if (this.browser) this.browser.process()?.kill('SIGINT')
          await this.resetBrowser()
        } else {
          throw new Error('browser crashed more than 3 times')
        }
      })

      success()
    } catch (error) {
      throw failure(error)
    }
  }

  async resetBrowser() {
    const { success, failure } = this.logger.action('puppeteer_reset_browser')
    try {
      if (this.browser) await this.destroy()
      this.isReleased = false
      this.userAgents = []
      this.chromePath = await new Promise((resolve) => locateChrome((path) => resolve(path || '')))
      const browser = await this.runBrowser()
      if (!browser) throw new Error("couldn't run browser")
      this.browser = browser
      success()
    } catch (error) {
      throw failure(error)
    }
  }

  async runBrowser(): Promise<Browser> {
    const { success, failure } = this.logger.action('puppeteer_run_browser')
    try {
      this.logger.addMeta({ executablePath: this.chromePath })
      if (!this.chromePath) throw new Error(`can't find Chrome at ${this.chromePath}`)

      const browser = await puppeteer.default.launch({
        executablePath: this.chromePath,
        headless: true,
        devtools: false,
        ignoreHTTPSErrors: true,
        slowMo: 0,
        args: [
          '--disable-gpu',
          '--no-sandbox',
          '--no-zygote',
          '--disable-setuid-sandbox',
          '--disable-accelerated-2d-canvas',
          '--disable-dev-shm-usage',
          "--proxy-server='direct://'",
          '--proxy-bypass-list=*',
        ],
      })

      success()
      return browser
    } catch (error) {
      throw failure(error)
    }
  }

  async createPage(url: string): Promise<Page> {
    const { success, failure } = this.logger.action('puppeteer_create_page')
    try {
      if (!this.browser) throw new Error("couldn't run browser")
      if (!this.currentPage) this.currentPage = await this.browser.newPage()
      await this.currentPage.setViewport({
        width: 1920 + Math.floor(Math.random() * 100),
        height: 3000 + Math.floor(Math.random() * 100),
        deviceScaleFactor: 1,
        hasTouch: false,
        isLandscape: false,
        isMobile: false,
      })

      //Cloudflare bypass techniques currently doesn't work with puppeteer
      //so the below overrides won't help much.
      //Use Flaresolverr instead before an eventual fix
      const userAgent = await this.getRandomUA()
      await this.currentPage.setUserAgent(userAgent)
      await this.currentPage.setJavaScriptEnabled(true)
      this.currentPage.setDefaultNavigationTimeout(0)

      await this.currentPage.evaluateOnNewDocument(() => {
        Object.defineProperty(navigator, 'webdriver', { get: () => false })
      })

      await this.currentPage.evaluateOnNewDocument(() => {
        Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] })
      })

      await this.currentPage.evaluateOnNewDocument(() => {
        Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] })
      })

      await this.currentPage.goto(url)
      success()
      return this.currentPage
    } catch (error) {
      throw failure(error)
    }
  }

  async getRandomUA() {
    const { success, failure } = this.logger.action('puppeteer_user_agent')
    let userAgent = defaultUA
    try {
      if (!this.userAgents.length) {
        const schema = z.array(z.object({ ua: z.string() }))
        const { data } = await axios.get('https://www.useragents.me/#most-common-desktop-useragents-json-csv')
        const html = parseDocument(data)
        const jsonId = 'most-common-desktop-useragents-json-csv'
        const results = findOne((e) => e.attribs?.id === jsonId, html.children, true)
        const text = textContent(findOne((e) => e.tagName === 'textarea', results?.children || []) || [])
        const parsed = schema.safeParse(JSON.parse(text))
        if (parsed.success && parsed.data.length) {
          const userAgents = parsed.data
          this.userAgents = userAgents.map((userAgent) => (unwantedUA(userAgent.ua) ? userAgent.ua : ''))
        }
      }
      this.userAgents = this.userAgents.filter(Boolean)
      const random = Math.floor(Math.random() * this.userAgents.length)
      userAgent = this.userAgents[random]
      success({ userAgent, isUADefault: userAgent === defaultUA })
      return userAgent
    } catch (error) {
      failure(error, { userAgent, isUADefault: true })
      return userAgent
    }
  }

  async destroy() {
    const { success, failure } = this.logger.action('puppeteer_stop_browser')
    try {
      this.isReleased = true
      this.userAgents = []
      if (this.browser) await this.browser.close()
      success()
    } catch (error) {
      failure(error)
    }
  }
}
