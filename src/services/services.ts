import { OpenAI } from 'openai'
import { PuppeteerManager } from '../modules/puppeteer.js'
import { settings } from '../settings.js'

export const openai = new OpenAI({
  apiKey: settings.openAi.key,
})

export const puppeteer = new PuppeteerManager()
