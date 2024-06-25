import { Page } from 'puppeteer'
import { z } from 'zod'

export interface IPuppeteerManager {
  init(): Promise<void>
  createPage(url: string): Promise<Page>
  destroy(): Promise<void>
}

export const gptSchemas = z.object({
  isRecruitment: z.boolean(),
  firstName: z.string(),
  isFirstContact: z.boolean(),
})

export type IGPT = z.infer<typeof gptSchemas>
