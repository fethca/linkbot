import OpenAI from 'openai'
import { settings } from '../settings.js'

export const openai = new OpenAI({
  apiKey: settings.openAi.key,
})
